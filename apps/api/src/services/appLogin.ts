import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import type { Db } from '../db/client';
import { appLogins } from '../db/schema';

export const APP_LOGIN_TTL_MS = 10 * 60_000;
export const LOGIN_PREFIX = 'login_';
/** base64url, 32 belgi — Telegram start parametri (≤64, [A-Za-z0-9_-]) ga sig'adi. */
export const NONCE_RE = /^[A-Za-z0-9_-]{32}$/;

const hash = (nonce: string) => createHash('sha256').update(nonce).digest('hex');

export async function startAppLogin(db: Db, now = new Date()): Promise<{ nonce: string; expiresAt: Date }> {
  const nonce = randomBytes(24).toString('base64url');
  const expiresAt = new Date(now.getTime() + APP_LOGIN_TTL_MS);
  await db.delete(appLogins).where(lt(appLogins.expiresAt, now)); // eskilarini tozalash
  await db.insert(appLogins).values({ nonceHash: hash(nonce), expiresAt, createdAt: now });
  return { nonce, expiresAt };
}

/** Bot /start login_<nonce> kelganda: nonce'ni foydalanuvchiga bog'laydi (bir marta). */
export async function claimAppLogin(db: Db, nonce: string, userId: number, now = new Date()): Promise<boolean> {
  if (!NONCE_RE.test(nonce)) return false;
  const rows = await db.update(appLogins).set({ userId, claimedAt: now })
    .where(and(eq(appLogins.nonceHash, hash(nonce)), isNull(appLogins.claimedAt), gt(appLogins.expiresAt, now)))
    .returning({ nonceHash: appLogins.nonceHash });
  return rows.length > 0;
}

export type PollResult = { status: 'pending' } | { status: 'expired' } | { status: 'ok'; userId: number };

/** Ilova so'rovi: tasdiqlangan bo'lsa bir martalik userId qaytaradi (keyin nonce yaroqsiz). */
export async function pollAppLogin(db: Db, nonce: string, now = new Date()): Promise<PollResult> {
  if (!NONCE_RE.test(nonce)) return { status: 'expired' };
  const [row] = await db.select().from(appLogins).where(eq(appLogins.nonceHash, hash(nonce)));
  if (!row || row.consumedAt || row.expiresAt <= now) return { status: 'expired' };
  if (!row.userId) return { status: 'pending' };
  const done = await db.update(appLogins).set({ consumedAt: now })
    .where(and(eq(appLogins.nonceHash, row.nonceHash), isNull(appLogins.consumedAt)))
    .returning({ userId: appLogins.userId });
  return done[0]?.userId ? { status: 'ok', userId: done[0].userId } : { status: 'expired' };
}
