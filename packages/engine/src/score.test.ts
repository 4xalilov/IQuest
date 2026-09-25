import { describe, expect, it } from 'vitest';
import { buildForm } from './generator';
import { score } from './score';
import { answer, newSession, resumeSection } from './session';
import type { SessionState } from './types';

const form = buildForm(5);
const T0 = 1_700_000_000_000;

/** Take the test answering `nCorrect` items correctly (spread across sections), each after `rt` ms. */
function run(nCorrect: number, rt = 20_000, pickCorrect?: (sec: number, i: number) => boolean, blur = 0): SessionState {
  let s = newSession(form, 5);
  let now = T0;
  const order: [number, number][] = [];
  for (let i = 0; i < 9; i++) for (let sec = 0; sec < 3; sec++) order.push([sec, i]);
  const correctSet = new Set(order.slice(0, nCorrect).map(([a, b]) => `${a}:${b}`));
  for (let sec = 0; sec < 3; sec++) {
    s = resumeSection(s, now);
    for (let i = 0; i < 9; i++) {
      now += rt;
      const item = form.sections[sec].items[i];
      const ok = pickCorrect ? pickCorrect(sec, i) : correctSet.has(`${sec}:${i}`);
      s = answer(s, ok ? item.answer : (item.answer + 1) % item.options.length, now);
    }
  }
  return { ...s, blurCount: blur };
}

describe('score', () => {
  it('is monotonic in correct answers, band width 12 inside 70–145', () => {
    let prev = -1;
    for (let n = 0; n <= 27; n++) {
      const r = score(form, run(n));
      expect(r.correct).toBe(n);
      expect(r.total).toBe(27);
      expect(r.band.low).toBeGreaterThanOrEqual(prev);
      expect(r.band.high - r.band.low).toBe(12);
      expect(r.band.low).toBeGreaterThanOrEqual(70);
      expect(r.band.high).toBeLessThanOrEqual(145);
      expect(r.pct.low).toBeLessThanOrEqual(r.pct.high);
      expect(r.pct.low).toBeGreaterThanOrEqual(1);
      expect(r.pct.high).toBeLessThanOrEqual(99);
      prev = r.band.low;
    }
    expect(score(form, run(0)).bandLevel).toBe('low');
    expect(score(form, run(14)).bandLevel).toBe('mid');
    expect(score(form, run(27)).bandLevel).toBe('high');
    expect(score(form, run(27)).band).toEqual({ low: 133, high: 145 });
  });

  it('median performance lands around 100', () => {
    const r = score(form, run(14));
    expect(r.band.low).toBeLessThan(100);
    expect(r.band.high).toBeGreaterThan(100);
    expect(r.pct.low).toBeLessThan(50);
    expect(r.pct.high).toBeGreaterThan(50);
  });

  it('flags low reliability for fast answering or leaving the app', () => {
    expect(score(form, run(14, 20_000)).reliability).toBe('ok');
    expect(score(form, run(14, 900)).reliability).toBe('low');
    expect(score(form, run(14, 2000)).reliability).toBe('low'); // median too low
    expect(score(form, run(14, 20_000, undefined, 3)).reliability).toBe('low');
    expect(score(form, run(14, 20_000, undefined, 2)).reliability).toBe('ok');
  });

  it('empty / untouched session scores safely', () => {
    const r = score(form, newSession(form, 5));
    expect(r.correct).toBe(0);
    expect(r.reliability).toBe('low');
    expect(r.band.low).toBe(70);
    expect(r.minutes).toBeGreaterThanOrEqual(1);
    expect(r.style).toBe('balanced');
  });

  it('style = strongest domain unless balanced; strengths words', () => {
    const numbersOnly = score(form, run(0, 20_000, (sec) => sec === 1));
    expect(numbersOnly.style).toBe('numbers');
    expect(numbersOnly.strengths.map((x) => x.word)).toEqual(['growth', 'strong', 'growth']);
    expect(numbersOnly.strengths.map((x) => x.domain)).toEqual(['pattern', 'numbers', 'spatial']);
    const even = score(form, run(0, 20_000, (_, i) => i < 5));
    expect(even.style).toBe('balanced');
    expect(even.strengths.every((x) => x.word === 'medium' && Math.abs(x.value - 5 / 9) < 1e-9)).toBe(true);
  });

  it('minutes = rounded total test time', () => {
    expect(score(form, run(10, 20_000)).minutes).toBe(9); // 27 × 20 s
  });
});
