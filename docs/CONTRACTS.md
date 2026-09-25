# Paketlar kontrakti

Paketlar parallel yoziladi, shuning uchun har bir paket shu fayldagi ochiq API'ga amal qiladi.
API'ni o'zgartirish kerak bo'lsa — shu faylni ham yangilang.

Stack: Preact 10 + @preact/signals, Vite, TypeScript (strict), pnpm workspaces. CSS — oddiy CSS fayllar,
faqat `packages/ui/tokens.css` dagi rol o'zgaruvchilari (`var(--accent)` va h.k.). CSS-in-JS yo'q, UI kutubxona yo'q.
Tezlik budjeti: kritik yoʻl (Intro → birinchi savol) JS ≤ 60 KB gzip (DESIGN.md v1.1 §14), animatsiya faqat `transform`/`opacity`.

## `@iquest/engine` — `packages/engine/src/`
DOM'siz, sof TS. Test ma'lumotlari, sessiya holati, ball hisoblash.

```ts
export type Domain = 'pattern' | 'numbers' | 'spatial';
export type Fill = 'none' | 'hatch' | 'solid';
export type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond';

/** Item grafikasi ma'lumot sifatida — UI uni SVG'ga chizadi. */
export interface Glyph { shape: ShapeKind; count: 1 | 2 | 3 | 4; fill: Fill; rotate?: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315 }

export type Item =
  | { id: string; domain: 'pattern'; kind: 'matrix'; cells: (Glyph | null)[]; options: Glyph[]; answer: number }   // cells: 9 ta, oxirgisi null; options: 8 ta
  | { id: string; domain: 'numbers'; kind: 'series'; terms: number[]; options: number[]; answer: number }            // options: 6 ta
  | { id: string; domain: 'spatial'; kind: 'rotation'; target: Glyph[]; options: Glyph[][]; answer: number };        // options: 5 ta

export interface Section { domain: Domain; titleKey: string; seconds: number; items: Item[] }  // 3 bo'lim × 9 item
export interface TestForm { id: string; version: string; sections: Section[]; practice: Item[] } // practice: 2 ta

export function buildForm(seed?: number): TestForm;   // deterministik generator

export type Answer = number | null;                    // null = "Bilmayman"
export interface SessionState {
  formId: string; seed: number;
  section: number; item: number;                       // 0-indexed joriy pozitsiya
  answers: Answer[][];                                 // [section][item]
  rtMs: number[][];                                    // javob vaqti
  sectionStartedAt: number | null; remainingSec: number[];
  phase: 'intro' | 'practice' | 'question' | 'break' | 'finished';
  blurCount: number;                                   // ilovadan chiqish soni
}
export function newSession(form: TestForm, seed: number): SessionState;
export function answer(s: SessionState, value: Answer, now: number): SessionState;   // immutabel, keyingi pozitsiyaga o'tadi
export function tick(s: SessionState, now: number): SessionState;                     // vaqt tugasa bo'limni yopadi
export function resumeSection(s: SessionState, now: number): SessionState;            // break -> question

export type Reliability = 'ok' | 'low';
export type StyleKey = 'pattern' | 'numbers' | 'spatial' | 'balanced';
export type StrengthWord = 'strong' | 'medium' | 'growth';
export interface Result {
  band: { low: number; high: number };                 // masalan 104–116
  pct: { low: number; high: number };                  // "100 kishidan ... tasidan yuqori"
  reliability: Reliability;
  bandLevel: 'low' | 'mid' | 'high';                   // low = ~16-persentildan past (paywall yashiriladi)
  style: StyleKey;
  strengths: { domain: Domain; value: number /*0..1*/; word: StrengthWord }[];
  correct: number; total: number; minutes: number;
}
export function score(form: TestForm, s: SessionState, ageBand?: string): Result;  // dastlabki me'yorlar (stub, lekin izchil)

export interface Store { load(): Promise<SessionState | null>; save(s: SessionState): Promise<void>; clear(): Promise<void> }
export function createStore(): Store;  // Telegram CloudStorage bo'lsa o'sha, bo'lmasa localStorage
```

## `@iquest/tg` — `packages/tg/src/`
`window.Telegram.WebApp` ustida yupqa qatlam. Telegram bo'lmasa (brauzer) — hamma funksiya no-op, xato bermaydi.

