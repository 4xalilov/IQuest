/**
 * Deterministic item generator. Same seed → identical TestForm (deep-equal JSON).
 * Every generated item is validated against the independent solvers in rules.ts and
 * regenerated (with the same PRNG stream, so still deterministic) if it is ambiguous.
 */
import type { Domain, Fill, Glyph, Item, Rotation, Section, ShapeKind, TestForm } from './types';
import {
  type Attr,
  figureKey,
  glyphKey,
  matrixAccepts,
  mirrorFigure,
  norm,
  rotateFigure,
  rotationOf,
  solveMatrix,
  uniqueNext,
} from './rules';

export const FORM_VERSION = 'v1';
export const SECTION_SECONDS = 300;
export const ITEMS_PER_SECTION = 9;
export const DOMAINS: Domain[] = ['pattern', 'numbers', 'spatial'];

// ───────────────────────────── PRNG ─────────────────────────────

export type Rng = () => number;

/** mulberry32 — tiny, fast, good enough for item generation. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
function shuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fresh random 32-bit seed for a new attempt (the app must store it; SessionState.seed does). */
export function randomSeed(): number {
  return (Math.floor(Math.random() * 0x100000000) >>> 0) || 1;
}

/** Put `correct` among `distractors` at a random index. */
function place<T>(rng: Rng, correct: T, distractors: T[]): { options: T[]; answer: number } {
  const answer = int(rng, 0, distractors.length);
  const options = distractors.slice();
  options.splice(answer, 0, correct);
  return { options, answer };
}

// ───────────────────────────── pattern / matrix ─────────────────────────────

const SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond'];
const FILLS: Fill[] = ['none', 'hatch', 'solid'];
const ROTS: Rotation[] = [0, 90, 180, 270];
type Mode = 'row' | 'col' | 'latin' | 'latin2';

/** Per-item difficulty plan: how many attributes vary and how many of them follow a latin-square rule. */
type MatrixPlan = { vary: number; latin: number; easy?: boolean };
const MATRIX_PLAN: MatrixPlan[] = [
  { vary: 1, latin: 0, easy: true }, // count progression only: the most salient rule
  { vary: 1, latin: 0 },
  { vary: 1, latin: 1 },
  { vary: 2, latin: 0 },
  { vary: 2, latin: 1 },
  { vary: 2, latin: 2 },
  { vary: 3, latin: 1 },
  { vary: 3, latin: 2 },
  { vary: 3, latin: 3 },
];

function cellIndex(mode: Mode, r: number, c: number): number {
  switch (mode) {
    case 'row': return r;
    case 'col': return c;
    case 'latin': return (r + c) % 3;
    case 'latin2': return (r + 2 * c) % 3;
  }
}

export interface MatrixMeta { vary: Attr[]; modes: Partial<Record<Attr, Mode>>; difficulty: number }

