/**
 * Rule solvers used both by the generator (to reject ambiguous items) and by the
 * tests (as independent checkers). Pure functions, no randomness.
 */
import type { Glyph, Rotation } from './types';

// ───────────────────────────── glyph helpers ─────────────────────────────

/** Visual rotation of a glyph: only triangles look different when rotated (multiples of 90 used). */
export function visualRotate(g: Glyph): number {
  return g.shape === 'triangle' ? (((g.rotate ?? 0) % 360) + 360) % 360 : 0;
}

/** Key that is equal for two glyphs iff they LOOK the same. */
export function glyphKey(g: Glyph): string {
  return `${g.shape}:${g.count}:${g.fill}:${visualRotate(g)}`;
}

export function figureKey(f: Glyph[]): string {
  return f.map(glyphKey).join('|');
}

/** Normalise a glyph: `rotate` only kept on triangles. */
export function norm(g: Glyph): Glyph {
  const out: Glyph = { shape: g.shape, count: g.count, fill: g.fill };
  if (g.shape === 'triangle') out.rotate = visualRotate(g) as Rotation;
  return out;
}

// ───────────────────────────── spatial figures ─────────────────────────────
// Figure = 4 glyphs, slots clockwise from top-left: 0 TL, 1 TR, 2 BR, 3 BL.

/** Rotate a figure by k·90° clockwise. */
export function rotateFigure(f: Glyph[], k: number): Glyph[] {
  const kk = ((k % 4) + 4) % 4;
  const out: Glyph[] = new Array(4);
  for (let i = 0; i < 4; i++) {
    const g = f[i];
    out[(i + kk) % 4] = norm({ ...g, rotate: (((g.rotate ?? 0) + 90 * kk) % 360) as Rotation });
  }
  return out;
}

/** Left–right mirror of a glyph: an up-pointing triangle rotated r becomes rotated −r. */
export function mirrorGlyph(g: Glyph): Glyph {
  return norm({ ...g, rotate: ((360 - visualRotate(g)) % 360) as Rotation });
}

/** Left–right mirror of a figure: TL↔TR, BL↔BR. */
export function mirrorFigure(f: Glyph[]): Glyph[] {
  return [mirrorGlyph(f[1]), mirrorGlyph(f[0]), mirrorGlyph(f[3]), mirrorGlyph(f[2])];
}

/** k in 1..3 if `b` is `a` rotated by k·90° (k=0 means identical), else -1. */
export function rotationOf(a: Glyph[], b: Glyph[]): number {
  if (a.length !== 4 || b.length !== 4) return -1;
  const kb = figureKey(b);
  for (let k = 0; k < 4; k++) if (figureKey(rotateFigure(a, k)) === kb) return k;
  return -1;
}

// ───────────────────────────── matrix solver ─────────────────────────────

type AttrVal = string | number;
const ATTRS = ['shape', 'count', 'fill', 'rotate'] as const;
export type Attr = (typeof ATTRS)[number];
const FILL_ORDER = ['none', 'hatch', 'solid'];

function attrOf(g: Glyph, a: Attr): AttrVal {
  if (a === 'rotate') return visualRotate(g);
  return g[a];
}

/**
 * All values for cell (2,2) predicted by simple rules consistent with the 8 known cells
 * of one attribute. Families: constant; constant per row; constant per column;
 * each row a permutation of one 3-set; each column a permutation of one 3-set;
 * numeric linear v = base + a·r + b·c (count, fill order, rotation mod 360);
 * addition across rows / columns (count).
 */
