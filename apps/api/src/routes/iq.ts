import type { FastifyPluginAsync } from 'fastify';
import { and, desc, eq, gt, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { buildForm, score, FORM_VERSION, type Result } from '@iquest/engine';
import { HttpError, currentUser } from '../app';
import { iqSessions, results, users } from '../db/schema';
import { finishedState, newSeed, publicForm, resultNotifBody, validateSubmission } from '../services/iq';
import { notify } from '../services/notify';
import { isPro } from '../services/pro';
import { getSettings } from '../services/settings';
import { getUsage, incUsage } from '../services/usage';

const DAY_MS = 86_400_000;
const idParams = z.object({ id: z.string() });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const submitBody = z.object({
  answers: z.array(z.array(z.number().int().nullable()).max(100)).max(20),
  rtMs: z.array(z.array(z.number()).max(100)).max(20),
  blurCount: z.number().int().min(0).max(10_000).optional(),
});

const routes: FastifyPluginAsync = async (app) => {
  const db = app.db;
  type SessionRow = typeof iqSessions.$inferSelect;

  const sessionDto = (s: SessionRow) => ({
    sessionId: s.id,
    seed: s.seed,
    formVersion: s.formVersion,
    form: publicForm(buildForm(s.seed)),
  });

  async function ownSession(userId: number, id: string): Promise<SessionRow> {
    if (!UUID_RE.test(id)) throw new HttpError(404, 'not_found');
    const [s] = await db.select().from(iqSessions).where(and(eq(iqSessions.id, id), eq(iqSessions.userId, userId)));
    if (!s) throw new HttpError(404, 'not_found');
    return s;
  }

  /** Yangi sessiya (yoki 24 soatdan yangi faol sessiyani qaytaradi — limit sarflanmaydi). */
  app.post('/iq/sessions', { preHandler: app.authenticate }, async (req) => {
    const body = z.object({ ageBand: z.string().trim().max(16).optional() }).parse(req.body ?? {});
    const user = await currentUser(app, req);
    const now = new Date();
    const cutoff = new Date(now.getTime() - DAY_MS);

    const [active] = await db.select().from(iqSessions)
      .where(and(eq(iqSessions.userId, user.id), eq(iqSessions.status, 'active'), gt(iqSessions.startedAt, cutoff)))
      .orderBy(desc(iqSessions.startedAt)).limit(1);
    if (active) return sessionDto(active);

    // eskirgan faol sessiyalar tashlab ketilgan hisoblanadi
    await db.update(iqSessions).set({ status: 'abandoned' })
      .where(and(eq(iqSessions.userId, user.id), eq(iqSessions.status, 'active'), lte(iqSessions.startedAt, cutoff)));

    if (!isPro(user, now)) {
      const { freeExamCount } = await getSettings(db);
      const used = await getUsage(db, user.id, 'iq_tests', now);
      if (used >= freeExamCount) throw new HttpError(403, 'limit_reached');
    }
    const [s] = await db.insert(iqSessions).values({
      userId: user.id,
      seed: newSeed(),
      formVersion: FORM_VERSION,
      ageBand: body.ageBand || null,
    }).returning();
    await incUsage(db, user.id, 'iq_tests', 1, now);
    return sessionDto(s!);
  });

  app.get('/iq/sessions/:id', { preHandler: app.authenticate }, async (req) => {
    const { id } = idParams.parse(req.params);
    const s = await ownSession(req.userId, id);
    return {
      ...sessionDto(s),
      status: s.status,
      ...(s.result ? { result: s.result as Result } : {}),
    };
  });

  /** Javoblarni qabul qiladi, ballni serverda hisoblaydi. */
  app.post('/iq/sessions/:id/submit', { preHandler: app.authenticate }, async (req) => {
    const { id } = idParams.parse(req.params);
    const body = submitBody.parse(req.body);
    const s = await ownSession(req.userId, id);
    if (s.status !== 'active') throw new HttpError(409, 'conflict', 'session already finished');

    const form = buildForm(s.seed);
    validateSubmission(form, body.answers, body.rtMs);
    const blurCount = body.blurCount ?? 0;
    const state = finishedState(form, s.seed, body.answers, body.rtMs, blurCount);
    const result = score(form, state, s.ageBand ?? undefined);

    // atomik: faqat 'active' holatdagi sessiya yopiladi — parallel ikkinchi submit 409 oladi
    const now = new Date();
    const [done] = await db.update(iqSessions).set({
      status: 'finished',
      answers: state.answers,
      rtMs: state.rtMs,
      blurCount,
      result,
      bandLow: result.band.low,
      bandHigh: result.band.high,
      finishedAt: now,
    }).where(and(eq(iqSessions.id, s.id), eq(iqSessions.status, 'active'))).returning({ id: iqSessions.id });
    if (!done) throw new HttpError(409, 'conflict', 'session already finished');

    const xp = result.correct * 10;
    await db.insert(results).values({
      userId: s.userId,
      kind: 'iq',
      iqSessionId: s.id,
      correct: result.correct,
      total: result.total,
      durationSec: Math.round(state.elapsedMs.reduce((a, b) => a + b, 0) / 1000),
      xp,
      createdAt: now,
    });
    await db.update(users).set({ xp: sql`${users.xp} + ${xp}` }).where(eq(users.id, s.userId));
    await notify(db, s.userId, { type: 'result', titleKey: 'notifResult', body: resultNotifBody(result) });
    return { result };
  });

  app.get('/iq/history', { preHandler: app.authenticate }, async (req) => {
    const rows = await db.select().from(iqSessions)
      .where(and(eq(iqSessions.userId, req.userId), eq(iqSessions.status, 'finished')))
      .orderBy(desc(iqSessions.finishedAt)).limit(50);
    return {
      items: rows.map((s) => {
        const r = s.result as Result | null;
        return {
          sessionId: s.id,
          finishedAt: s.finishedAt ? s.finishedAt.toISOString() : null,
          band: { low: s.bandLow ?? r?.band.low ?? 0, high: s.bandHigh ?? r?.band.high ?? 0 },
          style: r?.style ?? 'balanced',
          correct: r?.correct ?? 0,
          total: r?.total ?? 0,
        };
      }),
    };
  });
};
export default routes;
