import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { route, reset, type RouteName } from '../router';

const ICONS: Record<string, string> = {
  // Lucide: house, chart-column, user (1.75px stroke)
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  results: 'M3 3v16a2 2 0 0 0 2 2h16M8 17v-4M13 17V8M18 17v-7',
  profile: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
};

const TABS: { name: RouteName; key: string }[] = [
  { name: 'home', key: 'nav.home' },
  { name: 'results', key: 'nav.results' },
  { name: 'profile', key: 'nav.profile' },
];

/** Bosh sahifa · Natijalarim · Profil — only on top-level screens (DESIGN §8). */
export function BottomNav() {
  const active = route.value.name;
  return (
    <nav class="app-nav" aria-label={t('nav.label')}>
      {TABS.map((tab) => {
        const on = active === tab.name;
        return (
          <button
            key={tab.name}
            type="button"
            class={'app-nav__tab iq-ring' + (on ? ' is-active' : '')}
            aria-current={on ? 'page' : undefined}
            onClick={() => {
              if (on) return;
              tg.haptic.select();
              reset({ name: tab.name } as { name: 'home' });
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d={ICONS[tab.name]} fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{t(tab.key)}</span>
          </button>
        );
      })}
    </nav>
  );
}
