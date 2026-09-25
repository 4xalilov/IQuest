import './SeriesRow.css';

export interface SeriesRowProps {
  terms: number[];
  /** Accessible label; defaults to the terms read out followed by "?". */
  label?: string;
}

export function SeriesRow({ terms, label }: SeriesRowProps) {
  return (
    <p class="iq-series" aria-label={label ?? `${terms.join(', ')}, ?`}>
      {terms.map((t, i) => (
        <span class="iq-series__term" key={i} aria-hidden="true">
          {t < 0 ? `−${Math.abs(t)}` : t}<span class="iq-series__sep">,</span>
        </span>
      ))}
      <span class="iq-series__q" aria-hidden="true">?</span>
    </p>
  );
}
