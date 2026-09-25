import type { ComponentChildren, JSX } from 'preact';
import { useRef } from 'preact/hooks';
import { OptionTile } from './OptionTile';
import { cx } from './util';
import './OptionGrid.css';

export interface OptionGridProps {
  columns: 2 | 3 | 4 | 5;
  value: number | null;
  onChange: (i: number) => void;
  /** Each child is the content of one tile (Glyph, Figure, number…). */
  children: ComponentChildren[];
  /** Extensions. */
  label?: string;
  /** 'square' (graphics, default) or 'wide' (numbers). */
  shape?: 'square' | 'wide';
  disabled?: boolean;
  /** Per-tile accessible label; default "Variant {n}". */
  optionLabel?: (i: number) => string;
}

export function OptionGrid({ columns, value, onChange, children, label = 'Javob variantlari', shape = 'square', disabled, optionLabel }: OptionGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const n = children.length;
  const focusIndex = value ?? 0;

  const move = (i: number) => {
    const next = ((i % n) + n) % n;
    onChange(next);
    const el = ref.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`);
    el?.focus();
  };

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => {
    const cur = Number(e.currentTarget.dataset.index);
    let target: number | null = null;
    switch (e.key) {
      case 'ArrowRight': target = cur + 1; break;
      case 'ArrowLeft': target = cur - 1; break;
      case 'ArrowDown': target = cur + columns < n ? cur + columns : cur + 1; break;
      case 'ArrowUp': target = cur - columns >= 0 ? cur - columns : cur - 1; break;
      case 'Home': target = 0; break;
      case 'End': target = n - 1; break;
      default: return;
    }
    e.preventDefault();
    move(target);
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      class={cx('iq-options', shape === 'wide' && 'iq-options--wide')}
      style={{ '--iq-cols': String(columns) }}
    >
      {children.map((child, i) => (
        <OptionTile
          key={i}
          index={i}
          selected={value === i}
          onSelect={() => onChange(i)}
          disabled={disabled}
          tabIndex={i === focusIndex ? 0 : -1}
          label={optionLabel?.(i)}
          onKeyDown={onKeyDown}
        >
          {child}
        </OptionTile>
      ))}
    </div>
  );
}
