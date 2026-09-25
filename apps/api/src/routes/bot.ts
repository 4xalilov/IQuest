import type { FastifyPluginAsync } from 'fastify';
import { createHash, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { payments, users } from '../db/schema';
import { callBotApi } from '../lib/botApi';
import { markPaid } from '../services/payments';
import { LOGIN_PREFIX, claimAppLogin } from '../services/appLogin';
import { upsertTgUser } from './auth';

interface TgUpdate {
  update_id?: number;
  pre_checkout_query?: {
    id: string;
    from: { id: number };
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string; is_bot?: boolean };
    text?: string;
    successful_payment?: {
      currency: string;
      total_amount: number;
      invoice_payload: string;
      telegram_payment_charge_id: string;
    };
  };
}

/** Uzunlikni oshkor qilmaydigan konstant vaqtli solishtirish. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

const START_RE = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/;
const REF_RE = /^[A-Za-z0-9_-]{1,64}$/;

const routes: FastifyPluginAsync = async (app) => {
  const bot = <T = unknown>(method: string, params: Record<string, unknown>) =>
    callBotApi<T>(app.config.botToken, method, params);

  async function onPreCheckout(q: NonNullable<TgUpdate['pre_checkout_query']>) {
    const [p] = await app.db.select({ payment: payments, tgId: users.tgId }).from(payments)
      .innerJoin(users, eq(users.id, payments.userId))
      .where(eq(payments.payload, q.invoice_payload));
    const ok = !!p
      && p.payment.status === 'pending'
      && p.payment.provider === 'stars'
      && p.payment.currency === 'XTR'
      && q.currency === 'XTR'
      && p.payment.amount === q.total_amount
      && p.tgId === q.from.id;
    await bot('answerPreCheckoutQuery', ok
      ? { pre_checkout_query_id: q.id, ok: true }
      : { pre_checkout_query_id: q.id, ok: false, error_message: "To'lov topilmadi yoki muddati o'tgan. Iltimos, ilovadan qaytadan urinib ko'ring." });
  }

  async function onSuccessfulPayment(sp: NonNullable<NonNullable<TgUpdate['message']>['successful_payment']>) {
    const chargeId = sp.telegram_payment_charge_id;
    const [dup] = await app.db.select({ id: payments.id }).from(payments).where(eq(payments.telegramChargeId, chargeId));
    if (dup) return; // takroriy yetkazish — idempotent
    const [p] = await app.db.select().from(payments).where(eq(payments.payload, sp.invoice_payload));
    if (!p) {
      app.log.error({ chargeId, payload: sp.invoice_payload }, 'successful_payment: payment not found');
      return;
    }
    if (p.provider !== 'stars' || sp.currency !== 'XTR' || p.amount !== sp.total_amount) {
      app.log.error({ chargeId, paymentId: p.id }, 'successful_payment: amount/currency mismatch');
      return;
    }
    const res = await markPaid(app.db, p.id, { telegramChargeId: chargeId });
    if (!res) app.log.warn({ chargeId, paymentId: p.id, status: p.status }, 'successful_payment: payment not pending');
  }

  async function onStart(chatId: number, code?: string) {
    const url = new URL(app.config.webappUrl);
    if (code && REF_RE.test(code)) url.searchParams.set('ref', code);
    await bot('sendMessage', {
      chat_id: chatId,
      text: "Assalomu alaykum! IQuest'ga xush kelibsiz!\nIQ testlar va mashqlarni boshlash uchun quyidagi tugmani bosing.",
      reply_markup: { inline_keyboard: [[{ text: 'IQuestni ochish', web_app: { url: url.toString() } }]] },
    });
  }

  /** Android ilovadan kelgan "Telegram orqali kirish": nonce'ni shu Telegram foydalanuvchisiga bog'laydi. */
  async function onAppLogin(chatId: number, from: NonNullable<NonNullable<TgUpdate['message']>['from']>, nonce: string) {
    const { user } = await upsertTgUser(app.db, from);
    const ok = await claimAppLogin(app.db, nonce, user.id);
    await bot('sendMessage', {
      chat_id: chatId,
      text: ok
        ? "✅ Kirish tasdiqlandi. IQuest ilovasiga qayting — hisobingiz ochiladi."
        : "Bu kirish havolasi eskirgan yoki allaqachon ishlatilgan. Ilovada \"Telegram orqali kirish\" tugmasini qayta bosing.",
    });
  }

  app.post('/bot/webhook', { config: { rateLimit: false } }, async (req, reply) => {
    const secret = app.config.botWebhookSecret;
    const header = req.headers['x-telegram-bot-api-secret-token'];
    if (!secret || typeof header !== 'string' || !safeEqual(header, secret)) {
      return reply.code(401).send({ error: 'unauthorized' });
    }
    const u = (req.body ?? {}) as TgUpdate;
    try {
      if (u.pre_checkout_query) await onPreCheckout(u.pre_checkout_query);
      else if (u.message?.successful_payment) await onSuccessfulPayment(u.message.successful_payment);
      else if (u.message?.text) {
        const m = START_RE.exec(u.message.text.trim());
        if (m && m[1]?.startsWith(LOGIN_PREFIX) && u.message.from && !u.message.from.is_bot) await onAppLogin(u.message.chat.id, u.message.from, m[1].slice(LOGIN_PREFIX.length));
        else if (m) await onStart(u.message.chat.id, m[1]);
      }
    } catch (e) {
      req.log.error({ err: e, updateId: u.update_id }, 'bot webhook update failed');
    }
    return { ok: true };
  });
};
export default routes;
