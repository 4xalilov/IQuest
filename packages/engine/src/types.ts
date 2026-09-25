/**
 * @iquest/engine — public types (see docs/CONTRACTS.md).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RENDERING CONVENTION (the UI must follow this exactly)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Glyph (one matrix cell, one matrix option, one slot of a spatial figure):
 *  - `shape` drawn monochrome with `currentColor`; `fill`: 'none' = outline only,
 *    'solid' = filled, 'hatch' = 45° diagonal lines. The hatch texture is drawn in
 *    SCREEN space (always the same direction) — it is NOT rotated with the glyph.
 *  - `count` = number of identical copies of the shape inside the cell, laid out
 *    1 = centered, 2 = side by side, 3 = triangle/row, 4 = 2×2. The copies are
 *    identical, so the layout is purely cosmetic (no rule ever depends on it).
 *  - `rotate` (degrees, CLOCKWISE, like SVG `rotate()`), applied to each copy
 *    around its own center. Absent = 0.
 *    'triangle' at rotate 0 is an isosceles triangle with its apex pointing UP.
 *    The engine only ever sets `rotate` on triangles (a rotated circle/square/
 *    diamond would look identical or turn a square into a diamond); the UI should
 *    still honour it for any shape.
 *
 * Matrix item (`kind: 'matrix'`): `cells` is row-major, 9 entries, index
 *  r*3 + c; the last one is `null` (the "?" cell). `options` are 8 glyphs.
 *
 * Spatial figure (`kind: 'rotation'`): a figure is `Glyph[]` of EXACTLY 4
 *  glyphs filling the 4 slots of a 2×2 grid, in CLOCKWISE order starting at
 *  top-left:   index 0 = top-left, 1 = top-right, 2 = bottom-right,
 *  3 = bottom-left. Each glyph has count 1.
 *  Rotating a figure by 90° clockwise moves the glyph at slot i to slot
 *  (i + 1) % 4 AND adds 90 to that glyph's own `rotate` — so the UI simply draws
 *  every figure (target and options) as given, it never rotates anything
 *  itself. Exactly one option is a pure rotation (90/180/270°) of `target`;
 *  the others are mirror images (left–right flip) or have one glyph changed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Domain = 'pattern' | 'numbers' | 'spatial';
export type Fill = 'none' | 'hatch' | 'solid';
export type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond';
export type Rotation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

/** Item grafikasi ma'lumot sifatida — UI uni SVG'ga chizadi. */
export interface Glyph {
  shape: ShapeKind;
  count: 1 | 2 | 3 | 4;
  fill: Fill;
  rotate?: Rotation;
}

export type Item =
  | { id: string; domain: 'pattern'; kind: 'matrix'; cells: (Glyph | null)[]; options: Glyph[]; answer: number }
  | { id: string; domain: 'numbers'; kind: 'series'; terms: number[]; options: number[]; answer: number }
  | { id: string; domain: 'spatial'; kind: 'rotation'; target: Glyph[]; options: Glyph[][]; answer: number };

export interface Section {
  domain: Domain;
  titleKey: string;
  seconds: number;
  items: Item[];
}

export interface TestForm {
  id: string;
  version: string;
  sections: Section[];
  practice: Item[];
}

/** null = "Bilmayman" (don't know) or unanswered because the section timed out. */
export type Answer = number | null;

export type Phase = 'intro' | 'practice' | 'question' | 'break' | 'finished';

export interface SessionState {
  formId: string;
  seed: number;
  /** 0-indexed current position. In 'break' this already points to the NEXT section, item 0. */
  section: number;
  item: number;
  /** [section][item] — option index, or null. */
  answers: Answer[][];
  /** [section][item] — ms from the item being shown to the answer; 0 = never answered. */
  rtMs: number[][];
  /** Wall-clock ms when the current running segment of the section started; null = timer not running. */
  sectionStartedAt: number | null;
  /** Seconds left per section (integer, rounded up). Updated by tick()/answer()/pause(). */
  remainingSec: number[];
  phase: Phase;
  /** Times the user left the app during the test. */
  blurCount: number;

  // ── engine extras (not in the contract, JSON-safe) ──
  /** Section time budget per section in seconds (copied from the form). */
  budgetSec: number[];
  /** Section time used in ms, accumulated over finished running segments (excludes the live one). */
  elapsedMs: number[];
  /** Wall-clock ms when the current item was shown; null when not running. */
  itemShownAt: number | null;
}

export type Reliability = 'ok' | 'low';
export type StyleKey = 'pattern' | 'numbers' | 'spatial' | 'balanced';
export type StrengthWord = 'strong' | 'medium' | 'growth';

export interface Result {
  band: { low: number; high: number };
  pct: { low: number; high: number };
  reliability: Reliability;
  bandLevel: 'low' | 'mid' | 'high';
  style: StyleKey;
  strengths: { domain: Domain; value: number; word: StrengthWord }[];
  correct: number;
  total: number;
  minutes: number;
}

export interface Store {
  load(): Promise<SessionState | null>;
  save(s: SessionState): Promise<void>;
  clear(): Promise<void>;
}
