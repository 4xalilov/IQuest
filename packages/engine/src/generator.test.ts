import { describe, expect, it } from 'vitest';
import { buildForm, buildFormWithMeta } from './generator';
import { figureKey, glyphKey, matrixAccepts, mirrorFigure, rotateFigure, rotationOf, solveMatrix, solveSeries, uniqueNext, varyingAttrs } from './rules';
import type { Glyph, Item } from './types';

const SEEDS = Array.from({ length: 150 }, (_, i) => i * 7919 + 1);

function allItems(seed: number): Item[] {
  const f = buildForm(seed);
  return [...f.practice, ...f.sections.flatMap((s) => s.items)];
}

describe('buildForm', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(buildForm(42))).toBe(JSON.stringify(buildForm(42)));
    expect(JSON.stringify(buildForm())).toBe(JSON.stringify(buildForm(1)));
    expect(JSON.stringify(buildForm(42))).not.toBe(JSON.stringify(buildForm(43)));
  });

  it('has the contract shape', () => {
    const f = buildForm(7);
    expect(f.practice).toHaveLength(2);
    expect(f.sections.map((s) => s.domain)).toEqual(['pattern', 'numbers', 'spatial']);
    for (const s of f.sections) {
      expect(s.items).toHaveLength(9);
      expect(s.titleKey).toBe(`section.${s.domain}`);
      expect(s.seconds).toBeGreaterThan(0);
      expect(s.items.every((i) => i.domain === s.domain)).toBe(true);
    }
    const ids = allItems(7).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(JSON.parse(JSON.stringify(f))).toEqual(f);
  });

  it('every item has unique-looking options and a valid, randomised answer index', () => {
    const answerPos = new Map<string, Set<number>>();
    for (const seed of SEEDS) {
      for (const it of allItems(seed)) {
        expect(Number.isInteger(it.answer)).toBe(true);
        expect(it.answer).toBeGreaterThanOrEqual(0);
        expect(it.answer).toBeLessThan(it.options.length);
        const keys =
          it.kind === 'matrix' ? it.options.map(glyphKey) : it.kind === 'series' ? it.options.map(String) : it.options.map(figureKey);
        expect(new Set(keys).size).toBe(keys.length);
        const want = it.kind === 'matrix' ? 8 : it.kind === 'series' ? 6 : 5;
        expect(it.options).toHaveLength(want);
        const set = answerPos.get(it.kind) ?? new Set();
        set.add(it.answer);
        answerPos.set(it.kind, set);
      }
    }
    expect(answerPos.get('matrix')!.size).toBe(8);
    expect(answerPos.get('series')!.size).toBe(6);
    expect(answerPos.get('rotation')!.size).toBe(5);
  });
});

describe('matrix items', () => {
  it('cells: 9, last null; the correct option satisfies the rules and no distractor does', () => {
    for (const seed of SEEDS) {
      for (const it of allItems(seed)) {
        if (it.kind !== 'matrix') continue;
        expect(it.cells).toHaveLength(9);
        expect(it.cells[8]).toBeNull();
        expect(it.cells.slice(0, 8).every(Boolean)).toBe(true);
        // unambiguous: exactly one defensible value for every attribute
        for (const preds of Object.values(solveMatrix(it.cells))) expect(preds.size).toBe(1);
        it.options.forEach((o, i) => expect(matrixAccepts(it.cells, o)).toBe(i === it.answer));
      }
    }
  });

  it('distractors differ from the answer in exactly 1 or 2 attributes', () => {
    const diff = (a: Glyph, b: Glyph) =>
      Number(a.shape !== b.shape) + Number(a.count !== b.count) + Number(a.fill !== b.fill) +
      Number(a.shape === 'triangle' && b.shape === 'triangle' && (a.rotate ?? 0) !== (b.rotate ?? 0));
    for (const seed of SEEDS.slice(0, 50)) {
      for (const it of allItems(seed)) {
        if (it.kind !== 'matrix') continue;
        const c = it.options[it.answer];
        it.options.forEach((o, i) => {
          if (i === it.answer) return;
          const d = diff(o, c);
          expect(d).toBeGreaterThanOrEqual(1);
          expect(d).toBeLessThanOrEqual(2);
        });
      }
    }
  });

  it('never uses color, and rotate appears only on triangles', () => {
    for (const it of allItems(3)) {
      if (it.kind !== 'matrix') continue;
      for (const g of [...it.cells, ...it.options]) {
        if (!g) continue;
        expect(Object.keys(g).every((k) => ['shape', 'count', 'fill', 'rotate'].includes(k))).toBe(true);
        if (g.shape !== 'triangle') expect(g.rotate).toBeUndefined();
        expect(g.count).toBeGreaterThanOrEqual(1);
        expect(g.count).toBeLessThanOrEqual(4);
      }
    }
  });

  it('difficulty increases through the section (number of varying rules non-decreasing)', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const { form, meta } = buildFormWithMeta(seed);
      const items = form.sections[0].items;
      const vary = items.map((it) => (it.kind === 'matrix' ? varyingAttrs(it.cells).length : 0));
      for (let i = 1; i < vary.length; i++) expect(vary[i]).toBeGreaterThanOrEqual(vary[i - 1]);
      const d = meta.matrix.map((m) => m.difficulty);
      for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1]);
      expect(vary[0]).toBe(1);
      expect(vary[8]).toBe(3);
    }
  });
});

