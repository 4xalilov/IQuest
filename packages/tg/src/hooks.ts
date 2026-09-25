import { useEffect, useRef } from 'preact/hooks';
import { releaseBackButton, releaseMainButton, tg } from './index';

/**
 * Shows the Telegram BottomButton (MainButton) while the component is mounted.
 * The Telegram click handler is a stable wrapper registered once per mount, so a new
 * `onClick` closure on every render does not re-subscribe; it is removed (offClick) on unmount.
 * Outside Telegram this is a no-op — render `BottomBar` from @iquest/ui instead.
 */
export function useMainButton(text: string, onClick: () => void, enabled = true, loading = false): void {
  const cbRef = useRef(onClick);
  cbRef.current = onClick;
  const handlerRef = useRef<(() => void) | null>(null);
  if (!handlerRef.current) handlerRef.current = () => cbRef.current();

  useEffect(() => {
    tg.mainButton({ text, enabled, loading, onClick: handlerRef.current! });
  }, [text, enabled, loading]);

  useEffect(() => {
    const h = handlerRef.current!;
    return () => releaseMainButton(h);
  }, []);
}

/**
 * Shows the Telegram BackButton while mounted and `onClick` is non-null; hides it for `null`.
 * The handler is removed (offClick) on unmount or when switched to `null`.
 */
export function useBackButton(onClick: (() => void) | null): void {
  const cbRef = useRef(onClick);
  cbRef.current = onClick;
  const handlerRef = useRef<(() => void) | null>(null);
  if (!handlerRef.current) handlerRef.current = () => cbRef.current?.();

  const active = onClick !== null;
  useEffect(() => {
    const h = handlerRef.current!;
    if (!active) return;
    tg.backButton(h);
    return () => releaseBackButton(h);
  }, [active]);
}
