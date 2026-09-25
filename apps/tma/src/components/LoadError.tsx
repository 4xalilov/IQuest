import { EmptyState, Button } from '@iquest/ui';
import { t } from '@iquest/i18n';

/** Shown when a lazy chunk failed to download (usually offline). */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div class="app-center" role="alert">
      <EmptyState
        icon="⚠︎"
        text={t('error.network')}
        action={
          <Button variant="secondary" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        }
      />
    </div>
  );
}
