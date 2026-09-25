import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { appLogins } from '../src/db/schema';
import { makeTestApp, type TestCtx } from './helpers';

const SECRET = { 'x-telegram-bot-api-secret-token': 'hook-secret' };

describe('Android: bot orqali kirish', () => {
  let t: TestCtx;
  let sent: { method: string; body: Record<string, unknown> }[] = [];
  beforeAll(async () => { t = await makeTestApp(); });
  afterAll(async () => { await t.close(); });
  afterEach(() => { vi.restoreAllMocks(); sent = []; });

  const mockBot = () => vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    sent.push({ method: String(url).split('/').pop()!, body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify({ ok: true, result: {} }));
  });
  const start = async () => (await t.app.inject({ method: 'POST', url: '/auth/app/start' })).json() as { nonce: string; botLink: string };
  const poll = (nonce: string) => t.app.inject({ method: 'POST', url: '/auth/app/poll', payload: { nonce } });
  const botStart = (text: string, from = { id: 555, first_name: 'Aziz', username: 'aziz' }) =>
    t.app.inject({ method: 'POST', url: '/bot/webhook', headers: SECRET, payload: { update_id: 1, message: { chat: { id: from.id }, from, text } } });

  it('start → bot tasdig\'i → poll token beradi (bir marta)', async () => {
    mockBot();
    const s = await start();
    expect(s.botLink).toBe(`https://t.me/iquest_bot?start=login_${s.nonce}`);
    expect((await poll(s.nonce)).json()).toEqual({ status: 'pending' });

    await botStart(`/start login_${s.nonce}`);
    expect(sent[0]!.method).toBe('sendMessage');
    expect(String(sent[0]!.body.text)).toMatch(/tasdiqlandi/);

    const ok = (await poll(s.nonce)).json() as { status: string; token: string; user: { tgId: number; firstName: string } };
    expect(ok.status).toBe('ok');
    expect(ok.user).toMatchObject({ tgId: 555, firstName: 'Aziz' });
    const me = await t.app.inject({ method: 'GET', url: '/me', headers: { authorization: `Bearer ${ok.token}` } });
    expect(me.statusCode).toBe(200);

    expect((await poll(s.nonce)).statusCode).toBe(410); // qayta ishlatib bo'lmaydi
  });

  it('bir nonce ikkinchi Telegram foydalanuvchisi tomonidan egallanmaydi', async () => {
    mockBot();
    const s = await start();
    await botStart(`/start login_${s.nonce}`, { id: 1, first_name: 'A', username: 'a' });
    await botStart(`/start login_${s.nonce}`, { id: 2, first_name: 'B', username: 'b' });
    expect(String(sent[1]!.body.text)).toMatch(/eskirgan/);
    const ok = (await poll(s.nonce)).json() as { user: { tgId: number } };
    expect(ok.user.tgId).toBe(1);
  });

  it('eskirgan va noma\'lum nonce — 410', async () => {
    mockBot();
    const s = await start();
    await t.db.update(appLogins).set({ expiresAt: new Date(Date.now() - 1000) });
    await botStart(`/start login_${s.nonce}`);
    expect(String(sent[0]!.body.text)).toMatch(/eskirgan/);
    expect((await poll(s.nonce)).statusCode).toBe(410);
    expect((await poll('x'.repeat(32))).statusCode).toBe(410);
    expect((await poll('bad')).statusCode).toBe(410);
  });

  it('oddiy /start avvalgidek Mini App tugmasini yuboradi', async () => {
    mockBot();
    await botStart('/start');
    expect(JSON.stringify(sent[0]!.body.reply_markup)).toContain('web_app');
  });
});
