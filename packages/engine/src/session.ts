/**
 * Session reducer. All functions are pure and return a NEW state (input is never mutated).
 * State is plain JSON (numbers, strings, nulls, arrays) and survives JSON round-trips.
 *
 * Flow:
 *   newSession → 'intro'
 *   startPractice → 'practice' (practice items are handled by the UI; answer() ignores them)
 *   resumeSection(now) → 'question' in the current section, timer running
 *   answer(value, now) … → at the end of a section: 'break' (section = next, item = 0, timer stopped)
 *                        → after the last section: 'finished'
 *   tick(now) → closes the section when its time runs out (unanswered stay null)
 *   pause(now) / resumeSection(now) → stop / restart the timer mid-section (app hidden, reload)
 */
import type { Answer, SessionState, TestForm } from './types';

export function newSession(form: TestForm, seed: number): SessionState {
  return {
    formId: form.id,
    seed,
    section: 0,
    item: 0,
    answers: form.sections.map((s) => s.items.map((): Answer => null)),
    rtMs: form.sections.map((s) => s.items.map(() => 0)),
    sectionStartedAt: null,
    remainingSec: form.sections.map((s) => Math.max(0, Math.ceil(s.seconds))),
    phase: 'intro',
    blurCount: 0,
    budgetSec: form.sections.map((s) => Math.max(0, s.seconds)),
    elapsedMs: form.sections.map(() => 0),
    itemShownAt: null,
  };
}

function clone(s: SessionState): SessionState {
  return {
    ...s,
    answers: s.answers.map((r) => r.slice()),
    rtMs: s.rtMs.map((r) => r.slice()),
    remainingSec: s.remainingSec.slice(),
    budgetSec: s.budgetSec.slice(),
    elapsedMs: s.elapsedMs.slice(),
  };
}

const running = (s: SessionState) => s.phase === 'question' && s.sectionStartedAt !== null;

/** Section time used so far in ms (including the live running segment). */
export function usedMs(s: SessionState, now: number): number {
  const base = s.elapsedMs[s.section] ?? 0;
  if (!running(s)) return base;
  return base + Math.max(0, now - (s.sectionStartedAt as number));
}

/** Live seconds left in the current section (integer, rounded up; never negative). */
export function remaining(s: SessionState, now: number): number {
  if (s.phase !== 'question') return s.remainingSec[s.section] ?? 0;
  const budgetMs = (s.budgetSec[s.section] ?? 0) * 1000;
  return Math.max(0, Math.ceil((budgetMs - usedMs(s, now)) / 1000));
}

/** Close the current section (mutates the given CLONE). */
function closeSection(n: SessionState, now: number): void {
  const sec = n.section;
  if (running(n)) n.elapsedMs[sec] += Math.max(0, now - (n.sectionStartedAt as number));
  n.elapsedMs[sec] = Math.min(n.elapsedMs[sec], (n.budgetSec[sec] ?? 0) * 1000);
  n.remainingSec[sec] = Math.max(0, Math.ceil(((n.budgetSec[sec] ?? 0) * 1000 - n.elapsedMs[sec]) / 1000));
  n.sectionStartedAt = null;
  n.itemShownAt = null;
  if (sec + 1 >= n.answers.length) {
    n.phase = 'finished';
    n.item = Math.max(0, (n.answers[sec]?.length ?? 1) - 1);
  } else {
    n.phase = 'break';
    n.section = sec + 1;
    n.item = 0;
  }
}

/** Update the clock; if the current section's time is up, close it. */
export function tick(s: SessionState, now: number): SessionState {
  if (!running(s)) return s;
  const left = remaining(s, now);
  if (left <= 0) {
    const n = clone(s);
    closeSection(n, now);
    return n;
  }
  if (left === s.remainingSec[s.section]) return s;
  const n = clone(s);
  n.remainingSec[n.section] = left;
  return n;
}

/**
 * Record an answer (option index, or null = "Bilmayman") for the current item and advance.
 * Ignored unless a question is running. If the time already ran out, the section is closed
 * instead and the late answer is discarded.
 */
