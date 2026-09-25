import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface VerifiedInitData {
  user: TgUser;
  authDate: number;          // unix soniya
  startParam: string | null; // t.me/bot?startapp=... (referal kodi)
}

export class InitDataError extends Error {}

/**
 * Telegram Mini App initData imzosini tekshiradi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData: string, botToken: string, maxAgeSec: number, nowSec = Math.floor(Date.now() / 1000)): VerifiedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new InitDataError('hash yo\'q');
  params.delete('hash');
  const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new InitDataError('imzo noto\'g\'ri');

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) throw new InitDataError('auth_date yo\'q');
  if (maxAgeSec > 0 && nowSec - authDate > maxAgeSec) throw new InitDataError('initData eskirgan');

  const rawUser = params.get('user');
  if (!rawUser) throw new InitDataError('user yo\'q');
  let user: TgUser;
  try { user = JSON.parse(rawUser) as TgUser; } catch { throw new InitDataError('user JSON emas'); }
  if (typeof user.id !== 'number') throw new InitDataError('user.id yo\'q');

  return { user, authDate, startParam: params.get('start_param') };
}

/** Testlar va dev uchun: berilgan maydonlardan imzolangan initData yasaydi. */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const params = new URLSearchParams(fields);
  const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', createHmac('sha256', secret).update(checkString).digest('hex'));
  return params.toString();
}
