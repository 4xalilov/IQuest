import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { notifications, payments, users } from '../src/db/schema';
import { markPaid } from '../src/services/payments';
import { TEST_BOT_TOKEN, login, makeTestApp, type TestCtx } from './helpers';

const SECRET = { 'x-telegram-bot-api-secret-token': 'hook-secret' };

function tgOk(result: unknown = true) {
  return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { 'content-type': 'application/json' } });
}
function mockFetch() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => tgOk());
}
function calls(spy: ReturnType<typeof mockFetch>) {
  return spy.mock.calls.map(([url, init]) => ({
    method: String(url).replace(`https://api.telegram.org/bot${TEST_BOT_TOKEN}/`, ''),
    body: JSON.parse(String((init as RequestInit).body)),
  }));
}

describe('/bot/webhook', () => {
  let t: TestCtx;
  beforeAll(async () => { t = await makeTestApp(); });
  afterAll(async () => { await t.close(); });
  afterEach(() => { vi.restoreAllMocks(); });

  const hook = (payload: unknown, headers: Record<string, string> = SECRET) =>
    t.app.inject({ method: 'POST', url: '/bot/webhook', headers, payload: payload as object });

  async function starsPayment(tgId: number, plan = 'month1', amount = 150) {
    const { user } = await login(t.app, tgId);
    const payload = `pl-${tgId}-${Math.random().toString(36).slice(2)}`;
    const [p] = await t.db.insert(payments).values({ userId: user.id, provider: 'stars', plan, amount, currency: 'XTR', payload }).returning();
    return { user, payment: p! };
  }

  it('secret noto\'g\'ri yoki yo\'q — 401', async () => {
    const spy = mockFetch();
    expect((await hook({ update_id: 1 }, {})).statusCode).toBe(401);
    expect((await hook({ update_id: 1 }, { 'x-telegram-bot-api-secret-token': 'wrong' })).statusCode).toBe(401);
    expect((await hook({ update_id: 1 }, { 'x-telegram-bot-api-secret-token': 'hook-secre' })).statusCode).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('BOT_WEBHOOK_SECRET bo\'sh bo\'lsa — hammasi 401', async () => {
    const t2 = await makeTestApp({ BOT_WEBHOOK_SECRET: '' });
    try {
      const res = await t2.app.inject({ method: 'POST', url: '/bot/webhook', headers: { 'x-telegram-bot-api-secret-token': '' }, payload: { update_id: 1 } });
      expect(res.statusCode).toBe(401);
    } finally { await t2.close(); }
  });

  it('noma\'lum update — 200 ok', async () => {
    const spy = mockFetch();
    const res = await hook({ update_id: 2, edited_message: { text: 'x' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(spy).not.toHaveBeenCalled();
  });

  it('pre_checkout_query — pending va summa mos bo\'lsa ok:true', async () => {
    const { payment } = await starsPayment(301);
    const spy = mockFetch();
    const res = await hook({ update_id: 3, pre_checkout_query: { id: 'q1', from: { id: 301 }, currency: 'XTR', total_amount: 150, invoice_payload: payment.payload } });
    expect(res.statusCode).toBe(200);
    expect(calls(spy)).toEqual([{ method: 'answerPreCheckoutQuery', body: { pre_checkout_query_id: 'q1', ok: true } }]);
  });

  it('pre_checkout_query — summa noto\'g\'ri / topilmadi / pending emas / boshqa foydalanuvchi — ok:false', async () => {
    const { payment } = await starsPayment(302);
    const spy = mockFetch();
    await hook({ pre_checkout_query: { id: 'a', from: { id: 302 }, currency: 'XTR', total_amount: 1, invoice_payload: payment.payload } });
    await hook({ pre_checkout_query: { id: 'b', from: { id: 302 }, currency: 'XTR', total_amount: 150, invoice_payload: 'nope' } });
    await hook({ pre_checkout_query: { id: 'c', from: { id: 999999 }, currency: 'XTR', total_amount: 150, invoice_payload: payment.payload } });
    await t.db.update(payments).set({ status: 'rejected' }).where(eq(payments.id, payment.id));
    await hook({ pre_checkout_query: { id: 'd', from: { id: 302 }, currency: 'XTR', total_amount: 150, invoice_payload: payment.payload } });
    const c = calls(spy);
    expect(c.map((x) => [x.body.pre_checkout_query_id, x.body.ok])).toEqual([['a', false], ['b', false], ['c', false], ['d', false]]);
    for (const x of c) {
      expect(x.method).toBe('answerPreCheckoutQuery');
      expect(typeof x.body.error_message).toBe('string');
    }
  });

  it('successful_payment — Pro bir marta beriladi (takroriy yetkazishda ham)', async () => {
    const { user, payment } = await starsPayment(303, 'month1', 150);
    const spy = mockFetch();
    const update = {
      update_id: 10,
      message: {
        chat: { id: 303 }, from: { id: 303 },
        successful_payment: { currency: 'XTR', total_amount: 150, invoice_payload: payment.payload, telegram_payment_charge_id: 'ch-303' },
      },
    };
    const before = Date.now();
    expect((await hook(update)).statusCode).toBe(200);
    const [u1] = await t.db.select().from(users).where(eq(users.id, user.id));
    const exp1 = u1!.proExpiresAt!.getTime();
    expect(exp1).toBeGreaterThanOrEqual(before + 30 * 86_400_000 - 1000);
    expect(exp1).toBeLessThanOrEqual(Date.now() + 30 * 86_400_000 + 1000);

    const r2 = await hook(update);
    expect(r2.statusCode).toBe(200);
    expect(r2.json()).toEqual({ ok: true });
    const [u2] = await t.db.select().from(users).where(eq(users.id, user.id));
    expect(u2!.proExpiresAt!.getTime()).toBe(exp1);

    const [p] = await t.db.select().from(payments).where(eq(payments.id, payment.id));
    expect(p).toMatchObject({ status: 'paid', telegramChargeId: 'ch-303' });
    const notes = await t.db.select().from(notifications).where(eq(notifications.userId, user.id));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ type: 'payment', titleKey: 'notifPayment' });
    expect(Object.keys(notes[0]!.body as object).sort()).toEqual(['kril', 'ru', 'uz']);
    expect(spy).not.toHaveBeenCalled();
  });

  it('successful_payment — summa mos kelmasa Pro berilmaydi', async () => {
    const { user, payment } = await starsPayment(304);
    const res = await hook({ message: { chat: { id: 304 }, successful_payment: { currency: 'XTR', total_amount: 1, invoice_payload: payment.payload, telegram_payment_charge_id: 'ch-304' } } });
    expect(res.statusCode).toBe(200);
    const [u] = await t.db.select().from(users).where(eq(users.id, user.id));
    expect(u!.proExpiresAt).toBeNull();
  });

  it('markPaid — parallel chaqiruvda faqat bittasi muvaffaqiyatli', async () => {
    const { user, payment } = await starsPayment(305, 'week', 50);
    const [a, b] = await Promise.all([markPaid(t.db, payment.id, { reviewedBy: 1 }), markPaid(t.db, payment.id, { reviewedBy: 1 })]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const r = (a ?? b)!;
    expect(r.payment).toMatchObject({ status: 'paid', reviewedBy: 1 });
    expect(r.user.id).toBe(user.id);
    expect(r.user.proExpiresAt!.getTime()).toBe(r.proExpiresAt.getTime());
    expect(await markPaid(t.db, payment.id)).toBeNull();
    expect(await markPaid(t.db, 987654)).toBeNull();
  });

  it('/start va /start <code> — web_app tugmasi bilan javob', async () => {
    const spy = mockFetch();
    await hook({ update_id: 20, message: { chat: { id: 555 }, from: { id: 555 }, text: '/start' } });
    await hook({ update_id: 21, message: { chat: { id: 556 }, from: { id: 556 }, text: '/start IQABC123' } });
    await hook({ update_id: 22, message: { chat: { id: 557 }, from: { id: 557 }, text: 'salom' } });
    const c = calls(spy);
    expect(c).toHaveLength(2);
    expect(c[0]!.method).toBe('sendMessage');
    expect(c[0]!.body.chat_id).toBe(555);
    expect(typeof c[0]!.body.text).toBe('string');
    expect(c[0]!.body.reply_markup).toEqual({ inline_keyboard: [[{ text: 'IQuestni ochish', web_app: { url: t.config.webappUrl } }]] });
    expect(c[1]!.body.chat_id).toBe(556);
    expect(c[1]!.body.reply_markup.inline_keyboard[0][0].web_app.url).toBe(`${t.config.webappUrl}?ref=IQABC123`);
  });

  it('Bot API xatosi bo\'lsa ham Telegram\'ga 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: false, description: 'Forbidden: bot was blocked' }), { status: 403 }));
    const res = await hook({ message: { chat: { id: 1 }, text: '/start' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
