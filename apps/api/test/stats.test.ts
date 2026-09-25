import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { iqSessions, results } from '../src/db/schema';
import { computeStreaks } from '../src/services/stats';
import { login, makeTestApp, type TestCtx } from './helpers';

const NOW = new Date('2026-01-05T10:00:00Z'); // Toshkent: 2026-01-05 15:00

describe('computeStreaks', () => {
  it('bugun faol bo\'lmasa kechadan sanaydi', () => {
    expect(computeStreaks(['2026-01-01', '2026-01-02', '2026-01-03'], '2026-01-04')).toEqual({ current: 3, best: 3 });
    expect(computeStreaks(['2026-01-01', '2026-01-02'], '2026-01-04')).toEqual({ current: 0, best: 2 });
    expect(computeStreaks([], '2026-01-04')).toEqual({ current: 0, best: 0 });
    expect(computeStreaks(['2025-12-31', '2026-01-01'], '2026-01-01')).toEqual({ current: 2, best: 2 });
  });
});

describe('GET /stats/me', () => {
  let t: TestCtx;
  let auth: { authorization: string };
  let emptyAuth: { authorization: string };

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    t = await makeTestApp();
    const a = await login(t.app, 201);
    const b = await login(t.app, 202);
    const c = await login(t.app, 203);
    auth = a.auth;
    emptyAuth = c.auth;
    const uid = a.user.id;
    const r = (at: string, correct: number, total: number, kind = 'practice') =>
      ({ userId: uid, kind, correct, total, xp: correct, createdAt: new Date(at) });
    await t.db.insert(results).values([
      r('2024-12-01T08:00:00Z', 1, 1),             // yildan tashqarida
      r('2025-12-01T08:00:00Z', 2, 2, 'set'),      // oy tashqarisida, yil ichida
      r('2025-12-20T08:00:00Z', 1, 2),
      r('2025-12-21T08:00:00Z', 1, 2),
      r('2025-12-22T08:00:00Z', 1, 2),
      r('2025-12-23T08:00:00Z', 1, 2),
      r('2026-01-01T18:00:00Z', 5, 10),            // Toshkent: 1-yanvar 23:00
      r('2026-01-01T19:30:00Z', 8, 10),            // Toshkent: 2-yanvar 00:30
      r('2026-01-03T10:00:00Z', 3, 4, 'set'),
      r('2026-01-04T20:00:00Z', 1, 2, 'iq'),       // Toshkent: 5-yanvar (bugun)
      // boshqa foydalanuvchi — hisobga kirmaydi
      { userId: b.user.id, kind: 'practice', correct: 50, total: 50, xp: 50, createdAt: new Date('2026-01-04T12:00:00Z') },
    ]);
    const s = (status: string, low: number | null, high: number | null, finishedAt: string | null) => ({
      userId: uid, seed: 1, formVersion: 'v1', status, bandLow: low, bandHigh: high,
      startedAt: new Date(finishedAt ?? '2026-01-05T08:00:00Z'), finishedAt: finishedAt ? new Date(finishedAt) : null,
    });
    await t.db.insert(iqSessions).values([
      s('finished', 100, 110, '2026-01-03T09:00:00Z'),
      s('finished', 120, 130, '2025-12-01T09:00:00Z'),
      s('finished', 90, 100, '2026-01-05T09:00:00Z'),
      s('active', null, null, null),
      s('abandoned', 140, 150, '2026-01-04T09:00:00Z'),
    ]);
  });
  afterAll(async () => { await t.close(); vi.useRealTimers(); });

  const get = (url: string, headers = auth) => t.app.inject({ method: 'GET', url, headers });

  it('auth talab qilinadi', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/stats/me' })).statusCode).toBe(401);
  });

  it('noto\'g\'ri period — 400', async () => {
    const res = await get('/stats/me?period=day');
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('period=all (standart): jami, streak, iq, graph', async () => {
    const res = await get('/stats/me');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      totalQuestions: 37, correct: 24, wrong: 13, correctPct: 65,
      currentStreak: 1, bestStreak: 4,
      iq: { count: 3, best: { low: 120, high: 130 }, last: { low: 90, high: 100 }, avgMid: 108 },
      graph: [
        { date: '2025-12-21', pct: 50 }, { date: '2025-12-22', pct: 50 }, { date: '2025-12-23', pct: 50 },
        { date: '2026-01-01', pct: 50 }, { date: '2026-01-02', pct: 80 }, { date: '2026-01-03', pct: 75 },
        { date: '2026-01-05', pct: 50 },
      ],
    });
  });

  it('period=week — oxirgi 7 Toshkent kuni', async () => {
    const body = (await get('/stats/me?period=week')).json();
    expect(body).toMatchObject({ totalQuestions: 26, correct: 17, wrong: 9, correctPct: 65, currentStreak: 1, bestStreak: 4 });
    expect(body.iq).toEqual({ count: 2, best: { low: 100, high: 110 }, last: { low: 90, high: 100 }, avgMid: 100 });
    expect(body.graph.map((g: { date: string }) => g.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-05']);
  });

  it('period=month va year', async () => {
    expect((await get('/stats/me?period=month')).json()).toMatchObject({ totalQuestions: 34, correct: 21 });
    const year = (await get('/stats/me?period=year')).json();
    expect(year).toMatchObject({ totalQuestions: 36, correct: 23 });
    expect(year.iq.count).toBe(3);
  });

  it('bugun faollik bo\'lmasa streak kechadan sanaladi', async () => {
    vi.setSystemTime(new Date('2026-01-04T12:00:00Z')); // Toshkent: 4-yanvar 17:00
    try {
      const body = (await get('/stats/me')).json();
      expect(body.currentStreak).toBe(3); // 1, 2, 3-yanvar
      vi.setSystemTime(new Date('2026-01-07T12:00:00Z'));
      expect((await get('/stats/me')).json().currentStreak).toBe(0);
    } finally {
      vi.setSystemTime(NOW);
    }
  });

  it('natijasiz foydalanuvchi — nollar', async () => {
    expect((await get('/stats/me', emptyAuth)).json()).toEqual({
      totalQuestions: 0, correct: 0, wrong: 0, correctPct: 0, currentStreak: 0, bestStreak: 0,
      iq: { count: 0, best: null, last: null, avgMid: null }, graph: [],
    });
  });
});