function genMatrix(rng: Rng, id: string, plan: MatrixPlan): { item: Item; meta: MatrixMeta } {
  for (let attempt = 0; attempt < 200; attempt++) {
    // choose which attributes vary (shape and rotation never both: rotation only on triangles)
    const combos: Attr[][] = (
      [
        ['shape'], ['count'], ['fill'], ['rotate'],
        ['shape', 'count'], ['shape', 'fill'], ['count', 'fill'], ['count', 'rotate'], ['fill', 'rotate'],
        ['shape', 'count', 'fill'], ['count', 'fill', 'rotate'],
      ] as Attr[][]
    ).filter((c) => c.length === plan.vary && (!plan.easy || c[0] === 'count'));
    const vary = pick(rng, combos);
    const latinSet = new Set(shuffle(rng, vary).slice(0, plan.latin));
    const modes: Partial<Record<Attr, Mode>> = {};
    for (const a of vary) modes[a] = latinSet.has(a) ? pick(rng, ['latin', 'latin2'] as const) : pick(rng, ['row', 'col'] as const);

    // values
    const progression = <T>(xs: T[]) => (rng() < 0.5 ? xs : xs.slice().reverse());
    const shapeVals = shuffle(rng, SHAPES).slice(0, 3);
    const countStart = int(rng, 1, 2);
    const countVals = modes.count && modes.count.startsWith('latin')
      ? shuffle(rng, [countStart, countStart + 1, countStart + 2])
      : progression([countStart, countStart + 1, countStart + 2]);
    const fillVals = shuffle(rng, FILLS);
    const rotStart = pick(rng, [0, 90] as const);
    const rotVals = modes.rotate && modes.rotate.startsWith('latin')
      ? shuffle(rng, ROTS).slice(0, 3)
      : progression([rotStart, rotStart + 90, rotStart + 180]);

    const cShape: ShapeKind = modes.rotate ? 'triangle' : pick(rng, SHAPES);
    const cCount = int(rng, 1, 3);
    const cFill = pick(rng, FILLS);
    const cRot: Rotation = modes.shape ? 0 : pick(rng, ROTS); // mixed shapes: triangles stay upright

    const at = (r: number, c: number): Glyph => {
      const shape = modes.shape ? shapeVals[cellIndex(modes.shape, r, c)] : cShape;
      const count = (modes.count ? countVals[cellIndex(modes.count, r, c)] : cCount) as Glyph['count'];
      const fill = modes.fill ? fillVals[cellIndex(modes.fill, r, c)] : cFill;
      const rotate = (modes.rotate ? rotVals[cellIndex(modes.rotate, r, c)] : cRot) as Rotation;
      return norm({ shape, count, fill, rotate });
    };
    const cells: (Glyph | null)[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(r === 2 && c === 2 ? null : at(r, c));
    const correct = at(2, 2);

    // must be unambiguous: every attribute has exactly one defensible prediction = correct
    if (!matrixAccepts(cells, correct)) continue;
    // all 8 visible cells + answer must not be visually constant
    const sol = solveMatrix(cells);
    if (Object.values(sol).some((s) => s.size !== 1)) continue;

    const distractors = matrixDistractors(rng, cells, correct);
    if (!distractors) continue;
    const { options, answer } = place(rng, correct, distractors);
    return {
      item: { id, domain: 'pattern', kind: 'matrix', cells, options, answer },
      meta: { vary, modes, difficulty: plan.vary * 2 + plan.latin - (plan.easy ? 1 : 0) },
    };
  }
  throw new Error('matrix generation failed');
}

function mutate(g: Glyph, a: Attr, v: string | number): Glyph {
  switch (a) {
    case 'shape': return norm({ ...g, shape: v as ShapeKind, rotate: v === 'triangle' ? (g.rotate ?? 0) : undefined });
    case 'count': return norm({ ...g, count: v as Glyph['count'] });
    case 'fill': return norm({ ...g, fill: v as Fill });
    case 'rotate': return norm({ ...g, rotate: v as Rotation });
  }
}

function altValues(g: Glyph, a: Attr): (string | number)[] {
  switch (a) {
    case 'shape': return SHAPES.filter((s) => s !== g.shape);
    case 'count': return [1, 2, 3, 4].filter((n) => n !== g.count);
    case 'fill': return FILLS.filter((f) => f !== g.fill);
    case 'rotate': return g.shape === 'triangle' ? ROTS.filter((r) => r !== (g.rotate ?? 0)) : [];
  }
}

/** 7 unique distractors, each differing from the answer in exactly 1 or 2 attributes. */
function matrixDistractors(rng: Rng, cells: (Glyph | null)[], correct: Glyph): Glyph[] | null {
  const seenVal = (a: Attr, v: string | number) =>
    cells.some((g) => g && (a === 'rotate' ? (g.rotate ?? 0) === v : g[a] === v));
  const attrs: Attr[] = ['shape', 'count', 'fill', 'rotate'];
  const singles: Glyph[] = [];
  const plausibleSingles: Glyph[] = [];
  for (const a of attrs) {
    for (const v of altValues(correct, a)) {
      const g = mutate(correct, a, v);
      (seenVal(a, v) ? plausibleSingles : singles).push(g);
    }
  }
  const doubles: Glyph[] = [];
  for (let i = 0; i < attrs.length; i++) {
    for (let j = i + 1; j < attrs.length; j++) {
      for (const v1 of altValues(correct, attrs[i])) {
        const g1 = mutate(correct, attrs[i], v1);
        for (const v2 of altValues(g1, attrs[j])) {
          if (attrs[j] === 'rotate' && attrs[i] === 'shape' && g1.shape !== 'triangle') continue;
          doubles.push(mutate(g1, attrs[j], v2));
        }
      }
    }
  }
  const keyC = glyphKey(correct);
  const out: Glyph[] = [];
  const keys = new Set<string>([keyC]);
  const take = (pool: Glyph[], n: number) => {
    for (const g of pool) {
      if (out.length >= 7 || n <= 0) break;
      const k = glyphKey(g);
      if (keys.has(k) || matrixAccepts(cells, g)) continue;
      keys.add(k);
      out.push(g);
      n--;
    }
  };
  take(shuffle(rng, plausibleSingles), 4);
  take(shuffle(rng, doubles), 3);
  take(shuffle(rng, singles), 7);
  take(shuffle(rng, doubles), 7);
  return out.length === 7 ? out : null;
}

// ───────────────────────────── numbers / series ─────────────────────────────

export type SeriesKind =
  | 'arith' | 'arith-big' | 'geom' | 'period2' | 'second-diff' | 'fib' | 'interleaved' | 'affine' | 'alt-ops';

/** Series kinds in increasing difficulty; item i of the section uses SERIES_PLAN[i]. */
export const SERIES_PLAN: SeriesKind[] = ['arith', 'arith-big', 'geom', 'period2', 'second-diff', 'fib', 'interleaved', 'affine', 'alt-ops'];

function seriesTerms(rng: Rng, kind: SeriesKind): { terms: number[]; next: number } {
  const len = kind === 'arith' || kind === 'arith-big' || kind === 'geom' || kind === 'affine' ? 5 : 6;
  const seq: number[] = [];
  switch (kind) {
    case 'arith': {
      const d = int(rng, 2, 5), a = int(rng, 1, 20);
      for (let i = 0; i <= len; i++) seq.push(a + d * i);
      break;
    }
    case 'arith-big': {
      const d = int(rng, 6, 13) * (rng() < 0.5 ? -1 : 1);
      const a = d < 0 ? int(rng, 80, 150) : int(rng, 3, 40);
      for (let i = 0; i <= len; i++) seq.push(a + d * i);
      break;
    }
    case 'geom': {
      const r = pick(rng, [2, 3]), a = r === 2 ? int(rng, 1, 6) : int(rng, 1, 3);
      for (let i = 0; i <= len; i++) seq.push(a * r ** i);
      break;
    }
    case 'period2': {
      const up = int(rng, 4, 9), down = int(rng, 1, up - 1), a = int(rng, 2, 20);
      seq.push(a);
      for (let i = 0; i < len; i++) seq.push(seq[i] + (i % 2 === 0 ? up : -down));
      break;
    }
    case 'second-diff': {
      const d0 = int(rng, 1, 4), dd = int(rng, 1, 3), a = int(rng, 1, 15);
      seq.push(a);
      for (let i = 0; i < len; i++) seq.push(seq[i] + d0 + dd * i);
      break;
    }
    case 'fib': {
      const a = int(rng, 1, 5), b = int(rng, a, 8);
      seq.push(a, b);
      while (seq.length <= len) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
      break;
    }
    case 'interleaved': {
      const a = int(rng, 1, 10), da = int(rng, 2, 5);
      const b = int(rng, 30, 60), db = -int(rng, 2, 6);
      for (let i = 0; i <= len; i++) seq.push(i % 2 === 0 ? a + da * (i / 2) : b + db * ((i - 1) / 2));
      break;
    }
    case 'affine': {
      const p = pick(rng, [2, 3]), q = pick(rng, p === 2 ? [1, -1, 2, 3] : [1, -1]);
      seq.push(int(rng, 2, 5));
      for (let i = 0; i < len; i++) seq.push(seq[i] * p + q);
      break;
    }
    case 'alt-ops': {
      const k = 2, a = int(rng, 1, 5);
      seq.push(int(rng, 1, 5));
      const phase = int(rng, 0, 1);
      for (let i = 0; i < len; i++) seq.push((i + phase) % 2 === 0 ? seq[i] * k : seq[i] + a);
      break;
    }
  }
  return { terms: seq.slice(0, len), next: seq[len] };
}

/** 5 unique near-miss distractors, none of which any simple rule fitting the terms would produce. */
function seriesDistractors(rng: Rng, terms: number[], ans: number): number[] | null {
  const n = terms.length;
  const last = terms[n - 1];
  const dLast = last - terms[n - 2];
  const dFirst = terms[1] - terms[0];
  const step = ans - last;
  const ruleish = shuffle(rng, [
    last + dLast, // "keep the last difference"
    last + dFirst, // "keep the first difference"
    last + step + (step > 0 ? 1 : -1) * Math.max(1, Math.abs(dLast - step)),
    ans + dLast - step,
    last * 2,
    terms[n - 2] + last,
    last - dLast,
  ]);
  const near = shuffle(rng, [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + step, ans - step]);
  const out: number[] = [];
  const add = (v: number) => {
    if (out.length >= 5) return;
    if (!Number.isInteger(v) || v < 0 || v > 9999 || v === ans || out.includes(v)) return;
    out.push(v);
  };
  for (const v of ruleish.slice(0, 4)) add(v);
  for (const v of near) add(v);
  for (const v of ruleish) add(v);
  for (let k = 3; out.length < 5 && k < 50; k++) { add(ans + k); add(ans - k); }
  return out.length === 5 ? out : null;
}

function genSeries(rng: Rng, id: string, kind: SeriesKind): Item {
  for (let attempt = 0; attempt < 200; attempt++) {
    const { terms, next } = seriesTerms(rng, kind);
    if ([...terms, next].some((x) => x < 0 || x > 9999)) continue;
    if (uniqueNext(terms) !== next) continue; // ambiguous or undetected — try other parameters
    const d = seriesDistractors(rng, terms, next);
    if (!d) continue;
    const { options, answer } = place(rng, next, d);
    return { id, domain: 'numbers', kind: 'series', terms, options, answer };
  }
  throw new Error('series generation failed');
}

// ───────────────────────────── spatial / rotation ─────────────────────────────

/** Per-item plan: triangles in the figure and number of mirror distractors (of 4). */
const SPATIAL_PLAN: { tri: number; mirrors: number; subtle: boolean }[] = [
  { tri: 0, mirrors: 1, subtle: false },
  { tri: 1, mirrors: 1, subtle: false },
  { tri: 1, mirrors: 2, subtle: false },
  { tri: 1, mirrors: 2, subtle: true },
  { tri: 2, mirrors: 2, subtle: true },
  { tri: 2, mirrors: 3, subtle: true },
  { tri: 2, mirrors: 3, subtle: true },
  { tri: 3, mirrors: 3, subtle: true },
  { tri: 3, mirrors: 4, subtle: true },
];

function randomGlyph(rng: Rng, triangle: boolean): Glyph {
  if (triangle) return norm({ shape: 'triangle', count: 1, fill: pick(rng, FILLS), rotate: pick(rng, ROTS) });
  return { shape: pick(rng, ['circle', 'square', 'diamond'] as const), count: 1, fill: pick(rng, FILLS) };
}

function genRotation(rng: Rng, id: string, plan: { tri: number; mirrors: number; subtle: boolean }): Item {
  for (let attempt = 0; attempt < 500; attempt++) {
    const triSlots = new Set(shuffle(rng, [0, 1, 2, 3]).slice(0, plan.tri));
    const target = [0, 1, 2, 3].map((i) => randomGlyph(rng, triSlots.has(i)));
    // no rotational symmetry, and the mirror image must not be a rotation (chiral figure)
    if ([1, 2, 3].some((k) => figureKey(rotateFigure(target, k)) === figureKey(target))) continue;
    const mirror = mirrorFigure(target);
    if (rotationOf(target, mirror) >= 0) continue;
    // at least 3 visually distinct glyphs so the figure is readable
    if (new Set(target.map(glyphKey)).size < 3) continue;

    const k = int(rng, 1, 3);
    const correct = rotateFigure(target, k);
    const keys = new Set<string>([figureKey(correct), figureKey(target)]);
    const distractors: Glyph[][] = [];
    const push = (f: Glyph[]) => {
      const key = figureKey(f);
      if (keys.has(key) || rotationOf(target, f) >= 0) return false;
      keys.add(key);
      distractors.push(f);
      return true;
    };
    // mirror images at different rotations (prefer the same rotation as the answer first: hardest)
    const js = plan.mirrors >= 3 ? [k, ...shuffle(rng, [0, 1, 2, 3].filter((j) => j !== k))] : shuffle(rng, [0, 1, 2, 3]);
    for (const j of js) {
      if (distractors.length >= plan.mirrors) break;
      push(rotateFigure(mirror, j));
    }
    // rotations of the target with exactly one glyph changed
    for (let tries = 0; distractors.length < 4 && tries < 60; tries++) {
      const base = rotateFigure(target, pick(rng, [k, k, int(rng, 0, 3)]));
      const slot = int(rng, 0, 3);
      const g = base[slot];
      let changed: Glyph;
      if (plan.subtle && g.shape === 'triangle' && rng() < 0.6) changed = norm({ ...g, rotate: (((g.rotate ?? 0) + pick(rng, [90, 180, 270])) % 360) as Rotation });
      else if (plan.subtle || rng() < 0.5) changed = { ...g, fill: pick(rng, FILLS.filter((f) => f !== g.fill)) };
      else {
        const shape = pick(rng, SHAPES.filter((s) => s !== g.shape));
        changed = norm({ ...g, shape, rotate: shape === 'triangle' ? pick(rng, ROTS) : undefined });
      }
      const f = base.slice();
      f[slot] = changed;
      push(f);
    }
    if (distractors.length !== 4) continue;
    const { options, answer } = place(rng, correct, distractors);
    return { id, domain: 'spatial', kind: 'rotation', target, options, answer };
  }
  throw new Error('rotation generation failed');
}

// ───────────────────────────── form ─────────────────────────────

export interface FormMeta { matrix: MatrixMeta[]; series: SeriesKind[]; spatial: typeof SPATIAL_PLAN }

/** buildForm plus generation metadata (difficulty plan) — used by tests and analytics. */
export function buildFormWithMeta(seed = 1): { form: TestForm; meta: FormMeta } {
  const s = seed >>> 0;
  const rng = mulberry32(s);
  const practice: Item[] = [
    genMatrix(rng, 'x-pattern', { vary: 1, latin: 0, easy: true }).item,
    genSeries(rng, 'x-numbers', 'arith'),
  ];
  const matrixMeta: MatrixMeta[] = [];
  const sections: Section[] = DOMAINS.map((domain) => {
    const items: Item[] = [];
    for (let i = 0; i < ITEMS_PER_SECTION; i++) {
      const id = `${domain[0]}${i + 1}`;
      if (domain === 'pattern') {
        const { item, meta } = genMatrix(rng, id, MATRIX_PLAN[i]);
        matrixMeta.push(meta);
        items.push(item);
      } else if (domain === 'numbers') items.push(genSeries(rng, id, SERIES_PLAN[i]));
      else items.push(genRotation(rng, id, SPATIAL_PLAN[i]));
    }
    return { domain, titleKey: `section.${domain}`, seconds: SECTION_SECONDS, items };
  });
  return {
    form: { id: `iq-${FORM_VERSION}-${s}`, version: FORM_VERSION, sections, practice },
    meta: { matrix: matrixMeta, series: SERIES_PLAN.slice(), spatial: SPATIAL_PLAN.map((p) => ({ ...p })) },
  };
}

/** Deterministic: the same seed always yields the same form. Default seed 1 (use randomSeed() for variety). */
export function buildForm(seed?: number): TestForm {
  return buildFormWithMeta(seed ?? 1).form;
}
