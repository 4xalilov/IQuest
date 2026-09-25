/**
 * Provisional scoring (stub norms — replace with calibrated norms per age band later).
 * Monotonic: more correct answers never lowers the band.
 */
import type { Domain, Result, SessionState, StrengthWord, StyleKey, TestForm } from './types';
import { totalUsedMs } from './session';

/** Provisional norm: expected proportion correct and its SD in the population. */
export const NORM = { meanP: 0.5, sdP: 0.18, halfWidth: 6, min: 70, max: 145 } as const;
const FAST_MS = 1500;

/** Standard normal CDF (Abramowitz–Stegun 7.1.26, |err| < 1.5e-7). */
export function normCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** "Higher than X of 100 people" for an IQ value, clamped to 1..99. */
export function percentBelow(iq: number): number {
  return Math.min(99, Math.max(1, Math.round(100 * normCdf((iq - 100) / 15))));
}

function wordFor(v: number): StrengthWord {
  if (v >= 0.67) return 'strong';
  if (v >= 0.4) return 'medium';
  return 'growth';
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const a = xs.slice().sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function score(form: TestForm, s: SessionState, ageBand?: string): Result {
  void ageBand; // provisional norms are not age-specific yet
  let correct = 0;
  let total = 0;
  const strengths: Result['strengths'] = [];
  const answeredRt: number[] = [];

  form.sections.forEach((sec, i) => {
    let c = 0;
    sec.items.forEach((item, j) => {
      const a = s.answers[i]?.[j] ?? null;
      if (a !== null && a === item.answer) c++;
      if (a !== null) answeredRt.push(s.rtMs[i]?.[j] ?? 0);
    });
    correct += c;
    total += sec.items.length;
    const value = sec.items.length ? c / sec.items.length : 0;
    strengths.push({ domain: sec.domain as Domain, value, word: wordFor(value) });
  });

  // point estimate from proportion correct, then a ±halfWidth band inside [min, max]
  const p = total ? correct / total : 0;
  const point = 100 + 15 * ((p - NORM.meanP) / NORM.sdP);
  const centre = Math.min(NORM.max - NORM.halfWidth, Math.max(NORM.min + NORM.halfWidth, Math.round(point)));
  const band = { low: centre - NORM.halfWidth, high: centre + NORM.halfWidth };
  const pct = { low: percentBelow(band.low), high: percentBelow(band.high) };

  // reliability: too-fast answering, leaving the app, or no answers at all
  const fast = answeredRt.filter((rt) => rt < FAST_MS).length;
  const lowRel =
    answeredRt.length === 0 ||
    fast >= 5 ||
    fast / answeredRt.length >= 0.25 ||
    (answeredRt.length >= 5 && median(answeredRt) < 2500) ||
    s.blurCount >= 3;

  const bandLevel: Result['bandLevel'] = band.high < 85 ? 'low' : band.low >= 120 ? 'high' : 'mid';

  // style: strongest domain unless the profile is flat (spread < 2 items of 9) or tied at the top
  const vals = strengths.map((x) => x.value);
  const max = Math.max(...vals), min = Math.min(...vals);
  const top = strengths.filter((x) => x.value === max);
  const style: StyleKey = vals.length === 0 || max - min < 0.2 || top.length > 1 ? 'balanced' : (top[0].domain as StyleKey);

  const minutes = Math.max(1, Math.round(totalUsedMs(s) / 60000));

  return { band, pct, reliability: lowRel ? 'low' : 'ok', bandLevel, style, strengths, correct, total, minutes };
}
