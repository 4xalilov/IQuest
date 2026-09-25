import type { FastifyPluginAsync } from 'fastify';
import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { HttpError, currentUser } from '../app';
import { savedQuestions, users } from '../db/schema';
import { toUserDto } from '../lib/dto';
import { getSettings, toPublicSettings } from '../services/settings';
import { getUsage } from '../services/usage';

export const SAVED_MAX_PER_USER = 500;
export const SAVED_MAX_DATA_BYTES = 4096;

const PatchMe = z.object({
  firstName: z.string().trim().max(64).optional(),
  lastName: z.string().trim().max(64).optional(),
  phone: z.string().trim().regex(/^(\+998\d{9})?$/, 'phone: +998XXXXXXXXX yoki bo\'sh').optional(),
  lang: z.enum(['uz', 'ru', 'kril']).optional(),
});

const KeyParam = z.object({ key: z.string().min(1).max(64) });

const SavedBody = z.object({
  data: z.unknown().refine((v) => v !== undefined && v !== null, 'data majburiy')
    .refine((v) => Buffer.byteLength(JSON.stringify(v) ?? '', 'utf8') <= SAVED_MAX_DATA_BYTES, 'data 4 KB dan oshmasin'),
});

const routes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate };

  /** Profil + ochiq sozlamalar + bugungi sarf + limitlar. */
  app.get('/me', auth, async (req) => {
    const user = await currentUser(app, req);
    const s = await getSettings(app.db);
    const [practiceQuestions, iqTests] = await Promise.all([
      getUsage(app.db, user.id, 'practice_questions'),
      getUsage(app.db, user.id, 'iq_tests'),
    ]);
    return {
      user: toUserDto(user, app.config),
      settings: toPublicSettings(s),
      usage: { practiceQuestions, iqTests },
      limits: { dailyTestLimit: s.dailyTestLimit, freeExamCount: s.freeExamCount, freeTicketCount: s.freeTicketCount },
    };
  });

  /** Profilni tahrirlash (faqat berilgan maydonlar). */
  app.patch('/me', auth, async (req) => {
    const body = PatchMe.parse(req.body ?? {});
    const patch = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return { user: toUserDto(await currentUser(app, req), app.config) };
    const [u] = await app.db.update(users).set(patch).where(eq(users.id, req.userId)).returning();
    if (!u) throw new HttpError(401, 'user_not_found');
    return { user: toUserDto(u, app.config) };
  });

  /** Saqlangan savollar (yangi → eski). */
  app.get('/me/saved', auth, async (req) => {
    const rows = await app.db.select().from(savedQuestions)
      .where(eq(savedQuestions.userId, req.userId))
      .orderBy(desc(savedQuestions.createdAt), desc(savedQuestions.key));
    return { items: rows.map((r) => ({ key: r.key, data: r.data, createdAt: r.createdAt.toISOString() })) };
  });

  /** Upsert. Yangi kalit uchun foydalanuvchiga ≤ 500 ta (oshsa 409). */
  app.put('/me/saved/:key', auth, async (req) => {
    const { key } = KeyParam.parse(req.params);
    const { data } = SavedBody.parse(req.body ?? {});
    const where = and(eq(savedQuestions.userId, req.userId), eq(savedQuestions.key, key));
    const [existing] = await app.db.select({ key: savedQuestions.key }).from(savedQuestions).where(where);
    if (existing) {
      await app.db.update(savedQuestions).set({ data }).where(where);
      return { ok: true };
    }
    const [c] = await app.db.select({ n: count() }).from(savedQuestions).where(eq(savedQuestions.userId, req.userId));
    if (Number(c?.n ?? 0) >= SAVED_MAX_PER_USER) throw new HttpError(409, 'conflict', `saqlanganlar ${SAVED_MAX_PER_USER} tadan oshmasin`);
    await app.db.insert(savedQuestions).values({ userId: req.userId, key, data })
      .onConflictDoUpdate({ target: [savedQuestions.userId, savedQuestions.key], set: { data } });
    return { ok: true };
  });

  /** O'chirish (idempotent — yo'q kalit ham { ok: true }). */
  app.delete('/me/saved/:key', auth, async (req) => {
    const { key } = KeyParam.parse(req.params);
    await app.db.delete(savedQuestions).where(and(eq(savedQuestions.userId, req.userId), eq(savedQuestions.key, key)));
    return { ok: true };
  });
};
export default routes;
