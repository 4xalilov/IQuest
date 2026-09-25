import type { FastifyPluginAsync } from 'fastify';
import { eq, gt, gte, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { results, users } from '../db/schema';
import { displayName, initials, periodStart } from '../services/stats';

const PERIOD_DAYS = { day: 1, week: 7, month: 30 } as const;

const routes: FastifyPluginAsync = async (app) => {
  /**
   * Reyting. all — users.xp; day/week/month — results.xp yig'indisi (Toshkent kunlari, bugun ham kiradi).
   * Tenglikda kichik id oldinda. Davrda 0 xp bo'lganlar chiqarilmaydi.
   */
  app.get('/leaderboard', { preHandler: app.authenticate }, async (req) => {
    const q = z.object({
      period: z.enum(['day', 'week', 'month', 'all']).default('week'),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }).parse(req.query);

    const agg = q.period === 'all'
      ? app.db.select({ userId: sql<number>`${users.id}`.as('agg_user_id'), xp: sql<number>`${users.xp}`.as('agg_xp') })
        .from(users).where(gt(users.xp, 0)).as('agg')
      : app.db.select({
        userId: sql<number>`${results.userId}`.as('agg_user_id'),
        xp: sql<number>`sum(${results.xp})::int`.as('agg_xp'),
      }).from(results)
        .where(gte(results.createdAt, periodStart(PERIOD_DAYS[q.period])!))
        .groupBy(results.userId)
        .having(sql`sum(${results.xp}) > 0`)
        .as('agg');

    const ranked = app.db.select({
      userId: agg.userId,
      xp: agg.xp,
      rank: sql<number>`row_number() over (order by ${agg.xp} desc, ${agg.userId} asc)`.as('rank'),
    }).from(agg).as('ranked');

    const rows = await app.db.select({
      rank: ranked.rank, userId: ranked.userId, xp: ranked.xp, firstName: users.firstName, lastName: users.lastName,
    }).from(ranked)
      .innerJoin(users, eq(users.id, ranked.userId))
      .where(or(lte(ranked.rank, q.limit), eq(ranked.userId, req.userId)))
      .orderBy(ranked.rank);

    let me: { rank: number; xp: number } | null = null;
    const items = [];
    for (const r of rows) {
      const rank = Number(r.rank);
      const userId = Number(r.userId);
      const xp = Number(r.xp);
      const isMe = userId === req.userId;
      if (isMe) me = { rank, xp };
      if (rank <= q.limit) {
        items.push({ rank, userId, name: displayName(r.firstName, r.lastName), avatar: initials(r.firstName, r.lastName), xp, isMe });
      }
    }
    return { items, me };
  });
};
export default routes;
