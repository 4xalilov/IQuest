import type { ComponentChildren } from 'preact';
import { cx } from './util';
import './SectionProgress.css';

export interface SectionProgressProps {
  /** 1-based current section (display number). */
  section: number;
  sections: number;
  /** 1-based current item (display number); segments 1..item are filled. */
  item: number;
  items: number;
  /** Localised label, e.g. "Naqsh · 1/3-boʻlim". */
  label: string;
  /** Extension: content at the end of the label row (e.g. CalmTimer). */
  aside?: ComponentChildren;
}

export function SectionProgress({ section, sections, item, items, label, aside }: SectionProgressProps) {
  const done = Math.max(0, Math.min(item, items));
  return (
    <div class="iq-progress">
      <div class="iq-progress__head">
        <span class="iq-progress__label" data-section={section} data-sections={sections}>{label}</span>
        {aside}
      </div>
      <div class="iq-progress__row">
        <div
          class="iq-progress__segs"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={items}
          aria-valuenow={done}
          aria-valuetext={`${done}/${items}`}
          style={{ '--iq-items': String(items) }}
        >
          {Array.from({ length: items }, (_, i) => <i key={i} class={cx('iq-progress__seg', i < done && 'is-on')} />)}
        </div>
        <span class="iq-progress__count" aria-hidden="true">{done}/{items}</span>
      </div>
    </div>
  );
}
