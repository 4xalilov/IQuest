import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Card, PageHeader, StatusChip } from '@iquest/ui';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { parentAsked } from '../state';
import { beginTest, BOT } from '../flow';

/** S18 — "Davom etish uchun nima kerak?" Under 18, before the test (DESIGN 1.1). */
export default function Parent() {
  const asked = parentAsked.value;

  const send = () => {
    tg.haptic.light();
    tg.share(t('consent.minor.message', { link: `https://t.me/${BOT}` }));
    parentAsked.value = true;
  };

  const start = () => {
    tg.haptic.light();
    beginTest();
  };

  return (
    <Page cta={asked ? <Cta text={t('test.intro.cta')} onClick={start} /> : <Cta text={t('consent.minor.cta')} onClick={send} />}>
      <PageHeader
        title={t('consent.minor.title')}
        chip={<StatusChip tone="notice">{t('consent.minor.chip')}</StatusChip>}
      />
      <p class="app-p">{t('consent.minor')}</p>
      <Card tone="notice" padding="m">
        <p class="app-p">{t('consent.minor.nosave')}</p>
      </Card>
      {asked && (
        <p class="app-hint" role="status">
          {t('consent.minor.sent')}
        </p>
      )}
    </Page>
  );
}
