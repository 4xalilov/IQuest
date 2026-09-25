import type { ComponentChildren } from 'preact';
import './BottomBar.css';

export interface BottomBarProps {
  children: ComponentChildren;
}

/** Browser stand-in for Telegram's MainButton: sticky, safe-area aware. */
export function BottomBar({ children }: BottomBarProps) {
  return <div class="iq-bottombar">{children}</div>;
}
