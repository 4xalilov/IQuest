import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { HttpError } from '../app';
import { payments } from '../db/schema';
import { callBotApi } from '../lib/botApi';
import { PLAN_IDS, planPrices, planTitle, toPaymentDto, type PlanId } from '../services/payments';
import { getSettings } from '../services/settings';

const PlanBody = z.object({ plan: z.enum(PLAN_IDS) });

type FileKind = { ext: string; mime: string };

/** Fayl turini magic bytes bo'yicha aniqlaydi (kengaytmaga ishonilmaydi). */
export function sniffFile(buf: Buffer): FileKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (buf.length >= 5 && buf.toString('latin1', 0, 5) === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' };
  return null;
}
const MIME_ALIASES: Record<string, string> = { 'image/jpg': 'image/jpeg', 'image/pjpeg': 'image/jpeg' };

const routes: FastifyPluginAsync = async (app) => {
  const findPlan = async (plan: PlanId) => {
    const p = planPrices(await getSettings(app.db)).find((x) => x.id === plan);
    if (!p) throw new HttpError(400, 'validation', 'unknown plan');
    return p;
  };

  /** Tariflar (chegirma uzsFinal ga qo'llangan), chegirma va karta rekvizitlari. */
  app.get('/payments/plans', { preHandler: app.authenticate }, async () => {
    const s = await getSettings(app.db);
    const plans = planPrices(s);
    const applied = plans.some((p) => p.uzsFinal !== p.uzs);
    return { plans, discount: { ...s.discount, applied }, card: s.card };
  });

  /** Telegram Stars invoice havolasi. To'lov avval `pending` sifatida yoziladi. */
  app.post('/payments/stars/invoice', { preHandler: app.authenticate }, async (req) => {
    const { plan } = PlanBody.parse(req.body);
    const p = await findPlan(plan);
    const payload = randomUUID();
    const [payment] = await app.db.insert(payments).values({
      userId: req.userId, provider: 'stars', plan, amount: p.stars, currency: 'XTR', payload,
    }).returning();
    const title = `IQuest PRO — ${planTitle(plan)}`;
    try {
      const invoiceLink = await callBotApi<string>(app.config.botToken, 'createInvoiceLink', {
        title,
        description: `IQuest PRO obunasi: ${p.days} kun davomida barcha imkoniyatlar cheklovsiz.`,
        payload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: title, amount: p.stars }],
      });
      return { paymentId: payment!.id, invoiceLink };
    } catch (e) {
      req.log.error({ err: e, paymentId: payment!.id }, 'createInvoiceLink failed');
      await app.db.update(payments)
        .set({ status: 'rejected', note: `createInvoiceLink xatosi: ${(e as Error).message}`.slice(0, 500), updatedAt: new Date() })
        .where(eq(payments.id, payment!.id));
      throw new HttpError(502, 'bot_api');
    }
  });

  /** Karta orqali to'lov cheki (multipart: plan + file). */
  app.post('/payments/receipt', { preHandler: app.authenticate }, async (req) => {
    if (!req.isMultipart()) throw new HttpError(400, 'validation', 'multipart/form-data kutilgan');
    const fields: Record<string, string> = {};
    let file: { buf: Buffer; mimetype: string } | null = null;
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        const buf = await part.toBuffer();
        if (part.fieldname === 'file' && !file) file = { buf, mimetype: part.mimetype };
      } else if (typeof part.value === 'string') {
        fields[part.fieldname] = part.value;
      }
    }
    const { plan } = PlanBody.parse({ plan: fields.plan });
    if (!file || file.buf.length === 0) throw new HttpError(400, 'file_required');
    const kind = sniffFile(file.buf);
    const mime = MIME_ALIASES[file.mimetype] ?? file.mimetype;
    if (!kind || kind.mime !== mime) throw new HttpError(400, 'invalid_file', 'faqat jpg/png/webp/pdf');

    const [existing] = await app.db.select({ id: payments.id }).from(payments).where(and(
      eq(payments.userId, req.userId), eq(payments.provider, 'card_receipt'), eq(payments.status, 'pending'),
    ));
    if (existing) throw new HttpError(409, 'conflict', 'tekshirilayotgan chek allaqachon bor');

    const p = await findPlan(plan);
    const payload = randomUUID();
    const rel = path.posix.join('receipts', `${payload}.${kind.ext}`);
    const dir = path.join(app.config.uploadDir, 'receipts');
    const abs = path.join(app.config.uploadDir, rel);
    await mkdir(dir, { recursive: true });
    await writeFile(abs, file.buf);
    try {
      const [payment] = await app.db.insert(payments).values({
        userId: req.userId, provider: 'card_receipt', plan, amount: p.uzsFinal, currency: 'UZS', payload, receiptPath: rel,
      }).returning();
      return { payment: toPaymentDto(payment!) };
    } catch (e) {
      await unlink(abs).catch(() => {});
      throw e;
    }
  });

  /** Foydalanuvchining to'lovlari (yangi → eski, ≤ 50). */
  app.get('/payments/me', { preHandler: app.authenticate }, async (req) => {
    const rows = await app.db.select().from(payments).where(eq(payments.userId, req.userId))
      .orderBy(desc(payments.createdAt), desc(payments.id)).limit(50);
    return { items: rows.map(toPaymentDto) };
  });
};
export default routes;
