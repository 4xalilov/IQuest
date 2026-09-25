/**
 * @iquest/tg — thin layer over window.Telegram.WebApp.
 * Outside Telegram (plain browser, tests, SSR) every call is a safe no-op and `available` is false.
 */
import type { BottomButton, InvoiceStatus, SafeAreaInset, WebApp } from './types';

export type { InvoiceStatus } from './types';

type Unsub = () => void;
type MainButtonOpts = { text: string; enabled?: boolean; loading?: boolean; onClick: () => void };
type CloudStorageApi = {
  get(k: string): Promise<string | null>;
  set(k: string, v: string): Promise<void>;
  remove(k: string): Promise<void>;
};

const hasWindow = typeof window !== 'undefined' && typeof document !== 'undefined';

function getWebApp(): WebApp | null {
  if (!hasWindow) return null;
  const wa = window.Telegram?.WebApp;
  if (!wa) return null;
  // telegram-web-app.js also defines WebApp in a plain browser; there initData is empty and platform 'unknown'.
  if (!wa.initData && (!wa.platform || wa.platform === 'unknown')) return null;
  return wa;
}

const wa = getWebApp();

function atLeast(v: string): boolean {
  if (!wa) return false;
  try {
    return wa.isVersionAtLeast(v);
  } catch {
    return false;
  }
}

function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    /* Telegram throws on unsupported methods in some versions — ignore */
  }
}

const root = (): HTMLElement | null => (hasWindow ? document.documentElement : null);

/* ---------------- theme ---------------- */

function colorScheme(): 'light' | 'dark' {
  if (wa) return wa.colorScheme === 'dark' ? 'dark' : 'light';
  if (hasWindow && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/** Normalizes a computed CSS color ("#abc", "#aabbcc", "rgb(…)") to "#rrggbb", or null. */
export function toHex(value: string): string | null {
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + v.slice(1).split('').map((c) => c + c).join('')).toLowerCase();
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(v);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('');
  return null;
}

function cssVar(name: string): string | null {
  const el = root();
  if (!el) return null;
  return toHex(getComputedStyle(el).getPropertyValue(name));
}

let mainButtonColors: { color?: string; text_color?: string } = {};

function applyTheme(): void {
  const el = root();
  if (!el) return;
  el.setAttribute('data-theme', colorScheme());
  if (!wa) return;
  const bg = cssVar('--bg');
  if (bg) {
    if (atLeast('6.9')) safe(() => wa.setHeaderColor?.(bg));
    if (atLeast('6.1')) safe(() => wa.setBackgroundColor?.(bg));
    if (atLeast('7.10')) safe(() => wa.setBottomBarColor?.(bg));
  }
  const color = cssVar('--accent-fill');
  const text_color = cssVar('--on-fill');
  mainButtonColors = {};
  if (color) mainButtonColors.color = color;
  if (text_color) mainButtonColors.text_color = text_color;
  safe(() => wa.MainButton.setParams({ ...mainButtonColors }));
}

function onThemeChange(cb: () => void): Unsub {
  if (wa) {
    const h = () => cb();
    wa.onEvent('themeChanged', h);
    return () => wa.offEvent('themeChanged', h);
  }
  if (hasWindow && typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = () => cb();
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }
  return () => {};
}

/* ---------------- safe area ---------------- */

function writeInsets(prefix: string, inset: SafeAreaInset | undefined): void {
  const el = root();
  if (!el || !inset) return;
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    el.style.setProperty(`${prefix}-${side}`, `${Number(inset[side]) || 0}px`);
  }
}

function applySafeArea(): void {
  if (!wa) return;
  writeInsets('--tg-safe-area-inset', wa.safeAreaInset);
  writeInsets('--tg-content-safe-area-inset', wa.contentSafeAreaInset);
}

/* ---------------- motion ---------------- */

