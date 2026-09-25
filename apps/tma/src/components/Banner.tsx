import { t } from '@iquest/i18n';
import { online, recheckOnline } from '../state';

/** Offline banner (DESIGN 1.1 `Banner`): word + retry, never colour alone. The test keeps working offline. */
export function OfflineBanner() {
  if (online.value) return null;
  return (
    <div class="app-banner" role="status">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M5 12.86a10 10 0 0 1 5.17-2.69M19 12.86a10 10 0 0 0-2-1.43M2 8.82a15 15 0 0 1 4.18-2.65M22 8.82A15 15 0 0 0 11.29 5.01M2 2l20 20"
          fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="app-banner__text">{t('net.offline')}</span>
      <button type="button" class="app-banner__btn iq-ring" onClick={recheckOnline}>
        {t('net.retry')}
      </button>
    </div>
  );
}
