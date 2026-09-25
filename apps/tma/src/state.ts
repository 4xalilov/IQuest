import { signal, computed, effect, batch } from '@preact/signals';
import {
  buildForm,
  newSession,
  answer as engineAnswer,
  tick as engineTick,
  resumeSection,
  score,
  createStore,
  type Answer,
  type Result,
  type SessionState,
  type TestForm,
} from '@iquest/engine';
import { readJSON, writeJSON, clearAll } from './storage';

/* ------------------------------------------------------------------ */
/* Profile answers (S9)                                                */
/* ------------------------------------------------------------------ */

export const AGE_BANDS = ['13-15', '16-17', '18-24', '25-34', '35-44', '45-54', '55+'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];
export const EDUCATION = ['school', 'college', 'bachelor', 'master', 'other'] as const;
export type Education = (typeof EDUCATION)[number];
export const REGIONS = [
  'tashkent_city', 'tashkent', 'andijan', 'bukhara', 'fergana', 'jizzakh', 'kashkadarya',
  'khorezm', 'namangan', 'navoi', 'samarkand', 'surkhandarya', 'syrdarya', 'karakalpakstan', 'abroad',
] as const;
export type Region = (typeof REGIONS)[number];

export interface Profile {
  ageBand: AgeBand | null;
  region: Region | null;
  education: Education | null;
  distracted: boolean | null;
}

export const isMinor = (a: AgeBand | null): boolean => a === '13-15' || a === '16-17';
/** Norms for 13–15 are not ready yet → result shown without a number (S10 age_pending). */
export const isAgePending = (a: AgeBand | null): boolean => a === '13-15';

export const profile = signal<Profile>(
  readJSON<Profile>('profile', { ageBand: null, region: null, education: null, distracted: null }),
);
effect(() => writeJSON('profile', profile.value));

/* ------------------------------------------------------------------ */
/* Flags / settings                                                    */
/* ------------------------------------------------------------------ */

export const consentGiven = signal<boolean>(readJSON('consent', false));
export const practiceDone = signal<boolean>(readJSON('practiceDone', false));
export const timerHidden = signal<boolean>(readJSON('timerHidden', false));
export const largeText = signal<boolean>(readJSON('largeText', false));
effect(() => writeJSON('consent', consentGiven.value));
effect(() => writeJSON('practiceDone', practiceDone.value));
effect(() => writeJSON('timerHidden', timerHidden.value));
effect(() => {
  writeJSON('largeText', largeText.value);
  if (largeText.value) document.documentElement.setAttribute('data-text', 'large');
  else document.documentElement.removeAttribute('data-text');
});

/* ------------------------------------------------------------------ */
/* Connectivity                                                        */
/* ------------------------------------------------------------------ */

export const online = signal<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => (online.value = true));
  window.addEventListener('offline', () => (online.value = false));
}

/* ------------------------------------------------------------------ */
/* Results & purchases                                                 */
/* ------------------------------------------------------------------ */

export interface SavedResult {
  id: string;
  at: number; // epoch ms
  result: Result;
  ageBand: AgeBand | null;
  blurCount: number;
  /** Under 18: not stored in history until a parent consents (S18). */
  minor: boolean;
}

/** Persisted history (adults only), newest first. */
export const results = signal<SavedResult[]>(readJSON<SavedResult[]>('results', []));
effect(() => writeJSON('results', results.value));

/** The result just produced (may be unsaved for minors). */
export const current = signal<SavedResult | null>(results.value[0] ?? null);

export function findResult(id?: string): SavedResult | null {
  if (!id) return current.value;
  if (current.value?.id === id) return current.value;
  return results.value.find((r) => r.id === id) ?? null;
}

/** Result ids whose detailed report was paid for. */
export const purchases = signal<string[]>(readJSON<string[]>('purchases', []));
effect(() => writeJSON('purchases', purchases.value));

/** Official retest is offered 90 days after the first result. */
export const RETEST_DAYS = 90;

/* ------------------------------------------------------------------ */
/* Test session                                                        */
/* ------------------------------------------------------------------ */

const store = createStore();

export const session = signal<SessionState | null>(null);
/** False until the (possibly async CloudStorage) session load finished. */
export const sessionLoaded = signal(false);

let formCache: { seed: number; form: TestForm } | null = null;
function formFor(seed: number): TestForm {
  if (!formCache || formCache.seed !== seed) formCache = { seed, form: buildForm(seed) };
  return formCache.form;
}

/** The form of the running session (memoized by seed). */
export const form = computed<TestForm | null>(() => (session.value ? formFor(session.value.seed) : null));

/** A saved test the user can come back to: unfinished (S7) or finished but not yet scored (S9). */
export const resumable = computed(() => {
  const s = session.value;
  return !!s && s.phase !== 'intro' && s.phase !== 'practice';
});

/** Remaining seconds of the current section. Only CalmTimer reads this — ticks never re-render the page. */
export const clock = signal(0);

function persist(s: SessionState | null): void {
  const p = s ? store.save(s) : store.clear();
  p.catch(() => {
    /* offline / CloudStorage error: state stays in memory, next save retries */
  });
}

