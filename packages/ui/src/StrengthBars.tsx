import './StrengthBars.css';

export interface StrengthRow { label: string; value: number; word: string }
export interface StrengthBarsProps {
  rows: StrengthRow[];
}

/** Horizontal bars with a word, no numbers (§7). */
export function StrengthBars({ rows }: StrengthBarsProps) {
  return (
    <dl class="iq-bars">
      {rows.map((r) => {
        const v = Math.max(0.04, Math.min(1, r.value));
        return (
          <div class="iq-bars__row" key={r.label}>
            <dt class="iq-bars__label">{r.label}</dt>
            <dd class="iq-bars__track" aria-hidden="true"><i style={{ width: `${(v * 100).toFixed(1)}%` }} /></dd>
            <dd class="iq-bars__word">{r.word}</dd>
          </div>
        );
      })}
    </dl>
  );
}
