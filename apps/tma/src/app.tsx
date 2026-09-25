import { useEffect } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Button, Sheet } from '@iquest/ui';
import { BackBtn } from './components/BackBtn';
import { OfflineBanner } from './components/Banner';
import { back, exitAsk, isRoot, reset, route, routeKey, TEST_FLOW, type Route } from './router';
import { registerBlur, suspendTest } from './state';
import { lazyLoaded } from './lazy';
import Home from './screens/Home';
import Intro from './screens/Intro';
import Parent from './screens/Parent';
import Practice from './screens/Practice';
import Question from './screens/Question';
import Break from './screens/Break';
import Resume from './screens/Resume';
import Finish from './screens/Finish';
import { HelpScreen, MethodologyScreen, PaywallScreen, ResultScreen, ResultsScreen, SettingsScreen } from './screens/lazy';

function renderRoute(r: Route) {
  switch (r.name) {
    case 'home': return <Home />;
    case 'intro': return <Intro />;
    case 'parent': return <Parent />;
    case 'practice': return <Practice index={r.index} />;
    case 'question': return <Question />;
    case 'break': return <Break />;
    case 'resume': return <Resume />;
    case 'finish': return <Finish />;
    case 'result': return <ResultScreen id={r.id} />;
    case 'paywall': return <PaywallScreen id={r.id} />;
    case 'results': return <ResultsScreen />;
    case 'settings': return <SettingsScreen />;
    case 'methodology': return <MethodologyScreen />;
    case 'help': return <HelpScreen topic={r.topic} />;
  }
}

/** BackButton behaviour per screen (DESIGN §8). */
function backHandler(r: Route): (() => void) | null {
  if (TEST_FLOW.includes(r.name)) return () => (exitAsk.value = true);
  if (r.name === 'finish' || r.name === 'result') return () => reset({ name: 'home' });
  if (isRoot.value) return r.name === 'home' ? null : () => reset({ name: 'home' });
  return back;
}

/** "Testni toʻxtatasizmi?" — answers are kept, the test can be resumed from Home (S7). */
function ExitSheet() {
  const close = () => (exitAsk.value = false);
  const stop = () => {
    exitAsk.value = false;
    suspendTest();
    reset({ name: 'home' });
  };
  return (
    <Sheet open={exitAsk.value} onClose={close} label={t('test.exit.confirm')}>
      <div class="app-sheet">
        <h2 class="app-h2">{t('test.exit.confirm')}</h2>
        <div class="app-actions">
          <Button block onClick={close}>
            {t('test.exit.continue')}
          </Button>
          <Button block variant="secondary" onClick={stop}>
            {t('test.exit.stop')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function App() {
  const r = route.value;
  const inTest = TEST_FLOW.includes(r.name);
  const onBack = backHandler(r);

  // Telegram test mode (fullscreen, swipe lock, closing confirmation) + blur counting only in S5/S6.
  useEffect(() => {
    if (!inTest) return;
    tg.testMode(true);
    const off = tg.onBlur(registerBlur);
    return () => {
      off();
      tg.testMode(false);
      exitAsk.value = false;
    };
  }, [inTest]);

  // Focus the new screen's heading (screen readers + keyboard), also when a lazy chunk arrives.
  useSignalEffect(() => {
    void routeKey.value;
    void lazyLoaded.value;
    requestAnimationFrame(() => {
      const h = document.querySelector<HTMLElement>('#app h1');
      if (!h) return;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    });
  });

  // Every screen starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey.value]);

  return (
    <>
      {onBack && <BackBtn onBack={onBack} />}
      <OfflineBanner />
      <div class="app-view" key={routeKey.value}>
        {renderRoute(r)}
      </div>
      {inTest && <ExitSheet />}
    </>
  );
}