function isLowEndAndroid(): boolean {
  if (!hasWindow || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // e.g. "Telegram-Android/11.2.3 (Samsung SM-A155F; Android 14; SDK 34; LOW)"
  return /Telegram-Android\//.test(ua) && /;\s*LOW\s*\)/i.test(ua);
}

/* ---------------- init ---------------- */

let initialized = false;

function init(): void {
  if (initialized) return;
  initialized = true;
  if (wa) {
    safe(() => wa.ready());
    safe(() => wa.expand());
  }
  applyTheme();
  const el = root();
  if (el && isLowEndAndroid()) el.setAttribute('data-motion', 'off');
  if (!wa) {
    onThemeChange(applyTheme);
    return;
  }
  wa.onEvent('themeChanged', applyTheme);
  applySafeArea();
  if (atLeast('8.0')) {
    wa.onEvent('safeAreaChanged', applySafeArea);
    wa.onEvent('contentSafeAreaChanged', applySafeArea);
    wa.onEvent('fullscreenChanged', applySafeArea);
  }
}

/* ---------------- haptics ---------------- */

const haptic = {
  select(): void {
    if (atLeast('6.1')) safe(() => wa?.HapticFeedback?.selectionChanged());
  },
  light(): void {
    if (atLeast('6.1')) safe(() => wa?.HapticFeedback?.impactOccurred('light'));
  },
  success(): void {
    if (atLeast('6.1')) safe(() => wa?.HapticFeedback?.notificationOccurred('success'));
  },
  error(): void {
    if (atLeast('6.1')) safe(() => wa?.HapticFeedback?.notificationOccurred('error'));
  },
};

/* ---------------- test mode ---------------- */

let enteredFullscreen = false;

function isMobile(): boolean {
  const p = wa?.platform ?? '';
  return p === 'ios' || p === 'android' || p === 'android_x';
}

function testMode(on: boolean): void {
  if (!wa) return;
  if (on) {
    // Fullscreen only on phones; on desktop clients it would take over the whole monitor.
    if (atLeast('8.0') && isMobile() && !wa.isFullscreen) {
      safe(() => wa.requestFullscreen?.());
      enteredFullscreen = true;
    }
    if (atLeast('7.7')) safe(() => wa.disableVerticalSwipes?.());
    if (atLeast('6.2')) safe(() => wa.enableClosingConfirmation?.());
  } else {
    if (enteredFullscreen && atLeast('8.0')) safe(() => wa.exitFullscreen?.());
    enteredFullscreen = false;
    if (atLeast('7.7')) safe(() => wa.enableVerticalSwipes?.());
    if (atLeast('6.2')) safe(() => wa.disableClosingConfirmation?.());
  }
}

/* ---------------- main / back button ---------------- */

let mainHandler: (() => void) | null = null;

function mainButton(opts: MainButtonOpts | null): void {
  if (!wa) {
    mainHandler = opts ? opts.onClick : null;
    return;
  }
  const mb: BottomButton = wa.MainButton;
  safe(() => {
    if (!opts) {
      if (mainHandler) mb.offClick(mainHandler);
      mainHandler = null;
      mb.hideProgress();
      mb.hide();
      return;
    }
    if (mainHandler !== opts.onClick) {
      if (mainHandler) mb.offClick(mainHandler);
      mainHandler = opts.onClick;
      mb.onClick(mainHandler);
    }
    const enabled = opts.enabled !== false;
    mb.setParams({ text: opts.text, is_active: enabled, is_visible: true, ...mainButtonColors });
    if (opts.loading) mb.showProgress(false);
    else mb.hideProgress();
  });
}

/** Hides the main button only if `handler` is still the one registered (used by hooks on unmount). */
export function releaseMainButton(handler: () => void): void {
  if (mainHandler === handler) mainButton(null);
}

let backHandler: (() => void) | null = null;

function backButton(onClick: (() => void) | null): void {
  if (!wa || !atLeast('6.1')) {
    backHandler = onClick;
    return;
  }
  const bb = wa.BackButton;
  safe(() => {
    if (backHandler && backHandler !== onClick) bb.offClick(backHandler);
    if (!onClick) {
      backHandler = null;
      bb.hide();
      return;
    }
    if (backHandler !== onClick) bb.onClick(onClick);
    backHandler = onClick;
    bb.show();
  });
}

/** Hides the back button only if `handler` is still the one registered (used by hooks on unmount). */
export function releaseBackButton(handler: () => void): void {
  if (backHandler === handler) backButton(null);
}

/* ---------------- blur ---------------- */

function onBlur(cb: () => void): Unsub {
  if (!hasWindow) return () => {};
  let blurred = false;
  const leave = () => {
    if (blurred) return;
    blurred = true;
    cb();
  };
  const back = () => {
    blurred = false;
  };
  const onVis = () => (document.visibilityState === 'hidden' ? leave() : back());
  document.addEventListener('visibilitychange', onVis);
  const useEvents = !!wa && atLeast('8.0');
  if (useEvents) {
    wa!.onEvent('deactivated', leave);
    wa!.onEvent('activated', back);
  }
  return () => {
    document.removeEventListener('visibilitychange', onVis);
    if (useEvents) {
      wa!.offEvent('deactivated', leave);
      wa!.offEvent('activated', back);
    }
  };
}

/* ---------------- share ---------------- */

const DEFAULT_SHARE_URL = 'https://iquest.uz';

function share(text: string, url: string = DEFAULT_SHARE_URL): void {
  if (wa) {
    if (atLeast('6.7') && wa.switchInlineQuery) {
      try {
        wa.switchInlineQuery(text, ['users', 'groups', 'channels']);
        return;
      } catch {
        /* inline mode disabled → fall through */
      }
    }
    const link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (atLeast('6.1') && wa.openTelegramLink) safe(() => wa.openTelegramLink!(link));
    else safe(() => wa.openLink?.(link));
    return;
  }
  if (!hasWindow) return;
  const nav = navigator as Navigator & { share?: (d: { text?: string; url?: string }) => Promise<void> };
  if (typeof nav.share === 'function') {
    nav.share({ text }).catch(() => {});
    return;
  }
  nav.clipboard?.writeText(text).catch(() => {});
}

/* ---------------- payments ---------------- */

function openInvoice(url: string): Promise<InvoiceStatus> {
  return new Promise((resolve) => {
    if (!wa || !atLeast('6.1') || !wa.openInvoice) {
      resolve('failed');
      return;
    }
    try {
      wa.openInvoice(url, (status) => {
        resolve(status === 'paid' || status === 'cancelled' || status === 'pending' ? status : 'failed');
      });
    } catch {
      resolve('failed');
    }
  });
}

/* ---------------- cloud storage ---------------- */

function makeCloudStorage(): CloudStorageApi | null {
  const cs = wa && atLeast('6.9') ? wa.CloudStorage : undefined;
  if (!cs) return null;
  return {
    get: (k) =>
      new Promise((resolve, reject) => {
        try {
          cs.getItem(k, (err, value) => (err ? reject(new Error(err)) : resolve(value ? value : null)));
        } catch (e) {
          reject(e);
        }
      }),
    set: (k, v) =>
      new Promise((resolve, reject) => {
        try {
          cs.setItem(k, v, (err) => (err ? reject(new Error(err)) : resolve()));
        } catch (e) {
          reject(e);
        }
      }),
    remove: (k) =>
      new Promise((resolve, reject) => {
        try {
          cs.removeItem(k, (err) => (err ? reject(new Error(err)) : resolve()));
        } catch (e) {
          reject(e);
        }
      }),
  };
}

/* ---------------- public object ---------------- */

export const tg = {
  available: wa !== null,
  init,
  colorScheme,
  onThemeChange,
  haptic,
  testMode,
  mainButton,
  backButton,
  onBlur,
  share,
  openInvoice,
  cloudStorage: makeCloudStorage(),
  userLang(): string | undefined {
    return wa?.initDataUnsafe?.user?.language_code;
  },
  /** Raw WebApp (null outside Telegram) — escape hatch, prefer the wrappers above. */
  webApp: wa,
};

export { useMainButton, useBackButton } from './hooks';
