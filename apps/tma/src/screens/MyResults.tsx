import { t } from '@iquest/i18n';
import { Button, EmptyState, ObjectCard, PageHeader, StatusChip } from '@iquest/ui';
import { Page } from '../components/Page';
import { navigate, reset } from '../router';
import { isAgePending, purchases, results, RETEST_DAYS, type SavedResult } from '../state';
import { dayMonth, fullDate, DAY_MS } from '../format';

function chipFor(r: SavedResult, bought: boolean) {
  if (bought) return <StatusChip tone="money">{t('payment.chip.paid')}</StatusChip>;
  if (r.result.reliability === 'low') return <StatusChip tone="warn">{t('result.unreliable.chip')}</StatusChip>;
  if (isAgePending(r.ageBand)) return <StatusChip tone="notice">{t('result.age_pending.chip')}</StatusChip>;
  return undefined;
}

function metaFor(r: SavedResult): string {
  const style = t(`style.${r.result.style}.name`);
  if (r.result.reliability === 'low' || isAgePending(r.ageBand)) return style;
  return `${style} · ${t('result.band.short', { low: r.result.band.low, high: r.result.band.high })}`;
}

/** S15 — "Mening tarixim?" Results, purchases and the official retest date. */
export default function MyResults() {
  const list = results.value;
  const bought = purchases.value;

  if (list.length === 0) {
    return (
      <Page>
        <PageHeader title={t('results.title')} />
        <EmptyState
          text={t('results.empty')}
          action={<Button onClick={() => reset({ name: 'intro' })}>{t('results.empty.cta')}</Button>}
        />
      </Page>
    );
  }

  const first = list[list.length - 1];
  const retestAt = first.at + RETEST_DAYS * DAY_MS;

  return (
    <Page>
      <PageHeader title={t('results.title')} />
      {list.map((r) => (
        <ObjectCard
          key={r.id}
          title={t('results.item.title', { date: dayMonth(r.at) })}
          meta={metaFor(r)}
          chip={chipFor(r, bought.some((p) => p.id === r.id))}
          onClick={() => navigate({ name: 'result', id: r.id })}
        />
      ))}
      <p class="app-hint">
        {retestAt > Date.now() ? t('profile.retest', { date: fullDate(retestAt) }) : t('result.retest')}
      </p>

      <section class="app-section" aria-labelledby="purchases">
        <h2 class="app-h2" id="purchases">
          {t('profile.purchases')}
        </h2>
        {bought.length === 0 ? (
          <p class="app-p app-muted">{t('profile.purchases.empty')}</p>
        ) : (
          <ul class="app-list">
            {bought.map((p) => (
              <li key={p.id}>
                <span>{t('profile.purchase.report', { date: dayMonth(p.at) })}</span>
                <StatusChip tone="money">{t('payment.chip.paid')}</StatusChip>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
