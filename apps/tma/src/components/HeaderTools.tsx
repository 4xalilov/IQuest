import { t, locale, setLocale } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { navigate } from '../router';

/** `Oʻz · Ру` — one tap switches the language (DESIGN 1.1: S2/S3 header). */
export function LangSwitch() {
  const next = locale.value === 'ru' ? 'uz-Latn' : 'ru';
  return (
    <button
      type="button"
      class="app-iconbtn app-lang iq-ring"
      aria-label={t('settings.language')}
      onClick={() => {
        tg.haptic.select();
        setLocale(next);
      }}
    >
      <span aria-hidden="true">{t('lang.switch')}</span>
    </button>
  );
}

/** Settings gear (44px) in the S2 header — MVP has no bottom navigation. */
export function SettingsButton() {
  return (
    <button type="button" class="app-iconbtn iq-ring" aria-label={t('settings.title')} onClick={() => navigate({ name: 'settings' })}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
        />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.75" />
      </svg>
    </button>
  );
}
