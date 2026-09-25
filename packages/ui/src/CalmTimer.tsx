import { useRef } from 'preact/hooks';
import { cx } from './util';
import './util.css';
import './CalmTimer.css';

export interface CalmTimerProps {
  /** Seconds remaining. */
  seconds: number;
  hidden: boolean;
  onToggle: () => void;
  /** Extensions (i18n + ring scale). */
  total?: number;
  warnText?: string;
  hideLabel?: string;
  showLabel?: string;
  /** Warning threshold in seconds (default 60). */
  warnAt?: number;
}

const R = 8;
const C = 2 * Math.PI * R;

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function CalmTimer({
  seconds, hidden, onToggle, total,
  warnText = '1 daqiqa qoldi', hideLabel = 'Vaqtni yashirish', showLabel = 'Vaqtni koʻrsatish', warnAt = 60,
}: CalmTimerProps) {
  const first = useRef(seconds);
  const max = Math.max(total ?? first.current, 1);
  const frac = Math.max(0, Math.min(1, seconds / max));
  const warn = seconds <= warnAt;
  const clock = formatClock(seconds);

  return (
    <div class={cx('iq-timer', warn && 'is-warn', hidden && 'is-hidden')}>
      <button
        type="button"
        class="iq-timer__btn iq-ring"
        aria-label={hidden ? showLabel : `${clock}. ${hideLabel}`}
        aria-pressed={hidden}
        onClick={onToggle}
      >
        <svg class="iq-timer__ring" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r={R} class="iq-timer__track" />
          {!hidden && (
            <circle
              cx="10" cy="10" r={R} class="iq-timer__arc"
              stroke-dasharray={C.toFixed(2)}
              stroke-dashoffset={(C * (1 - frac)).toFixed(2)}
              transform="rotate(-90 10 10)"
            />
          )}
        </svg>
        <span class="iq-timer__text" aria-hidden="true">
          {hidden ? (warn ? warnText : showLabel) : clock}
        </span>
        {!hidden && warn && <span class="iq-timer__warn" aria-hidden="true">{warnText}</span>}
      </button>
      <span class="iq-sr-only" aria-live="polite">{warn ? warnText : ''}</span>
    </div>
  );
}
