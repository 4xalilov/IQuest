import './SeriesRow.css';

export interface SeriesRowProps {
  terms: number[];
  /** Accessible label; defaults to the terms read out followed by "?". */
  label?: string;
}

const fmt = (t: number) => (t < 0 ? `−${Math.abs(t)}` : String(t));

export function SeriesRow({ terms, label }: SeriesRowProps) {
  return (
    <p class="iq-series" aria-label={label ?? `${terms.join(', ')}, ?`}>
      {terms.slice(0, -1).map((t, i) => (
        <span class="iq-series__term" key={i} aria-hidden="true">{fmt(t)}<span class="iq-series__sep">,</span></span>
      ))}
      {/* last term and "?" never separate across lines */}
      <span class="iq-series__term" aria-hidden="true">
        {terms.length > 0 && <>{fmt(terms[terms.length - 1])}<span class="iq-series__sep">,</span> </>}
        <span class="iq-series__q">?</span>
      </span>
    </p>
  );
}