export function predictAttr(grid: (AttrVal | null)[], attr: Attr): Set<string> {
  const v = (r: number, c: number) => grid[r * 3 + c] as AttrVal;
  const preds = new Set<string>();
  const known = grid.slice(0, 8) as AttrVal[];
  // constant
  if (known.every((x) => x === known[0])) preds.add(String(known[0]));
  // row-constant
  if ([0, 1].every((r) => v(r, 0) === v(r, 1) && v(r, 1) === v(r, 2)) && v(2, 0) === v(2, 1)) preds.add(String(v(2, 0)));
  // column-constant
  if ([0, 1].every((c) => v(0, c) === v(1, c) && v(1, c) === v(2, c)) && v(0, 2) === v(1, 2)) preds.add(String(v(0, 2)));
  // row permutations of the same 3-set
  {
    const set = new Set([v(0, 0), v(0, 1), v(0, 2)]);
    const row1 = new Set([v(1, 0), v(1, 1), v(1, 2)]);
    if (set.size === 3 && row1.size === 3 && [...row1].every((x) => set.has(x)) && v(2, 0) !== v(2, 1) && set.has(v(2, 0)) && set.has(v(2, 1))) {
      const rest = [...set].filter((x) => x !== v(2, 0) && x !== v(2, 1));
      preds.add(String(rest[0]));
    }
  }
  // column permutations of the same 3-set
  {
    const set = new Set([v(0, 0), v(1, 0), v(2, 0)]);
    const col1 = new Set([v(0, 1), v(1, 1), v(2, 1)]);
    if (set.size === 3 && col1.size === 3 && [...col1].every((x) => set.has(x)) && v(0, 2) !== v(1, 2) && set.has(v(0, 2)) && set.has(v(1, 2))) {
      const rest = [...set].filter((x) => x !== v(0, 2) && x !== v(1, 2));
      preds.add(String(rest[0]));
    }
  }
  // numeric families
  const num = (x: AttrVal): number => (attr === 'fill' ? FILL_ORDER.indexOf(x as string) : (x as number));
  if (attr === 'count' || attr === 'fill' || attr === 'rotate') {
    const mod = attr === 'rotate' ? 360 : 0;
    const n = (r: number, c: number) => num(v(r, c));
    const eq = (x: number, y: number) => (mod ? (((x - y) % mod) + mod) % mod === 0 : x === y);
    const base = n(0, 0);
    const b = n(0, 1) - base;
    const a = n(1, 0) - base;
    let ok = true;
    for (let i = 0; i < 8 && ok; i++) {
      const r = Math.floor(i / 3), c = i % 3;
      if (!eq(n(r, c), base + a * r + b * c)) ok = false;
    }
    if (ok) {
      let p = base + 2 * a + 2 * b;
      if (mod) p = ((p % mod) + mod) % mod;
      // a prediction outside the attribute's range is not a drawable answer, so it is not a rival rule
      if (attr === 'fill') {
        if (p >= 0 && p <= 2) preds.add(FILL_ORDER[p]);
      } else if (attr === 'rotate' || (p >= 1 && p <= 4)) preds.add(String(p));
    }
    if (attr === 'count') {
      // addition: col2 = col0 + col1 in each row / row2 = row0 + row1 in each column
      const addIf = (p: number) => { if (p >= 1 && p <= 4) preds.add(String(p)); };
      if ([0, 1].every((r) => n(r, 2) === n(r, 0) + n(r, 1))) addIf(n(2, 0) + n(2, 1));
      if ([0, 1].every((c) => n(2, c) === n(0, c) + n(1, c))) addIf(n(0, 2) + n(1, 2));
    }
  }
  return preds;
}

/**
 * For a matrix: per attribute, the set of defensible predictions. The item is
 * unambiguous iff every attribute has exactly one prediction.
 */
export function solveMatrix(cells: (Glyph | null)[]): Record<Attr, Set<string>> {
  const out = {} as Record<Attr, Set<string>>;
  for (const a of ATTRS) {
    out[a] = predictAttr(cells.map((g) => (g ? attrOf(g, a) : null)), a);
  }
  return out;
}

/** True iff glyph `g` satisfies every rule that the 8 known cells admit (and the rules are unambiguous). */
export function matrixAccepts(cells: (Glyph | null)[], g: Glyph): boolean {
  const sol = solveMatrix(cells);
  return ATTRS.every((a) => sol[a].size === 1 && sol[a].has(String(attrOf(g, a))));
}

/** Which attributes vary across the 8 known cells. */
export function varyingAttrs(cells: (Glyph | null)[]): Attr[] {
  return ATTRS.filter((a) => new Set(cells.slice(0, 8).map((g) => String(attrOf(g as Glyph, a)))).size > 1);
}

// ───────────────────────────── series solver ─────────────────────────────

const isInt = (x: number) => Number.isFinite(x) && Math.abs(x - Math.round(x)) < 1e-9;

function diffs(t: number[]): number[] {
  const d: number[] = [];
  for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
  return d;
}

