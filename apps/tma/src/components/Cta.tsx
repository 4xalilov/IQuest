import { tg, useMainButton } from '@iquest/tg';
import { Button } from '@iquest/ui';

interface Props {
  text: string;
  onClick: () => void;
  enabled?: boolean;
  loading?: boolean;
}

/**
 * The screen's single primary action. In Telegram it drives the native BottomButton while
 * mounted (unmount = hidden, e.g. while a Sheet is open). In a browser it renders the primary
 * Button that Page puts into the BottomBar.
 */
export function Cta({ text, onClick, enabled = true, loading = false }: Props) {
  useMainButton(text, onClick, enabled, loading);
  if (tg.available) return null;
  return (
    <Button block disabled={!enabled} loading={loading} onClick={onClick}>
      {text}
    </Button>
  );
}
