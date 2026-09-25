import { tg, useBackButton } from '@iquest/tg';
import { t } from '@iquest/i18n';

/**
 * Telegram BackButton while mounted. Outside Telegram (browser dev / web) a small
 * text button is drawn instead so every screen stays navigable.
 */
export function BackBtn({ onBack }: { onBack: () => void }) {
  useBackButton(onBack);
  if (tg.available) return null;
  return (
    <button type="button" class="app-back iq-ring" onClick={onBack}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {t('common.back')}
    </button>
  );
}
