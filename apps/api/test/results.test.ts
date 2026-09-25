import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { results } from '../src/db/schema';
import { grantPro } from '../src/services/pro';
import { setSetting } from '../src/services/settings';
import { getUsage } from '../src/services/usage';
import { login, makeTestApp, type TestCtx } from './helpers';

type Auth = { authorization: string };

describe('results', () => {
  let t: TestCtx;
  beforeAll(async () => { t = await makeTestApp(); });
  afterAll(async () => { await t.close(); });

  const post = (auth: Auth, payload: object) => t.app.inject({ method: 'POST', url: '/results', headers: auth, payload });

  it('auth talab qilinadi', async () => {
    expect((await t.app.inject({ method: 'POST', url: '/results', payload: {} })).statusCode).toBe(401);
    expect((await t.app.inject({ method: 'GET', url: '/results/sets' })).statusCode).toBe(401);
    expect((await t.app.inject({ method: 'POST', url: '/results/practice/check' })).statusCode).toBe(401);
  });

  it('validatsiya — 400', async () => {
    const u = await login(t.app, 201);
    const bad: object[] = [
      {},
      { kind: 'iq', correct: 1, total: 1 },
      { kind: 'practice', correct: 5, total: 4 },
      { kind: 'practice', correct: -1, total: 4 },
      { kind: 'practice', correct: 1, total: 101 },
      { kind: 'practice', correct: 1.5, total: 4 },
      { kind: 'set', correct: 1, total: 4 },
      { kind: 'set', setId: 0, correct: 1, total: 4 },
      { kind: 'set', setId: 101, correct: 1, total: 4 },
      { kind: 'set', setId: 2, correct: 1, total: 4, durationSec: -3 },
    ];
    for (const p of bad) {
      const r = await post(u.auth, p);
      expect(r.statusCode, JSON.stringify(p)).toBe(400);
      expect(r.json()).toMatchObject({ error: 'validation' });
    }
  });

  it('to\'plam: xp = correct × 2; mashq: xp = correct × 1 va practice usage += total', async () => {
    const u = await login(t.app, 202);
    const r1 = await post(u.auth, { kind: 'set', setId: 3, correct: 15, total: 20, durationSec: 300 });
    expect(r1.statusCode).toBe(200);
    const b1 = r1.json() as { result: Record<string, unknown>; xpGained: number; user: { xp: number; id: number } };
    expect(b1.xpGained).toBe(30);
    expect(b1.user).toMatchObject({ id: u.user.id, xp: 30 });
    expect(b1.result).toMatchObject({ kind: 'set', setId: 3, correct: 15, total: 20, durationSec: 300, xp: 30 });
    expect(typeof b1.result.createdAt).toBe('string');
    expect(await getUsage(t.db, u.user.id, 'practice_questions')).toBe(0);

    const r2 = await post(u.auth, { kind: 'practice', setId: 50, correct: 7, total: 10 });
    expect(r2.statusCode).toBe(200);
    const b2 = r2.json() as { result: Record<string, unknown>; xpGained: number; user: { xp: number } };
    expect(b2.xpGained).toBe(7);
    expect(b2.user.xp).toBe(37);
    expect(b2.result).toMatchObject({ kind: 'practice', setId: null, durationSec: 0 });
    expect(await getUsage(t.db, u.user.id, 'practice_questions')).toBe(10);

    const rows = await t.db.select().from(results).where(eq(results.userId, u.user.id));
    expect(rows).toHaveLength(2);
  });

  it('bepul foydalanuvchi freeTicketCount dan yuqori to\'plam — 403 forbidden; Pro — ruxsat', async () => {
    await setSetting(t.db, 'freeTicketCount', 10);
    const u = await login(t.app, 203);
    expect((await post(u.auth, { kind: 'set', setId: 10, correct: 1, total: 20 })).statusCode).toBe(200);
    const r = await post(u.auth, { kind: 'set', setId: 11, correct: 1, total: 20 });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ error: 'forbidden' });
    // mashq setId ga bog'liq emas
    expect((await post(u.auth, { kind: 'practice', correct: 1, total: 2 })).statusCode).toBe(200);

    await grantPro(t.db, u.user.id, 30);
    expect((await post(u.auth, { kind: 'set', setId: 99, correct: 1, total: 20 })).statusCode).toBe(200);
  });

  it('POST /results/practice/check — limit va Pro', async () => {
    await setSetting(t.db, 'dailyTestLimit', 20);
    const u = await login(t.app, 204);
    const check = async () => (await t.app.inject({ method: 'POST', url: '/results/practice/check', headers: u.auth })).json();
    expect(await check()).toEqual({ allowed: true, used: 0, limit: 20 });
    await post(u.auth, { kind: 'practice', correct: 10, total: 15 });
    expect(await check()).toEqual({ allowed: true, used: 15, limit: 20 });
    await post(u.auth, { kind: 'practice', correct: 3, total: 5 });
    expect(await check()).toEqual({ allowed: false, used: 20, limit: 20 });

    await grantPro(t.db, u.user.id, 7);
    expect(await check()).toEqual({ allowed: true, used: 20, limit: null });
  });

  it('GET /results/sets — setId bo\'yicha eng yaxshi foiz, urinishlar, oxirgi vaqt', async () => {
    const u = await login(t.app, 205);
    await post(u.auth, { kind: 'set', setId: 2, correct: 10, total: 20 });
    await post(u.auth, { kind: 'set', setId: 2, correct: 17, total: 20 });
    await post(u.auth, { kind: 'set', setId: 2, correct: 12, total: 20 });
    await post(u.auth, { kind: 'set', setId: 1, correct: 2, total: 3 });
    await post(u.auth, { kind: 'practice', correct: 5, total: 5 });
    const other = await login(t.app, 206);
    await post(other.auth, { kind: 'set', setId: 1, correct: 20, total: 20 });

    const r = await t.app.inject({ method: 'GET', url: '/results/sets', headers: u.auth });
    expect(r.statusCode).toBe(200);
    const items = (r.json() as { items: { setId: number; best: number; attempts: number; lastAt: string }[] }).items;
    expect(items.map(({ setId, best, attempts }) => ({ setId, best, attempts }))).toEqual([
      { setId: 1, best: 67, attempts: 1 },
      { setId: 2, best: 85, attempts: 3 },
    ]);
    const last = await t.db.select().from(results).where(eq(results.userId, u.user.id));
    const lastSet2 = last.filter((x) => x.setId === 2).map((x) => x.createdAt.getTime()).sort((a, b) => b - a)[0]!;
    expect(new Date(items[1]!.lastAt).getTime()).toBe(lastSet2);

    const empty = await t.app.inject({ method: 'GET', url: '/results/sets', headers: (await login(t.app, 207)).auth });
    expect(empty.json()).toEqual({ items: [] });
  });
});
