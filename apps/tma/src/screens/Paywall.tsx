import { useState } from 'preact/hooks';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Button, Card, EmptyState, PageHeader, StatusChip } from '@iquest/ui';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { CheckIcon } from '../components/Icons';
import { back, reset } from '../router';
import { addPurchase, findResult, isPurchased, online } from '../state';
import { price, PAYWALL_ITEMS } from '../price';

type PayState = 'idle' | 'opening' | 'pending' | 'failed' | 'cancelled' | 'paid';

const INVOICE_URL = import.meta.env.VITE_INVOICE_URL ?? '';

/**
 * S12 — "Pullik hisobotda nima bor?" + S13 — "Toʻlov oʻtdimi?" in one screen.
 * Plain list (no blurred "hidden" content), price in --money, decline equal in weight to buy.
 */
export default function Paywall({ id }: { id: string }) {
  const saved = findResult(id);
  const [state, setState] = useState<PayState>(() => (isPurchased(id) ? 'paid' : 'idle'));

  if (!saved) {
    return (
      <Page>
        <EmptyState text={t('error.load')} action={<Button onClick={() => reset({ name: 'home' })}>{t('common.go_home')}</Button>} />
      </Page>
    );
  }

  const buy = async () => {
    if (!online.value) return;
    tg.haptic.light();
    setState('opening');
    const status = INVOICE_URL ? await tg.openInvoice(INVOICE_URL) : 'failed';
    if (status === 'paid') {
      addPurchase(id);
      tg.haptic.success();
    } else if (status === 'failed') {
      tg.haptic.error();
    }
    setState(status);
  };

  const cta =
    state === 'paid' ? (
      <Cta text={t('payment.open_report')} onClick={() => back()} />
    ) : state === 'pending' ? (
      <Cta text={t('payment.pending')} onClick={() => {}} enabled={false} loading />
    ) : (
      <Cta
        text={state === 'failed' ? t('payment.retry') : t('paywall.buy_with_price', { price: price() })}
        onClick={buy}
        enabled={online.value}
        loading={state === 'opening'}
      />
    );

  const status =
    state === 'pending' ? (
      <Card padding="m">
        <StatusChip tone="money">{t('payment.pending')}</StatusChip>
        <p class="app-p">{t('payment.pending.body')}</p>
      </Card>
    ) : state === 'failed' ? (
      <Card padding="m">
        <StatusChip tone="danger">{t('payment.failed')}</StatusChip>
        <p class="app-p" role="alert">
          {INVOICE_URL ? t('payment.failed.body') : t('payment.unavailable')}
        </p>
      </Card>
    ) : state === 'cancelled' ? (
      <p class="app-hint" role="status">
        {t('payment.cancelled')}
      </p>
    ) : state === 'paid' ? (
      <Card padding="m">
        <StatusChip tone="money">{t('payment.chip.paid')}</StatusChip>
        <p class="app-p" role="status">
          {t('payment.success.body')}
        </p>
      </Card>
    ) : null;

  return (
    <Page cta={cta}>
      <PageHeader
        eyebrow={t('report.title')}
        title={state === 'paid' ? t('payment.success') : t('paywall.lead')}
        chip={state === 'paid' ? undefined : <span class="app-price">{price()}</span>}
      />
      {status}
      {state !== 'paid' && (
        <>
          <ul class="app-checklist">
            {PAYWALL_ITEMS.map((k) => (
              <li key={k}>
                <span class="app-accent">
                  <CheckIcon />
                </span>
                {t(k)}
              </li>
            ))}
          </ul>
          <p class="app-p app-muted">{t('paywall.terms')}</p>
          {!online.value && <p class="app-hint">{t('error.offline')}</p>}
          <Button block variant="secondary" disabled={state === 'opening'} onClick={() => back()}>
            {t('paywall.decline')}
          </Button>
        </>
      )}
    </Page>
  );
}
