import type { FastifyPluginAsync } from 'fastify';
import { and, asc, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { iqSessions, results } from '../db/schema';
import { computeStreaks, periodStart, resultTashkentDay } from '../services/stats';
import { tashkentDay } from '../services/usage';

const PERIOD_DAYS = { all: null, week: 7, month: 30, year: 365 } as const;

const pct = (correct: number, total: number) => (total > 0 ? Math.round((100 * correct) / total) : 0);

const routes: FastifyPluginAsync = async (app) => {
  /**
   * Shaxsiy statistika. period — jami/iq/graph uchun filtr (Toshkent kunlari, bugun ham kiradi);
   * streak'lar har doim butun tarix bo'yicha.
   */
  app.get('/stats/me', { preHandler: app.authenticate }, async (req) => {
    const q = z.object({ period: z.enum(['all', 'week', 'month', 'year']).default('all') }).parse(req.query);
    const now = new Date();
    const today = tashkentDay(now);
    const start = periodStart(PERIOD_DAYS[q.period], now);

    // Kunlik yig'indi (butun tarix) — davr chegaralari Toshkent kuniga tekislangani uchun hammasi shundan chiqadi.
    const days = await app.db.select({
      day: resultTashkentDay,
      correct: sql<number>`coalesce(sum(${results.correct}), 0)::int`.mapWith(Number),
      total: sql<number>`coalesce(sum(${results.total}), 0)::int`.mapWith(Number),
    }).from(results)
      .where(eq(results.userId, req.userId))
      .groupBy(resultTashkentDay)
      .orderBy(asc(resultTashkentDay));

    const startDay = start ? tashkentDay(start) : null;
    const inPeriod = startDay ? days.filter((d) => d.day >= startDay) : days;
    const totalQuestions = inPeriod.reduce((s, d) => s + d.total, 0);
    const correct = inPeriod.reduce((s, d) => s + d.correct, 0);
    const streaks = computeStreaks(days.map((d) => d.day), today);
    const graph = inPeriod.slice(-7).map((d) => ({ date: d.day, pct: pct(d.correct, d.total) }));

    const iqWhere = [eq(iqSessions.userId, req.userId), eq(iqSessions.status, 'finished'),
      isNotNull(iqSessions.bandLow), isNotNull(iqSessions.bandHigh)];
    if (start) iqWhere.push(gte(iqSessions.finishedAt, start));
    const sessions = await app.db.select({ low: iqSessions.bandLow, high: iqSessions.bandHigh, finishedAt: iqSessions.finishedAt })
      .from(iqSessions).where(and(...iqWhere))
      .orderBy(desc(iqSessions.finishedAt), desc(iqSessions.startedAt));
    const bands = sessions.map((s) => ({ low: s.low!, high: s.high! }));
    let best: { low: number; high: number } | null = null;
    for (const b of bands) if (!best || b.low > best.low || (b.low === best.low && b.high > best.high)) best = b;

    return {
      totalQuestions,
      correct,
      wrong: totalQuestions - correct,
      correctPct: pct(correct, totalQuestions),
      currentStreak: streaks.current,
      bestStreak: streaks.best,
      iq: {
        count: bands.length,
        best,
        last: bands[0] ?? null,
        avgMid: bands.length ? Math.round(bands.reduce((s, b) => s + (b.low + b.high) / 2, 0) / bands.length) : null,
      },
      graph,
    };
  });
};
export default routes;
