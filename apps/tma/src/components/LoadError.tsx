import { EmptyState, Button } from '@iquest/ui';
import { t } from '@iquest/i18n';

/** A lazy chunk failed to download (usually offline). */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div class="app-fallback" role="alert">
      <EmptyState
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
