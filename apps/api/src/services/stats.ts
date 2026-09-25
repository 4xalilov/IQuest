import { sql } from 'drizzle-orm';
import { results } from '../db/schema';
import { tashkentDay } from './usage';

const DAY_MS = 86_400_000;
const TZ_OFFSET_MS = 5 * 3_600_000; // Asia/Tashkent = UTC+5 (DST yo'q)

/** YYYY-MM-DD Toshkent kunining boshlanishi (UTC Date). */
export function tashkentDayStart(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - TZ_OFFSET_MS);
}

/** YYYY-MM-DD ga n kun qo'shadi (manfiy ham bo'lishi mumkin). */
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Davr boshlanishi — bugungi Toshkent kunini ham qo'shib, oxirgi `days` kun.
 * days = null → cheklovsiz (null qaytaradi).
 */
export function periodStart(days: number | null, now = new Date()): Date | null {
  if (days === null) return null;
  return tashkentDayStart(addDays(tashkentDay(now), -(days - 1)));
}

/** results.created_at → Toshkent sanasi (YYYY-MM-DD), sessiya timezone'iga bog'liq emas. */
export const resultTashkentDay = sql<string>`to_char((${results.createdAt} AT TIME ZONE 'UTC') + interval '5 hours', 'YYYY-MM-DD')`;

/** Faol kunlar (o'sish tartibida) bo'yicha joriy va eng uzun ketma-ketlik. */
export function computeStreaks(activeDays: string[], today: string): { current: number; best: number } {
  const set = new Set(activeDays);
  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) { current++; cursor = addDays(cursor, -1); }
  return { current, best };
}

/** "Ali Valiyev" → "Ali V." ; familiya bo'lmasa — faqat ism. */
export function displayName(firstName: string, lastName: string): string {
  const f = firstName.trim();
  const l = lastName.trim();
  if (!l) return f;
  return `${f} ${[...l][0]!.toUpperCase()}.`.trim();
}

/** Ism bosh harflari (1–2 ta, katta harf). */
export function initials(firstName: string, lastName: string): string {
  const a = [...firstName.trim()][0] ?? '';
  const b = [...lastName.trim()][0] ?? '';
  return (a + b).toUpperCase() || '?';
}
