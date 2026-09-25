import { signal, effect, type Signal } from '@preact/signals';

export type Locale = 'uz-Latn' | 'ru';
export const LOCALES: readonly Locale[] = ['uz-Latn', 'ru'];

type Dict = Record<string, string>;

const STORAGE_KEY = 'iquest.locale';
const FALLBACK: Locale = 'uz-Latn';

// uz-Latn — asosiy va zaxira til, doim bundle ichida. Qolgan tillar talab qilinganda yuklanadi.
const uzModules = import.meta.glob<Dict>('../locales/uz-Latn/*.json', { eager: true, import: 'default' });
const loaders: Record<Exclude<Locale, 'uz-Latn'>, () => Promise<{ default: Dict }>> = {
  ru: () => import('./ru'),
};

/** Merged flat dictionaries per locale (ru is empty until loadLocale('ru')). Exported for tests/tools. */
export const dictionaries: Record<Locale, Dict> = { 'uz-Latn': {}, ru: {} };
for (const dict of Object.values(uzModules)) Object.assign(dictionaries['uz-Latn'], dict);

const loading: Partial<Record<Locale, Promise<void>>> = {};

/** Loads a locale's dictionary once. uz-Latn resolves immediately. */
export function loadLocale(l: Locale): Promise<void> {
  if (l === 'uz-Latn') return Promise.resolve();
  return (loading[l] ??= loaders[l]().then(
    (m) => void Object.assign(dictionaries[l], m.default),
    (err) => {
      delete loading[l]; // tarmoq xatosi — keyingi urinishda qayta yuklanadi
      throw err;
    },
  ));
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

/** Telegram language_code → our locale. CIS codes (ru, uk, be, kk, ky, tg) → 'ru' (DESIGN §9 S1), everything else → 'uz-Latn'. */
export function fromLanguageCode(code: string | undefined | null): Locale {
  const base = (code ?? '').toLowerCase().split(/[-_]/)[0];
  return ['ru', 'uk', 'be', 'kk', 'ky', 'tg'].includes(base) ? 'ru' : 'uz-Latn';
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

const startLocale = initialLocale();

/** Current locale. Switches only after its dictionary is loaded, so the UI never flashes raw keys. */
export const locale: Signal<Locale> = signal<Locale>('uz-Latn');

/** Resolves when the starting locale is ready; render the app after it (no-op for uz-Latn). */
export const ready: Promise<void> = loadLocale(startLocale).then(
  () => void (locale.value = startLocale),
  () => undefined, // yuklanmasa — uz-Latn bilan davom etamiz
);

if (typeof document !== 'undefined') {
  effect(() => {
    document.documentElement.lang = locale.value === 'ru' ? 'ru' : 'uz';
  });
}

export async function setLocale(l: Locale): Promise<void> {
  if (!isLocale(l)) return;
  await loadLocale(l);
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
