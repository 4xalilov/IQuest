import type { ComponentChildren } from 'preact';
import { BottomBar } from './BottomBar';
import { cx } from './util';
import './Screen.css';

export interface ScreenProps {
  children: ComponentChildren;
  /** Rendered in a sticky BottomBar (browser stand-in for MainButton). */
  bottom?: ComponentChildren;
  class?: string;
}

/** Page container: gutter, safe-area insets, 12px + opacity enter animation. */
export function Screen({ children, bottom, class: klass }: ScreenProps) {
  return (
    <div class={cx('iq-screen', klass)}>
      <main class="iq-screen__body">{children}</main>
      {bottom && <BottomBar>{bottom}</BottomBar>}
    </div>
  );
}
