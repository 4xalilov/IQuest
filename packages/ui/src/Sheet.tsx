import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { cx } from './util';
import './Sheet.css';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ComponentChildren;
  /** Extension: accessible name of the dialog. */
  label?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
const EXIT_MS = 260;

/**
 * Bottom sheet. Position: fixed — render it at the end of the tree (outside any
 * transformed ancestor). Focus-trap-lite: first focusable gets focus, Tab cycles,
 * Escape closes, focus returns to the opener; body scroll is locked while mounted.
 */
export function Sheet({ open, onClose, children, label }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // mount → next frame show; hide → wait for exit transition → unmount
  useEffect(() => {
    if (open) {
      setMounted(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    opener.current = document.activeElement;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const els = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!els.length) { e.preventDefault(); return; }
      const a = els[0], z = els[els.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      else if (!panel.current.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = prevOverflow;
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  if (!mounted) return null;
  return (
    <div class={cx('iq-sheet', shown && open && 'is-open')}>
      <div class="iq-sheet__backdrop" onClick={() => closeRef.current()} aria-hidden="true" />
      <div ref={panel} class="iq-sheet__panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <span class="iq-sheet__grip" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
