import type { Glyph as GlyphData } from '@iquest/engine';
import { Glyph } from './Glyph';
import './MatrixGrid.css';

export interface MatrixGridProps {
  cells: (GlyphData | null)[];
  /** Accessible description of the whole matrix (must not reveal the answer). */
  label?: string;
}

export function MatrixGrid({ cells, label = '3×3 matritsa, oxirgi katak boʻsh' }: MatrixGridProps) {
  return (
    <div class="iq-matrix" role="img" aria-label={label}>
      {cells.slice(0, 9).map((c, i) =>
        c ? (
          <div class="iq-matrix__cell" key={i}><Glyph glyph={c} /></div>
        ) : (
          <div class="iq-matrix__cell iq-matrix__cell--q" key={i} aria-hidden="true">?</div>
        ),
      )}
    </div>
  );
}
