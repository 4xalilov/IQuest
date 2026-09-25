import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { buildForm, type Result } from '@iquest/engine';
import { iqSessions, notifications, results, users } from '../src/db/schema';
import { grantPro } from '../src/services/pro';
import { setSetting } from '../src/services/settings';
import { getUsage } from '../src/services/usage';
import { login, makeTestApp, type TestCtx } from './helpers';

type Auth = { authorization: string };
interface SessionRes { sessionId: string; seed: number; formVersion: string; form: { sections: { items: Record<string, unknown>[] }[] } }

function answersFor(seed: number, mode: 'correct' | 'wrong') {
  const form = buildForm(seed);
  const answers = form.sections.map((s) => s.items.map((it) => (mode === 'correct' ? it.answer : (it.answer + 1) % it.options.length)));
  const rtMs = form.sections.map((s) => s.items.map(() => 6000));
  return { answers, rtMs };
}

describe('iq', () => {
  let t: TestCtx;
  beforeAll(async () => { t = await makeTestApp(); });
  afterAll(async () => { await t.close(); });

  const create = (auth: Auth, payload: object = {}) => t.app.inject({ method: 'POST', url: '/iq/sessions', headers: auth, payload });
  const submit = (auth: Auth, id: string, payload: object) =>
    t.app.inject({ method: 'POST', url: `/iq/sessions/${id}/submit`, headers: auth, payload });

  it('auth talab qilinadi', async () => {
    const res = await t.app.inject({ method: 'POST', url: '/iq/sessions', payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it('sessiya yaratadi, javoblarsiz forma qaytaradi, faol sessiyani qayta ishlatadi', async () => {
    const u = await login(t.app, 101);
    const r1 = await create(u.auth, { ageBand: '18-25' });
    expect(r1.statusCode).toBe(200);
    const s1 = r1.json() as SessionRes;
    expect(s1.formVersion).toBe('v1');
    expect(s1.form.sections).toHaveLength(3);
    for (const sec of s1.form.sections) {
      expect(sec.items).toHaveLength(9);
      for (const it of sec.items) { expect(it).not.toHaveProperty('answer'); expect(it).toHaveProperty('options'); }
    }
    expect(JSON.stringify(s1.form.sections)).not.toContain('"answer"');

    const r2 = await create(u.auth);
    expect((r2.json() as SessionRes).sessionId).toBe(s1.sessionId);
    expect(await getUsage(t.db, u.user.id, 'iq_tests')).toBe(1);

    const g = await t.app.inject({ method: 'GET', url: `/iq/sessions/${s1.sessionId}`, headers: u.auth });
    expect(g.statusCode).toBe(200);
    expect(g.json()).toMatchObject({ sessionId: s1.sessionId, status: 'active', seed: s1.seed, formVersion: 'v1' });
    expect(g.json()).not.toHaveProperty('result');
  });

  it('24 soatdan eski faol sessiya qayta ishlatilmaydi', async () => {
    const u = await login(t.app, 102);
    const s1 = (await create(u.auth)).json() as SessionRes;
    await t.db.update(iqSessions).set({ startedAt: new Date(Date.now() - 25 * 3_600_000) }).where(eq(iqSessions.id, s1.sessionId));
    const s2 = (await create(u.auth)).json() as SessionRes;
    expect(s2.sessionId).not.toBe(s1.sessionId);
    const [old] = await t.db.select().from(iqSessions).where(eq(iqSessions.id, s1.sessionId));
    expect(old!.status).toBe('abandoned');
  });

  it('bepul foydalanuvchi: freeExamCount dan keyin 403 limit_reached; Pro — cheksiz', async () => {
    await setSetting(t.db, 'freeExamCount', 2);
    const u = await login(t.app, 103);
    for (let i = 0; i < 2; i++) {
      const s = (await create(u.auth)).json() as SessionRes;
      expect((await submit(u.auth, s.sessionId, answersFor(s.seed, 'wrong'))).statusCode).toBe(200);
    }
    const blocked = await create(u.auth);
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toMatchObject({ error: 'limit_reached' });

    const p = await login(t.app, 104);
    await grantPro(t.db, p.user.id, 30);
    for (let i = 0; i < 4; i++) {
      const r = await create(p.auth);
      expect(r.statusCode).toBe(200);
      const s = r.json() as SessionRes;
      expect((await submit(p.auth, s.sessionId, answersFor(s.seed, 'wrong'))).statusCode).toBe(200);
    }
  });

  it('submit: server tomonda ball, to\'g\'ri javoblar yuqoriroq band; xp, results, notify', async () => {
    const good = await login(t.app, 105);
    const bad = await login(t.app, 106);
    const sg = (await create(good.auth)).json() as SessionRes;
    const sb = (await create(bad.auth)).json() as SessionRes;

    const rg = await submit(good.auth, sg.sessionId, { ...answersFor(sg.seed, 'correct'), blurCount: 0 });
    expect(rg.statusCode).toBe(200);
    const resG = (rg.json() as { result: Result }).result;
    expect(resG.correct).toBe(27);
    expect(resG.total).toBe(27);
    expect(resG.reliability).toBe('ok');

    const rb = await submit(bad.auth, sb.sessionId, answersFor(sb.seed, 'wrong'));
    const resB = (rb.json() as { result: Result }).result;
    expect(resB.correct).toBe(0);
    expect(resG.band.low).toBeGreaterThan(resB.band.high);

    const [row] = await t.db.select().from(iqSessions).where(eq(iqSessions.id, sg.sessionId));
    expect(row).toMatchObject({ status: 'finished', bandLow: resG.band.low, bandHigh: resG.band.high });
    expect(row!.finishedAt).toBeInstanceOf(Date);

    const [u] = await t.db.select().from(users).where(eq(users.id, good.user.id));
    expect(u!.xp).toBe(270);
    const rs = await t.db.select().from(results).where(eq(results.userId, good.user.id));
    expect(rs).toHaveLength(1);
    expect(rs[0]).toMatchObject({ kind: 'iq', iqSessionId: sg.sessionId, correct: 27, total: 27, xp: 270 });
    const ns = await t.db.select().from(notifications).where(eq(notifications.userId, good.user.id));
    expect(ns).toHaveLength(1);
    expect(ns[0]).toMatchObject({ type: 'result', titleKey: 'notifResult' });
    expect((ns[0]!.body as { uz: string }).uz).toContain(`${resG.band.low}–${resG.band.high}`);

    const g = await t.app.inject({ method: 'GET', url: `/iq/sessions/${sg.sessionId}`, headers: good.auth });
    expect(g.json()).toMatchObject({ status: 'finished', result: { correct: 27 } });

    // ikki marta submit — 409
    const again = await submit(good.auth, sg.sessionId, answersFor(sg.seed, 'correct'));
    expect(again.statusCode).toBe(409);
    const [u2] = await t.db.select().from(users).where(eq(users.id, good.user.id));
    expect(u2!.xp).toBe(270);
  });

  it('klient yuborgan ball e\'tiborga olinmaydi, blurCount ishonchlilikka ta\'sir qiladi', async () => {
    const u = await login(t.app, 107);
    const s = (await create(u.auth)).json() as SessionRes;
    const r = await submit(u.auth, s.sessionId, { ...answersFor(s.seed, 'wrong'), blurCount: 5, correct: 27, result: { band: { low: 140, high: 145 } } });
    expect(r.statusCode).toBe(200);
    const res = (r.json() as { result: Result }).result;
    expect(res.correct).toBe(0);
    expect(res.reliability).toBe('low');
  });

  it('noto\'g\'ri shakl — 400', async () => {
    const u = await login(t.app, 108);
    const s = (await create(u.auth)).json() as SessionRes;
    const ok = answersFor(s.seed, 'correct');
    const form = buildForm(s.seed);
    const cases: object[] = [
      {},
      { answers: ok.answers },
      { answers: ok.answers.slice(0, 2), rtMs: ok.rtMs.slice(0, 2) },
      { answers: ok.answers.map((r) => r.slice(0, 8)), rtMs: ok.rtMs },
      { answers: ok.answers, rtMs: ok.rtMs.map((r) => r.slice(0, 8)) },
      { answers: ok.answers.map((r, i) => (i === 0 ? [form.sections[0]!.items[0]!.options.length, ...r.slice(1)] : r)), rtMs: ok.rtMs },
      { answers: ok.answers.map((r, i) => (i === 1 ? [-1, ...r.slice(1)] : r)), rtMs: ok.rtMs },
      { answers: ok.answers.map((r, i) => (i === 1 ? [1.5, ...r.slice(1)] : r)), rtMs: ok.rtMs },
      { answers: ok.answers.map((r, i) => (i === 2 ? ['a', ...r.slice(1)] : r)), rtMs: ok.rtMs },
      { answers: ok.answers, rtMs: ok.rtMs.map((r, i) => (i === 2 ? [-5, ...r.slice(1)] : r)) },
      { answers: ok.answers, rtMs: ok.rtMs.map((r, i) => (i === 2 ? [null, ...r.slice(1)] : r)) },
      { answers: ok.answers, rtMs: ok.rtMs, blurCount: -1 },
    ];
    for (const c of cases) {
      const r = await submit(u.auth, s.sessionId, c);
      expect(r.statusCode, JSON.stringify(c).slice(0, 80)).toBe(400);
      expect(r.json()).toMatchObject({ error: 'validation' });
    }
    // null ("Bilmayman") qabul qilinadi
    const nulls = { answers: ok.answers.map((r) => r.map(() => null)), rtMs: ok.rtMs.map((r) => r.map(() => 0)) };
    const r = await submit(u.auth, s.sessionId, nulls);
    expect(r.statusCode).toBe(200);
    expect((r.json() as { result: Result }).result.correct).toBe(0);
  });

  it('boshqa foydalanuvchining sessiyasi — 404', async () => {
    const a = await login(t.app, 109);
    const b = await login(t.app, 110);
    const s = (await create(a.auth)).json() as SessionRes;
    expect((await t.app.inject({ method: 'GET', url: `/iq/sessions/${s.sessionId}`, headers: b.auth })).statusCode).toBe(404);
    expect((await submit(b.auth, s.sessionId, answersFor(s.seed, 'correct'))).statusCode).toBe(404);
    expect((await t.app.inject({ method: 'GET', url: '/iq/sessions/not-a-uuid', headers: a.auth })).statusCode).toBe(404);
    expect((await t.app.inject({ method: 'GET', url: '/iq/sessions/00000000-0000-0000-0000-000000000000', headers: a.auth })).statusCode).toBe(404);
  });

  it('GET /iq/history — tugallangan sessiyalar, yangi → eski', async () => {
    const u = await login(t.app, 111);
    await grantPro(t.db, u.user.id, 7);
    const s1 = (await create(u.auth)).json() as SessionRes;
    await submit(u.auth, s1.sessionId, answersFor(s1.seed, 'wrong'));
    const s2 = (await create(u.auth)).json() as SessionRes;
    await submit(u.auth, s2.sessionId, answersFor(s2.seed, 'correct'));
    await create(u.auth); // faol, tarixda ko'rinmaydi

    const h = await t.app.inject({ method: 'GET', url: '/iq/history', headers: u.auth });
    expect(h.statusCode).toBe(200);
    const items = (h.json() as { items: { sessionId: string; finishedAt: string; band: { low: number; high: number }; style: string; correct: number; total: number }[] }).items;
    expect(items.map((i) => i.sessionId)).toEqual([s2.sessionId, s1.sessionId]);
    expect(items[0]).toMatchObject({ correct: 27, total: 27 });
    expect(items[1]).toMatchObject({ correct: 0, total: 27 });
    expect(items[0]!.band.low).toBeGreaterThan(items[1]!.band.high);
    expect(typeof items[0]!.style).toBe('string');
    expect(new Date(items[0]!.finishedAt).toISOString()).toBe(items[0]!.finishedAt);

    const other = await login(t.app, 112);
    const h2 = await t.app.inject({ method: 'GET', url: '/iq/history', headers: other.auth });
    expect(h2.json()).toEqual({ items: [] });
  });
});
