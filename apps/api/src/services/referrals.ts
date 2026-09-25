import { and, count, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { referralRewards, referrals, users } from '../db/schema';
import { notify } from './notify';
import { grantPro } from './pro';
import { getSettings } from './settings';

/**
 * Yangi foydalanuvchiga referal kodini qo'llaydi (faqat birinchi kirishda chaqiriladi).
 * Noto'g'ri/o'z kodi bo'lsa jim o'tadi. Milestone'ga yetsa taklif qiluvchiga Pro beriladi.
 * Idempotent: referrals.referredId unique, referralRewards (userId, milestone) — PK.
 */
export async function applyReferralCode(db: Db, newUserId: number, code: string): Promise<void> {
  const norm = code.trim().toUpperCase();
  if (!norm || norm.length > 32) return;
  const [referrer] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, norm));
  if (!referrer || referrer.id === newUserId) return;

  // Bir foydalanuvchi faqat bir marta taklif qilinadi
  const inserted = await db.insert(referrals).values({ referrerId: referrer.id, referredId: newUserId })
    .onConflictDoNothing().returning({ id: referrals.id });
  if (!inserted[0]) return;
  await db.update(users).set({ referredBy: referrer.id }).where(and(eq(users.id, newUserId), isNull(users.referredBy)));

  const [c] = await db.select({ n: count() }).from(referrals).where(eq(referrals.referrerId, referrer.id));
  const invited = Number(c?.n ?? 0);
  const { referralMilestones } = await getSettings(db);
  for (const m of [...referralMilestones].sort((a, b) => a.count - b.count)) {
    if (m.count > invited) break;
    await db.transaction(async (tx) => {
      const r = await tx.insert(referralRewards).values({ userId: referrer.id, milestone: m.count, days: m.days })
        .onConflictDoNothing().returning({ milestone: referralRewards.milestone });
      if (!r[0]) return; // bu milestone allaqachon berilgan
      await grantPro(tx as unknown as Db, referrer.id, m.days);
      await notify(tx as unknown as Db, referrer.id, {
        type: 'referral',
        titleKey: 'referral',
        body: {
          uz: `${m.count} ta do'stingizni taklif qildingiz — ${m.days} kun Pro sovg'a!`,
          ru: `Вы пригласили ${m.count} друзей — ${m.days} дн. Pro в подарок!`,
          kril: `${m.count} та дўстингизни таклиф қилдингиз — ${m.days} кун Pro совға!`,
        },
      });
    });
  }
}
