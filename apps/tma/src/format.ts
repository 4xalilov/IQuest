import { t } from '@iquest/i18n';

/** "25-sentabr" (uz) / "25 сентября" (ru) — month names come from i18n, not Intl (no uz data on many Androids). */
export function dayMonth(ts: number): string {
  const d = new Date(ts);
  return t('date.day_month', { d: d.getDate(), month: t(`month.${d.getMonth() + 1}`) });
}

/** "25-sentabr 2026" / "25 сентября 2026". */
export function fullDate(ts: number): string {
  return t('date.full', { d: new Date(ts).getDate(), month: t(`month.${new Date(ts).getMonth() + 1}`), y: new Date(ts).getFullYear() });
}

export const DAY_MS = 86_400_000;

