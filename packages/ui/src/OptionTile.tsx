import type { ComponentChildren, JSX } from 'preact';
import { cx } from './util';
import './util.css';
import './OptionTile.css';

export interface OptionTileProps {
  selected: boolean;
  onSelect: () => void;
  /** 0-based; announced as "Variant {index+1}". */
  index: number;
  children: ComponentChildren;
  disabled?: boolean;
  /** Extensions: roving tabindex (set by OptionGrid), label template, key handler. */
  tabIndex?: number;
  label?: string;
  onKeyDown?: (e: JSX.TargetedKeyboardEvent<HTMLButtonElement>) => void;
}

export function OptionTile({ selected, onSelect, index, children, disabled, tabIndex, label, onKeyDown }: OptionTileProps) {
  return (
    <button
      type="button"
      role="radio"
      class={cx('iq-tile', 'iq-ring', selected && 'is-selected')}
      aria-checked={selected}
      aria-label={label ?? `Variant ${index + 1}`}
      disabled={disabled}
      tabIndex={tabIndex}
      data-index={index}
      onClick={() => { if (!selected) onSelect(); }}
      onKeyDown={onKeyDown}
    >
      <span class="iq-tile__body" aria-hidden="true">{children}</span>
      {selected && (
        <span class="iq-tile__check" aria-hidden="true">
          <svg viewBox="0 0 12 12"><path d="M2.6 6.2 5 8.5l4.4-5" /></svg>
        </span>
      )}
    </button>
  );
}
