import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iqSessions, notifications, payments, users } from '../src/db/schema';
import { DEFAULT_SETTINGS } from '../src/services/settings';
import { ADMIN_TG_ID, initDataFor, login, makeTestApp, type TestCtx } from './helpers';

let payloadSeq = 0;
const newPayload = () => `test-${Date.now()}-${++payloadSeq}`;

describe('admin', () => {
  let t: TestCtx;
  let admin: Awaited<ReturnType<typeof login>>;
  let user: Awaited<ReturnType<typeof login>>;
  let other: Awaited<ReturnType<typeof login>>;

  beforeAll(async () => {
    t = await makeTestApp();
    admin = await login(t.app, ADMIN_TG_ID);
    user = await login(t.app, 201);
    other = await login(t.app, 202);
  });
  afterAll(async () => { await t.close(); });

  const insertPayment = async (v: Partial<typeof payments.$inferInsert> = {}) => {
    const [p] = await t.db.insert(payments).values({
      userId: user.user.id, provider: 'card_receipt', plan: 'week', amount: 9900, currency: 'UZS', payload: newPayload(), ...v,
    }).returning();
    return p!;
  };

  describe('access', () => {
    const endpoints: [string, string][] = [
      ['GET', '/admin/payments'],
      ['POST', '/admin/payments/1/approve'],
      ['POST', '/admin/payments/1/reject'],
      ['GET', '/admin/payments/1/receipt'],
      ['GET', '/admin/settings'],
      ['PUT', '/admin/settings'],
      ['GET', '/admin/users'],
      ['POST', '/admin/users/1/pro'],
      ['GET', '/admin/stats'],
      ['POST', '/admin/broadcast'],
    ];
    it.each(endpoints)('%s %s — token yo\'q 401, admin emas 403', async (method, url) => {
      const none = await t.app.inject({ method: method as 'GET', url, payload: method === 'GET' ? undefined : {} });
      expect(none.statusCode).toBe(401);
      const nonAdmin = await t.app.inject({ method: method as 'GET', url, headers: user.auth, payload: method === 'GET' ? undefined : {} });
      expect(nonAdmin.statusCode).toBe(403);
      expect(nonAdmin.json()).toEqual({ error: 'forbidden' });
    });
  });

  describe('settings', () => {
    const put = (payload: unknown) => t.app.inject({ method: 'PUT', url: '/admin/settings', headers: admin.auth, payload: payload as object });

    it('GET standartlarni qaytaradi', async () => {
      const res = await t.app.inject({ method: 'GET', url: '/admin/settings', headers: admin.auth });
      expect(res.statusCode).toBe(200);
      expect(res.json().settings).toEqual(DEFAULT_SETTINGS);
    });

    it.each([
      ['noma\'lum kalit', { foo: 1 }],
      ['manfiy son', { dailyTestLimit: -1 }],
      ['kasr son', { freeExamCount: 1.5 }],
      ['satr son', { freeTicketCount: '10' }],
      ['percent > 100', { discount: { active: true, percent: 101, label: '', endDate: null, code: '' } }],
      ['yomon endDate', { discount: { active: true, percent: 10, label: '', endDate: '2026/01/01', code: '' } }],
      ['mavjud bo\'lmagan sana', { discount: { active: true, percent: 10, label: '', endDate: '2026-02-30', code: '' } }],
      ['discount ichida ortiqcha kalit', { discount: { ...DEFAULT_SETTINGS.discount, extra: 1 } }],
      ['plan yetishmaydi', { plans: { week: DEFAULT_SETTINGS.plans.week, month1: DEFAULT_SETTINGS.plans.month1 } }],
      ['plan days 0', { plans: { ...DEFAULT_SETTINGS.plans, week: { days: 0, uzs: 1, stars: 1 } } }],
      ['ortiqcha plan', { plans: { ...DEFAULT_SETTINGS.plans, year: { days: 365, uzs: 1, stars: 1 } } }],
      ['milestone tartibsiz', { referralMilestones: [{ count: 5, days: 7 }, { count: 3, days: 7 }] }],
      ['milestone takror', { referralMilestones: [{ count: 3, days: 7 }, { count: 3, days: 30 }] }],
      ['card number emas', { card: { number: 123, owner: 'X' } }],
    ])('rad etadi: %s', async (_name, payload) => {
      const res = await put(payload);
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('validation');
    });

    it('xato bo\'lsa hech narsa saqlanmaydi', async () => {
      const res = await put({ dailyTestLimit: 5, foo: 1 });
      expect(res.statusCode).toBe(400);
      const s = (await t.app.inject({ method: 'GET', url: '/admin/settings', headers: admin.auth })).json().settings;
      expect(s.dailyTestLimit).toBe(DEFAULT_SETTINGS.dailyTestLimit);
    });

    it('to\'g\'ri qiymatlarni saqlaydi va birlashtirilgan sozlamalarni qaytaradi', async () => {
      const discount = { active: true, percent: 20, label: 'Bahor', endDate: '2030-03-01', code: 'SPRING' };
      const plans = { week: { days: 7, uzs: 10000, stars: 60 }, month1: { days: 30, uzs: 30000, stars: 160 }, month2: { days: 60, uzs: 50000, stars: 260 } };
      const res = await put({ dailyTestLimit: 50, freeExamCount: 0, discount, plans, referralMilestones: [{ count: 2, days: 3 }, { count: 4, days: 10 }], card: { number: '8600 1234', owner: 'ALI' } });
      expect(res.statusCode).toBe(200);
      const s = res.json().settings;
      expect(s).toMatchObject({ dailyTestLimit: 50, freeExamCount: 0, freeTicketCount: DEFAULT_SETTINGS.freeTicketCount, discount, plans });

      const pub = (await t.app.inject({ method: 'GET', url: '/settings/public' })).json();
      expect(pub.daily_test_limit.value).toBe(50);
      expect(pub.free_exam_count.value).toBe(0);
      expect(pub.discount).toEqual(discount);
      expect(pub.card).toEqual({ number: '8600 1234', owner: 'ALI' });
      expect(pub.referral_milestones).toEqual([{ count: 2, days: 3 }, { count: 4, days: 10 }]);

      const auth = await t.app.inject({ method: 'POST', url: '/auth/telegram', payload: { initData: initDataFor(203) } });
      expect(auth.json().settings.daily_test_limit.value).toBe(50);

      // endDate null ga qaytariladi; boshqa kalitlar saqlanib qoladi
      const res2 = await put({ discount: { ...discount, endDate: null } });
      expect(res2.statusCode).toBe(200);
      expect(res2.json().settings.discount.endDate).toBeNull();
      expect(res2.json().settings.dailyTestLimit).toBe(50);

      // keyingi testlar uchun plans'ni standartga qaytarish
      expect((await put({ plans: DEFAULT_SETTINGS.plans })).statusCode).toBe(200);
    });
  });

  describe('payments', () => {
    it('ro\'yxat status bo\'yicha filtrlanadi va user bilan', async () => {
      const p1 = await insertPayment();
      const p2 = await insertPayment({ status: 'paid', userId: other.user.id });
      const res = await t.app.inject({ method: 'GET', url: '/admin/payments?status=pending', headers: admin.auth });
      expect(res.statusCode).toBe(200);
      const items = res.json().items as { id: number; status: string; user: { id: number; tgId: number } }[];
      expect(items.some((i) => i.id === p1.id)).toBe(true);
      expect(items.some((i) => i.id === p2.id)).toBe(false);
      expect(items.every((i) => i.status === 'pending')).toBe(true);
      expect(items.find((i) => i.id === p1.id)!.user).toMatchObject({ id: user.user.id, tgId: 201 });
      const all = (await t.app.inject({ method: 'GET', url: '/admin/payments', headers: admin.auth })).json().items as { id: number }[];
      expect(all.map((i) => i.id)).toEqual(expect.arrayContaining([p1.id, p2.id]));
      const bad = await t.app.inject({ method: 'GET', url: '/admin/payments?status=weird', headers: admin.auth });
      expect(bad.statusCode).toBe(400);
    });

    it('approve: Pro beradi faqat bir marta; ikkinchisi 409', async () => {
      const p = await insertPayment({ plan: 'month1', amount: 29900 });
      const before = Date.now();
      const res = await t.app.inject({ method: 'POST', url: `/admin/payments/${p.id}/approve`, headers: admin.auth });
      expect(res.statusCode).toBe(200);
      const b = res.json();
      expect(b.payment).toMatchObject({ id: p.id, status: 'paid', reviewedBy: admin.user.id });
      expect(b.user).toMatchObject({ id: user.user.id, isPro: true });
      const exp1 = new Date(b.user.proExpiresAt).getTime();
      expect(exp1).toBeGreaterThanOrEqual(before + 30 * 86_400_000 - 1000);
      expect(exp1).toBeLessThanOrEqual(Date.now() + 30 * 86_400_000 + 1000);

      const again = await t.app.inject({ method: 'POST', url: `/admin/payments/${p.id}/approve`, headers: admin.auth });
      expect(again.statusCode).toBe(409);
      const [u] = await t.db.select().from(users).where(eq(users.id, user.user.id));
      expect(u!.proExpiresAt!.getTime()).toBe(exp1);

      const notifs = await t.db.select().from(notifications).where(eq(notifications.userId, user.user.id));
      expect(notifs.filter((n) => n.type === 'payment')).toHaveLength(1);

      const rej = await t.app.inject({ method: 'POST', url: `/admin/payments/${p.id}/reject`, headers: admin.auth, payload: {} });
      expect(rej.statusCode).toBe(409);
    });

    it('approve/reject noma\'lum to\'lov — 404', async () => {
      expect((await t.app.inject({ method: 'POST', url: '/admin/payments/999999/approve', headers: admin.auth })).statusCode).toBe(404);
      expect((await t.app.inject({ method: 'POST', url: '/admin/payments/999999/reject', headers: admin.auth, payload: {} })).statusCode).toBe(404);
    });

    it('reject: status rejected, note, notify; keyin approve 409', async () => {
      const p = await insertPayment({ userId: other.user.id });
      const res = await t.app.inject({ method: 'POST', url: `/admin/payments/${p.id}/reject`, headers: admin.auth, payload: { note: 'Chek o\'qilmaydi' } });
      expect(res.statusCode).toBe(200);
      expect(res.json().payment).toMatchObject({ id: p.id, status: 'rejected', note: 'Chek o\'qilmaydi', reviewedBy: admin.user.id });
      const notifs = await t.db.select().from(notifications).where(eq(notifications.userId, other.user.id));
      expect(notifs.filter((n) => n.type === 'payment')).toHaveLength(1);
      const [u] = await t.db.select().from(users).where(eq(users.id, other.user.id));
      expect(u!.proExpiresAt).toBeNull();
      expect((await t.app.inject({ method: 'POST', url: `/admin/payments/${p.id}/approve`, headers: admin.auth })).statusCode).toBe(409);
      expect((await t.app.inject({ method: 'POST', url: `/admin/payments/${p.id}/reject`, headers: admin.auth, payload: {} })).statusCode).toBe(409);
    });

    it('receipt: faylni to\'g\'ri content-type bilan uzatadi', async () => {
      await mkdir(path.join(t.config.uploadDir, 'receipts'), { recursive: true });
      const content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
      await writeFile(path.join(t.config.uploadDir, 'receipts', 'r1.png'), content);
      await writeFile(path.join(t.config.uploadDir, 'receipts', 'r2.pdf'), '%PDF-1.4');
      const p = await insertPayment({ receiptPath: 'receipts/r1.png' });
      const res = await t.app.inject({ method: 'GET', url: `/admin/payments/${p.id}/receipt`, headers: admin.auth });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.rawPayload.equals(content)).toBe(true);

      const p2 = await insertPayment({ receiptPath: 'receipts/r2.pdf' });
      const res2 = await t.app.inject({ method: 'GET', url: `/admin/payments/${p2.id}/receipt`, headers: admin.auth });
      expect(res2.statusCode).toBe(200);
      expect(res2.headers['content-type']).toBe('application/pdf');
      expect(res2.body).toBe('%PDF-1.4');
    });

    it('receipt: fayl yo\'q, receiptPath yo\'q, path traversal — 404', async () => {
      const missing = await insertPayment({ receiptPath: 'receipts/nope.jpg' });
      const none = await insertPayment({ provider: 'stars', currency: 'XTR', amount: 50 });
      const trav = await insertPayment({ receiptPath: '../../etc/passwd' });
      const abs = await insertPayment({ receiptPath: '/etc/passwd' });
      const dir = await insertPayment({ receiptPath: '.' });
      for (const p of [missing, none, trav, abs, dir]) {
        const res = await t.app.inject({ method: 'GET', url: `/admin/payments/${p.id}/receipt`, headers: admin.auth });
        expect(res.statusCode).toBe(404);
        expect(res.body).not.toContain('root:');
      }
      expect((await t.app.inject({ method: 'GET', url: '/admin/payments/999999/receipt', headers: admin.auth })).statusCode).toBe(404);
    });
  });

  describe('users', () => {
    beforeAll(async () => {
      await t.db.update(users).set({ firstName: 'Alisher', lastName: 'Navoiy', username: 'alish_er' }).where(eq(users.id, user.user.id));
      await t.db.update(users).set({ firstName: 'Bobur', lastName: 'Mirzo', username: 'bobur100' }).where(eq(users.id, other.user.id));
    });
    const search = async (qs: string) => {
      const res = await t.app.inject({ method: 'GET', url: `/admin/users${qs}`, headers: admin.auth });
      expect(res.statusCode).toBe(200);
      return res.json() as { items: { id: number; tgId: number; firstName: string; isAdmin: boolean }[]; total: number };
    };

    it('q: ism, familiya, username (ILIKE), tgId', async () => {
      expect((await search('?q=alish')).items.map((u) => u.id)).toEqual([user.user.id]);
      expect((await search('?q=MIRZO')).items.map((u) => u.id)).toEqual([other.user.id]);
      expect((await search('?q=bobur1')).items.map((u) => u.id)).toEqual([other.user.id]);
      const byTg = await search('?q=201');
      expect(byTg.items.map((u) => u.id)).toEqual([user.user.id]);
      expect(byTg.total).toBe(1);
      // % va _ literal sifatida
      expect((await search('?q=%25')).total).toBe(0);
      expect((await search('?q=a_i')).total).toBe(0); // wildcard bo'lganda "Ali" ga mos kelardi
      expect((await search('?q=sh_e')).items.map((u) => u.id)).toEqual([user.user.id]);
    });

    it('limit/offset/total', async () => {
      const all = await search('');
      expect(all.total).toBeGreaterThanOrEqual(3);
      expect(all.items[0]).toHaveProperty('isAdmin');
      const page = await search('?limit=1&offset=1');
      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(all.total);
      expect(page.items[0]!.id).toBe(all.items[1]!.id);
      for (const qs of ['?limit=0', '?limit=101', '?offset=-1', '?limit=abc']) {
        expect((await t.app.inject({ method: 'GET', url: `/admin/users${qs}`, headers: admin.auth })).statusCode).toBe(400);
      }
    });

    it('POST /admin/users/:id/pro', async () => {
      const [before] = await t.db.select().from(users).where(eq(users.id, other.user.id));
      expect(before!.proExpiresAt).toBeNull();
      const res = await t.app.inject({ method: 'POST', url: `/admin/users/${other.user.id}/pro`, headers: admin.auth, payload: { days: 10 } });
      expect(res.statusCode).toBe(200);
      const u = res.json().user;
      expect(u).toMatchObject({ id: other.user.id, isPro: true });
      const exp = new Date(u.proExpiresAt).getTime();
      expect(Math.abs(exp - (Date.now() + 10 * 86_400_000))).toBeLessThan(5000);
      // uzaytiradi
      const res2 = await t.app.inject({ method: 'POST', url: `/admin/users/${other.user.id}/pro`, headers: admin.auth, payload: { days: 5 } });
      expect(new Date(res2.json().user.proExpiresAt).getTime()).toBe(exp + 5 * 86_400_000);

      for (const days of [0, 3651, 1.5, '7']) {
        const bad = await t.app.inject({ method: 'POST', url: `/admin/users/${other.user.id}/pro`, headers: admin.auth, payload: { days } });
        expect(bad.statusCode).toBe(400);
      }
      expect((await t.app.inject({ method: 'POST', url: '/admin/users/999999/pro', headers: admin.auth, payload: { days: 1 } })).statusCode).toBe(404);
    });
  });

  describe('stats', () => {
    it('hisoblaydi', async () => {
      const t2 = await makeTestApp();
      try {
        const a = await login(t2.app, ADMIN_TG_ID);
        const u1 = await login(t2.app, 301);
        const u2 = await login(t2.app, 302);
        const u3 = await login(t2.app, 303);
        // u3 — kecha ko'rilgan (DAU emas); u1 — Pro; u2 — Pro muddati o'tgan
        await t2.db.update(users).set({ lastSeenAt: new Date(Date.now() - 2 * 86_400_000) }).where(eq(users.id, u3.user.id));
        await t2.db.update(users).set({ proExpiresAt: new Date(Date.now() + 86_400_000) }).where(eq(users.id, u1.user.id));
        await t2.db.update(users).set({ proExpiresAt: new Date(Date.now() - 86_400_000) }).where(eq(users.id, u2.user.id));
        await t2.db.insert(iqSessions).values([
          { userId: u1.user.id, seed: 1, formVersion: 'v1' },
          { userId: u2.user.id, seed: 2, formVersion: 'v1' },
          { userId: u2.user.id, seed: 3, formVersion: 'v1', startedAt: new Date(Date.now() - 2 * 86_400_000) },
        ]);
        const pay = (v: Partial<typeof payments.$inferInsert>) => ({ userId: u1.user.id, provider: 'card_receipt', plan: 'week', amount: 0, currency: 'UZS', payload: newPayload(), ...v });
        await t2.db.insert(payments).values([
          pay({ amount: 9900, status: 'paid' }),
          pay({ amount: 29900, status: 'paid' }),
          pay({ amount: 49900, status: 'pending' }),
          pay({ amount: 9900, status: 'rejected' }),
          pay({ provider: 'stars', currency: 'XTR', amount: 50, status: 'paid' }),
          pay({ provider: 'stars', currency: 'XTR', amount: 150, status: 'paid' }),
          pay({ provider: 'stars', currency: 'XTR', amount: 250, status: 'pending' }),
        ]);
        const res = await t2.app.inject({ method: 'GET', url: '/admin/stats', headers: a.auth });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ users: 4, proUsers: 1, dau: 3, iqTestsToday: 2, revenue: { uzs: 39800, stars: 200 } });
      } finally {
        await t2.close();
      }
    });
  });

  describe('broadcast', () => {
    it('har foydalanuvchiga bitta bildirishnoma', async () => {
      const n = (await t.db.select({ id: users.id }).from(users)).length;
      expect(n).toBeGreaterThan(1);
      const body = { uz: 'Yangi testlar!', ru: 'Новые тесты!', kril: 'Янги тестлар!' };
      const res = await t.app.inject({ method: 'POST', url: '/admin/broadcast', headers: admin.auth, payload: { type: 'new', titleKey: 'newTests', body } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ sent: n });
      const rows = await t.db.select().from(notifications).where(eq(notifications.titleKey, 'newTests'));
      expect(rows).toHaveLength(n);
      expect(new Set(rows.map((r) => r.userId)).size).toBe(n);
      expect(rows[0]).toMatchObject({ type: 'new', body, read: false });

      const list = await t.app.inject({ method: 'GET', url: '/notifications', headers: user.auth });
      expect(list.json().items[0]).toMatchObject({ titleKey: 'newTests', body });

      for (const payload of [
        { type: 'spam', titleKey: 'x', body },
        { type: 'new', titleKey: '', body },
        { type: 'new', titleKey: 'x', body: { uz: 'a', ru: 'b' } },
      ]) {
        expect((await t.app.inject({ method: 'POST', url: '/admin/broadcast', headers: admin.auth, payload })).statusCode).toBe(400);
      }
    });
  });
});
