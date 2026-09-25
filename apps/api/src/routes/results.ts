import type { FastifyPluginAsync } from 'fastify';
import { and, asc, count, eq, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import { HttpError, currentUser } from '../app';
import { results, users } from '../db/schema';
import { toUserDto } from '../lib/dto';
import { isPro } from '../services/pro';
import { getSettings } from '../services/settings';
import { getUsage, incUsage } from '../services/usage';

const resultBody = z.object({
  kind: z.enum(['set', 'practice']),
  setId: z.number().int().min(1).max(100).optional(),
  correct: z.number().int().min(0).max(100),
  total: z.number().int().min(0).max(100),
  durationSec: z.number().int().min(0).max(86_400).optional(),
}).superRefine((b, ctx) => {
  if (b.correct > b.total) ctx.addIssue({ code: 'custom', path: ['correct'], message: 'correct must be <= total' });
  if (b.kind === 'set' && b.setId === undefined) ctx.addIssue({ code: 'custom', path: ['setId'], message: 'setId is required for kind "set"' });
});

type ResultRow = typeof results.$inferSelect;
const resultDto = (r: ResultRow) => ({
  id: r.id,
  kind: r.kind,
  setId: r.setId,
  correct: r.correct,
  total: r.total,
  durationSec: r.durationSec,
  xp: r.xp,
  createdAt: r.createdAt.toISOString(),
});

const routes: FastifyPluginAsync = async (app) => {
  const db = app.db;

  /** Mashq yoki to'plam natijasini saqlaydi, xp qo'shadi. */
  app.post('/results', { preHandler: app.authenticate }, async (req) => {
    const body = resultBody.parse(req.body);
    const user = await currentUser(app, req);
    const isSet = body.kind === 'set';
    if (isSet && !isPro(user)) {
      const { freeTicketCount } = await getSettings(db);
      if (body.setId! > freeTicketCount) throw new HttpError(403, 'forbidden', 'pro required for this set');
    }
    const xpGained = body.correct * (isSet ? 2 : 1);
    const [row] = await db.insert(results).values({
      userId: user.id,
      kind: body.kind,
      setId: isSet ? body.setId! : null,
      correct: body.correct,
      total: body.total,
      durationSec: body.durationSec ?? 0,
      xp: xpGained,
    }).returning();
    if (!isSet && body.total > 0) await incUsage(db, user.id, 'practice_questions', body.total);
    const [updated] = await db.update(users).set({ xp: sql`${users.xp} + ${xpGained}` }).where(eq(users.id, user.id)).returning();
    return { result: resultDto(row!), xpGained, user: toUserDto(updated!, app.config) };
  });

  /** Bugungi mashq limiti (bepul foydalanuvchi: dailyTestLimit savol). */
  app.post('/results/practice/check', { preHandler: app.authenticate }, async (req) => {
    const user = await currentUser(app, req);
    const used = await getUsage(db, user.id, 'practice_questions');
    if (isPro(user)) return { allowed: true, used, limit: null };
    const { dailyTestLimit } = await getSettings(db);
    return { allowed: used < dailyTestLimit, used, limit: dailyTestLimit };
  });

  /** To'plamlar bo'yicha progress: eng yaxshi foiz, urinishlar, oxirgi urinish vaqti. */
  app.get('/results/sets', { preHandler: app.authenticate }, async (req) => {
    const rows = await db.select({
      setId: results.setId,
      best: max(sql<number>`case when ${results.total} > 0 then round(100.0 * ${results.correct} / ${results.total}) else 0 end`),
      attempts: count(),
      lastAt: max(results.createdAt),
    }).from(results)
      .where(and(eq(results.userId, req.userId), eq(results.kind, 'set')))
      .groupBy(results.setId)
      .orderBy(asc(results.setId));
    return {
      items: rows.filter((r) => r.setId !== null).map((r) => ({
        setId: r.setId!,
        best: Number(r.best ?? 0),
        attempts: Number(r.attempts),
        lastAt: r.lastAt ? new Date(r.lastAt).toISOString() : null,
      })),
    };
  });
};
export default routes;
