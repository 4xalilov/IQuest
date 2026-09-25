import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Card, Figure, PageHeader, SeriesRow, StatusChip } from '@iquest/ui';
import type { Domain, Glyph } from '@iquest/engine';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { CheckIcon } from '../components/Icons';
import { exitAsk } from '../router';
import { form, session, timeUp } from '../state';
import { startSection } from '../flow';

/** Static format samples for the next section (never a real test item). */
const SAMPLE_FIGURE: Glyph[] = [
  { shape: 'triangle', count: 1, fill: 'solid' },
  { shape: 'circle', count: 1, fill: 'none' },
  { shape: 'square', count: 1, fill: 'hatch' },
  { shape: 'diamond', count: 1, fill: 'none' },
];
const PROMPT_KIND: Record<Domain, string> = { pattern: 'matrix', numbers: 'series', spatial: 'rotation' };

function Sample({ domain }: { domain: Domain }) {
  if (domain === 'numbers') return <SeriesRow terms={[3, 6, 9, 12]} label={t('break.sample.aria')} />;
  if (domain === 'spatial') return <Figure glyphs={SAMPLE_FIGURE} size={96} label={t('break.sample.aria')} />;
  return null;
}

/** S6 — "Qancha qoldi?" Timer is stopped here; the next section starts on "Davom etish". */
export default function Break() {
  const s = session.value;
  const f = form.value;
  if (!s || !f || s.phase !== 'break') return null;
  const done = s.section; // in 'break' `section` already points to the next one
  const next = f.sections[s.section];

  const go = () => {
    tg.haptic.light();
    startSection();
  };

  return (
    <Page cta={exitAsk.value ? null : <Cta text={t('break.cta')} onClick={go} />}>
      <PageHeader
        eyebrow={t('break.eyebrow')}
        title={
          <span class="app-title-icon">
            <span class="app-accent">
              <CheckIcon size={24} />
            </span>
            {t('section.done.title', { n: done })}
          </span>
        }
      />
      <p class="app-p">{t('section.done.body')}</p>
      {timeUp.value && (
        <Card tone="notice" padding="m">
          <p class="app-p">{t('test.timeup')}</p>
        </Card>
      )}
      <Card>
        <div class="app-next">
          <span class="app-eyebrow">{t('break.next', { name: t(next.titleKey) })}</span>
          <StatusChip tone="neutral">
            {t('break.next.meta', { count: next.items.length, minutes: Math.round(next.seconds / 60) })}
          </StatusChip>
          <p class="app-p">{t(`test.prompt.${PROMPT_KIND[next.domain]}`)}</p>
          <div class="app-sample">
            <Sample domain={next.domain} />
          </div>
        </div>
      </Card>
      <p class="app-hint">{t('break.timer_paused')}</p>
    </Page>
  );
}
