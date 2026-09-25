import { t } from '@iquest/i18n';

/** Report price label, e.g. "150 ⭐" (env override for tests of other prices). */
export const price = (): string => import.meta.env.VITE_REPORT_PRICE ?? t('paywall.price');
