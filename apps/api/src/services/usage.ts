import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { dailyUsage } from '../db/schema';

export type UsageKind = 'practice_questions' | 'iq_tests';

/** Kun chegarasi — Toshkent vaqti (UTC+5). YYYY-MM-DD. */
export function tashkentDay(now = new Date()): string {
  return new Date(now.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
}

export async function getUsage(db: Db, userId: number, kind: UsageKind, now = new Date()): Promise<number> {
  const [r] = await db.select({ count: dailyUsage.count }).from(dailyUsage)
    .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.day, tashkentDay(now)), eq(dailyUsage.kind, kind)));
  return r?.count ?? 0;
}

/** Hisoblagichni oshiradi va yangi qiymatni qaytaradi. */
export async function incUsage(db: Db, userId: number, kind: UsageKind, by = 1, now = new Date()): Promise<number> {
  const [r] = await db.insert(dailyUsage).values({ userId, day: tashkentDay(now), kind, count: by })
    .onConflictDoUpdate({ target: [dailyUsage.userId, dailyUsage.day, dailyUsage.kind], set: { count: sql`${dailyUsage.count} + ${by}` } })
    .returning({ count: dailyUsage.count });
  return r!.count;
}
