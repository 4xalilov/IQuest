import { describe, expect, it, beforeEach } from 'vitest';
import { dictionaries, fromLanguageCode, hasKey, loadLocale, locale, setLocale, t } from './index';

await loadLocale('ru');

const uz = dictionaries['uz-Latn'];
const ru = dictionaries.ru;
const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Button labels must fit a 360px-wide button (~22 characters). */
const BUTTON_KEYS = [
  /\.cta$/,
  /^nav\./,
  /^common\.(continue|back|close|cancel|retry|save)$/,
  /^write_access\.(allow|deny)$/,
  /^test\.(skip|next|exit\.continue|exit\.stop|intro\.later|timer\.hide|timer\.show)$/,
  /^result\.(retake|share)$/,
  /^paywall\.decline$/,
  /^payment\.(retry|open_report)$/,
  /^share\.(mode\.(style|score)|channel\.)/,
  /^report\.pdf$/,
  /^help\.contact$/,
];

describe('locale dictionaries', () => {
  it('are loaded', () => {
    expect(Object.keys(uz).length).toBeGreaterThan(100);
    expect(Object.keys(ru).length).toBeGreaterThan(100);
  });

  it('every uz-Latn key exists in ru and vice versa', () => {
    expect(Object.keys(uz).filter((k) => !(k in ru))).toEqual([]);
    expect(Object.keys(ru).filter((k) => !(k in uz))).toEqual([]);
  });

  it('uses the same {params} in both locales', () => {
    const diff = Object.keys(uz).filter((k) => k in ru && params(uz[k]).join() !== params(ru[k]).join());
    expect(diff).toEqual([]);
  });

  it('no empty values', () => {
    for (const d of [uz, ru]) expect(Object.entries(d).filter(([, v]) => !v.trim())).toEqual([]);
  });

  it('uz-Latn uses ʻ/ʼ, never an ASCII apostrophe inside words', () => {
    const bad = Object.entries(uz).filter(([, v]) => /[a-zA-Z]'[a-zA-Z]/.test(v));
    expect(bad).toEqual([]);
    // ‘ ’ ` are also common wrong substitutes for ʻ (U+02BB) / ʼ (U+02BC)
    expect(Object.entries(uz).filter(([, v]) => /[a-zA-Z][‘’`][a-zA-Z]/.test(v))).toEqual([]);
  });

  it('uz-Latn has no Cyrillic leaks (except the language names)', () => {
    expect(Object.entries(uz).filter(([k, v]) => !['lang.ru', 'lang.switch'].includes(k) && /[Ѐ-ӿ]/.test(v))).toEqual([]);
  });

  it('no straight double quotes, double spaces or leading/trailing spaces', () => {
    for (const d of [uz, ru]) {
      expect(Object.entries(d).filter(([, v]) => v.includes('"'))).toEqual([]);
      expect(Object.entries(d).filter(([, v]) => /\S {2,}\S/.test(v))).toEqual([]);
      expect(Object.entries(d).filter(([, v]) => v !== v.trim())).toEqual([]);
      expect(Object.entries(d).filter(([, v]) => v.includes('...'))).toEqual([]);
      expect(Object.entries(d).filter(([, v]) => / - /.test(v))).toEqual([]); // use em dash —
    }
  });

  it('button labels fit a 360px button (≤ 22 chars)', () => {
    const long: string[] = [];
    for (const d of [uz, ru]) {
      for (const [k, v] of Object.entries(d)) {
        if (BUTTON_KEYS.some((re) => re.test(k)) && [...v].length > 22) long.push(`${k}: ${v}`);
      }
    }
    expect(long).toEqual([]);
  });
});

describe('t()', () => {
  beforeEach(() => setLocale('uz-Latn'));

  it('loads ru lazily and only switches after loading', async () => {
    expect(Object.keys(ru).length).toBeGreaterThan(300);
  });

  it('returns the value for the current locale', async () => {
    expect(t('home.cta')).toBe('Testni boshlash');
    await setLocale('ru');
    expect(locale.value).toBe('ru');
    expect(t('home.cta')).toBe('Начать тест');
  });

  it('matches DESIGN §13 v1.1 copy', () => {
    expect(t('result.pct', { low: 61, high: 86 })).toBe('Har 100 kishidan taxminan 61–86 nafaridan yuqori');
    expect(t('section.done', { n: 1 })).not.toContain('✅');
  });

  it('interpolates params and leaves unknown placeholders', () => {
    expect(t('finish.body', { count: 27, minutes: 16 })).toBe('Barakalla! 27 ta savolga 16 daqiqada javob berdingiz.');
    expect(t('result.pct', { low: 60 })).toBe('Har 100 kishidan taxminan 60–{high} nafaridan yuqori');
  });

  it('falls back to uz-Latn, then to the key itself', async () => {
    await setLocale('ru');
    uz['__only_uz__'] = 'faqat {x}';
    expect(t('__only_uz__', { x: 1 })).toBe('faqat 1');
    delete uz['__only_uz__'];
    expect(t('no.such.key')).toBe('no.such.key');
    expect(hasKey('no.such.key')).toBe(false);
    expect(hasKey('home.cta')).toBe(true);
  });

  it('maps Telegram language codes', () => {
    expect(fromLanguageCode('ru')).toBe('ru');
    expect(fromLanguageCode('uk')).toBe('ru');
    expect(fromLanguageCode('kk')).toBe('ru');
    expect(fromLanguageCode('be')).toBe('ru');
    expect(fromLanguageCode('ky')).toBe('ru');
    expect(fromLanguageCode('tg')).toBe('ru');
    expect(fromLanguageCode('uz')).toBe('uz-Latn');
    expect(fromLanguageCode('en')).toBe('uz-Latn');
    expect(fromLanguageCode(undefined)).toBe('uz-Latn');
  });
});