function commit(s: SessionState | null): void {
  session.value = s;
  persist(s);
}

export function loadSession(): void {
  store
    .load()
    .then((s) => {
      if (!s || s.phase === 'intro' || s.phase === 'practice') return;
      // Drop sessions from another form version.
      try {
        if (formFor(s.seed).id !== s.formId) return;
      } catch {
        return;
      }
      // A session saved while running (app killed): drop the live segment instead of charging the
      // closed-app time to the section. Normally blur already stored a paused state.
      session.value = s.sectionStartedAt === null ? s : { ...s, sectionStartedAt: null, itemShownAt: null };
    })
    .catch(() => {})
    .finally(() => (sessionLoaded.value = true));
}

/** Stops the running section clock; elapsed time stays in the state (engine fields). */
function pause(s: SessionState, now: number): SessionState {
  if (s.phase !== 'question' || s.sectionStartedAt === null) return s;
  const t = engineTick(s, now);
  if (t.phase !== 'question' || t.sectionStartedAt === null) return t;
  const elapsedMs = t.elapsedMs.slice();
  elapsedMs[t.section] = (elapsedMs[t.section] ?? 0) + Math.max(0, now - t.sectionStartedAt);
  return { ...t, sectionStartedAt: null, itemShownAt: null, elapsedMs };
}

/** Creates a fresh session (phase 'intro'); practice items come from its form. */
export function prepareTest(): void {
  const seed = (Math.random() * 2 ** 31) >>> 0;
  session.value = newSession(formFor(seed), seed);
}

/** intro/practice/break/paused question → running question. */
export function continueTest(): void {
  const s = session.value;
  if (!s) return;
  commit(resumeSection(s, Date.now()));
}

/** Leaves the test (exit confirm): answers are kept, the clock stops. */
export function suspendTest(): void {
  stopClock();
  const s = session.value;
  if (s) commit(pause(s, Date.now()));
}

/** Throws away an unfinished test (S7 "start over"). */
export function discardTest(): void {
  stopClock();
  commit(null);
}

export function answerCurrent(value: Answer): SessionState | null {
  const s = session.value;
  if (!s || s.phase !== 'question') return s;
  const next = engineAnswer(s, value, Date.now());
  commit(next);
  return next;
}

/** Leaving the app during the test: counted (reliability) and the clock is paused until return. */
export function registerBlur(): void {
  const s = session.value;
  if (!s || s.phase !== 'question') return;
  commit({ ...pause(s, Date.now()), blurCount: s.blurCount + 1 });
}

let timer: ReturnType<typeof setInterval> | undefined;
let onPhase: ((s: SessionState) => void) | null = null;

function onTick(): void {
  let s = session.value;
  if (!s || s.phase !== 'question') return;
  const now = Date.now();
  if (s.sectionStartedAt === null) {
    // paused by blur/reload: restart once the page is visible again
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    s = resumeSection(s, now);
    commit(s);
  }
  const t = engineTick(s, now);
  clock.value = Math.max(0, t.remainingSec[t.section] ?? 0);
  if (t.phase !== s.phase || t.section !== s.section) {
    commit(t);
    onPhase?.(t);
  }
}

/** One interval for the whole test; `cb` gets called when time closes a section. */
export function startClock(cb: (s: SessionState) => void): void {
  onPhase = cb;
  if (timer === undefined) timer = setInterval(onTick, 1000);
  onTick();
}

export function stopClock(): void {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  onPhase = null;
}

/** Minutes spent actually answering (for S8). */
export function minutesSpent(s: SessionState): number {
  const ms = s.elapsedMs.reduce((a, b) => a + b, 0);
  return Math.max(1, Math.round(ms / 60000));
}

export function itemCount(s: SessionState): number {
  return s.answers.reduce((n, sec) => n + sec.length, 0);
}

/** Scores the finished session with the S9 answers and clears the saved test. */
export function finalize(): SavedResult | null {
  const s = session.value;
  const f = form.value;
  if (!s || !f) return current.value;
  const p = profile.value;
  const result = score(f, s, p.ageBand ?? undefined);
  const saved: SavedResult = {
    id: `${s.formId}-${s.seed}`,
    at: Date.now(),
    result,
    ageBand: p.ageBand,
    blurCount: s.blurCount,
    minor: isMinor(p.ageBand),
  };
  batch(() => {
    current.value = saved;
    if (!saved.minor) results.value = [saved, ...results.value.filter((r) => r.id !== saved.id)];
    commit(null);
  });
  return saved;
}

/** "Delete my data" (S16): session, results, purchases, profile, flags. */
export async function deleteAllData(): Promise<void> {
  stopClock();
  try {
    await store.clear();
  } catch {
    /* ignore */
  }
  clearAll();
  batch(() => {
    session.value = null;
    results.value = [];
    current.value = null;
    purchases.value = [];
    profile.value = { ageBand: null, region: null, education: null, distracted: null };
    consentGiven.value = false;
    practiceDone.value = false;
    timerHidden.value = false;
    largeText.value = false;
  });
  clearAll(); // effects above re-wrote defaults; remove them again
}
