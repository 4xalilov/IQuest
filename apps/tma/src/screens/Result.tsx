import { useEffect, useState } from 'preact/hooks';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Accordion, Button, Card, EmptyState, PageHeader, PaywallCard, ScoreBandCard, StatusChip, StrengthBars, StyleBadge } from '@iquest/ui';
import type { Result } from '@iquest/engine';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { navigate, reset } from '../router';
import {
  EDUCATION, REGIONS, findResult, isAgePending, isPurchased, paywallDeclined, profile, setProfile,
  type Education, type Region,
} from '../state';
import { dayMonth } from '../format';
import { idlePreload } from '../lazy';
import { PaywallScreen, ShareSheet } from './lazy';
import { price } from '../price';

export const PAYWALL_ITEMS = ['paywall.item.sections', 'paywall.item.timing', 'paywall.item.plan', 'paywall.item.pdf'];

const celebrated = new Set<string>();

function strongest(r: Result) {
  return r.strengths.reduce((a, b) => (b.value > a.value ? b : a), r.strengths[0]);
}

/** Optional region/education (1.1: moved from S9 to after the strengths). */
function NormsHelp() {
  const p = profile.value;
  const [region, setRegion] = useState<Region | ''>(p.region ?? '');
  const [edu, setEdu] = useState<Education | ''>(p.education ?? '');
  const [sent, setSent] = useState(p.region !== null || p.education !== null);
  if (sent) {
    return (
      <Card padding="m">
        <p class="app-p app-muted" role="status">
          {t('result.norms_help.thanks')}
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <form
        class="app-form"
        onSubmit={(e) => {
          e.preventDefault();
          tg.haptic.light();
          setProfile({ region: region || null, education: edu || null });
          setSent(true);
        }}
      >
        <h2 class="app-h2">{t('result.norms_help.title')}</h2>
        <label class="app-select">
          <span class="app-field__label">
            {t('survey.region')} <span class="app-muted">· {t('common.optional')}</span>
          </span>
          <select value={region} onChange={(e) => setRegion((e.target as HTMLSelectElement).value as Region | '')}>
            <option value="">{t('survey.region.placeholder')}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(`survey.region.${r}`)}
              </option>
            ))}
          </select>
        </label>
        <label class="app-select">
          <span class="app-field__label">
            {t('survey.edu')} <span class="app-muted">· {t('common.optional')}</span>
          </span>
          <select value={edu} onChange={(e) => setEdu((e.target as HTMLSelectElement).value as Education | '')}>
            <option value="">{t('survey.region.placeholder')}</option>
            {EDUCATION.map((x) => (
              <option key={x} value={x}>
                {t(`survey.edu.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary" disabled={!region && !edu}>
          {t('result.norms_help.cta')}
        </Button>
      </form>
    </Card>
  );
}

/**
 * S10 — "Mening natijam qanday?" Variants: unreliable · low band · age_pending (13–15) · normal/high.
 * No "genius" labels, no count-up animation; paywall only for reliable, adult, non-low results.
 */
export default function ResultPage({ id }: { id?: string }) {
  const saved = findResult(id);
  const [share, setShare] = useState(false);
  const [shareMounted, setShareMounted] = useState(false);

  useEffect(() => {
    if (!saved) return;
    if (!celebrated.has(saved.id) && Date.now() - saved.at < 60_000) {
      celebrated.add(saved.id);
      tg.haptic.success(); // peak moment (§5), together with the band's scaleX reveal — once
    }
    if (!saved.minor) idlePreload(ShareSheet);
  }, []);

  if (!saved) {
    return (
      <Page>
        <EmptyState
          text={t('results.empty')}
          action={<Button onClick={() => reset({ name: 'intro' })}>{t('results.empty.cta')}</Button>}
        />
      </Page>
    );
  }

  const r = saved.result;
  const unreliable = r.reliability === 'low';
  const agePending = isAgePending(saved.ageBand);
  const low = r.bandLevel === 'low';
  const minor = saved.minor;
  const top = strongest(r);
  const styleName = t(`style.${r.style}.name`);
  const purchased = isPurchased(saved.id);
  const showPaywall = !unreliable && !agePending && !low && !minor && !purchased && !paywallDeclined.value.includes(saved.id);

  const band = unreliable ? (
    <ScoreBandCard
      variant="unreliable"
      low={0} high={0} pctLow={0} pctHigh={0}
      label={t('result.band.label')}
      pctText=""
      chip={<StatusChip tone="warn">{t('result.unreliable.chip')}</StatusChip>}
      message={saved.blurCount >= 3 ? t('result.unreliable.blur') : t('result.unreliable')}
    />
  ) : agePending ? (
    <ScoreBandCard
      variant="age_pending"
      low={0} high={0} pctLow={0} pctHigh={0}
      label={t('result.band.label')}
      pctText=""
      chip={<StatusChip tone="notice">{t('result.age_pending.chip')}</StatusChip>}
      message={t('result.age_pending')}
    />
  ) : (
    <ScoreBandCard
      low={r.band.low}
      high={r.band.high}
      pctLow={r.pct.low}
      pctHigh={r.pct.high}
      label={t('result.band.label')}
      pctText={t('result.pct', { low: r.pct.low, high: r.pct.high })}
    />
  );

  const strengths = (
    <section class="app-section" aria-labelledby="abilities">
      <h2 class="app-h2" id="abilities">
        {t('result.abilities')}
      </h2>
      <StrengthBars
        rows={r.strengths.map((x) => ({ label: t(`domain.${x.domain}`), value: x.value, word: t(`strength.${x.word}`) }))}
      />
    </section>
  );

  const cta = unreliable ? (
    <Cta text={t('result.retake')} onClick={() => reset({ name: 'intro' })} />
  ) : minor ? null : share ? null : (
    <Cta
      text={t('result.share')}
      onClick={() => {
        tg.haptic.light();
        setShareMounted(true);
        setShare(true);
      }}
    />
  );

  return (
    <Page cta={cta}>
      <PageHeader
        eyebrow={t('result.eyebrow', { date: dayMonth(saved.at) })}
        title={t('result.title')}
        chip={!unreliable && !agePending ? <StatusChip tone="notice">{t('result.norms.provisional')}</StatusChip> : undefined}
      />
      <p class="app-p">{t('finish.body', { count: r.total, minutes: r.minutes })}</p>

      {low && !unreliable && !agePending ? (
        <>
          {/* Low band: strengths and conditions first, the number after (§9 S10 variants). */}
          <p class="app-lead">{t('result.low.intro', { strength: t(`domain.${top.domain}`) })}</p>
          <StyleBadge emoji={t(`style.${r.style}.emoji`)} name={styleName} desc={t(`style.${r.style}.desc`)} />
          {strengths}
          <Card padding="m">
            <p class="app-p">{t('result.conditions')}</p>
          </Card>
          {band}
          <Accordion title={t('result.worried')}>
            <p class="app-p">{t('result.worried.body')}</p>
            <button type="button" class="app-link iq-ring" onClick={() => navigate({ name: 'methodology' })}>
              {t('settings.methodology')}
            </button>
          </Accordion>
        </>
      ) : (
        <>
          <StyleBadge emoji={t(`style.${r.style}.emoji`)} name={styleName} desc={t(`style.${r.style}.desc`)} />
          {band}
          {strengths}
        </>
      )}

      {!minor && <NormsHelp />}

      <div class="app-accordions">
        <Accordion title={t('result.accordion.means')}>
          <p class="app-p">{t('result.means')}</p>
          <p class="app-p">{t('result.conditions')}</p>
          <p class="app-p">{t('result.snapshot')}</p>
        </Accordion>
        <Accordion title={t('result.accordion.next')}>
          <p class="app-p">{t('result.retest')}</p>
          <button type="button" class="app-link iq-ring" onClick={() => navigate({ name: 'methodology' })}>
            {t('settings.methodology')}
          </button>
        </Accordion>
      </div>

      {low && !unreliable && !agePending && (
        <div class="app-center-row">
          <Button variant="secondary" onClick={() => reset({ name: 'intro' })}>
            {t('result.retake')}
          </Button>
        </div>
      )}

      {purchased && (
        <Card padding="m">
          <div class="app-row">
            <StatusChip tone="money">{t('payment.chip.paid')}</StatusChip>
            <Button variant="secondary" size="s" onClick={() => navigate({ name: 'paywall', id: saved.id })}>
              {t('payment.open_report')}
            </Button>
          </div>
        </Card>
      )}

      {showPaywall && (
        <PaywallCard
          title={t('paywall.title', { price: price() })}
          price={price()}
          items={PAYWALL_ITEMS.map((k) => t(k))}
          terms={t('paywall.terms')}
          cta={t('paywall.cta')}
          decline={t('paywall.decline')}
          onBuy={() => {
            void PaywallScreen.preload();
            navigate({ name: 'paywall', id: saved.id });
          }}
          onDecline={() => (paywallDeclined.value = [...paywallDeclined.value, saved.id])}
        />
      )}

      {shareMounted && <ShareSheet open={share} onClose={() => setShare(false)} id={saved.id} />}
    </Page>
  );
}
