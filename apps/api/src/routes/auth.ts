import type { FastifyPluginAsync } from 'fastify';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { HttpError } from '../app';
import type { Db } from '../db/client';
import { users } from '../db/schema';
import { toUserDto } from '../lib/dto';
import { InitDataError, verifyInitData, type TgUser } from '../lib/telegram';
import { LOGIN_PREFIX, pollAppLogin, startAppLogin } from '../services/appLogin';
import { applyReferralCode } from '../services/referrals';
import { getSettings, toPublicSettings } from '../services/settings';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newReferralCode(): string {
  const b = randomBytes(6);
  return 'IQ' + [...b].map((x) => ALPHABET[x % ALPHABET.length]).join('');
}

function langFrom(code?: string): string {
  return code === 'ru' ? 'ru' : 'uz';
}

/** Telegram foydalanuvchisini yaratadi yoki yangilaydi. created=true — birinchi kirish. */
export async function upsertTgUser(db: Db, tg: TgUser): Promise<{ user: typeof users.$inferSelect; created: boolean }> {
  const [existing] = await db.select().from(users).where(eq(users.tgId, tg.id));
  if (existing) {
    const [u] = await db.update(users).set({
      username: tg.username ?? existing.username,
      photoUrl: tg.photo_url ?? existing.photoUrl,
      lastSeenAt: new Date(),
    }).where(eq(users.id, existing.id)).returning();
    return { user: u!, created: false };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const inserted = await db.insert(users).values({
      tgId: tg.id,
      username: tg.username ?? null,
      firstName: tg.first_name ?? '',
      lastName: tg.last_name ?? '',
      photoUrl: tg.photo_url ?? null,
      lang: langFrom(tg.language_code),
      referralCode: newReferralCode(),
    }).onConflictDoNothing().returning();
    if (inserted[0]) return { user: inserted[0], created: true };
    const [raced] = await db.select().from(users).where(eq(users.tgId, tg.id));
    if (raced) return { user: raced, created: false };
  }
  throw new Error('referral code collision');
}

const routes: FastifyPluginAsync = async (app) => {
  const issue = async (user: typeof users.$inferSelect) => ({
    token: app.jwt.sign({ uid: user.id, tg: user.tgId }),
    user: toUserDto(user, app.config),
    settings: toPublicSettings(await getSettings(app.db)),
  });

  /** Telegram Mini App kirishi. start_param — referal kodi (ixtiyoriy). */
  app.post('/auth/telegram', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
    const body = z.object({ initData: z.string().min(1), ref: z.string().max(32).optional() }).parse(req.body);
    let data;
    try {
      data = verifyInitData(body.initData, app.config.botToken, app.config.initDataMaxAgeSec);
    } catch (e) {
      if (e instanceof InitDataError) throw new HttpError(401, 'invalid_init_data', e.message);
      throw e;
    }
    const { user, created } = await upsertTgUser(app.db, data.user);
    const ref = data.startParam ?? body.ref;
    if (created && ref) await applyReferralCode(app.db, user.id, ref);
    return issue(user);
  });

  /** Android ilova: bot orqali kirishni boshlash. botLink'ni Telegram'da ochish kerak. */
  app.post('/auth/app/start', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async () => {
    const { nonce, expiresAt } = await startAppLogin(app.db);
    return { nonce, expiresAt: expiresAt.toISOString(), botLink: `https://t.me/${app.config.botUsername}?start=${LOGIN_PREFIX}${nonce}` };
  });

  /** Android ilova: har 2–3 soniyada so'raladi. status: pending | expired (410) | ok (+ token, user, settings). */
  app.post('/auth/app/poll', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { nonce } = z.object({ nonce: z.string().max(64) }).parse(req.body);
    const r = await pollAppLogin(app.db, nonce);
    if (r.status === 'pending') return { status: 'pending' };
    if (r.status === 'expired') return reply.code(410).send({ error: 'expired' });
    const [user] = await app.db.select().from(users).where(eq(users.id, r.userId));
    if (!user) return reply.code(410).send({ error: 'expired' });
    return { status: 'ok', ...(await issue(user)) };
  });

  /** Faqat dev/test: Telegram'siz brauzerda sinash uchun. Production'da o'chiq. */
  if (app.config.env !== 'production') {
    app.post('/auth/dev', async (req) => {
      const body = z.object({ tgId: z.number().int().positive(), firstName: z.string().default('Dev'), ref: z.string().optional() }).parse(req.body);
      const { user, created } = await upsertTgUser(app.db, { id: body.tgId, first_name: body.firstName });
      if (created && body.ref) await applyReferralCode(app.db, user.id, body.ref);
      return issue(user);
    });
  }
};
export default routes;
