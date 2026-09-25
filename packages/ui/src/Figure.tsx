import type { Glyph as GlyphData } from '@iquest/engine';
import { useMemo } from 'preact/hooks';
import { GlyphShapes, HatchPattern } from './Glyph';
import type { Place } from './Glyph';
import { cx, uid } from './util';
import './Glyph.css';

export type Slot = Place;

/**
 * Rendering convention for spatial figures (engine types.ts): glyph i sits in
 * slot i of a 2×2 grid, clockwise from top-left (0 TL, 1 TR, 2 BR, 3 BL), each at
 * half scale. The engine pre-rotates options (slot shift + glyph.rotate), so the
 * UI draws figures as given. A single glyph is centred at full scale.
 */
export function figureLayout(n: number): Slot[] {
  if (n <= 1) return [{ x: 50, y: 50, scale: 1 }];
  const slots: Slot[] = [
    { x: 25, y: 25, scale: 0.5 },
    { x: 75, y: 25, scale: 0.5 },
    { x: 75, y: 75, scale: 0.5 },
    { x: 25, y: 75, scale: 0.5 },
  ];
  return slots.slice(0, Math.min(n, 4));
}

export interface FigureProps {
  glyphs: GlyphData[];
  size?: number;
  class?: string;
  label?: string;
}

export function Figure({ glyphs, size, class: klass, label }: FigureProps) {
  const hatchId = useMemo(() => uid('iq-hatch'), []);
  const slots = figureLayout(glyphs.length);
  const hasHatch = glyphs.some((g) => g.fill === 'hatch');
  return (
    <svg
      class={cx('iq-glyph', 'iq-figure', klass)}
      viewBox="0 0 100 100"
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {hasHatch && <defs><HatchPattern id={hatchId} /></defs>}
      <g>
        {glyphs.slice(0, 4).map((g, i) => {
          const s = slots[i];
          return (
            <GlyphShapes key={i} glyph={g} hatchId={hatchId} at={s} />
          );
        })}
      </g>
    </svg>
  );
}
