import type { Config } from '../config';
import type { users } from '../db/schema';
import { isPro } from '../services/pro';

export type UserRow = typeof users.$inferSelect;

/** Barcha route'lar foydalanuvchini shu shaklda qaytaradi (iquest-frontend bilan mos). */
export function toUserDto(u: UserRow, config: Config) {
  return {
    id: u.id,
    tgId: u.tgId,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    phone: u.phone,
    lang: u.lang,
    photoUrl: u.photoUrl,
    isPro: isPro(u),
    proExpiresAt: u.proExpiresAt ? u.proExpiresAt.toISOString() : null,
    referralCode: u.referralCode,
    xp: u.xp,
    isAdmin: config.adminTgIds.has(String(u.tgId)),
  };
}
