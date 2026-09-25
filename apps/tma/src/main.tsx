import '@iquest/ui/styles.css';
import './app.css';
import { render } from 'preact';
import { tg } from '@iquest/tg';
import { ready } from '@iquest/i18n';
import { boot } from './router';
import { loadSession, visited, results } from './state';
import { App } from './app';

// Theme, safe areas and ready() before the first frame (no colour flash).
tg.init();
loadSession();

// DESIGN 1.1: first launch → S3 directly; returning users → S2.
boot(visited.value || results.value.length > 0 ? { name: 'home' } : { name: 'intro' });

// ru lug'ati alohida chunk; uz-Latn uchun ready darhol bajariladi.
ready.then(() => {
  const root = document.getElementById('app')!;
  root.textContent = ''; // drop the inline boot shell
  render(<App />, root);
});
