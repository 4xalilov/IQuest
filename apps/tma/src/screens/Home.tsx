import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { ObjectCard, PageHeader, StatusChip } from '@iquest/ui';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { LangSwitch, SettingsButton } from '../components/HeaderTools';
import { navigate } from '../router';
import { form, resumable, results, session, sessionLoaded } from '../state';
import { dayMonth } from '../format';

/** S2 — "Nima qilaman?" (returning users). */
export default function Home() {
  const loaded = sessionLoaded.value;
  const s = resumable.value ? session.value : null;
  const f = form.value;
  const last = results.value[0];
  const finished = s?.phase === 'finished';

  const go = () => {
    tg.haptic.light();
    if (finished) navigate({ name: 'finish' });
    else if (s) navigate({ name: 'resume' });
    else navigate({ name: 'intro' });
  };

  let resumeCard = null;
  if (s && f) {
    const total = f.sections.reduce((n, sec) => n + sec.items.length, 0);
    const done = f.sections.slice(0, s.section).reduce((n, sec) => n + sec.items.length, 0) + (s.phase === 'break' ? 0 : s.item);
    resumeCard = (
      <ObjectCard
        title={finished ? t('finish.title') : t('home.resume.title')}
        meta={finished ? t('home.pending.meta') : t('home.resume.meta', { section: s.section + 1, item: s.item + 1 })}
        chip={<StatusChip tone="accent">{t('home.chip.in_progress')}</StatusChip>}
        progress={finished ? 1 : done / total}
        onClick={go}
      />
    );
  }

  return (
    <Page
      cta={
        <Cta
          text={finished ? t('finish.cta') : s ? t('home.resume.cta') : t('home.cta')}
          onClick={go}
          loading={!loaded}
        />
      }
    >
      <PageHeader
        title={t('app.name')}
        chip={
          <span class="app-tools">
            <LangSwitch />
            <SettingsButton />
          </span>
        }
        sub={t('tagline')}
      />
      {resumeCard}
      <ObjectCard
        title={t('home.test.title')}
        meta={t('home.test.meta')}
        chip={<StatusChip tone="accent">{t('home.chip.free')}</StatusChip>}
        onClick={s ? undefined : go}
      />
      {last && (
        <ObjectCard
          title={t('home.results.title')}
          meta={t('home.results.meta', { date: dayMonth(last.at) })}
          onClick={() => navigate({ name: 'results' })}
        />
      )}
      <p class="app-note">{t('promise')}</p>
    </Page>
  );
}
