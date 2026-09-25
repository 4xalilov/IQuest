import { t } from '@iquest/i18n';
import { Accordion, Button, PageHeader } from '@iquest/ui';
import { Page } from '../components/Page';
import { LINKS, openLink } from '../flow';

const FAQ = ['free', 'retest', 'refund', 'data'] as const;

/** S19 — "Savolim bor": FAQ + contact. `topic="worried"` opens the reassurance answer first. */
export default function Help({ topic }: { topic?: string }) {
  return (
    <Page>
      <PageHeader title={t('help.title')} sub={t('help.faq')} />
      <div class="app-accordions">
        <Accordion title={t('result.worried')} open={topic === 'worried'}>
          <p class="app-p">{t('result.worried.body')}</p>
        </Accordion>
        {FAQ.map((k) => (
          <Accordion key={k} title={t(`help.q.${k}`)}>
            <p class="app-p">{t(`help.a.${k}`)}</p>
          </Accordion>
        ))}
      </div>
      <Button variant="secondary" block onClick={() => openLink(LINKS.support)}>
        {t('help.contact')}
      </Button>
    </Page>
  );
}
