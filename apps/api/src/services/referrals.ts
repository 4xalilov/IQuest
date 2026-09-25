import type { Db } from '../db/client';

/**
 * Yangi foydalanuvchiga referal kodini qo'llaydi (faqat birinchi kirishda chaqiriladi).
 * Noto'g'ri/o'z kodi bo'lsa jim o'tadi. Milestone'ga yetsa taklif qiluvchiga Pro beriladi.
 * TODO(agent: users+referrals) — amalga oshiriladi.
 */
export async function applyReferralCode(_db: Db, _newUserId: number, _code: string): Promise<void> {}
