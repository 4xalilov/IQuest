import { useState } from 'preact/hooks';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Button, Sheet, StyleBadge } from '@iquest/ui';
import { ChipGroup } from '../components/ChipGroup';
import { findResult, isAgePending } from '../state';

type Mode = 'style' | 'score';

/**
 * S11 — "Qanday ulashaman?" Default is "Faqat uslubim" (no number); the score option exists only
 * for reliable results with ready norms. Never offered to minors (§15).
 */
export default function ShareSheet({ open, onClose, id }: { open: boolean; onClose: () => void; id: string }) {
  const saved = findResult(id);
  const [mode, setMode] = useState<Mode>('style');
  if (!saved || saved.minor) return null;
  const r = saved.result;
  const scoreAllowed = r.reliability === 'ok' && !isAgePending(saved.ageBand);
  const withScore = scoreAllowed && mode === 'score';
  const styleName = t(`style.${r.style}.name`);
  const top = r.strengths.reduce((a, b) => (b.value > a.value ? b : a), r.strengths[0]);

  const send = () => {
    tg.haptic.light();
    tg.share(
      withScore
        ? t('share.with_score', { low: r.band.low, high: r.band.high, strength: t(`domain.${top.domain}`) })
        : t('share.style_only', { style: styleName }),
    );
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label={t('share.title')}>
      <div class="app-sheet">
        <h2 class="app-h2">{t('share.title')}</h2>
        <div class="app-share-preview" role="img" aria-label={t('share.preview.aria')}>
          <span class="app-eyebrow">{t('share.card.title')}</span>
          <StyleBadge emoji={t(`style.${r.style}.emoji`)} name={styleName} desc={t(`style.${r.style}.desc`)} />
          {withScore && <p class="app-share-iq">{t('share.card.iq', { low: r.band.low, high: r.band.high })}</p>}
        </div>
        {scoreAllowed && (
          <>
            <ChipGroup<Mode>
              label={t('share.mode.label')}
              labelId="share-mode"
              options={['style', 'score']}
              value={mode}
              onChange={setMode}
              labelFor={(m) => t(`share.mode.${m}`)}
            />
            <p class="app-hint">{t('share.score_hint')}</p>
          </>
        )}
        <div class="app-actions">
          <Button block onClick={send}>
            {t('share.cta')}
          </Button>
          <Button block variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
