import { signal, computed } from '@preact/signals';

/** Every screen of the app. Params live on the route object itself. */
export type Route =
  | { name: 'language' }
  | { name: 'home' }
  | { name: 'intro' }
  | { name: 'practice'; index: number }
  | { name: 'question' }
  | { name: 'break' }
  | { name: 'resume' }
  | { name: 'finish' }
  | { name: 'questions' }
  | { name: 'parent' }
  | { name: 'result'; id?: string }
  | { name: 'paywall'; id: string }
  | { name: 'results' }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'methodology' }
  | { name: 'help'; topic?: string };

export type RouteName = Route['name'];

/** Top-level tabs: bottom navigation visible, no BackButton. */
export const TABS: readonly RouteName[] = ['home', 'results', 'profile'];
/** Test flow: Telegram test mode on, bottom nav hidden, BackButton asks to confirm exit. */
export const TEST_FLOW: readonly RouteName[] = ['question', 'break'];

const stack = signal<Route[]>([{ name: 'home' }]);

export const route = computed<Route>(() => stack.value[stack.value.length - 1]);
export const canGoBack = computed(() => stack.value.length > 1);

/** Push a screen. */
export function navigate(r: Route): void {
  stack.value = [...stack.value, r];
}

/** Replace the current screen (flows that must not be returned to, e.g. finished test steps). */
export function replace(r: Route): void {
  stack.value = [...stack.value.slice(0, -1), r];
}

/** Reset history to a single screen (switching tabs, leaving a flow). */
export function reset(r: Route): void {
  stack.value = [r];
}

export function back(): void {
  if (stack.value.length > 1) stack.value = stack.value.slice(0, -1);
  else stack.value = [{ name: 'home' }];
}
