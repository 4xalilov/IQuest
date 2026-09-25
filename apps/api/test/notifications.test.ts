import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { notify } from '../src/services/notify';
import { login, makeTestApp, type TestCtx } from './helpers';

const body = { uz: 'salom', ru: 'привет', kril: 'салом' };

describe('/notifications', () => {
  let t: TestCtx;
  let a: Awaited<ReturnType<typeof login>>;
  let b: Awaited<ReturnType<typeof login>>;
  beforeAll(async () => {
    t = await makeTestApp();
    a = await login(t.app, 101);
    b = await login(t.app, 102);
    await notify(t.db, a.user.id, { type: 'new', titleKey: 'first', body });
    await notify(t.db, a.user.id, { type: 'result', titleKey: 'second', body });
    await notify(t.db, a.user.id, { type: 'daily', titleKey: 'third', body });
    await notify(t.db, b.user.id, { type: 'daily', titleKey: 'b-only', body });
  });
  afterAll(async () => { await t.close(); });

  const list = async (auth: Record<string, string>, qs = '') => {
    const res = await t.app.inject({ method: 'GET', url: `/notifications${qs}`, headers: auth });
    expect(res.statusCode).toBe(200);
    return res.json() as { items: { id: number; type: string; titleKey: string; body: unknown; read: boolean; createdAt: string }[]; unread: number };
  };

  it('token yo\'q — 401', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/notifications' })).statusCode).toBe(401);
    expect((await t.app.inject({ method: 'GET', url: '/notifications/prefs' })).statusCode).toBe(401);
  });

  it('faqat o\'z bildirishnomalari, yangi → eski', async () => {
    const r = await list(a.auth);
    expect(r.items.map((n) => n.titleKey)).toEqual(['third', 'second', 'first']);
    expect(r.unread).toBe(3);
    expect(r.items[0]).toMatchObject({ type: 'daily', body, read: false });
    expect(typeof r.items[0]!.createdAt).toBe('string');
    const rb = await list(b.auth);
    expect(rb.items.map((n) => n.titleKey)).toEqual(['b-only']);
  });

  it('read: o\'ziniki o\'qiladi, begona/noma\'lum — 404', async () => {
    const r = await list(a.auth);
    const target = r.items.find((n) => n.titleKey === 'second')!;
    const bItem = (await list(b.auth)).items[0]!;

    const foreign = await t.app.inject({ method: 'POST', url: `/notifications/${bItem.id}/read`, headers: a.auth });
    expect(foreign.statusCode).toBe(404);
    const unknown = await t.app.inject({ method: 'POST', url: '/notifications/999999/read', headers: a.auth });
    expect(unknown.statusCode).toBe(404);

    const ok = await t.app.inject({ method: 'POST', url: `/notifications/${target.id}/read`, headers: a.auth });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ ok: true });

    const after = await list(a.auth);
    expect(after.unread).toBe(2);
    expect(after.items.find((n) => n.id === target.id)!.read).toBe(true);
    const unreadOnly = await list(a.auth, '?unread=1');
    expect(unreadOnly.items.map((n) => n.titleKey)).toEqual(['third', 'first']);
    expect(unreadOnly.unread).toBe(2);
    // b ga ta'sir qilmadi
    expect((await list(b.auth)).unread).toBe(1);
  });

  it('read-all faqat o\'zinikini belgilaydi', async () => {
    const res = await t.app.inject({ method: 'POST', url: '/notifications/read-all', headers: a.auth });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, count: 2 });
    expect((await list(a.auth)).unread).toBe(0);
    expect((await list(a.auth, '?unread=1')).items).toEqual([]);
    expect((await list(b.auth)).unread).toBe(1);
    const again = await t.app.inject({ method: 'POST', url: '/notifications/read-all', headers: a.auth });
    expect(again.json()).toEqual({ ok: true, count: 0 });
  });

  it('≤ 100 ta qaytaradi', async () => {
    const c = await login(t.app, 103);
    for (let i = 0; i < 105; i++) await notify(t.db, c.user.id, { type: 'new', titleKey: `n${i}`, body });
    const r = await list(c.auth);
    expect(r.items).toHaveLength(100);
    expect(r.unread).toBe(105);
  });

  it('prefs: standart — hammasi true; PUT qisman upsert', async () => {
    const get = async (auth: Record<string, string>) =>
      (await t.app.inject({ method: 'GET', url: '/notifications/prefs', headers: auth })).json();
    expect(await get(a.auth)).toEqual({ daily: true, result: true, new: true, exam: true });

    const put1 = await t.app.inject({ method: 'PUT', url: '/notifications/prefs', headers: a.auth, payload: { daily: false } });
    expect(put1.statusCode).toBe(200);
    expect(put1.json()).toEqual({ daily: false, result: true, new: true, exam: true });

    const put2 = await t.app.inject({ method: 'PUT', url: '/notifications/prefs', headers: a.auth, payload: { exam: false } });
    expect(put2.json()).toEqual({ daily: false, result: true, new: true, exam: false });
    expect(await get(a.auth)).toEqual({ daily: false, result: true, new: true, exam: false });

    // boshqa foydalanuvchi ta'sirlanmaydi
    expect(await get(b.auth)).toEqual({ daily: true, result: true, new: true, exam: true });

    const bad = await t.app.inject({ method: 'PUT', url: '/notifications/prefs', headers: a.auth, payload: { daily: 'no' } });
    expect(bad.statusCode).toBe(400);
    const unknownKey = await t.app.inject({ method: 'PUT', url: '/notifications/prefs', headers: a.auth, payload: { spam: true } });
    expect(unknownKey.statusCode).toBe(400);
  });
});
