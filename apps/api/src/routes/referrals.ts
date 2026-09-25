import type { FastifyPluginAsync } from 'fastify';
import { asc, count, desc, eq, sql } from 'drizzle-orm';
import { currentUser } from '../app';
import { referralRewards, referrals, users } from '../db/schema';
import { getSettings } from '../services/settings';

const routes: FastifyPluginAsync = async (app) => {
  /** Referal kodi, havola, mukofotlar va taklif qilinganlar tarixi. */
  app.get('/referrals/me', { preHandler: app.authenticate }, async (req) => {
    const user = await currentUser(app, req);
    const [c] = await app.db.select({ n: count() }).from(referrals).where(eq(referrals.referrerId, user.id));
    const invited = Number(c?.n ?? 0);

    const rewards = await app.db.select().from(referralRewards)
      .where(eq(referralRewards.userId, user.id)).orderBy(asc(referralRewards.milestone));
    const rewarded = new Set(rewards.map((r) => r.milestone));

    const { referralMilestones } = await getSettings(app.db);
    const next = [...referralMilestones].sort((a, b) => a.count - b.count)
      .find((m) => m.count > invited && !rewarded.has(m.count)) ?? null;

    // pos — taklif tartib raqami (1 dan); milestone'ga to'g'ri kelgan taklif "rewarded"
    const pos = sql<number>`row_number() over (order by ${referrals.createdAt}, ${referrals.id})`;
    const sub = app.db.select({ firstName: users.firstName, createdAt: referrals.createdAt, id: referrals.id, pos: pos.as('pos') })
      .from(referrals).innerJoin(users, eq(users.id, referrals.referredId))
      .where(eq(referrals.referrerId, user.id)).as('h');
    const history = await app.db.select().from(sub).orderBy(desc(sub.createdAt), desc(sub.id)).limit(50);

    return {
      code: user.referralCode,
      link: `https://t.me/${app.config.botUsername}?startapp=${user.referralCode}`,
      invited,
      rewards: rewards.map((r) => ({ milestone: r.milestone, days: r.days, createdAt: r.createdAt.toISOString() })),
      next: next ? { count: next.count, days: next.days } : null,
      history: history.map((h) => ({
        firstName: h.firstName,
        createdAt: new Date(h.createdAt).toISOString(),
        rewarded: rewarded.has(Number(h.pos)),
      })),
    };
  });
};
export default routes;
