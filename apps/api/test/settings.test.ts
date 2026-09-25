import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, setSetting } from '../src/services/settings';
import { makeTestApp, type TestCtx } from './helpers';

describe('/settings/public', () => {
  let t: TestCtx;
  beforeAll(async () => { t = await makeTestApp(); });
  afterAll(async () => { await t.close(); });

  it('auth talab qilmaydi va standart qiymatlarni qaytaradi', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/settings/public' });
    expect(res.statusCode).toBe(200);
    const s = res.json();
    expect(s.daily_test_limit.value).toBe(DEFAULT_SETTINGS.dailyTestLimit);
    expect(s.free_exam_count.value).toBe(DEFAULT_SETTINGS.freeExamCount);
    expect(s.free_ticket_count.value).toBe(DEFAULT_SETTINGS.freeTicketCount);
    expect(s.plans).toEqual(DEFAULT_SETTINGS.plans);
    expect(s.referral_milestones).toEqual(DEFAULT_SETTINGS.referralMilestones);
    expect(s.discount).toEqual(DEFAULT_SETTINGS.discount);
    expect(s.card).toEqual(DEFAULT_SETTINGS.card);
  });

  it('saqlangan sozlamalarni aks ettiradi', async () => {
    await setSetting(t.db, 'dailyTestLimit', 7);
    const s = (await t.app.inject({ method: 'GET', url: '/settings/public' })).json();
    expect(s.daily_test_limit.value).toBe(7);
  });
});
