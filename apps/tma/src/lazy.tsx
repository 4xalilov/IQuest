import { signal, type Signal } from '@preact/signals';
import type { ComponentType, FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Skeleton } from '@iquest/ui';
import { LoadError } from './components/LoadError';

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

export interface LazyScreen<P> extends FunctionComponent<P> {
  /** Starts downloading the chunk (idempotent). */
  preload(): Promise<void>;
}

/** Bumped when any lazy chunk arrives, so the app can move focus to the new heading. */
export const lazyLoaded = signal(0);

/**
 * Code splitting without preact/compat: the loaded component lives in a signal, so only this
 * wrapper re-renders when the chunk arrives. While loading, the page frame is kept (same
 * background, full height → no layout jump) and a skeleton appears only after 150 ms
 * (DESIGN 1.1 — no flicker on fast/cached loads). Network failure → retry.
 * `quiet` renders nothing while loading (overlays such as the share sheet).
 */
export function lazyScreen<P extends object>(load: Loader<P>, opts: { quiet?: boolean } = {}): LazyScreen<P> {
  const comp: Signal<ComponentType<P> | null> = signal(null);
  const failed = signal(false);
  let pending: Promise<void> | null = null;

  const preload = (): Promise<void> => {
    if (!pending) {
      failed.value = false;
      pending = load().then(
        (m) => {
          comp.value = m.default;
          lazyLoaded.value++;
        },
        () => {
          pending = null;
          failed.value = true;
        },
      );
    }
    return pending;
  };

  const Wrapper = ((props: P) => {
    const C = comp.value;
    if (C) return <C {...props} />;
    if (failed.value) return opts.quiet ? null : <LoadError onRetry={() => void preload()} />;
    void preload();
    return opts.quiet ? null : <DelayedSkeleton />;
  }) as LazyScreen<P>;
  Wrapper.preload = preload;
  return Wrapper;
}

function DelayedSkeleton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(id);
  }, []);
  return (
    <div class="app-fallback" aria-busy="true">
      {show && (
        <>
          <Skeleton h={12} w={96} />
          <Skeleton h={32} w="70%" />
          <Skeleton h={140} r={20} />
          <Skeleton h={96} r={20} />
        </>
      )}
    </div>
  );
}

/** Starts a chunk download when the browser is idle (Result during the last section). */
export function idlePreload(l: { preload(): Promise<void> }): void {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(() => void l.preload(), { timeout: 2000 });
  else setTimeout(() => void l.preload(), 300);
}
