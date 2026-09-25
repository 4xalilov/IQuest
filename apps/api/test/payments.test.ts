import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { payments } from '../src/db/schema';
import { DEFAULT_SETTINGS, deleteSetting, setSetting } from '../src/services/settings';
import { tashkentDay } from '../src/services/usage';
import { TEST_BOT_TOKEN, login, makeTestApp, type TestCtx } from './helpers';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);

function multipart(fields: Record<string, string>, file?: { name: string; type: string; data: Buffer }) {
  const boundary = '----iquestTestBoundary' + Math.random().toString(16).slice(2);
  const chunks: Buffer[] = [];
  for (const [k, v] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  if (file) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`));
    chunks.push(file.data, Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

function tgOk(result: unknown) {
  return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('payments', () => {
  let t: TestCtx;
  beforeAll(async () => { t = await makeTestApp(); });
  afterAll(async () => {
    // Faqat shu test yaratgan fayllarni o'chiramiz (UPLOAD_DIR boshqa test fayllari bilan umumiy bo'lishi mumkin).
    const rows = await t.db.select({ receiptPath: payments.receiptPath }).from(payments);
    for (const r of rows) if (r.receiptPath) await rm(path.join(t.config.uploadDir, r.receiptPath), { force: true });
    await t.close();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('auth talab qilinadi', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/payments/plans' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /payments/plans — chegirmasiz', async () => {
    const { auth } = await login(t.app, 101);
    const res = await t.app.inject({ method: 'GET', url: '/payments/plans', headers: auth });
    expect(res.statusCode).toBe(200);
    const b = res.json();
    expect(b.plans).toEqual([
      { id: 'week', days: 7, uzs: 9900, uzsFinal: 9900, stars: 50 },
      { id: 'month1', days: 30, uzs: 29900, uzsFinal: 29900, stars: 150 },
      { id: 'month2', days: 60, uzs: 49900, uzsFinal: 49900, stars: 250 },
    ]);
    expect(b.discount.applied).toBe(false);
    expect(b.card).toEqual(DEFAULT_SETTINGS.card);
  });

  it('GET /payments/plans — faol chegirma uzsFinal ga qo\'llanadi, stars emas', async () => {
    const { auth } = await login(t.app, 101);
    await setSetting(t.db, 'discount', { active: true, percent: 15, label: 'Kuz', endDate: tashkentDay(), code: '' });
    const b = (await t.app.inject({ method: 'GET', url: '/payments/plans', headers: auth })).json();
    const m1 = b.plans.find((p: { id: string }) => p.id === 'month1');
    expect(m1).toEqual({ id: 'month1', days: 30, uzs: 29900, uzsFinal: Math.round(29900 * 0.85), stars: 150 });
    expect(b.discount).toMatchObject({ active: true, percent: 15, applied: true });

    // endDate o'tgan — qo'llanmaydi
    await setSetting(t.db, 'discount', { active: true, percent: 15, label: 'Kuz', endDate: '2020-01-01', code: '' });
    const b2 = (await t.app.inject({ method: 'GET', url: '/payments/plans', headers: auth })).json();
    expect(b2.plans[1].uzsFinal).toBe(29900);
    expect(b2.discount.applied).toBe(false);

    // endDate null — muddatsiz
    await setSetting(t.db, 'discount', { active: true, percent: 10, label: '', endDate: null, code: '' });
    const b3 = (await t.app.inject({ method: 'GET', url: '/payments/plans', headers: auth })).json();
    expect(b3.plans[0].uzsFinal).toBe(8910);
    await deleteSetting(t.db, 'discount');
  });

  it('POST /payments/stars/invoice — pending yozadi va havola qaytaradi', async () => {
    const { auth, user } = await login(t.app, 102);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(tgOk('https://t.me/$abc'));
    const res = await t.app.inject({ method: 'POST', url: '/payments/stars/invoice', headers: auth, payload: { plan: 'month1' } });
    expect(res.statusCode).toBe(200);
    const b = res.json();
    expect(b.invoiceLink).toBe('https://t.me/$abc');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe(`https://api.telegram.org/bot${TEST_BOT_TOKEN}/createInvoiceLink`);
    const sent = JSON.parse(String((init as RequestInit).body));
    expect(sent).toMatchObject({ title: 'IQuest PRO — 1 oylik', currency: 'XTR', provider_token: '', prices: [{ amount: 150 }] });

    const [p] = await t.db.select().from(payments).where(eq(payments.id, b.paymentId));
    expect(p).toMatchObject({ userId: user.id, provider: 'stars', plan: 'month1', amount: 150, currency: 'XTR', status: 'pending', payload: sent.payload });
  });

  it('POST /payments/stars/invoice — noma\'lum tarif 400', async () => {
    const { auth } = await login(t.app, 102);
    const res = await t.app.inject({ method: 'POST', url: '/payments/stars/invoice', headers: auth, payload: { plan: 'year' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /payments/stars/invoice — Bot API xatosi 502 va to\'lov rejected', async () => {
    const { auth, user } = await login(t.app, 103);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, description: 'Bad Request: boom' }), { status: 400 }),
    );
    const res = await t.app.inject({ method: 'POST', url: '/payments/stars/invoice', headers: auth, payload: { plan: 'week' } });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe('bot_api');
    const rows = await t.db.select().from(payments).where(eq(payments.userId, user.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('rejected');
    expect(rows[0]!.note).toContain('boom');
  });

  it('POST /payments/receipt — PNG qabul qilinadi, faylga yoziladi; ikkinchisi 409', async () => {
    const { auth, user } = await login(t.app, 104);
    await setSetting(t.db, 'discount', { active: true, percent: 50, label: '', endDate: null, code: '' });
    const mp = multipart({ plan: 'week' }, { name: 'chek.png', type: 'image/png', data: PNG });
    const res = await t.app.inject({ method: 'POST', url: '/payments/receipt', headers: { ...auth, ...mp.headers }, payload: mp.payload });
    expect(res.statusCode).toBe(200);
    const { payment } = res.json();
    expect(payment).toMatchObject({ provider: 'card_receipt', plan: 'week', amount: 4950, currency: 'UZS', status: 'pending', hasReceipt: true });
    await deleteSetting(t.db, 'discount');

    const [row] = await t.db.select().from(payments).where(eq(payments.id, payment.id));
    expect(row!.userId).toBe(user.id);
    expect(row!.receiptPath).toBe(`receipts/${row!.payload}.png`);
    expect(existsSync(path.join(t.config.uploadDir, row!.receiptPath!))).toBe(true);

    const mp2 = multipart({ plan: 'month1' }, { name: 'b.png', type: 'image/png', data: PNG });
    const res2 = await t.app.inject({ method: 'POST', url: '/payments/receipt', headers: { ...auth, ...mp2.headers }, payload: mp2.payload });
    expect(res2.statusCode).toBe(409);

    const me = (await t.app.inject({ method: 'GET', url: '/payments/me', headers: auth })).json();
    expect(me.items).toHaveLength(1);
    expect(me.items[0]).toMatchObject({ id: payment.id, status: 'pending' });
    expect(me.items[0].receiptPath).toBeUndefined();
  });

  it('POST /payments/receipt — soxta fayl, noto\'g\'ri mimetype, faylsiz, noma\'lum tarif rad etiladi', async () => {
    const { auth, user } = await login(t.app, 105);
    const send = (mp: ReturnType<typeof multipart>) =>
      t.app.inject({ method: 'POST', url: '/payments/receipt', headers: { ...auth, ...mp.headers }, payload: mp.payload });

    const fake = await send(multipart({ plan: 'week' }, { name: 'x.png', type: 'image/png', data: Buffer.from('not really a png at all') }));
    expect(fake.statusCode).toBe(400);
    expect(fake.json().error).toBe('invalid_file');

    const wrongMime = await send(multipart({ plan: 'week' }, { name: 'x.pdf', type: 'application/pdf', data: PNG }));
    expect(wrongMime.statusCode).toBe(400);

    const noFile = await send(multipart({ plan: 'week' }));
    expect(noFile.statusCode).toBe(400);

    const badPlan = await send(multipart({ plan: 'year' }, { name: 'x.png', type: 'image/png', data: PNG }));
    expect(badPlan.statusCode).toBe(400);

    const pdf = await send(multipart({ plan: 'month2' }, { name: 'c.bin', type: 'application/pdf', data: Buffer.from('%PDF-1.4\n%...') }));
    expect(pdf.statusCode).toBe(200);
    const rows = await t.db.select().from(payments).where(eq(payments.userId, user.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.receiptPath).toMatch(/\.pdf$/);
  });

  it('GET /payments/me — faqat o\'z to\'lovlari', async () => {
    const { auth } = await login(t.app, 106);
    const res = await t.app.inject({ method: 'GET', url: '/payments/me', headers: auth });
    expect(res.json()).toEqual({ items: [] });
  });
});
