import type { FastifyPluginAsync } from 'fastify';
import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { HttpError } from '../app';
import { notificationPrefs, notifications } from '../db/schema';

const DEFAULT_PREFS = { daily: true, result: true, new: true, exam: true };

const PrefsPatch = z.strictObject({
  daily: z.boolean().optional(),
  result: z.boolean().optional(),
  new: z.boolean().optional(),
  exam: z.boolean().optional(),
});

const routes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: app.authenticate };

  async function unreadCount(userId: number): Promise<number> {
    const [c] = await app.db.select({ n: count() }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return Number(c?.n ?? 0);
  }

  async function getPrefs(userId: number) {
    const [p] = await app.db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId));
    return p ? { daily: p.daily, result: p.result, new: p.new, exam: p.exam } : { ...DEFAULT_PREFS };
  }

  /** Bildirishnomalar ro'yxati (yangi → eski, ≤ 100). ?unread=1 — faqat o'qilmaganlar. `unread` — jami o'qilmaganlar soni. */
  app.get('/notifications', auth, async (req) => {
    const q = z.object({ unread: z.enum(['0', '1', 'true', 'false']).optional() }).parse(req.query);
    const onlyUnread = q.unread === '1' || q.unread === 'true';
    const where = onlyUnread
      ? and(eq(notifications.userId, req.userId), eq(notifications.read, false))
      : eq(notifications.userId, req.userId);
    const rows = await app.db.select().from(notifications).where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(100);
    return {
      items: rows.map((n) => ({
        id: n.id, type: n.type, titleKey: n.titleKey, body: n.body, read: n.read, createdAt: n.createdAt.toISOString(),
      })),
      unread: await unreadCount(req.userId),
    };
  });

  /** Bitta bildirishnomani o'qilgan deb belgilaydi (faqat o'ziniki; aks holda 404). */
  app.post('/notifications/:id/read', auth, async (req) => {
    const { id } = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) }).parse(req.params);
    const r = await app.db.update(notifications).set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.userId)))
      .returning({ id: notifications.id });
    if (!r[0]) throw new HttpError(404, 'not_found');
    return { ok: true };
  });

  app.post('/notifications/read-all', auth, async (req) => {
    const r = await app.db.update(notifications).set({ read: true })
      .where(and(eq(notifications.userId, req.userId), eq(notifications.read, false)))
      .returning({ id: notifications.id });
    return { ok: true, count: r.length };
  });

  app.get('/notifications/prefs', auth, async (req) => getPrefs(req.userId));

  /** Qisman yangilash (upsert). Qator bo'lmasa — standart (hammasi true) ustiga yoziladi. */
  app.put('/notifications/prefs', auth, async (req) => {
    const patch = PrefsPatch.parse(req.body ?? {});
    const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<typeof DEFAULT_PREFS>;
    if (Object.keys(set).length) {
      await app.db.insert(notificationPrefs).values({ userId: req.userId, ...DEFAULT_PREFS, ...set })
        .onConflictDoUpdate({ target: notificationPrefs.userId, set });
    }
    return getPrefs(req.userId);
  });
};
export default routes;
