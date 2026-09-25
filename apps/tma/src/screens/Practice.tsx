import { useEffect, useRef, useState } from 'preact/hooks';
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

type Attr = 'count' | 'shape' | 'fill' | 'rotate';
const ATTRS: Attr[] = ['count', 'shape', 'fill', 'rotate'];

/** What changes in the matrix, and in which direction → which explanation to show. */
function explain(item: Item): string {
  if (item.kind === 'series') {
    const step = item.terms[1] - item.terms[0];
    return step < 0 ? t('practice.explain.series.less', { step: -step }) : t('practice.explain.series', { step });
  }
  if (item.kind === 'matrix') {
    const at = (r: number, c: number) => item.cells[r * 3 + c];
    const val = (r: number, c: number, k: Attr) => String(at(r, c)?.[k] ?? 0);
    // Along rows (left → right) or down columns (top → bottom)? Row 0 and column 0 are always complete.
    const inRow = (k: Attr) => new Set([0, 1, 2].map((c) => val(0, c, k))).size > 1;
    const inCol = (k: Attr) => new Set([0, 1, 2].map((r) => val(r, 0, k))).size > 1;
    const rowAttr = ATTRS.find(inRow);
    const attr = rowAttr ?? ATTRS.find(inCol) ?? 'shape';
    const prefix = rowAttr ? 'practice.explain.' : 'practice.explain.col.';
    if (attr === 'count') {
      const [a, b] = rowAttr ? [at(0, 0), at(0, 1)] : [at(0, 0), at(1, 0)];
      if ((b?.count ?? 0) < (a?.count ?? 0)) return t(`${prefix}count.less`);
    }
    return t(prefix + attr);
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
  const feedback = useRef<HTMLDivElement>(null);
  // Keep the explanation in view above the BottomButton once answered.
  useEffect(() => {
    if (value !== null) feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [value]);
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
      <div class="app-feedback-slot" aria-live="polite" ref={feedback}>
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
