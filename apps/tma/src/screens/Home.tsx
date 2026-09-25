import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { ObjectCard, PageHeader, StatusChip, Skeleton } from '@iquest/ui';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { navigate } from '../router';
import { form, resumable, results, session, sessionLoaded } from '../state';
import { dayMonth } from '../format';

/** S2 — "Nima qilaman?" */
export default function Home() {
  const loaded = sessionLoaded.value;
  const s = resumable.value ? session.value : null;
  const f = form.value;
  const last = results.value[0];

  const start = () => {
    tg.haptic.light();
    navigate(s ? { name: 'resume' } : { name: 'intro' });
  };

  let resumeCard = null;
  if (s && f) {
    const total = f.sections.reduce((n, sec) => n + sec.items.length, 0);
    const done = f.sections.slice(0, s.section).reduce((n, sec) => n + sec.items.length, 0) + (s.phase === 'break' ? 0 : s.item);
    const finished = s.phase === 'finished';
    resumeCard = (
      <ObjectCard
        title={finished ? t('home.pending.title') : t('home.resume.title')}
        meta={
          finished
            ? t('home.pending.meta')
            : t('home.resume.meta', { section: s.section + 1, sections: f.sections.length, item: s.item + 1 })
        }
        chip={<StatusChip tone="accent">{finished ? t('status.almost') : t('status.in_progress')}</StatusChip>}
        progress={finished ? 1 : done / total}
        onClick={() => navigate(finished ? { name: 'questions' } : { name: 'resume' })}
      />
    );
  }

  return (
    <Page
      cta={
        <Cta
          text={s ? (s.phase === 'finished' ? t('home.pending.cta') : t('home.resume.cta')) : t('home.cta')}
          onClick={s?.phase === 'finished' ? () => navigate({ name: 'questions' }) : start}
          loading={!loaded}
        />
      }
    >
      <PageHeader eyebrow={t('home.eyebrow')} title={t('app.name')} sub={t('home.tagline')} />
      {!loaded ? <Skeleton h={112} r={20} /> : resumeCard}
      <ObjectCard
        title={t('home.test.title')}
        meta={t('home.test.meta')}
        chip={<StatusChip tone="accent">{t('home.test.free')}</StatusChip>}
        onClick={s ? undefined : start}
      />
      {last && (
        <ObjectCard
          title={t('home.results.title')}
          meta={t('home.results.meta', { date: dayMonth(last.at) })}
          onClick={() => navigate({ name: 'results' })}
        />
      )}
      <p class="app-promise">{t('promise')}</p>
    </Page>
  );
}