```ts
export const tg: {
  available: boolean;
  init(): void;                                    // ready(), expand(), mavzu bog'lash (§3), safe-area CSS o'zgaruvchilari
  colorScheme(): 'light' | 'dark';
  onThemeChange(cb: () => void): () => void;
  haptic: { select(): void; light(): void; success(): void; error(): void };
  testMode(on: boolean): void;                     // fullscreen + disableVerticalSwipes + enableClosingConfirmation
  mainButton(opts: { text: string; enabled?: boolean; loading?: boolean; onClick: () => void } | null): void; // null = yashirish
  backButton(onClick: (() => void) | null): void;
  onBlur(cb: () => void): () => void;              // 'deactivated' / visibilitychange
  share(text: string): void;                       // shareMessage yoki switchInlineQuery / fallback
  openInvoice(url: string): Promise<'paid' | 'cancelled' | 'failed' | 'pending'>;
  cloudStorage: { get(k: string): Promise<string | null>; set(k: string, v: string): Promise<void>; remove(k: string): Promise<void> } | null;
  userLang(): string | undefined;
};
```
Preact hook (ilovada ishlatiladi): `useMainButton(text, onClick, enabled)` va `useBackButton(onClick)` — `packages/tg/src/hooks.ts`.

BottomButton Telegram tashqarisida ishlamaydi → `packages/ui` `BottomBar` komponenti brauzerda o'rniga chiziladi (`tg.available === false` bo'lsa).

## `@iquest/i18n` — `packages/i18n/src/`
```ts
export type Locale = 'uz-Latn' | 'ru';
export const locale: Signal<Locale>;
export function t(key: string, params?: Record<string, string | number>): string;   // {name} almashtiradi; kalit yo'q bo'lsa uz-Latn, keyin kalitning o'zi
export function setLocale(l: Locale): void;                                          // localStorage'da saqlanadi
```
Lug'at: `packages/i18n/locales/<locale>/*.json` (flat kalitlar). Hammasi build vaqtida `import.meta.glob(..., { eager: true })` bilan olinadi.

## `@iquest/ui` — `packages/ui/src/`
Har komponent o'z `.css` faylini import qiladi. Barcha stil `tokens.css` rollari orqali.

```ts
Button({ variant?: 'primary'|'secondary'|'ghost', size?: 'm'|'s', loading?, disabled?, onClick, children, block?: boolean })
Glyph({ glyph: engine.Glyph, size?: number })       // monoxrom SVG, currentColor, diagonal chiziq pattern
MatrixGrid({ cells: (Glyph|null)[] })
SeriesRow({ terms: number[] })
OptionTile({ selected, onSelect, index, children, disabled? })   // role="radio", aria-label="Variant {index+1}"
OptionGrid({ columns: 2|3|4, value: number|null, onChange(i), children: ComponentChildren[] })  // role="radiogroup", strelka tugmalari
SectionProgress({ section, sections, item, items, label })
CalmTimer({ seconds, hidden, onToggle })            // ≤60 -> warn holati + "1 daqiqa qoldi"
StatusChip({ tone: 'neutral'|'accent'|'warn'|'money'|'notice'|'danger', children })
PageHeader({ eyebrow?, title, chip? })
Card({ children, tone?: 'default'|'warn'|'notice', padding? })
ObjectCard({ title, meta?, chip?, progress?, action?, onClick? })
ScoreBandCard({ low, high, pctLow, pctHigh, label, pctText, chip })   // egri chiziq + scaleX 400ms ochilish
StyleBadge({ emoji, name, desc })
StrengthBars({ rows: { label: string; value: number; word: string }[] })
PaywallCard({ title, price, items: string[], terms, cta, decline, onBuy, onDecline })  // ikkala tugma teng vaznli
Accordion({ title, children })
Sheet({ open, onClose, children })                  // pastdan chiquvchi oyna (ConsentSheet, ShareSheet, tasdiqlash)
EmptyState({ icon?, text, action? })
Skeleton({ h, w?, r? })
BottomBar({ children })                             // brauzer uchun MainButton o'rnini bosuvchi
Screen({ children, bottom? })                       // sahifa konteyneri: gutter, safe-area, 12px+opacity kirish animatsiyasi
```
`packages/ui/src/index.ts` hammasini eksport qiladi.

## `apps/tma` — ilova
Ekranlar `apps/tma/src/screens/*.tsx`, marshrutlash — oddiy signal (`route` signal, kutubxonasiz).
Og'ir ekranlar (natija, paywall, ulashish, sozlamalar, metodika) `lazy()` bilan alohida chunk.
