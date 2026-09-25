import { signal, computed, effect, batch } from '@preact/signals';
import {
  buildForm,
  newSession,
  answer as engineAnswer,
  tick as engineTick,
  resumeSection,
  pause,
  noteBlur,
  remaining,
  randomSeed,
  score,
  createStore,
  type Answer,
  type Result,
  type SessionState,
  type TestForm,
} from '@iquest/engine';
import { readJSON, writeJSON, clearAll } from './storage';

/* ------------------------------------------------------------------ */
/* Profile (age on S3; distracted on S8; region/education on S10)      */
/* ------------------------------------------------------------------ */

export const AGE_BANDS = ['13-15', '16-17', '18-24', '25-34', '35-44', '45+'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];
/** i18n key for an age band chip: survey.age.13_15 … survey.age.45_plus */
export const ageKey = (a: AgeBand) => `survey.age.${a.replace('-', '_').replace('+', '_plus')}`;

export const EDUCATION = ['school', 'vocational', 'student', 'bachelor', 'master'] as const;
export type Education = (typeof EDUCATION)[number];
export const REGIONS = [
  'tashkent_city', 'tashkent_region', 'andijan', 'bukhara', 'fergana', 'jizzakh', 'kashkadarya', 'khorezm',
  'namangan', 'navoi', 'samarkand', 'surkhandarya', 'sirdarya', 'karakalpakstan', 'abroad',
] as const;
export type Region = (typeof REGIONS)[number];
export const DISTRACTED = ['no', 'some', 'yes'] as const;
export type Distracted = (typeof DISTRACTED)[number];

export interface Profile {
  ageBand: AgeBand | null;
  region: Region | null;
  education: Education | null;
  distracted: Distracted | null;
}

export const isMinor = (a: AgeBand | null): boolean => a === '13-15' || a === '16-17';
/** Norms for 13–15 are not ready → the result is shown without a number (S10 age_pending). */
export const isAgePending = (a: AgeBand | null): boolean => a === '13-15';

const EMPTY_PROFILE: Profile = { ageBand: null, region: null, education: null, distracted: null };
export const profile = signal<Profile>({ ...EMPTY_PROFILE, ...readJSON<Partial<Profile>>('profile', {}) });
effect(() => writeJSON('profile', profile.value));

export function setProfile(p: Partial<Profile>): void {
  profile.value = { ...profile.value, ...p };
}

/* ------------------------------------------------------------------ */
/* Flags / settings                                                    */
/* ------------------------------------------------------------------ */

export const consentGiven = signal<boolean>(readJSON('consent', false));
export const practiceDone = signal<boolean>(readJSON('practiceDone', false));
export const timerHidden = signal<boolean>(readJSON('timerHidden', false));
export const largeText = signal<boolean>(readJSON('largeText', false));
/** Parent consent request sent (S18) — minors can then start the test. */
export const parentAsked = signal<boolean>(readJSON('parentAsked', false));
/** Set once the user has started a test: returning users land on S2, first-timers on S3. */
export const visited = signal<boolean>(readJSON('visited', false));
effect(() => writeJSON('consent', consentGiven.value));
effect(() => writeJSON('practiceDone', practiceDone.value));
effect(() => writeJSON('timerHidden', timerHidden.value));
effect(() => writeJSON('parentAsked', parentAsked.value));
effect(() => writeJSON('visited', visited.value));
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
export function recheckOnline(): void {
  online.value = navigator.onLine !== false;
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
  /** Under 18: kept in memory only until a parent consents (S18). */
  minor: boolean;
}

/** Persisted history (adults only), newest first. */
export const results = signal<SavedResult[]>(readJSON<SavedResult[]>('results', []));
effect(() => writeJSON('results', results.value));

/** The result just produced (may be unsaved for minors). */
export const current = signal<SavedResult | null>(null);

export function findResult(id?: string): SavedResult | null {
  if (current.value && (!id || current.value.id === id)) return current.value;
  if (!id) return results.value[0] ?? null;
  return results.value.find((r) => r.id === id) ?? null;
}

/** Result ids whose detailed report was paid for. */
export const purchases = signal<{ id: string; at: number }[]>(readJSON('purchases', []));
effect(() => writeJSON('purchases', purchases.value));
export const isPurchased = (id: string) => purchases.value.some((p) => p.id === id);
export function addPurchase(id: string): void {
  if (!isPurchased(id)) purchases.value = [...purchases.value, { id, at: Date.now() }];
}

/** Paywall dismissed ("Hozir emas") — for this app session only, never nagged again in it. */
export const paywallDeclined = signal<string[]>([]);

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

