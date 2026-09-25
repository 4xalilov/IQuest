import type { ComponentChildren } from 'preact';
import './StatusChip.css';

export type ChipTone = 'neutral' | 'accent' | 'warn' | 'money' | 'notice' | 'danger';

export interface StatusChipProps {
  tone: ChipTone;
  children: ComponentChildren;
}

/** Colour + word, never colour alone (§14). */
export function StatusChip({ tone, children }: StatusChipProps) {
  return <span class={`iq-chip iq-chip--${tone}`}>{children}</span>;
}
