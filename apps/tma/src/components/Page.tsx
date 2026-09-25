import type { ComponentChildren } from 'preact';
import { tg } from '@iquest/tg';
import { Screen } from '@iquest/ui';

interface Props {
  children: ComponentChildren;
  /** The screen's <Cta/> (MainButton). Mounted always; drawn in the BottomBar only in a browser. */
  cta?: ComponentChildren;
  class?: string;
}

/**
 * Screen wrapper. In Telegram the native BottomButton replaces the bar, so the bar is not
 * rendered at all (no empty sticky strip); `cta` is still mounted to drive the native button.
 */
export function Page({ children, cta, class: klass }: Props) {
  if (tg.available || !cta) {
    return (
      <Screen class={klass}>
        {children}
        {cta}
      </Screen>
    );
  }
  return (
    <Screen class={klass} bottom={cta}>
      {children}
    </Screen>
  );
}
