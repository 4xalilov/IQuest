import { useEffect, useState } from 'preact/hooks';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Button, CalmTimer, SectionProgress } from '@iquest/ui';
import type { SessionState } from '@iquest/engine';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { ItemView } from '../components/ItemView';
import { exitAsk, replace } from '../router';
import { answerCurrent, blurNotice, clock, form, session, startClock, stopClock, timerHidden } from '../state';
import { idlePreload } from '../lazy';
import { ResultScreen } from './lazy';

/** Only this component reads `clock` → the 1 s tick re-renders the timer, nothing else. */
function TimerSlot({ total }: { total: number }) {
  return (
    <CalmTimer
      seconds={clock.value}
      total={total}
      hidden={timerHidden.value}
      onToggle={() => (timerHidden.value = !timerHidden.value)}
      warnText={t('test.timer.warn')}
      hideLabel={t('test.timer.hide')}
      showLabel={t('test.timer.show')}
    />
  );
}

/** Where the flow goes after the section/test closed (by answer or by time). */
function afterClose(s: SessionState): void {
  tg.haptic.success();
  replace(s.phase === 'finished' ? { name: 'finish' } : { name: 'break' });
}

/**
 * S5 — "Qaysi variant toʻgʻri?" Measurement mode: no correctness feedback, neutral colours.
 * The page frame stays mounted between items; only the item area is keyed (≤120 ms fade).
 */
export default function Question() {
  const s = session.value;
  const f = form.value;

  useEffect(() => {
    startClock(afterClose);
    return stopClock;
  }, []);

  // Prefetch the result chunk once the last section starts (works offline afterwards).
  const lastSection = !!f && !!s && s.section === f.sections.length - 1;
  useEffect(() => {
    if (lastSection) idlePreload(ResultScreen);
  }, [lastSection]);

  // Selection belongs to one item: a new item id means "nothing selected" without remounting the page.
  const [sel, setSel] = useState<{ id: string; v: number } | null>(null);

  if (!s || !f || s.phase !== 'question') return null;
  const sectionCount = f.sections.length;
  const sec = f.sections[s.section];
  const item = sec.items[s.item];
  const value = sel && sel.id === item.id ? sel.v : null;

  const isLastInSection = s.item === sec.items.length - 1;
  const isLastOverall = isLastInSection && s.section === sectionCount - 1;
  const ctaText = isLastOverall ? t('test.finish') : isLastInSection ? t('test.section.finish') : t('test.next');

  const pick = (i: number) => {
    if (i !== value) tg.haptic.select();
    setSel({ id: item.id, v: i });
  };

  const submit = (v: number | null) => {
    tg.haptic.light();
    const next = answerCurrent(v);
    if (next && next.phase !== 'question') afterClose(next);
  };

  const name = t(sec.titleKey);
  return (
    <Page class="app-q" cta={exitAsk.value ? null : <Cta text={ctaText} onClick={() => submit(value)} enabled={value !== null} />}>
      <SectionProgress
        section={s.section + 1}
        sections={sectionCount}
        item={s.item + 1}
        items={sec.items.length}
        label={t('test.section.eyebrow', { name, n: s.section + 1, total: sectionCount })}
        aside={<TimerSlot total={s.budgetSec[s.section]} />}
      />
      <h1 class="app-prompt" tabIndex={-1}>
        {t(`test.prompt.${item.kind}`)}
      </h1>
      {blurNotice.value && (
        <p class="app-inline-warn" role="status">
          {t('test.blur.notice')}
        </p>
      )}
      <div class="app-item app-fade" key={item.id}>
        <ItemView item={item} value={value} onChange={pick} />
      </div>
      <div class="app-center-row">
        <Button variant="ghost" onClick={() => submit(null)}>
          {t('test.skip')}
        </Button>
      </div>
    </Page>
  );
}
