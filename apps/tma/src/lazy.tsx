import { signal, type Signal } from '@preact/signals';
import type { ComponentType, FunctionComponent } from 'preact';
import { Skeleton } from '@iquest/ui';
import { LoadError } from './components/LoadError';

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

export interface LazyScreen<P> extends FunctionComponent<P> {
  /** Starts downloading the chunk (idempotent). */
  preload(): Promise<void>;
}

/**
 * Tiny code-splitting helper without preact/compat: the loaded component lives in a signal,
 * so only this wrapper re-renders when the chunk arrives. Fallback is a skeleton that
 * reserves the same page frame (no layout jump), or a retry button on network failure.
 */
export function lazyScreen<P extends object>(load: Loader<P>, fallback?: ComponentType): LazyScreen<P> {
  const comp: Signal<ComponentType<P> | null> = signal(null);
  const failed = signal(false);
  let pending: Promise<void> | null = null;

  const preload = (): Promise<void> => {
    if (!pending) {
      failed.value = false;
      pending = load().then(
        (m) => {
          comp.value = m.default;
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
    if (failed.value) return <LoadError onRetry={() => void preload()} />;
    void preload();
    const F = fallback ?? ScreenSkeleton;
    return <F />;
  }) as LazyScreen<P>;
  Wrapper.preload = preload;
  return Wrapper;
}

/** Page-shaped placeholder: header + two cards, same gutters as Screen. */
export function ScreenSkeleton() {
  return (
    <div class="app-skeleton" aria-busy="true">
      <Skeleton h={12} w={96} />
      <Skeleton h={32} w="70%" />
      <Skeleton h={140} r={20} />
      <Skeleton h={96} r={20} />
    </div>
  );
}

