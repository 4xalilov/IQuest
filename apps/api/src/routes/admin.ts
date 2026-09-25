import type { FastifyPluginAsync } from 'fastify';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { and, count, desc, eq, gt, gte, ilike, or, sql, sum, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { markPaid } from '../services/payments';
import { HttpError } from '../app';
import type { Db } from '../db/client';
import { iqSessions, payments, users } from '../db/schema';
import { toUserDto } from '../lib/dto';
import { notify } from '../services/notify';
import { grantPro } from '../services/pro';
import { getSettings, setSetting, type AppSettings, type SettingKey } from '../services/settings';
import { tashkentDay } from '../services/usage';

type PaymentRow = typeof payments.$inferSelect;
type UserRow = typeof users.$inferSelect;

// ---------------------------------------------------------------------------
// Sozlamalar validatsiyasi (AppSettings bilan mos, qat'iy)
// ---------------------------------------------------------------------------
const nonNegInt = z.number().int().nonnegative();
const posInt = z.number().int().positive();
const PlanSchema = z.strictObject({ days: posInt, uzs: posInt, stars: posInt });

export const SettingsPatch = z.strictObject({
  dailyTestLimit: nonNegInt,
  freeExamCount: nonNegInt,
  freeTicketCount: nonNegInt,
  discount: z.strictObject({
    active: z.boolean(),
    percent: z.number().int().min(0).max(100),
    label: z.string().max(100),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'invalid date').nullable(),
    code: z.string().max(32),
  }),
  plans: z.strictObject({ week: PlanSchema, month1: PlanSchema, month2: PlanSchema }),
  referralMilestones: z.array(z.strictObject({ count: posInt, days: posInt })).max(20)
    .refine((ms) => ms.every((m, i) => i === 0 || m.count > ms[i - 1]!.count), 'milestones must be sorted ascending by unique count'),
  card: z.strictObject({ number: z.string().max(32), owner: z.string().max(100) }),
}).partial();

// ---------------------------------------------------------------------------
// To'lovni tasdiqlash — umumiy markPaid() (services/payments.ts): pending → paid, Pro, bildirishnoma.
export async function approvePayment(db: Db, paymentId: number, adminUserId: number): Promise<{ payment: PaymentRow; user: UserRow } | null> {
  const r = await markPaid(db, paymentId, { reviewedBy: adminUserId });
  return r && { payment: r.payment, user: r.user };
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf',
};

const IdParam = z.object({ id: z.coerce.number().int().positive().max(2_147_483_647) });

