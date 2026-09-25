import { useRef } from 'preact/hooks';
import { tg } from '@iquest/tg';

interface Props<T extends string> {
  label: string;
  labelId: string;
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  labelFor: (v: T) => string;
  required?: boolean;
}

/** Single-choice chips (S9). role="radiogroup" with roving tabindex and arrow keys. */
export function ChipGroup<T extends string>({ label, labelId, options, value, onChange, labelFor, required }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = (v: T) => {
    if (v !== value) tg.haptic.select();
    onChange(v);
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    pick(options[n]);
    (ref.current?.children[n] as HTMLElement | undefined)?.focus();
  };
  const focusIdx = value === null ? 0 : options.indexOf(value);
  return (
    <div class="app-field">
      <div class="app-field__label" id={labelId}>
        {label}
      </div>
      <div class="app-chips" role="radiogroup" aria-labelledby={labelId} aria-required={required || undefined} ref={ref}>
        {options.map((o, i) => {
          const on = o === value;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === focusIdx ? 0 : -1}
              class={'app-chip iq-ring' + (on ? ' is-on' : '')}
              onClick={() => pick(o)}
              onKeyDown={(e) => onKey(e as unknown as KeyboardEvent, i)}
            >
              {on && (
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              )}
              {labelFor(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
