import { signal, computed } from '@preact/signals';

/** Every screen of the app (DESIGN 1.1 §9). Params live on the route object. */
export type Route =
  | { name: 'home' }
  | { name: 'intro' }
  | { name: 'parent' }
  | { name: 'practice'; index: number }
  | { name: 'question' }
  | { name: 'break' }
  | { name: 'resume' }
  | { name: 'finish' }
  | { name: 'result'; id?: string }
  | { name: 'paywall'; id: string }
  | { name: 'results' }
  | { name: 'settings' }
  | { name: 'methodology' }
  | { name: 'help'; topic?: string };

export type RouteName = Route['name'];

/** Test flow: Telegram test mode on, BackButton asks to confirm the exit. */
export const TEST_FLOW: readonly RouteName[] = ['question', 'break'];

const stack = signal<Route[]>([{ name: 'home' }]);

export const route = computed<Route>(() => stack.value[stack.value.length - 1]);
/** Changes on every navigation (also to the same screen name) — used for focus management. */
export const routeKey = computed(() => `${stack.value.length}:${JSON.stringify(route.value)}`);

/** Push a screen. */
export function navigate(r: Route): void {
  stack.value = [...stack.value, r];
}

/** Replace the current screen (flow steps that must not be returned to). */
export function replace(r: Route): void {
  stack.value = [...stack.value.slice(0, -1), r];
}

/** Reset history (leaving a flow). The root is always Home so BackButton has somewhere to go. */
export function reset(r: Route): void {
  stack.value = r.name === 'home' ? [r] : [{ name: 'home' }, r];
}

/** First screen: returning users → S2, first launch → S3 directly (DESIGN 1.1). */
export function boot(r: Route): void {
  stack.value = [r];
}

export function back(): void {
  if (stack.value.length > 1) stack.value = stack.value.slice(0, -1);
  else stack.value = [{ name: 'home' }];
}

export const isRoot = computed(() => stack.value.length === 1);

/** Exit-confirm sheet in the test flow (opened by BackButton). */
export const exitAsk = signal(false);
