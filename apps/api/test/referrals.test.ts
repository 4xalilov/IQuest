import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { notifications, referralRewards, referrals, users } from '../src/db/schema';
import { applyReferralCode } from '../src/services/referrals';
import { login, makeTestApp, type TestCtx } from './helpers';

const DAY = 86_400_000;

describe('referrals', () => {
  let t: TestCtx;
  beforeAll(async () => { t = await makeTestApp({ BOT_USERNAME: 'test_bot' }); });
  afterAll(async () => { await t.close(); });

  const me = async (auth: Record<string, string>) => {
    const res = await t.app.inject({ method: 'GET', url: '/referrals/me', headers: auth });
    expect(res.statusCode).toBe(200);
    return res.json();
  };

  it('GET /referrals/me — auth talab qilinadi', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/referrals/me' });
    expect(res.statusCode).toBe(401);
  });

  it('bo\'sh holat: kod, havola, next', async () => {
    const { auth, user } = await login(t.app, 200);
    const b = await me(auth);
    expect(b).toEqual({
      code: user.referralCode,
      link: `https://t.me/test_bot?startapp=${user.referralCode}`,
      invited: 0,
      rewards: [],
      next: { count: 3, days: 7 },
      history: [],
    });
  });

  it('start_param orqali taklif; 3 ta → 7 kun Pro (bir marta)', async () => {
    const ref = await login(t.app, 300);
    const code = ref.user.referralCode;
    const a = await login(t.app, 301, { start_param: code });
    await login(t.app, 302, { start_param: code });

    const [ua] = await t.db.select().from(users).where(eq(users.id, a.user.id));
    expect(ua!.referredBy).toBe(ref.user.id);
    let b = await me(ref.auth);
    expect(b.invited).toBe(2);
    expect(b.rewards).toEqual([]);
    expect((await login(t.app, 300)).user.isPro).toBe(false);

    const before = Date.now();
    await login(t.app, 303, { start_param: code });
    const [u] = await t.db.select().from(users).where(eq(users.id, ref.user.id));
    const ms = u!.proExpiresAt!.getTime() - before;
    expect(ms).toBeGreaterThan(7 * DAY - 60_000);
    expect(ms).toBeLessThan(7 * DAY + 60_000);

    b = await me(ref.auth);
    expect(b.invited).toBe(3);
    expect(b.rewards).toHaveLength(1);
    expect(b.rewards[0]).toMatchObject({ milestone: 3, days: 7 });
    expect(b.next).toEqual({ count: 5, days: 30 });
    expect(b.history.map((h: { firstName: string }) => h.firstName)).toEqual(['User303', 'User302', 'User301']);
    expect(b.history.map((h: { rewarded: boolean }) => h.rewarded)).toEqual([true, false, false]);
    expect(Object.keys(b.history[0]).sort()).toEqual(['createdAt', 'firstName', 'rewarded']);

    const notes = await t.db.select().from(notifications).where(eq(notifications.userId, ref.user.id));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ type: 'referral', titleKey: 'referral' });

    // 4-taklif — yangi mukofot yo'q, Pro muddati o'zgarmaydi
    await login(t.app, 304, { start_param: code });
    const [u2] = await t.db.select().from(users).where(eq(users.id, ref.user.id));
    expect(u2!.proExpiresAt!.getTime()).toBe(u!.proExpiresAt!.getTime());
    expect(await t.db.select().from(referralRewards).where(eq(referralRewards.userId, ref.user.id))).toHaveLength(1);
  });

  it('mavjud foydalanuvchiga start_param qo\'llanmaydi', async () => {
    const ref = await login(t.app, 400);
    await login(t.app, 401);
    await login(t.app, 401, { start_param: ref.user.referralCode });
    expect((await me(ref.auth)).invited).toBe(0);
  });

  it('o\'zini taklif qilish va noma\'lum kod jim e\'tiborsiz qoldiriladi', async () => {
    const u = await login(t.app, 500);
    await applyReferralCode(t.db, u.user.id, u.user.referralCode);
    await applyReferralCode(t.db, u.user.id, 'IQNOPE00');
    await applyReferralCode(t.db, u.user.id, '');
    expect(await t.db.select().from(referrals).where(eq(referrals.referredId, u.user.id))).toHaveLength(0);
    // noma'lum start_param bilan kirish ham muvaffaqiyatli
    const n = await login(t.app, 501, { start_param: 'IQUNKNOWN' });
    expect(n.user.id).toBeGreaterThan(0);
    const [row] = await t.db.select().from(users).where(eq(users.id, n.user.id));
    expect(row!.referredBy).toBeNull();
  });

  it('ikki marta chaqirish xavfsiz; faqat bir marta taklif qilinadi', async () => {
    const r1 = await login(t.app, 600);
    const r2 = await login(t.app, 601);
    const x = await login(t.app, 602);
    await applyReferralCode(t.db, x.user.id, r1.user.referralCode);
    await applyReferralCode(t.db, x.user.id, r1.user.referralCode);
    await applyReferralCode(t.db, x.user.id, r2.user.referralCode);
    const rows = await t.db.select().from(referrals).where(eq(referrals.referredId, x.user.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.referrerId).toBe(r1.user.id);
    const [row] = await t.db.select().from(users).where(eq(users.id, x.user.id));
    expect(row!.referredBy).toBe(r1.user.id);
    expect((await me(r2.auth)).invited).toBe(0);
  });

  it('5 ta — ikkinchi milestone (30 kun) mavjud Pro ustiga qo\'shiladi; ohirgi milestone\'dan keyin next=null', async () => {
    const ref = await login(t.app, 700);
    const code = ref.user.referralCode;
    for (let i = 1; i <= 5; i++) await login(t.app, 700 + i, { start_param: code });
    const [u] = await t.db.select().from(users).where(eq(users.id, ref.user.id));
    const ms = u!.proExpiresAt!.getTime() - Date.now();
    expect(ms).toBeGreaterThan(37 * DAY - 60_000);
    expect(ms).toBeLessThan(37 * DAY + 60_000);
    let b = await me(ref.auth);
    expect(b.rewards.map((r: { milestone: number }) => r.milestone)).toEqual([3, 5]);
    expect(b.next).toEqual({ count: 10, days: 60 });
    for (let i = 6; i <= 10; i++) await login(t.app, 700 + i, { start_param: code });
    b = await me(ref.auth);
    expect(b.invited).toBe(10);
    expect(b.rewards.map((r: { milestone: number }) => r.milestone)).toEqual([3, 5, 10]);
    expect(b.next).toBeNull();
    expect(b.history.filter((h: { rewarded: boolean }) => h.rewarded)).toHaveLength(3);
  });
});
