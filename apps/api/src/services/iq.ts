import { newSession, type Answer, type Result, type SessionState, type TestForm } from '@iquest/engine';
import { HttpError } from '../app';

/** Yangi sessiya uchun seed: iq_sessions.seed — signed int4, shuning uchun 1..2^31-1. */
export function newSeed(): number {
  return 1 + Math.floor(Math.random() * 0x7ffffffe);
}

/**
 * Klientga yuboriladigan forma: baholanadigan bo'limlardagi `answer` maydonlari olib tashlanadi.
 * Mashq (practice) itemlari ballga ta'sir qilmaydi — UI "to'g'ri javob N" ko'rsatishi uchun ular saqlanadi.
 */
export function publicForm(form: TestForm) {
  return {
    ...form,
    sections: form.sections.map((s) => ({
      ...s,
      items: s.items.map((item) => {
        const { answer: _answer, ...rest } = item;
        return rest;
      }),
    })),
  };
}

function optionCount(form: TestForm, i: number, j: number): number {
  return form.sections[i]!.items[j]!.options.length;
}

/** answers/rtMs shaklini formaga nisbatan tekshiradi (bo'limlar × itemlar). Xato — 400 validation. */
export function validateSubmission(form: TestForm, answers: Answer[][], rtMs: number[][]): void {
  const bad = (message: string) => new HttpError(400, 'validation', message);
  const nSec = form.sections.length;
  if (answers.length !== nSec || rtMs.length !== nSec) throw bad(`expected ${nSec} sections`);
  form.sections.forEach((sec, i) => {
    const a = answers[i]!, r = rtMs[i]!;
    if (a.length !== sec.items.length || r.length !== sec.items.length) throw bad(`section ${i}: expected ${sec.items.length} items`);
    a.forEach((v, j) => {
      if (v === null) return;
      if (!Number.isInteger(v) || v < 0 || v >= optionCount(form, i, j)) throw bad(`answers[${i}][${j}] out of range`);
    });
    r.forEach((v, j) => {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw bad(`rtMs[${i}][${j}] invalid`);
    });
  });
}

/**
 * Yuborilgan javoblardan tugallangan SessionState yasaydi (score() uchun).
 * Bo'lim sarflangan vaqti (elapsedMs) = shu bo'limdagi rtMs yig'indisi, bo'lim byudjeti bilan cheklangan;
 * remainingSec shundan hisoblanadi. Taymer to'xtagan, phase = 'finished'.
 */
export function finishedState(form: TestForm, seed: number, answers: Answer[][], rtMs: number[][], blurCount: number): SessionState {
  const s = newSession(form, seed);
  const elapsedMs = form.sections.map((sec, i) => {
    const sum = rtMs[i]!.reduce((acc, v) => acc + v, 0);
    return Math.min(Math.round(sum), Math.max(0, sec.seconds) * 1000);
  });
  const lastSec = form.sections.length - 1;
  return {
    ...s,
    section: Math.max(0, lastSec),
    item: Math.max(0, (form.sections[lastSec]?.items.length ?? 1) - 1),
    answers: answers.map((r) => r.slice()),
    rtMs: rtMs.map((r) => r.map((v) => Math.round(v))),
    elapsedMs,
    remainingSec: s.budgetSec.map((b, i) => Math.max(0, Math.ceil((b * 1000 - elapsedMs[i]!) / 1000))),
    sectionStartedAt: null,
    itemShownAt: null,
    phase: 'finished',
    blurCount,
  };
}

/** Natija bildirishnomasi matni (band bilan). */
export function resultNotifBody(r: Result) {
  const band = `${r.band.low}–${r.band.high}`;
  return {
    uz: `IQ test natijangiz tayyor: ${band}`,
    ru: `Ваш результат IQ-теста готов: ${band}`,
    kril: `IQ тест натижангиз тайёр: ${band}`,
  };
}