export function answer(s: SessionState, value: Answer, now: number): SessionState {
  if (!running(s)) return s;
  const t = tick(s, now);
  if (t.phase !== 'question' || t.section !== s.section) return t;
  const n = clone(t);
  const { section, item } = n;
  const valid = value === null || (Number.isInteger(value) && value >= 0);
  n.answers[section][item] = valid ? value : null;
  n.rtMs[section][item] = Math.max(0, Math.round(now - (n.itemShownAt ?? now)));
  if (item + 1 >= n.answers[section].length) {
    closeSection(n, now);
  } else {
    n.item = item + 1;
    n.itemShownAt = now;
    n.remainingSec[section] = remaining(n, now);
  }
  return n;
}

/**
 * Start / continue the current section: intro, practice or break → question, or restart the
 * timer of a paused question (e.g. after reload). The current item's reaction time restarts.
 * No-op when already running or finished.
 */
export function resumeSection(s: SessionState, now: number): SessionState {
  if (s.phase === 'finished' || running(s)) return s;
  const n = clone(s);
  n.phase = 'question';
  n.sectionStartedAt = now;
  n.itemShownAt = now;
  n.remainingSec[n.section] = remaining(n, now);
  // a section with no time left (0-second budget, or resumed after expiry) closes immediately
  return tick(n, now);
}

/** intro → practice. */
export function startPractice(s: SessionState): SessionState {
  if (s.phase !== 'intro') return s;
  return { ...clone(s), phase: 'practice' };
}

/** Stop the timer (app hidden / closed). resumeSection() restarts it. */
export function pause(s: SessionState, now: number): SessionState {
  if (!running(s)) return s;
  const t = tick(s, now);
  if (!running(t)) return t;
  const n = clone(t);
  n.elapsedMs[n.section] += Math.max(0, now - (n.sectionStartedAt as number));
  n.sectionStartedAt = null;
  n.itemShownAt = null;
  n.remainingSec[n.section] = remaining(n, now);
  return n;
}

/** Count one "left the app" event (used for the reliability flag). */
export function noteBlur(s: SessionState): SessionState {
  return { ...clone(s), blurCount: s.blurCount + 1 };
}

/** Total test time used across sections, in ms. */
export function totalUsedMs(s: SessionState, now?: number): number {
  let sum = 0;
  for (let i = 0; i < s.elapsedMs.length; i++) sum += i === s.section && now !== undefined ? usedMs(s, now) : s.elapsedMs[i];
  return sum;
}

/** Runtime check for data loaded from storage. */
export function isSessionState(x: unknown): x is SessionState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  const numArr = (a: unknown) => Array.isArray(a) && a.every((v) => typeof v === 'number' && Number.isFinite(v));
  const phases = ['intro', 'practice', 'question', 'break', 'finished'];
  if (typeof s.formId !== 'string' || typeof s.seed !== 'number') return false;
  if (!Number.isInteger(s.section) || !Number.isInteger(s.item)) return false;
  if (typeof s.phase !== 'string' || !phases.includes(s.phase)) return false;
  if (typeof s.blurCount !== 'number') return false;
  if (!(s.sectionStartedAt === null || typeof s.sectionStartedAt === 'number')) return false;
  if (!(s.itemShownAt === null || typeof s.itemShownAt === 'number')) return false;
  if (!Array.isArray(s.answers) || !Array.isArray(s.rtMs)) return false;
  const nSec = s.answers.length;
  if (nSec === 0 || s.rtMs.length !== nSec) return false;
  if (!numArr(s.remainingSec) || !numArr(s.budgetSec) || !numArr(s.elapsedMs)) return false;
  if ([s.remainingSec, s.budgetSec, s.elapsedMs].some((a) => (a as number[]).length !== nSec)) return false;
  for (let i = 0; i < nSec; i++) {
    const a = s.answers[i], r = s.rtMs[i];
    if (!Array.isArray(a) || !numArr(r) || a.length !== (r as number[]).length) return false;
    if (!a.every((v) => v === null || (typeof v === 'number' && Number.isInteger(v)))) return false;
  }
  const sec = s.section as number, item = s.item as number;
  if (sec < 0 || sec >= nSec || item < 0 || item >= Math.max(1, (s.answers[sec] as unknown[]).length)) return false;
  return true;
}
