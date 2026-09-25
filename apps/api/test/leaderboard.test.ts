import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { results, users } from '../src/db/schema';
import { login, makeTestApp, type TestCtx } from './helpers';

const NOW = new Date('2026-01-05T10:00:00Z'); // Toshkent: 2026-01-05 15:00

describe('GET /leaderboard', () => {
  let t: TestCtx;
  const ids: Record<string, number> = {};
  const auths: Record<string, { authorization: string }> = {};

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    t = await makeTestApp();
    const people = [
      ['u1', 301, 'Ali', 'Valiyev', 500],
      ['u2', 302, 'bob', '', 300],
      ['u3', 303, 'Sardor', 'karimov', 300],
      ['u4', 304, 'Zero', 'Xp', 0],
      ['u5', 305, 'Me', '', 10],
    ] as const;
    for (const [key, tg, firstName, lastName, xp] of people) {
      const r = await login(t.app, tg);
      ids[key] = r.user.id;
      auths[key] = r.auth;
      await t.db.update(users).set({ firstName, lastName, xp }).where(eq(users.id, r.user.id));
    }
    const r = (key: string, xp: number, at: string) =>
      ({ userId: ids[key]!, kind: 'practice', correct: xp, total: xp, xp, createdAt: new Date(at) });
    await t.db.insert(results).values([
      r('u1', 10, '2026-01-05T03:00:00Z'),
      r('u1', 20, '2026-01-02T10:00:00Z'),
      r('u2', 30, '2026-01-04T19:30:00Z'),   // Toshkent: 5-yanvar 00:30 — bugun
      r('u2', 100, '2026-01-04T18:30:00Z'),  // Toshkent: 4-yanvar 23:30 — kecha
      r('u3', 50, '2025-12-16T10:00:00Z'),   // 20 kun oldin
      r('u5', 10, '2026-01-05T08:00:00Z'),
      r('u4', 0, '2026-01-05T08:00:00Z'),    // 0 xp — chiqarilmaydi
    ]);
  });
  afterAll(async () => { await t.close(); vi.useRealTimers(); });

  const get = (url: string, who = 'u5') => t.app.inject({ method: 'GET', url, headers: auths[who] });
  const order = (body: { items: { userId: number }[] }) =>
    body.items.map((i) => Object.keys(ids).find((k) => ids[k] === i.userId));

  it('auth talab qilinadi', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/leaderboard' })).statusCode).toBe(401);
  });

  it('noto\'g\'ri period/limit — 400', async () => {
    expect((await get('/leaderboard?period=year')).statusCode).toBe(400);
    expect((await get('/leaderboard?period=all&limit=0')).statusCode).toBe(400);
    expect((await get('/leaderboard?period=all&limit=101')).statusCode).toBe(400);
    expect((await get('/leaderboard?period=all&limit=abc')).statusCode).toBe(400);
  });

  it('period=all — users.xp, tenglikda kichik id oldinda, 0 xp chiqarilmaydi', async () => {
    const body = (await get('/leaderboard?period=all')).json();
    expect(order(body)).toEqual(['u1', 'u2', 'u3', 'u5']);
    expect(body.items[0]).toEqual({ rank: 1, userId: ids.u1, name: 'Ali V.', avatar: 'AV', xp: 500, isMe: false });
    expect(body.items[1]).toMatchObject({ rank: 2, name: 'bob', avatar: 'B', xp: 300 });
    expect(body.items[2]).toMatchObject({ rank: 3, name: 'Sardor K.', avatar: 'SK', xp: 300 });
    expect(body.items[3]).toMatchObject({ rank: 4, xp: 10, isMe: true });
    expect(body.me).toEqual({ rank: 4, xp: 10 });
  });

  it('period=day — joriy Toshkent kuni', async () => {
    const body = (await get('/leaderboard?period=day')).json();
    expect(order(body)).toEqual(['u2', 'u1', 'u5']);
    expect(body.items.map((i: { xp: number }) => i.xp)).toEqual([30, 10, 10]);
    expect(body.me).toEqual({ rank: 3, xp: 10 });
  });

  it('period=week va month', async () => {
    const week = (await get('/leaderboard?period=week')).json();
    expect(order(week)).toEqual(['u2', 'u1', 'u5']);
    expect(week.items.map((i: { xp: number }) => i.xp)).toEqual([130, 30, 10]);
    const month = (await get('/leaderboard?period=month')).json();
    expect(order(month)).toEqual(['u2', 'u3', 'u1', 'u5']);
    expect(month.items.map((i: { rank: number }) => i.rank)).toEqual([1, 2, 3, 4]);
  });

  it('me — top ro\'yxatdan tashqarida ham qaytadi', async () => {
    const body = (await get('/leaderboard?period=all&limit=2')).json();
    expect(order(body)).toEqual(['u1', 'u2']);
    expect(body.items.every((i: { isMe: boolean }) => !i.isMe)).toBe(true);
    expect(body.me).toEqual({ rank: 4, xp: 10 });
  });

  it('0 xp foydalanuvchi uchun me = null', async () => {
    const body = (await get('/leaderboard?period=day', 'u4')).json();
    expect(body.me).toBeNull();
    expect(order(body)).not.toContain('u4');
    expect((await get('/leaderboard?period=all', 'u3')).json().items[2].isMe).toBe(true);
  });
});
