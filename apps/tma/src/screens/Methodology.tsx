import { t } from '@iquest/i18n';
import { PageHeader } from '@iquest/ui';
import { FORM_VERSION } from '@iquest/engine';
import { Page } from '../components/Page';
import { fullDate } from '../format';

/** Provisional norms release date (shown in S17). */
const NORMS_DATE = Date.UTC(2026, 8, 1);

const BLOCKS = ['measures', 'not_measures', 'norms', 'limits'] as const;

/** S17 — "Test qanday ishlaydi?" Static text. */
export default function Methodology() {
  return (
    <Page>
      <PageHeader eyebrow={t('method.eyebrow')} title={t('method.title')} />
      {BLOCKS.map((b) => (
        <section key={b} class="app-section">
          <h2 class="app-h2">{t(`method.${b}.title`)}</h2>
          <p class="app-p">{t(`method.${b}.body`, { version: FORM_VERSION, date: fullDate(NORMS_DATE) })}</p>
        </section>
      ))}
      <section class="app-section">
        <h2 class="app-h2">{t('method.claims.title')}</h2>
        <ul class="app-bullets">
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>{t(`method.claims.${n}`)}</li>
          ))}
        </ul>
      </section>
      <section class="app-section">
        <h2 class="app-h2">{t('method.practice.title')}</h2>
        <p class="app-p">{t('method.practice.body')}</p>
      </section>
    </Page>
  );
}
