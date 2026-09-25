import type { ComponentChildren, JSX } from 'preact';
import { cx } from './util';
import './util.css';
import './Button.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'm' | 's';
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
  children: ComponentChildren;
  block?: boolean;
  /** Extensions beyond the contract. */
  type?: 'button' | 'submit';
  ariaLabel?: string;
  class?: string;
}

export function Button({
  variant = 'primary', size = 'm', loading = false, disabled = false,
  onClick, children, block = false, type = 'button', ariaLabel, class: klass,
}: ButtonProps) {
  return (
    <button
      type={type}
      class={cx('iq-btn', 'iq-ring', `iq-btn--${variant}`, `iq-btn--${size}`, block && 'iq-btn--block', loading && 'is-loading', klass)}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      onClick={(e) => { if (!loading && !disabled) onClick?.(e); }}
    >
      <span class="iq-btn__label">{children}</span>
      {loading && <span class="iq-btn__spinner" aria-hidden="true" />}
    </button>
  );
}
