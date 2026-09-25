import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { users } from '../db/schema';

export function isPro(u: { proExpiresAt: Date | null }, now = new Date()): boolean {
  return !!u.proExpiresAt && u.proExpiresAt.getTime() > now.getTime();
}

/** Pro muddatini uzaytiradi: max(hozir, joriy tugash sanasi) + days. Yangi tugash sanasini qaytaradi. */
export async function grantPro(db: Db, userId: number, days: number, now = new Date()): Promise<Date> {
  const [u] = await db.select({ proExpiresAt: users.proExpiresAt }).from(users).where(eq(users.id, userId));
  if (!u) throw new Error(`user ${userId} topilmadi`);
  const base = u.proExpiresAt && u.proExpiresAt > now ? u.proExpiresAt : now;
  const until = new Date(base.getTime() + days * 86_400_000);
  await db.update(users).set({ proExpiresAt: until }).where(eq(users.id, userId));
  return until;
}
