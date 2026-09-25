import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signInitData, verifyInitData } from '../src/lib/telegram';
import { ADMIN_TG_ID, TEST_BOT_TOKEN, initDataFor, login, makeTestApp, type TestCtx } from './helpers';

describe('initData', () => {
  it('to\'g\'ri imzoni qabul qiladi, buzilganini rad etadi', () => {
    const d = initDataFor(42);
    expect(verifyInitData(d, TEST_BOT_TOKEN, 3600).user.id).toBe(42);
    expect(() => verifyInitData(d.replace('User42', 'User43'), TEST_BOT_TOKEN, 3600)).toThrow();
    expect(() => verifyInitData(d, 'other:token', 3600)).toThrow();
  });
  it('eskirgan initData rad etiladi', () => {
    const d = signInitData({ auth_date: '1000', user: JSON.stringify({ id: 1 }) }, TEST_BOT_TOKEN);
    expect(() => verifyInitData(d, TEST_BOT_TOKEN, 60)).toThrow(/eskirgan/);
  });
});

describe('/auth/telegram', () => {
  let t: TestCtx;
  beforeAll(async () => { t = await makeTestApp(); });
  afterAll(async () => { await t.close(); });

  it('foydalanuvchi yaratadi va token + settings qaytaradi', async () => {
    const r = await login(t.app, 42);
    expect(r.user).toMatchObject({ tgId: 42, firstName: 'User42', isPro: false, isAdmin: false });
    expect(r.user.referralCode).toMatch(/^IQ[A-Z0-9]{6}$/);
    expect((r as unknown as { settings: { daily_test_limit: { value: number } } }).settings.daily_test_limit.value).toBe(100);
    const again = await login(t.app, 42);
    expect(again.user.id).toBe(r.user.id);
  });
  it('noto\'g\'ri imzo — 401', async () => {
    const res = await t.app.inject({ method: 'POST', url: '/auth/telegram', payload: { initData: 'user=%7B%7D&hash=00' } });
    expect(res.statusCode).toBe(401);
  });
  it('admin ADMIN_TG_IDS orqali aniqlanadi', async () => {
    const r = await login(t.app, ADMIN_TG_ID);
    expect((r.user as unknown as { isAdmin: boolean }).isAdmin).toBe(true);
  });
  it('/auth/dev test muhitida ishlaydi', async () => {
    const res = await t.app.inject({ method: 'POST', url: '/auth/dev', payload: { tgId: 7 } });
    expect(res.statusCode).toBe(200);
  });
});