const routes: FastifyPluginAsync = async (app) => {
  const admin = { preHandler: app.requireAdmin };
  const dto = (u: UserRow) => toUserDto(u, app.config);
  const paymentDto = (p: PaymentRow) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  });

  async function loadPayment(id: number): Promise<PaymentRow> {
    const [p] = await app.db.select().from(payments).where(eq(payments.id, id));
    if (!p) throw new HttpError(404, 'not_found');
    return p;
  }

  // ---- payments ----------------------------------------------------------
  app.get('/admin/payments', admin, async (req) => {
    const q = z.object({ status: z.enum(['pending', 'paid', 'rejected', 'refunded']).optional() }).parse(req.query);
    const rows = await app.db.select({ payment: payments, user: users }).from(payments)
      .innerJoin(users, eq(users.id, payments.userId))
      .where(q.status ? eq(payments.status, q.status) : undefined)
      .orderBy(desc(payments.createdAt), desc(payments.id))
      .limit(200);
    return { items: rows.map((r) => ({ ...paymentDto(r.payment), user: dto(r.user) })) };
  });

  app.post('/admin/payments/:id/approve', admin, async (req) => {
    const { id } = IdParam.parse(req.params);
    const r = await approvePayment(app.db, id, req.userId);
    if (!r) {
      await loadPayment(id); // yo'q bo'lsa — 404
      throw new HttpError(409, 'conflict', 'payment is not pending');
    }
    return { payment: paymentDto(r.payment), user: dto(r.user) };
  });

  app.post('/admin/payments/:id/reject', admin, async (req) => {
    const { id } = IdParam.parse(req.params);
    const { note } = z.object({ note: z.string().max(500).optional() }).parse(req.body ?? {});
    const [p] = await app.db.update(payments)
      .set({ status: 'rejected', reviewedBy: req.userId, note: note ?? null, updatedAt: new Date() })
      .where(and(eq(payments.id, id), eq(payments.status, 'pending')))
      .returning();
    if (!p) {
      await loadPayment(id);
      throw new HttpError(409, 'conflict', 'payment is not pending');
    }
    const suffix = note ? ` (${note})` : '';
    await notify(app.db, p.userId, {
      type: 'payment',
      titleKey: 'paymentRejected',
      body: {
        uz: `To'lovingiz rad etildi${suffix}.`,
        ru: `Ваш платёж отклонён${suffix}.`,
        kril: `Тўловингиз рад этилди${suffix}.`,
      },
    });
    return { payment: paymentDto(p) };
  });

  app.get('/admin/payments/:id/receipt', admin, async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    const p = await loadPayment(id);
    if (!p.receiptPath) throw new HttpError(404, 'not_found');
    const root = path.resolve(app.config.uploadDir);
    const file = path.resolve(root, p.receiptPath);
    const inside = (f: string, r: string) => f.startsWith(r + path.sep);
    if (!inside(file, root)) throw new HttpError(404, 'not_found');
    let real: string;
    try {
      real = await realpath(file);
      const st = await stat(real);
      if (!st.isFile()) throw new Error('not a file');
      // symlink orqali chiqib ketishning oldini olish
      if (!inside(real, await realpath(root))) throw new Error('outside');
    } catch {
      throw new HttpError(404, 'not_found');
    }
    const type = CONTENT_TYPES[path.extname(real).toLowerCase()] ?? 'application/octet-stream';
    return reply.header('content-type', type).header('cache-control', 'private, no-store').send(createReadStream(real));
  });

  // ---- settings ----------------------------------------------------------
  app.get('/admin/settings', admin, async () => ({ settings: await getSettings(app.db) }));

  app.put('/admin/settings', admin, async (req) => {
    const patch = SettingsPatch.parse(req.body ?? {});
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      await setSetting(app.db, key as SettingKey, value as AppSettings[SettingKey]);
    }
    return { settings: await getSettings(app.db) };
  });

  // ---- users -------------------------------------------------------------
  app.get('/admin/users', admin, async (req) => {
    const q = z.object({
      q: z.string().max(100).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(req.query);
    let where: SQL | undefined;
    const term = q.q?.trim();
    if (term) {
      const pat = `%${term.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
      const conds: SQL[] = [ilike(users.firstName, pat), ilike(users.lastName, pat), ilike(users.username, pat)];
      if (/^\d{1,15}$/.test(term)) conds.push(eq(users.tgId, Number(term)));
      where = or(...conds);
    }
    const rows = await app.db.select().from(users).where(where).orderBy(desc(users.id)).limit(q.limit).offset(q.offset);
    const [c] = await app.db.select({ n: count() }).from(users).where(where);
    return { items: rows.map(dto), total: Number(c?.n ?? 0) };
  });

  app.post('/admin/users/:id/pro', admin, async (req) => {
    const { id } = IdParam.parse(req.params);
    const { days } = z.object({ days: z.number().int().min(1).max(3650) }).parse(req.body);
    const [exists] = await app.db.select({ id: users.id }).from(users).where(eq(users.id, id));
    if (!exists) throw new HttpError(404, 'not_found');
    await grantPro(app.db, id, days);
    const [u] = await app.db.select().from(users).where(eq(users.id, id));
    return { user: dto(u!) };
  });

  // ---- stats -------------------------------------------------------------
  app.get('/admin/stats', admin, async () => {
    const now = new Date();
    const dayStart = new Date(`${tashkentDay(now)}T00:00:00+05:00`);
    const db = app.db;
    const [[u], [pro], [dau], [iq], rev] = await Promise.all([
      db.select({ n: count() }).from(users),
      db.select({ n: count() }).from(users).where(gt(users.proExpiresAt, now)),
      db.select({ n: count() }).from(users).where(gte(users.lastSeenAt, dayStart)),
      db.select({ n: count() }).from(iqSessions).where(gte(iqSessions.startedAt, dayStart)),
      db.select({ currency: payments.currency, total: sum(payments.amount) }).from(payments)
        .where(eq(payments.status, 'paid')).groupBy(payments.currency),
    ]);
    const revOf = (cur: string) => Number(rev.find((r) => r.currency === cur)?.total ?? 0);
    return {
      users: Number(u?.n ?? 0),
      proUsers: Number(pro?.n ?? 0),
      dau: Number(dau?.n ?? 0),
      iqTestsToday: Number(iq?.n ?? 0),
      revenue: { uzs: revOf('UZS'), stars: revOf('XTR') },
    };
  });

  // ---- broadcast ---------------------------------------------------------
  app.post('/admin/broadcast', admin, async (req) => {
    const body = z.object({
      type: z.enum(['daily', 'result', 'new', 'exam', 'payment', 'referral']),
      titleKey: z.string().min(1).max(64),
      body: z.strictObject({ uz: z.string().max(2000), ru: z.string().max(2000), kril: z.string().max(2000) }),
    }).parse(req.body);
    // Bitta INSERT ... SELECT — har foydalanuvchiga bitta bildirishnoma
    const res = await app.db.execute(sql`
      WITH ins AS (
        INSERT INTO notifications (user_id, type, title_key, body)
        SELECT id, ${body.type}, ${body.titleKey}, ${JSON.stringify(body.body)}::jsonb FROM users
        RETURNING 1
      )
      SELECT count(*)::int AS sent FROM ins`);
    // postgres-js massiv qaytaradi, PGlite — { rows }
    const rows = (Array.isArray(res) ? res : (res as unknown as { rows: unknown[] }).rows) as { sent: number | string }[];
    return { sent: Number(rows[0]?.sent ?? 0) };
  });
};
export default routes;
