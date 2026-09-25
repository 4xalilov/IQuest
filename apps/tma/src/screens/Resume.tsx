import { useEffect, useState } from 'preact/hooks';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Button, EmptyState, PageHeader, Sheet } from '@iquest/ui';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { replace, reset } from '../router';
import { discardTest, session, sessionLoaded } from '../state';
import { startSection } from '../flow';

/** S7 — "Qayerda toʻxtadim?" */
export default function Resume() {
  const s = session.value;
  const [confirm, setConfirm] = useState(false);
  const finished = s?.phase === 'finished';
  useEffect(() => {
    if (finished) replace({ name: 'finish' });
  }, [finished]);

  if (!sessionLoaded.value) return <Page>{null}</Page>;
  if (!s || s.phase === 'intro' || s.phase === 'practice') {
    return (
      <Page>
        <EmptyState
          text={t('resume.empty')}
          action={<Button onClick={() => replace({ name: 'intro' })}>{t('home.cta')}</Button>}
        />
      </Page>
    );
  }
  if (finished) return null;

  const go = () => {
    tg.haptic.light();
    startSection();
  };

  const restart = () => {
    discardTest();
    setConfirm(false);
    reset({ name: 'intro' });
  };

  const body =
    s.phase === 'break'
      ? t('resume.body.break', { section: s.section })
      : t('resume.body', { section: s.section + 1, item: s.item + 1 });

  return (
    <Page cta={confirm ? null : <Cta text={t('resume.cta')} onClick={go} />}>
      <PageHeader title={t('resume.title')} />
      <p class="app-p">{body}</p>
      <div class="app-center-row">
        <Button variant="ghost" onClick={() => setConfirm(true)}>
          {t('resume.restart')}
        </Button>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} label={t('resume.restart.title')}>
        <div class="app-sheet">
          <h2 class="app-h2">{t('resume.restart.title')}</h2>
          <p class="app-p app-muted">{t('resume.restart.body')}</p>
          <div class="app-actions">
            <Button block onClick={() => setConfirm(false)}>
              {t('resume.cta')}
            </Button>
            <Button block variant="secondary" onClick={restart}>
              {t('resume.restart')}
            </Button>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}
