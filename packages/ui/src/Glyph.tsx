import type { Glyph as GlyphData, ShapeKind } from '@iquest/engine';
import { useMemo } from 'preact/hooks';
import { cx, uid } from './util';
import './Glyph.css';

/*
 * Item graphics (DESIGN.md §6): monochrome, stroke = currentColor 2px (non-scaling),
 * fill none / 45° hatch / solid. Rules never depend on colour.
 * All geometry lives in a 100×100 viewBox.
 */

type Pt = readonly [number, number];

/** Shape centres and half-size for count 1–4 (100×100 box). */
const LAYOUT: Record<1 | 2 | 3 | 4, { pts: Pt[]; s: number }> = {
  1: { pts: [[50, 50]], s: 27 },
  2: { pts: [[28, 50], [72, 50]], s: 17 },
  3: { pts: [[50, 29], [27, 69], [73, 69]], s: 15.5 },
  4: { pts: [[30, 30], [70, 30], [30, 70], [70, 70]], s: 15 },
};

/** Unit polygons (half-size 1, centred on 0,0; y down). Triangle apex points UP. */
const POLY: Record<Exclude<ShapeKind, 'circle'>, Pt[]> = {
  square: [[-0.88, -0.88], [0.88, -0.88], [0.88, 0.88], [-0.88, 0.88]],
  triangle: [[0, -1.2], [1.08, 0.6], [-1.08, 0.6]],
  diamond: [[0, -1.1], [0.88, 0], [0, 1.1], [-0.88, 0]],
};

/** Placement of a glyph's 100×100 box inside the parent SVG (used by Figure). */
export interface Place { x: number; y: number; scale: number }
const IDENTITY: Place = { x: 50, y: 50, scale: 1 };

/**
 * Geometry is computed in final coordinates (no SVG transforms), so rotation is
 * applied to each copy around its own centre while the hatch pattern stays in
 * screen space with constant density (engine convention, types.ts).
 */
function shapeEl(kind: ShapeKind, cx: number, cy: number, s: number, rot: number, fill: string, at: Place, key: number) {
  const k = at.scale;
  const X = at.x + (cx - 50) * k;
  const Y = at.y + (cy - 50) * k;
  const S = s * k;
  const common = { key, fill, stroke: 'currentColor', 'stroke-width': 2, 'stroke-linejoin': 'round' as const, 'vector-effect': 'non-scaling-stroke' };
  if (kind === 'circle') return <circle cx={X} cy={Y} r={S} {...common} />;
  const a = (rot * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const d = POLY[kind]
    .map(([px, py], i) => `${i ? 'L' : 'M'}${(X + (px * cos - py * sin) * S).toFixed(2)} ${(Y + (px * sin + py * cos) * S).toFixed(2)}`)
    .join('') + 'Z';
  return <path d={d} {...common} />;
}

/** SVG <pattern> for the hatch fill. Place inside <defs>. */
export function HatchPattern({ id }: { id: string }) {
  return (
    <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" stroke-width="2.4" />
    </pattern>
  );
}

/** Glyph shapes as an SVG group in a 100×100 box (no <svg> wrapper). */
export function GlyphShapes({ glyph, hatchId, at = IDENTITY }: { glyph: GlyphData; hatchId: string; at?: Place }) {
  const { pts, s } = LAYOUT[glyph.count] ?? LAYOUT[1];
  const fill = glyph.fill === 'solid' ? 'currentColor' : glyph.fill === 'hatch' ? `url(#${hatchId})` : 'none';
  const r = glyph.rotate ?? 0;
  return <g>{pts.map(([x, y], i) => shapeEl(glyph.shape, x, y, s, r, fill, at, i))}</g>;
}

export interface GlyphProps {
  glyph: GlyphData;
  /** Rendered size in px; omitted = fills its container (100%). */
  size?: number;
  class?: string;
  /** Accessible label; omitted = decorative (aria-hidden). */
  label?: string;
}

export function Glyph({ glyph, size, class: klass, label }: GlyphProps) {
  const hatchId = useMemo(() => uid('iq-hatch'), []);
  return (
    <svg
      class={cx('iq-glyph', klass)}
      viewBox="0 0 100 100"
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {glyph.fill === 'hatch' && <defs><HatchPattern id={hatchId} /></defs>}
      <GlyphShapes glyph={glyph} hatchId={hatchId} />
    </svg>
  );
}
