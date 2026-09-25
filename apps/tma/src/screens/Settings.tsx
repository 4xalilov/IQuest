import { useState } from 'preact/hooks';
import { t, locale, setLocale, type Locale } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Button, PageHeader, Sheet } from '@iquest/ui';
import { Page } from '../components/Page';
import { ChipGroup } from '../components/ChipGroup';
import { ChevronIcon } from '../components/Icons';
import { boot, navigate } from '../router';
import { deleteAllData, largeText } from '../state';
import { LINKS, openLink } from '../flow';

const LOCALES: readonly Locale[] = ['uz-Latn', 'ru'];

function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" class="app-row-btn iq-ring" onClick={onClick}>
        <span>{label}</span>
        <ChevronIcon />
      </button>
    </li>
  );
}

/** S16 — "Qanday sozlayman?" */
export default function Settings() {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    await deleteAllData();
    tg.haptic.success();
    setBusy(false);
    setConfirm(false);
    boot({ name: 'intro' }); // like a first launch
  };

  return (
    <Page>
      <PageHeader title={t('settings.title')} />

      <ChipGroup<Locale>
        label={t('settings.language')}
        labelId="lang-label"
        options={LOCALES}
        value={locale.value}
        onChange={setLocale}
        labelFor={(l) => (l === 'ru' ? t('lang.ru') : t('lang.uz'))}
      />

      <div class="app-switch-row">
        <span id="large-text">{t('settings.large_text')}</span>
        <button
          type="button"
          role="switch"
          aria-checked={largeText.value}
          aria-labelledby="large-text"
          class={'app-switch iq-ring' + (largeText.value ? ' is-on' : '')}
          onClick={() => {
            tg.haptic.select();
            largeText.value = !largeText.value;
          }}
        >
          <span class="app-switch__knob" />
        </button>
      </div>

      <section class="app-section" aria-labelledby="privacy">
        <h2 class="app-h2" id="privacy">
          {t('settings.privacy')}
        </h2>
        <p class="app-p app-muted">{t('privacy.short')}</p>
        <ul class="app-list app-list--nav">
          <Row label={t('settings.privacy')} onClick={() => openLink(LINKS.privacy)} />
          <Row label={t('settings.terms')} onClick={() => openLink(LINKS.terms)} />
          <Row label={t('settings.refund')} onClick={() => openLink(LINKS.refund)} />
          <Row label={t('settings.methodology')} onClick={() => navigate({ name: 'methodology' })} />
          <Row label={t('settings.help')} onClick={() => navigate({ name: 'help' })} />
        </ul>
      </section>

      <Button variant="secondary" block class="app-danger" onClick={() => setConfirm(true)}>
        {t('settings.delete')}
      </Button>
      <p class="app-hint app-center-text">{t('settings.version', { v: __APP_VERSION__ })}</p>

      <Sheet open={confirm} onClose={() => !busy && setConfirm(false)} label={t('settings.delete.title')}>
        <div class="app-sheet">
          <h2 class="app-h2">{t('settings.delete.title')}</h2>
          <p class="app-p app-muted">{t('settings.delete.body')}</p>
          <div class="app-actions">
            <Button block variant="secondary" class="app-danger" loading={busy} onClick={remove}>
              {t('settings.delete.cta')}
            </Button>
            <Button block variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}
