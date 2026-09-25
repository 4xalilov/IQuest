import type { ComponentChildren } from 'preact';
import { cx } from './util';
import './util.css';
import './ObjectCard.css';

export interface ObjectCardProps {
  title: ComponentChildren;
  meta?: ComponentChildren;
  chip?: ComponentChildren;
  /** 0..1 */
  progress?: number;
  action?: ComponentChildren;
  onClick?: () => void;
}

/** Test/result card: ≤ 5 slots — title, meta, status chip, progress, action. */
export function ObjectCard({ title, meta, chip, progress, action, onClick }: ObjectCardProps) {
  const p = progress == null ? null : Math.max(0, Math.min(1, progress));
  return (
    <div class={cx('iq-ocard', onClick && 'is-clickable')}>
      <div class="iq-ocard__top">
        <h3 class="iq-ocard__title">
          {onClick ? <button type="button" class="iq-ocard__link iq-ring" onClick={onClick}>{title}</button> : title}
        </h3>
        {chip}
      </div>
      {meta && <p class="iq-ocard__meta">{meta}</p>}
      {p != null && (
        <div class="iq-ocard__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
          <i style={{ width: `${(p * 100).toFixed(1)}%` }} />
        </div>
      )}
      {action && <div class="iq-ocard__action">{action}</div>}
    </div>
  );
}
