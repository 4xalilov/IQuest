import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { savedQuestions } from '../src/db/schema';
import { incUsage } from '../src/services/usage';
import { login, makeTestApp, type TestCtx } from './helpers';

describe('users', () => {
  let t: TestCtx;
  beforeAll(async () => { t = await makeTestApp(); });
  afterAll(async () => { await t.close(); });

  it('auth talab qilinadi (401)', async () => {
    for (const [method, url] of [['GET', '/me'], ['PATCH', '/me'], ['GET', '/me/saved'], ['PUT', '/me/saved/a'], ['DELETE', '/me/saved/a']] as const) {
      const res = await t.app.inject({ method, url, payload: method === 'PUT' ? { data: 1 } : undefined });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('GET /me — user, settings, usage, limits', async () => {
    const { auth, user } = await login(t.app, 101);
    await incUsage(t.db, user.id, 'practice_questions', 7);
    await incUsage(t.db, user.id, 'iq_tests', 1);
    const res = await t.app.inject({ method: 'GET', url: '/me', headers: auth });
    expect(res.statusCode).toBe(200);
    const b = res.json();
    expect(b.user).toMatchObject({ id: user.id, tgId: 101, isPro: false });
    expect(b.settings.daily_test_limit.value).toBe(100);
    expect(b.usage).toEqual({ practiceQuestions: 7, iqTests: 1 });
    expect(b.limits).toEqual({ dailyTestLimit: 100, freeExamCount: 2, freeTicketCount: 10 });
  });

  it('PATCH /me — maydonlarni yangilaydi', async () => {
    const { auth } = await login(t.app, 102);
    const res = await t.app.inject({ method: 'PATCH', url: '/me', headers: auth, payload: { firstName: ' Ali ', lastName: 'Valiyev', phone: '+998901234567', lang: 'kril' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ firstName: 'Ali', lastName: 'Valiyev', phone: '+998901234567', lang: 'kril' });
    // qisman yangilash, telefonni tozalash
    const r2 = await t.app.inject({ method: 'PATCH', url: '/me', headers: auth, payload: { phone: '' } });
    expect(r2.json().user).toMatchObject({ firstName: 'Ali', phone: '', lang: 'kril' });
    // bo'sh body — o'zgarishsiz
    const r3 = await t.app.inject({ method: 'PATCH', url: '/me', headers: auth, payload: {} });
    expect(r3.statusCode).toBe(200);
    expect(r3.json().user.firstName).toBe('Ali');
  });

  it('PATCH /me — validatsiya xatolari (400)', async () => {
    const { auth } = await login(t.app, 103);
    for (const payload of [{ phone: '901234567' }, { phone: '+99890123456' }, { lang: 'en' }, { firstName: 'x'.repeat(65) }, { lastName: 5 }]) {
      const res = await t.app.inject({ method: 'PATCH', url: '/me', headers: auth, payload });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect(res.json().error).toBe('validation');
    }
  });

  it('saved: upsert, ro\'yxat (yangi → eski), o\'chirish', async () => {
    const { auth } = await login(t.app, 104);
    const put = (key: string, data: unknown) => t.app.inject({ method: 'PUT', url: `/me/saved/${encodeURIComponent(key)}`, headers: auth, payload: { data } });
    expect((await put('12-5', { q: 'a' })).json()).toEqual({ ok: true });
    await new Promise((r) => setTimeout(r, 5));
    expect((await put('rules-0-2', { q: 'b' })).statusCode).toBe(200);
    expect((await put('12-5', { q: 'a2' })).statusCode).toBe(200); // upsert

    let list = (await t.app.inject({ method: 'GET', url: '/me/saved', headers: auth })).json();
    expect(list.items.map((i: { key: string }) => i.key)).toEqual(['rules-0-2', '12-5']);
    expect(list.items[1].data).toEqual({ q: 'a2' });
    expect(typeof list.items[0].createdAt).toBe('string');

    const del = await t.app.inject({ method: 'DELETE', url: '/me/saved/12-5', headers: auth });
    expect(del.json()).toEqual({ ok: true });
    list = (await t.app.inject({ method: 'GET', url: '/me/saved', headers: auth })).json();
    expect(list.items.map((i: { key: string }) => i.key)).toEqual(['rules-0-2']);
    // yo'q kalitni o'chirish ham ok
    expect((await t.app.inject({ method: 'DELETE', url: '/me/saved/none', headers: auth })).statusCode).toBe(200);
  });

  it('saved boshqa foydalanuvchiga ko\'rinmaydi', async () => {
    const a = await login(t.app, 105);
    const b = await login(t.app, 106);
    await t.app.inject({ method: 'PUT', url: '/me/saved/k', headers: a.auth, payload: { data: 1 } });
    const list = (await t.app.inject({ method: 'GET', url: '/me/saved', headers: b.auth })).json();
    expect(list.items).toEqual([]);
  });

  it('saved: validatsiya — key ≤ 64, data ≤ 4 KB, data majburiy', async () => {
    const { auth } = await login(t.app, 107);
    const long = await t.app.inject({ method: 'PUT', url: `/me/saved/${'k'.repeat(65)}`, headers: auth, payload: { data: 1 } });
    expect(long.statusCode).toBe(400);
    const ok64 = await t.app.inject({ method: 'PUT', url: `/me/saved/${'k'.repeat(64)}`, headers: auth, payload: { data: 1 } });
    expect(ok64.statusCode).toBe(200);
    const big = await t.app.inject({ method: 'PUT', url: '/me/saved/big', headers: auth, payload: { data: { s: 'x'.repeat(4100) } } });
    expect(big.statusCode).toBe(400);
    const missing = await t.app.inject({ method: 'PUT', url: '/me/saved/m', headers: auth, payload: {} });
    expect(missing.statusCode).toBe(400);
    const nul = await t.app.inject({ method: 'PUT', url: '/me/saved/n', headers: auth, payload: { data: null } });
    expect(nul.statusCode).toBe(400);
  });

  it('saved: 500 tadan oshsa yangi kalit — 409, mavjudini yangilash mumkin', async () => {
    const { auth, user } = await login(t.app, 108);
    await t.db.insert(savedQuestions).values(Array.from({ length: 500 }, (_, i) => ({ userId: user.id, key: `k${i}`, data: { i } })));
    const extra = await t.app.inject({ method: 'PUT', url: '/me/saved/new', headers: auth, payload: { data: 1 } });
    expect(extra.statusCode).toBe(409);
    expect(extra.json().error).toBe('conflict');
    const update = await t.app.inject({ method: 'PUT', url: '/me/saved/k0', headers: auth, payload: { data: 'upd' } });
    expect(update.statusCode).toBe(200);
    await t.app.inject({ method: 'DELETE', url: '/me/saved/k1', headers: auth });
    const again = await t.app.inject({ method: 'PUT', url: '/me/saved/new', headers: auth, payload: { data: 1 } });
    expect(again.statusCode).toBe(200);
  });
});
