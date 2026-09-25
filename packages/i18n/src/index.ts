import { signal, effect, type Signal } from '@preact/signals';

export type Locale = 'uz-Latn' | 'ru';
export const LOCALES: readonly Locale[] = ['uz-Latn', 'ru'];

type Dict = Record<string, string>;

const STORAGE_KEY = 'iquest.locale';
const FALLBACK: Locale = 'uz-Latn';

const modules = import.meta.glob<Dict>('../locales/*/*.json', { eager: true, import: 'default' });

/** Merged flat dictionaries per locale. Exported for tests/tools. */
export const dictionaries: Record<Locale, Dict> = { 'uz-Latn': {}, ru: {} };
for (const [path, dict] of Object.entries(modules)) {
  const m = /\/locales\/([^/]+)\/[^/]+\.json$/.exec(path);
  const loc = m?.[1] as Locale | undefined;
  if (loc && loc in dictionaries) Object.assign(dictionaries[loc], dict);
}

function isLocale(v: unknown): v is Locale {
  return v === 'uz-Latn' || v === 'ru';
}

function readStored(): Locale | null {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return isLocale(v) ? v : null;
  } catch {
    return null;
  }
}

/** Telegram language_code → our locale. Russian-speaking CIS codes → 'ru', everything else → 'uz-Latn'. */
export function fromLanguageCode(code: string | undefined | null): Locale {
  const base = (code ?? '').toLowerCase().split(/[-_]/)[0];
  return base === 'ru' || base === 'be' || base === 'uk' || base === 'kk' ? 'ru' : 'uz-Latn';
}

function telegramLang(): string | undefined {
  try {
    const w = typeof window !== 'undefined' ? (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } } }) : undefined;
    return w?.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  } catch {
    return undefined;
  }
}

function initialLocale(): Locale {
  const stored = readStored();
  if (stored) return stored;
  const code = telegramLang();
  if (code) return fromLanguageCode(code);
  return FALLBACK;
}

/** True when the user already picked a language (S1 language screen is shown only the first time). */
export function hasStoredLocale(): boolean {
  return readStored() !== null;
}

export const locale: Signal<Locale> = signal(initialLocale());

if (typeof document !== 'undefined') {
  effect(() => {
    document.documentElement.lang = locale.value === 'ru' ? 'ru' : 'uz';
  });
}

export function setLocale(l: Locale): void {
  if (!isLocale(l)) return;
  locale.value = l;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* storage unavailable (private mode, preview) — keep in memory only */
  }
}

/**
 * Translates `key` for the current locale, replacing `{name}` placeholders from `params`.
 * Missing key → uz-Latn value → the key itself. Unknown placeholders are left as is.
 * Reading `locale.value` here makes components re-render on language change.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const l = locale.value;
  const raw = dictionaries[l][key] ?? dictionaries[FALLBACK][key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** True if `key` exists in the current locale or in the uz-Latn fallback. */
export function hasKey(key: string): boolean {
  return key in dictionaries[locale.value] || key in dictionaries[FALLBACK];
}