export type SeriesFamily =
  | 'arith' | 'geom' | 'second-diff' | 'diff-geom' | 'fib' | 'affine' | 'period2-diff' | 'interleaved' | 'alt-ops';

/**
 * Predictions for the next term under every simple rule family that fits ALL shown terms
 * with at least one verifying constraint beyond its parameters.
 */
export function solveSeries(t: number[]): Map<SeriesFamily, number> {
  const n = t.length;
  const out = new Map<SeriesFamily, number>();
  const d = diffs(t);
  const last = t[n - 1];
  // arithmetic
  if (n >= 3 && d.every((x) => x === d[0])) out.set('arith', last + d[0]);
  // geometric
  if (n >= 3 && t[0] !== 0) {
    const r = t[1] / t[0];
    if (r !== 0 && t.every((x, i) => i === 0 || Math.abs(x - t[i - 1] * r) < 1e-9)) {
      const p = last * r;
      if (isInt(p)) out.set('geom', Math.round(p));
    }
  }
  // constant second difference
  if (n >= 4) {
    const dd = diffs(d);
    if (dd.every((x) => x === dd[0])) out.set('second-diff', last + d[d.length - 1] + dd[0]);
  }
  // differences form a geometric sequence
  if (n >= 4 && d[0] !== 0) {
    const q = d[1] / d[0];
    if (q !== 0 && d.every((x, i) => i === 0 || Math.abs(x - d[i - 1] * q) < 1e-9)) {
      const p = last + d[d.length - 1] * q;
      if (isInt(p)) out.set('diff-geom', Math.round(p));
    }
  }
  // fibonacci-like
  if (n >= 4 && t.every((x, i) => i < 2 || x === t[i - 1] + t[i - 2])) out.set('fib', t[n - 1] + t[n - 2]);
  // affine recurrence x' = p·x + q
  if (n >= 4 && t[1] !== t[0]) {
    const p = (t[2] - t[1]) / (t[1] - t[0]);
    const q = t[1] - p * t[0];
    if (t.every((x, i) => i === 0 || Math.abs(x - (p * t[i - 1] + q)) < 1e-9)) {
      const v = p * last + q;
      if (isInt(v)) out.set('affine', Math.round(v));
    }
  }
  // period-2 differences
  if (n >= 5 && d.every((x, i) => i < 2 || x === d[i - 2])) out.set('period2-diff', last + d[d.length - 2]);
  // two interleaved arithmetic sequences
  if (n >= 6) {
    const ev = t.filter((_, i) => i % 2 === 0);
    const od = t.filter((_, i) => i % 2 === 1);
    const de = diffs(ev), dO = diffs(od);
    if (de.every((x) => x === de[0]) && dO.every((x) => x === dO[0])) {
      out.set('interleaved', n % 2 === 0 ? ev[ev.length - 1] + de[0] : od[od.length - 1] + dO[0]);
    }
  }
  // alternating operations: ×k then +a (either phase)
  if (n >= 5) {
    for (const phase of [0, 1]) {
      const mulStep = phase; // index of the first multiply step
      const addStep = 1 - phase;
      if (t[mulStep] === 0) continue;
      const k = t[mulStep + 1] / t[mulStep];
      const a = t[addStep + 1] - t[addStep];
      if (!isInt(k) || k === 1 || k === 0) continue;
      let ok = true;
      for (let i = 0; i < n - 1 && ok; i++) {
        const isMul = (i + phase) % 2 === 0;
        const exp = isMul ? t[i] * k : t[i] + a;
        if (exp !== t[i + 1]) ok = false;
      }
      if (ok) {
        const isMul = (n - 1 + phase) % 2 === 0;
        const p = isMul ? last * k : last + a;
        const prev = out.get('alt-ops');
        if (prev === undefined) out.set('alt-ops', p);
        else if (prev !== p) out.set('alt-ops', NaN);
      }
    }
  }
  return out;
}

/** The unique defensible next term, or null if no family fits or families disagree. */
export function uniqueNext(t: number[]): number | null {
  const preds = [...solveSeries(t).values()];
  if (preds.length === 0) return null;
  const s = new Set(preds);
  if (s.size !== 1) return null;
  const v = preds[0];
  return Number.isFinite(v) ? v : null;
}
