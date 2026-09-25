import { useState } from 'preact/hooks';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { PageHeader } from '@iquest/ui';
import type { Item } from '@iquest/engine';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { ItemView } from '../components/ItemView';
import { CheckIcon, XIcon } from '../components/Icons';
import { replace } from '../router';
import { form, practiceDone } from '../state';
import { startSection } from '../flow';

/** What changes along a matrix row → which explanation to show. */
function explain(item: Item): string {
  if (item.kind === 'series') return t('practice.explain.series', { step: item.terms[1] - item.terms[0] });
  if (item.kind === 'matrix') {
    const row = item.cells.slice(0, 3).filter((g) => g !== null);
    const varies = (k: 'count' | 'shape' | 'fill' | 'rotate') => new Set(row.map((g) => String(g?.[k] ?? 0))).size > 1;
    const attr = (['count', 'shape', 'fill', 'rotate'] as const).find(varies) ?? 'shape';
    return t(`practice.explain.${attr}`);
  }
  return t('practice.explain.rotation');
}

/**
 * S4 — "Savol qanday ishlaydi?" Play mode: immediate feedback (accent ✓ / danger ✕ + word).
 * 1.1: one matrix item; the second (series) only if the first answer was wrong.
 */
export default function Practice({ index }: { index: number }) {
  const f = form.value;
  const item = f?.practice[index];
  const [value, setValue] = useState<number | null>(null);
  if (!f || !item) return null;

  const answered = value !== null;
  const correct = value === item.answer;

  const pick = (i: number) => {
    if (answered) return;
    setValue(i);
    if (i === item.answer) tg.haptic.success();
    else tg.haptic.error();
  };

  const next = () => {
    tg.haptic.light();
    if (!correct && index + 1 < f.practice.length) {
      replace({ name: 'practice', index: index + 1 });
      return;
    }
    practiceDone.value = true;
    startSection();
  };

  return (
    <Page cta={<Cta text={t('practice.cta')} onClick={next} enabled={answered} />}>
      <PageHeader eyebrow={t('practice.label')} title={t(`test.prompt.${item.kind}`)} />
      <p class="app-hint">{t('practice.hint')}</p>
      <div class="app-item" key={item.id}>
        <ItemView item={item} value={value} onChange={pick} />
      </div>
      <div class="app-feedback-slot" aria-live="polite">
        {answered && (
          <div class={'app-feedback ' + (correct ? 'is-correct' : 'is-wrong')}>
            <span class="app-feedback__status">
              {correct ? <CheckIcon /> : <XIcon />}
              {correct ? t('practice.status.correct') : t('practice.status.wrong')}
            </span>
            {!correct && <span class="app-feedback__answer">{t('practice.answer_is', { n: item.answer + 1 })}</span>}
            <span class="app-feedback__text">{explain(item)}</span>
          </div>
        )}
      </div>
    </Page>
  );
}
