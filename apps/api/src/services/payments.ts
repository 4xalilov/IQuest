/**
 * To'lovlar uchun umumiy mantiq (routes/payments.ts, routes/bot.ts, routes/admin.ts).
 *
 * Eksport qilinadigan API:
 *   - `PLAN_IDS`, `type PlanId`                    — 'week' | 'month1' | 'month2'
 *   - `isDiscountActive(discount, now?)`           — chegirma hozir amal qiladimi (Toshkent sanasi bo'yicha)
 *   - `planPrices(settings, now?)`                 — [{ id, days, uzs, uzsFinal, stars }] (chegirma faqat uzsFinal ga)
 *   - `planTitle(plan)`                            — o'zbekcha nom: "1 haftalik" | "1 oylik" | "2 oylik"
 *   - `toPaymentDto(p)`                            — foydalanuvchiga qaytariladigan shakl (receiptPath/payload ichki)
 *   - `markPaid(db, paymentId, opts?)`             — pending → paid + grantPro(plans[plan].days) + notify(type:'payment')
 *
 * markPaid(db, paymentId, { telegramChargeId?, reviewedBy?, note?, now? })
 *   → Promise<{ payment: PaymentRow; user: UserRow; proExpiresAt: Date } | null>
 *   Provayderdan qat'i nazar ishlaydi (stars / card_receipt). Holat o'tishi atomar:
 *   `UPDATE payments SET status='paid' ... WHERE id=? AND status='pending' RETURNING *` — hammasi bitta tranzaksiyada.
 *   To'lov topilmasa yoki allaqachon pending emas bo'lsa — null (Pro qayta berilmaydi). `user` — xom UserRow
 *   (Pro muddati yangilangan); API javobi uchun `toUserDto(user, config)` dan o'tkazing.
 */
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { payments, users } from '../db/schema';
import type { UserRow } from '../lib/dto';
import { notify } from './notify';
import { grantPro } from './pro';
import { getSettings, type AppSettings } from './settings';
import { tashkentDay } from './usage';

export type PaymentRow = typeof payments.$inferSelect;
export const PLAN_IDS = ['week', 'month1', 'month2'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

const PLAN_TITLES: Record<PlanId, string> = { week: '1 haftalik', month1: '1 oylik', month2: '2 oylik' };

export function planTitle(plan: string): string {
  return PLAN_TITLES[plan as PlanId] ?? plan;
}

/** Chegirma faol va endDate (YYYY-MM-DD, Toshkent) hali o'tmagan bo'lsa — true. */
export function isDiscountActive(d: AppSettings['discount'], now = new Date()): boolean {
  if (!d?.active || !(d.percent > 0)) return false;
  if (!d.endDate) return true;
  return String(d.endDate).slice(0, 10) >= tashkentDay(now);
}

export function planPrices(s: AppSettings, now = new Date()) {
  const active = isDiscountActive(s.discount, now);
  const pct = Math.min(100, Math.max(0, s.discount?.percent ?? 0));
  return PLAN_IDS.filter((id) => s.plans[id]).map((id) => {
    const p = s.plans[id];
    return {
      id,
      days: p.days,
      uzs: p.uzs,
      uzsFinal: active ? Math.round((p.uzs * (100 - pct)) / 100) : p.uzs,
      stars: p.stars,
    };
  });
}

export function toPaymentDto(p: PaymentRow) {
  return {
    id: p.id,
    provider: p.provider,
    plan: p.plan,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    note: p.note,
    hasReceipt: !!p.receiptPath,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export interface MarkPaidOpts {
  /** Telegram Stars: successful_payment.telegram_payment_charge_id (unique). */
  telegramChargeId?: string;
  /** Admin tasdiqlasa — admin users.id. */
  reviewedBy?: number;
  note?: string;
  now?: Date;
}

export async function markPaid(
  db: Db,
  paymentId: number,
  opts: MarkPaidOpts = {},
): Promise<{ payment: PaymentRow; user: UserRow; proExpiresAt: Date } | null> {
  const now = opts.now ?? new Date();
  const settings = await getSettings(db);
  return db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    const set: Partial<typeof payments.$inferInsert> = { status: 'paid', updatedAt: now };
    if (opts.telegramChargeId !== undefined) set.telegramChargeId = opts.telegramChargeId;
    if (opts.reviewedBy !== undefined) set.reviewedBy = opts.reviewedBy;
    if (opts.note !== undefined) set.note = opts.note;
    const [payment] = await t.update(payments).set(set)
      .where(and(eq(payments.id, paymentId), eq(payments.status, 'pending')))
      .returning();
    if (!payment) return null;
    const plan = settings.plans[payment.plan as PlanId];
    if (!plan) throw new Error(`payment ${payment.id}: noma'lum tarif ${payment.plan}`);
    const until = await grantPro(t, payment.userId, plan.days, now);
    await notify(t, payment.userId, {
      type: 'payment',
      titleKey: 'notifPayment',
      body: {
        uz: `To'lov qabul qilindi. IQuest PRO ${plan.days} kunga faollashtirildi.`,
        ru: `Оплата получена. IQuest PRO активирован на ${plan.days} дн.`,
        kril: `Тўлов қабул қилинди. IQuest PRO ${plan.days} кунга фаоллаштирилди.`,
      },
    });
    const [user] = await t.select().from(users).where(eq(users.id, payment.userId));
    return { payment, user: user!, proExpiresAt: until };
  });
}
