import { t } from '@iquest/i18n';
import { StatusChip } from '@iquest/ui';
import { online } from '../state';

/** Calm, non-blocking offline hint. The test itself works fully offline. */
export function OfflineNote() {
  if (online.value) return null;
  return (
    <div class="app-offline" role="status">
      <StatusChip tone="warn">{t('offline.chip')}</StatusChip>
      <span>{t('offline.body')}</span>
    </div>
  );
}