describe('series items', () => {
  it('have 5–6 small terms, exactly one defensible continuation, which is the answer', () => {
    for (const seed of SEEDS) {
      for (const it of allItems(seed)) {
        if (it.kind !== 'series') continue;
        expect(it.terms.length).toBeGreaterThanOrEqual(5);
        expect(it.terms.length).toBeLessThanOrEqual(6);
        for (const x of [...it.terms, ...it.options]) {
          expect(Number.isInteger(x)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(9999);
        }
        const next = uniqueNext(it.terms);
        expect(next).toBe(it.options[it.answer]);
        const preds = new Set(solveSeries(it.terms).values());
        it.options.forEach((o, i) => {
          if (i !== it.answer) expect(preds.has(o)).toBe(false);
        });
      }
    }
  });

  it('solver recognises the classic families', () => {
    expect(uniqueNext([2, 4, 6, 8, 10])).toBe(12);
    expect(uniqueNext([3, 6, 12, 24, 48])).toBe(96);
    expect(uniqueNext([1, 2, 4, 7, 11, 16])).toBe(22);
    expect(uniqueNext([2, 3, 5, 8, 13, 21])).toBe(34);
    expect(uniqueNext([5, 40, 8, 37, 11, 34])).toBe(14);
    expect(uniqueNext([3, 6, 9, 18, 21, 42])).toBe(45);
    expect(uniqueNext([1, 2])).toBeNull();
  });

  it('difficulty increases: section uses families in the planned order', () => {
    const { meta } = buildFormWithMeta(5);
    expect(meta.series).toEqual(['arith', 'arith-big', 'geom', 'period2', 'second-diff', 'fib', 'interleaved', 'affine', 'alt-ops']);
  });
});

describe('spatial items', () => {
  it('exactly one option is a pure rotation of the target; the target is chiral', () => {
    for (const seed of SEEDS) {
      for (const it of allItems(seed)) {
        if (it.kind !== 'rotation') continue;
        expect(it.target).toHaveLength(4);
        expect(it.options.every((o) => o.length === 4)).toBe(true);
        expect(rotationOf(it.target, mirrorFigure(it.target))).toBe(-1);
        it.options.forEach((o, i) => {
          const k = rotationOf(it.target, o);
          if (i === it.answer) expect(k).toBeGreaterThan(0);
          else expect(k).toBe(-1);
        });
      }
    }
  });

  it('distractors are mirror images or one-glyph changes of a rotation', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      for (const it of allItems(seed)) {
        if (it.kind !== 'rotation') continue;
        it.options.forEach((o, i) => {
          if (i === it.answer) return;
          const isMirror = rotationOf(mirrorFigure(it.target), o) >= 0;
          const oneChanged = [0, 1, 2, 3].some((k) => {
            const r = rotateFigure(it.target, k);
            return r.filter((g, j) => glyphKey(g) !== glyphKey(o[j])).length === 1;
          });
          expect(isMirror || oneChanged).toBe(true);
        });
      }
    }
  });

  it('rotation helpers: 4 quarter turns = identity; mirror twice = identity', () => {
    const f: Glyph[] = [
      { shape: 'triangle', count: 1, fill: 'none', rotate: 90 },
      { shape: 'circle', count: 1, fill: 'solid' },
      { shape: 'square', count: 1, fill: 'hatch' },
      { shape: 'diamond', count: 1, fill: 'none' },
    ];
    expect(figureKey(rotateFigure(rotateFigure(f, 2), 2))).toBe(figureKey(f));
    expect(figureKey(mirrorFigure(mirrorFigure(f)))).toBe(figureKey(f));
    const r1 = rotateFigure(f, 1);
    expect(r1[1]).toEqual({ shape: 'triangle', count: 1, fill: 'none', rotate: 180 });
    expect(r1[0]).toEqual(f[3]);
  });

  it('difficulty increases: more mirror distractors later in the section', () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const f = buildForm(seed);
      const mirrors = f.sections[2].items.map((it) =>
        it.kind === 'rotation' ? it.options.filter((o) => rotationOf(mirrorFigure(it.target), o) >= 0).length : 0,
      );
      for (let i = 1; i < mirrors.length; i++) expect(mirrors[i]).toBeGreaterThanOrEqual(mirrors[i - 1]);
    }
  });
});
