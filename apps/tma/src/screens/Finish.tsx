import { useEffect } from 'preact/hooks';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Button, EmptyState, PageHeader } from '@iquest/ui';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { ChipGroup } from '../components/ChipGroup';
import { replace, reset } from '../router';
import { DISTRACTED, finalize, itemCount, minutesSpent, profile, session, sessionLoaded, setProfile, type Distracted } from '../state';
import { ResultScreen } from './lazy';

/**
 * S8 (1.1: S8 + S9) — "Natijadan oldin nima qolgan?" Success haptic, one optional question,
 * asked BEFORE the result so the answer is not changed after seeing it.
 */
export default function Finish() {
  const s = session.value;
  const finished = s?.phase === 'finished';

  useEffect(() => {
    if (!finished) return;
    tg.haptic.success();
    void ResultScreen.preload(); // usually already prefetched during the last section
  }, [finished]);

  if (!sessionLoaded.value) return <Page>{null}</Page>;
  if (!s || !finished) {
    return (
      <Page>
        <EmptyState text={t('resume.empty')} action={<Button onClick={() => reset({ name: 'home' })}>{t('common.go_home')}</Button>} />
      </Page>
    );
  }

  const show = () => {
    tg.haptic.light();
    const r = finalize();
    if (r) replace({ name: 'result', id: r.id });
  };

  return (
    <Page cta={<Cta text={t('finish.cta')} onClick={show} />}>
      <PageHeader title={t('finish.title')} />
      <p class="app-lead">{t('finish.body', { count: itemCount(s), minutes: minutesSpent(s) })}</p>
      <ChipGroup<Distracted>
        label={t('finish.distracted')}
        labelId="distracted-label"
        options={DISTRACTED}
        value={profile.value.distracted}
        onChange={(v) => setProfile({ distracted: v })}
        labelFor={(v) => t(`finish.distracted.${v}`)}
      />
      <p class="app-hint">{t('survey.distracted.hint')}</p>
    </Page>
  );
}
