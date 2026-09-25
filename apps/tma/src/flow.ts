import { tg } from '@iquest/tg';
import { navigate, reset } from './router';
import { continueTest, isMinor, parentAsked, practiceDone, prepareTest, profile } from './state';

/** S3 "Boshlash": minors first go to S18; then practice (first time) or straight into S5. */
export function beginTest(): void {
  if (isMinor(profile.value.ageBand) && !parentAsked.value) {
    navigate({ name: 'parent' });
    return;
  }
  prepareTest();
  if (!practiceDone.value) {
    navigate({ name: 'practice', index: 0 });
    return;
  }
  startSection();
}

/** Starts / continues the running section and shows S5. */
export function startSection(): void {
  continueTest();
  reset({ name: 'question' });
}

/** Opens the Telegram write-access prompt ("Keyinroq eslatish"). Resolves to true when allowed. */
export function requestWriteAccess(): Promise<boolean> {
  const wa = window.Telegram?.WebApp as unknown as
    | { requestWriteAccess?: (cb?: (ok: boolean) => void) => void; isVersionAtLeast?: (v: string) => boolean }
    | undefined;
  return new Promise((resolve) => {
    if (!tg.available || !wa?.requestWriteAccess || !wa.isVersionAtLeast?.('6.9')) return resolve(false);
    try {
      wa.requestWriteAccess((ok) => resolve(!!ok));
    } catch {
      resolve(false);
    }
  });
}

/** Opens an external page (privacy text, support) inside Telegram or a new tab. */
export function openLink(url: string): void {
  const wa = window.Telegram?.WebApp;
  try {
    if (tg.available && url.startsWith('https://t.me/') && wa?.openTelegramLink) wa.openTelegramLink(url);
    else if (tg.available && wa?.openLink) wa.openLink(url);
    else window.open(url, '_blank', 'noopener');
  } catch {
    /* ignore */
  }
}

export const LINKS = {
  privacy: 'https://iquest.uz/maxfiylik',
  terms: 'https://iquest.uz/shartlar',
  refund: 'https://iquest.uz/qaytarish',
  methodology: 'https://iquest.uz/metodika',
  support: 'https://t.me/iquest_support',
} as const;

export const BOT = import.meta.env.VITE_BOT_USERNAME ?? 'iquest_bot';
