import type { Item } from '@iquest/engine';
import { Figure, Glyph, MatrixGrid, SeriesRow, OptionGrid } from '@iquest/ui';
import { t } from '@iquest/i18n';

interface Props {
  item: Item;
  value: number | null;
  onChange: (i: number) => void;
  disabled?: boolean;
}

const optionLabel = (i: number) => t('item.option', { n: i + 1 });

/**
 * Stimulus + answer options for any item kind. Neutral styling only — correctness is never
 * shown here (measurement mode); Practice adds its own feedback below.
 */
export function ItemView({ item, value, onChange, disabled }: Props) {
  const common = { value, onChange, disabled, label: t('item.options'), optionLabel };
  if (item.kind === 'matrix') {
    return (
      <>
        <div class="app-stimulus">
          <MatrixGrid cells={item.cells} label={t('item.matrix.aria')} />
        </div>
        <OptionGrid columns={4} {...common}>
          {item.options.map((g) => (
            <Glyph glyph={g} />
          ))}
        </OptionGrid>
      </>
    );
  }
  if (item.kind === 'series') {
    return (
      <>
        <div class="app-stimulus">
          <SeriesRow terms={item.terms} />
        </div>
        <OptionGrid columns={3} shape="wide" {...common}>
          {item.options.map((n) => (
            <span class="app-num">{n < 0 ? `−${Math.abs(n)}` : n}</span>
          ))}
        </OptionGrid>
      </>
    );
  }
  return (
    <>
      <p class="app-task">{t('item.rotation.task')}</p>
      <div class="app-stimulus app-stimulus--figure">
        <Figure glyphs={item.target} label={t('item.rotation.aria')} />
      </div>
      <OptionGrid columns={5} {...common}>
        {item.options.map((fig) => (
          <Figure glyphs={fig} />
        ))}
      </OptionGrid>
    </>
  );
}