/** The form of the current session (memoized by seed). */
export const form = computed<TestForm | null>(() => (session.value ? formFor(session.value.seed) : null));

/** A saved test to come back to: unfinished (S7) or finished but not yet scored (S8). */
export const resumable = computed(() => {
  const s = session.value;
  return !!s && s.phase !== 'intro' && s.phase !== 'practice';
});

/** Remaining seconds of the current section. Only the timer slot reads it — ticks never re-render the page. */
export const clock = signal(0);
/** The last section was closed by the timer (S6 shows `test.timeup`). */
export const timeUp = signal(false);
/** The user left the app during this question (S5 shows `test.blur.notice`). */
export const blurNotice = signal(false);

function persist(s: SessionState | null): void {
  // Optimistic: never awaited (DESIGN §5 — the next question must render within 100 ms).
  const p = s ? store.save(s) : store.clear();
  p.catch(() => {
    /* offline / CloudStorage error: state stays in memory, the next save retries */
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
      try {
        if (formFor(s.seed).id !== s.formId) return; // another form version
      } catch {
        return;
      }
      // Saved while running (app killed): drop the live segment instead of charging closed-app time.
      session.value = s.sectionStartedAt === null ? s : { ...s, sectionStartedAt: null, itemShownAt: null };
    })
    .catch(() => {})
    .finally(() => (sessionLoaded.value = true));
}

/** Creates a fresh session (phase 'intro'); practice items come from its form. */
export function prepareTest(): void {
  const seed = randomSeed();
  visited.value = true;
  setProfile({ distracted: null }); // asked again after every test
  session.value = newSession(formFor(seed), seed);
}

/** intro / practice / break / paused question → running question. */
export function continueTest(): void {
  const s = session.value;
  if (!s) return;
  timeUp.value = false;
  blurNotice.value = false;
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
  let s = session.value;
  if (!s || s.phase !== 'question') return s;
  const now = Date.now();
  if (s.sectionStartedAt === null) s = resumeSection(s, now); // paused by blur, answer on return
  const next = engineAnswer(s, value, now);
  blurNotice.value = false;
  commit(next);
  if (next.phase === 'question') clock.value = remaining(next, now);
  return next;
}

/** Leaving the app during the test: counted (reliability) and the clock pauses until return. */
export function registerBlur(): void {
  const s = session.value;
  if (!s || s.phase !== 'question') return;
  blurNotice.value = true;
  commit(noteBlur(pause(s, Date.now())));
}

let timer: ReturnType<typeof setInterval> | undefined;
let onClosed: ((s: SessionState) => void) | null = null;

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
  clock.value = remaining(t, now);
  if (t.phase !== 'question' || t.section !== s.section) {
    timeUp.value = true;
    commit(t);
    onClosed?.(t);
  }
}

/** One interval for the whole test; `cb` runs when the timer closes a section. */
export function startClock(cb: (s: SessionState) => void): void {
  onClosed = cb;
  if (timer === undefined) timer = setInterval(onTick, 1000);
  onTick();
}

export function stopClock(): void {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  onClosed = null;
}

/** Minutes actually spent in sections (for S8). */
export function minutesSpent(s: SessionState): number {
  return Math.max(1, Math.round(s.elapsedMs.reduce((a, b) => a + b, 0) / 60000));
}

export function itemCount(s: SessionState): number {
  return s.answers.reduce((n, sec) => n + sec.length, 0);
}

/** Scores the finished session and clears the saved test. Minors' results are not persisted. */
export function finalize(): SavedResult | null {
  const s = session.value;
  const f = form.value;
  if (!s || !f) return current.value;
  const p = profile.value;
  const saved: SavedResult = {
    id: `${s.formId}-${Date.now().toString(36)}`,
    at: Date.now(),
    result: score(f, s, p.ageBand ?? undefined),
    ageBand: p.ageBand,
    blurCount: s.blurCount,
    minor: isMinor(p.ageBand),
  };
  batch(() => {
    current.value = saved;
    if (!saved.minor) results.value = [saved, ...results.value];
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
  batch(() => {
    session.value = null;
    results.value = [];
    current.value = null;
    purchases.value = [];
    paywallDeclined.value = [];
    profile.value = { ...EMPTY_PROFILE };
    consentGiven.value = false;
    practiceDone.value = false;
    timerHidden.value = false;
    largeText.value = false;
    parentAsked.value = false;
    visited.value = false;
  });
  clearAll(); // effects above re-wrote defaults; remove every key
}
