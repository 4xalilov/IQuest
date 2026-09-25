import { useState } from 'preact/hooks';
import { t } from '@iquest/i18n';
import { tg } from '@iquest/tg';
import { Button, Card, PageHeader, StatusChip } from '@iquest/ui';
import { Page } from '../components/Page';
import { Cta } from '../components/Cta';
import { ChipGroup } from '../components/ChipGroup';
import { LangSwitch } from '../components/HeaderTools';
import { AGE_BANDS, ageKey, consentGiven, isAgePending, isMinor, profile, setProfile, type AgeBand } from '../state';
import { beginTest, LINKS, openLink, requestWriteAccess } from '../flow';

/** S3 — "Nimaga tayyorlanay?" Age (required) and first-time consent live here (DESIGN 1.1). */
export default function Intro() {
  const age = profile.value.ageBand;
  const needConsent = !consentGiven.value;
  const [checked, setChecked] = useState(false);
  const [later, setLater] = useState<'idle' | 'asking' | 'done'>('idle');
  const ready = age !== null && (!needConsent || checked);

  const start = () => {
    if (!ready) return;
    tg.haptic.light();
    if (needConsent) consentGiven.value = true;
    beginTest();
  };

  const remind = async () => {
    setLater('asking');
    await requestWriteAccess();
    setLater('done');
  };

  return (
    <Page cta={<Cta text={t('test.intro.cta')} onClick={start} enabled={ready} />}>
      <PageHeader eyebrow={t('test.intro.eyebrow')} title={t('test.intro.title')} chip={<LangSwitch />} />

      <ul class="app-facts">
        <li>{t('test.intro.meta')}</li>
        <li>{t('test.intro.free')}</li>
        <li>{t('test.intro.quiet')}</li>
      </ul>

      <Card tone="warn" padding="m">
        <p class="app-p">{t('test.intro.integrity')}</p>
      </Card>

      <ChipGroup<AgeBand>
        label={t('survey.age')}
        labelId="age-label"
        options={AGE_BANDS}
        value={age}
        onChange={(v) => setProfile({ ageBand: v })}
        labelFor={(v) => t(ageKey(v))}
        required
      />
      {age === null && <p class="app-hint">{t('survey.age.required')}</p>}
      {isAgePending(age) && (
        <Card tone="notice" padding="m">
          <StatusChip tone="notice">{t('result.age_pending.chip')}</StatusChip>
          <p class="app-p">{t('result.age_pending')}</p>
        </Card>
      )}
      {isMinor(age) && !isAgePending(age) && <p class="app-hint">{t('consent.minor')}</p>}

      {needConsent && (
        <section class="app-consent" aria-labelledby="consent-title">
          <h2 class="app-h2" id="consent-title">
            {t('consent.title')}
          </h2>
          <p class="app-p app-muted">{t('consent.body')}</p>
          <button type="button" class="app-link iq-ring" onClick={() => openLink(LINKS.privacy)}>
            {t('consent.full')}
          </button>
          <label class="app-check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked((e.target as HTMLInputElement).checked)} />
            <span class="app-check__box" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span>{t('consent.check')}</span>
          </label>
        </section>
      )}

      {tg.available && (
        <div class="app-center-row">
          {later === 'done' ? (
            <p class="app-hint" role="status">
              {t('test.intro.later.done')}
            </p>
          ) : (
            <Button variant="ghost" loading={later === 'asking'} onClick={remind}>
              {t('test.intro.later')}
            </Button>
          )}
        </div>
      )}
    </Page>
  );
}
