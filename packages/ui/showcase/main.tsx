import { render } from 'preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Glyph as G } from '@iquest/engine';
import '../src/styles.css';
import './showcase.css';
import {
  Accordion, BottomBar, Button, CalmTimer, Card, EmptyState, Figure, Glyph, MatrixGrid, ObjectCard,
  OptionGrid, OptionTile, PageHeader, PaywallCard, Screen, ScoreBandCard, SectionProgress, SeriesRow,
  Sheet, Skeleton, StatusChip, StrengthBars, StyleBadge,
} from '../src';

const q = new URLSearchParams(location.search);
const root = document.documentElement;
if (q.get('theme')) root.setAttribute('data-theme', q.get('theme')!);
if (q.get('text') === 'large') root.setAttribute('data-text', 'large');
if (q.get('motion') === 'off') root.setAttribute('data-motion', 'off');

/* ---------- sample data ---------- */
const kinds = ['circle', 'square', 'triangle'] as const;
const fills = ['none', 'hatch', 'solid'] as const;
const cells: (G | null)[] = kinds.flatMap((shape, r) =>
  ([1, 2, 3] as const).map((count) => (r === 2 && count === 3 ? null : { shape, count, fill: fills[r] })),
);
const matrixOptions: G[] = [
  { shape: 'triangle', count: 2, fill: 'solid' }, { shape: 'square', count: 3, fill: 'solid' },
  { shape: 'triangle', count: 3, fill: 'solid' }, { shape: 'triangle', count: 3, fill: 'hatch' },
  { shape: 'circle', count: 3, fill: 'solid' }, { shape: 'triangle', count: 1, fill: 'solid' },
  { shape: 'triangle', count: 3, fill: 'none' }, { shape: 'square', count: 3, fill: 'hatch' },
];
const allGlyphs: G[] = (['circle', 'square', 'triangle', 'diamond'] as const).flatMap((shape) =>
  ([1, 2, 3, 4] as const).map((count, i) => ({ shape, count, fill: fills[i % 3] })),
);
const rotations: G[] = ([0, 45, 90, 135, 180, 225, 270, 315] as const).map((rotate, i) => ({ shape: 'triangle', count: i % 2 ? 2 : 1, fill: fills[i % 3], rotate }));
const target: G[] = [
  { shape: 'triangle', count: 1, fill: 'solid', rotate: 0 }, { shape: 'circle', count: 1, fill: 'none' },
  { shape: 'square', count: 1, fill: 'hatch' }, { shape: 'diamond', count: 1, fill: 'none' },
];
/** rotate a figure 90° cw per engine convention */
const rot90 = (f: G[]): G[] => f.map((_, i) => {
  const g = f[(i + 3) % 4];
  return { ...g, rotate: (((g.rotate ?? 0) + 90) % 360) as G['rotate'] };
});
const mirror = (f: G[]): G[] => [f[1], f[0], f[3], f[2]];
const spatialOptions: G[][] = [mirror(target), rot90(target), mirror(rot90(target)), rot90(rot90(target)), mirror(rot90(rot90(target)))];

const long = 'Juda uzun sarlavha matni ikki qatorga oʻtishi kerak va hech qachon kesilmasligi lozim';

/* ---------- showcase chrome ---------- */
function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="sc-section">
      <h2 class="sc-h">{title}</h2>
      {children}
    </section>
  );
}
function State({ name, children, row }: { name: string; children: ComponentChildren; row?: boolean }) {
  return (
    <div class="sc-state">
      <div class="sc-state__name">{name}</div>
      <div class={row ? 'sc-row' : 'sc-col'}>{children}</div>
    </div>
  );
}

function Toolbar() {
  const [theme, setTheme] = useState(root.getAttribute('data-theme') ?? '');
  const [large, setLarge] = useState(root.getAttribute('data-text') === 'large');
  useEffect(() => { theme ? root.setAttribute('data-theme', theme) : root.removeAttribute('data-theme'); }, [theme]);
  useEffect(() => { large ? root.setAttribute('data-text', 'large') : root.removeAttribute('data-text'); }, [large]);
  return (
    <div class="sc-toolbar" role="group" aria-label="Mavzu">
      {[['', 'Tizim'], ['light', 'Yorugʻ'], ['dark', 'Qorongʻi']].map(([v, l]) => (
        <button key={v} class="sc-tb" aria-pressed={theme === v} onClick={() => setTheme(v)}>{l}</button>
      ))}
      <button class="sc-tb" aria-pressed={large} onClick={() => setLarge(!large)}>Katta matn</button>
    </div>
  );
}

function App() {
  const [opt, setOpt] = useState<number | null>(2);
  const [numOpt, setNumOpt] = useState<number | null>(null);
  const [spOpt, setSpOpt] = useState<number | null>(1);
  const [hidden, setHidden] = useState(false);
  const [secs, setSecs] = useState(222);
  const [sheet, setSheet] = useState(q.get('sheet') === '1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.get('static')) return;
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 222)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Screen
      bottom={q.get('nobar') ? undefined : <Button block onClick={() => setSheet(true)}>Keyingi</Button>}
    >
      <PageHeader eyebrow="@iquest/ui" title="Komponentlar" chip={<StatusChip tone="accent">v1</StatusChip>} sub="Barcha komponentlar va holatlari." />
      <Toolbar />

      <Section title="Button">
        <State name="primary · secondary · ghost">
          <Button block onClick={() => {}}>Boshlash</Button>
          <Button variant="secondary" block onClick={() => {}}>Ulashish</Button>
          <Button variant="ghost" block onClick={() => {}}>Bilmayman</Button>
        </State>
        <State name="size s · inline" row>
          <Button size="s" onClick={() => {}}>Kichik</Button>
          <Button size="s" variant="secondary" onClick={() => {}}>Ikkinchi</Button>
          <Button size="s" variant="ghost" onClick={() => {}}>Ghost</Button>
        </State>
        <State name="disabled · loading (click)">
          <Button block disabled onClick={() => {}}>Keyingi</Button>
          <Button block loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>Hisobotni olish</Button>
          <Button block loading variant="secondary" onClick={() => {}}>Yuklanmoqda</Button>
        </State>
        <State name="long label">
          <Button block onClick={() => {}}>Natijani doʻstlarga ulashish va taqqoslash imkoniyati</Button>
        </State>
      </Section>

      <Section title="SectionProgress + CalmTimer">
        <State name="normal (click timer to hide)">
          <SectionProgress section={1} sections={3} item={4} items={9} label="Naqsh · 1/3-boʻlim"
            aside={<CalmTimer seconds={secs} total={300} hidden={hidden} onToggle={() => setHidden(!hidden)} />} />
        </State>
        <State name="warn ≤ 60s">
          <SectionProgress section={2} sections={3} item={8} items={9} label="Raqamlar · 2/3"
            aside={<CalmTimer seconds={42} total={300} hidden={false} onToggle={() => {}} />} />
        </State>
        <State name="hidden · hidden + warn" row>
          <CalmTimer seconds={200} total={300} hidden onToggle={() => {}} />
          <CalmTimer seconds={30} total={300} hidden onToggle={() => {}} />
        </State>
        <State name="start · end">
          <SectionProgress section={1} sections={3} item={0} items={9} label="Fazo · 3/3-boʻlim" />
          <SectionProgress section={3} sections={3} item={9} items={9} label="Fazo · 3/3-boʻlim" />
        </State>
      </Section>

      <Section title="MatrixGrid">
        <MatrixGrid cells={cells} />
      </Section>

      <Section title="OptionGrid · matrix (4 cols)">
        <OptionGrid columns={4} value={opt} onChange={setOpt}>
          {matrixOptions.map((g, i) => <Glyph key={i} glyph={g} />)}
        </OptionGrid>
        <State name="disabled">
          <OptionGrid columns={4} value={null} onChange={() => {}} disabled>
            {matrixOptions.slice(0, 4).map((g, i) => <Glyph key={i} glyph={g} />)}
          </OptionGrid>
        </State>
      </Section>

      <Section title="SeriesRow + OptionGrid wide (3 cols)">
        <SeriesRow terms={[2, 6, 12, 20, 30]} />
        <SeriesRow terms={[128, 256, 512, 1024, 2048, -4096]} />
        <OptionGrid columns={3} shape="wide" value={numOpt} onChange={setNumOpt}>
          {[40, 42, 36, 44, 48, 1024].map((n) => <span key={n}>{n}</span>)}
        </OptionGrid>
      </Section>

      <Section title="Figure · spatial (5 cols)">
        <div class="sc-figure-target"><Figure glyphs={target} size={112} label="Namuna shakl" /></div>
        <OptionGrid columns={5} value={spOpt} onChange={setSpOpt}>
          {spatialOptions.map((f, i) => <Figure key={i} glyphs={f} />)}
        </OptionGrid>
      </Section>

      <Section title="Glyph · shapes × count × fill">
        <div class="sc-glyphs">{allGlyphs.map((g, i) => <div key={i} class="sc-glyph"><Glyph glyph={g} /></div>)}</div>
        <State name="rotate 0…315 (hatch stays in screen space)">
          <div class="sc-glyphs">{rotations.map((g, i) => <div key={i} class="sc-glyph"><Glyph glyph={g} /></div>)}</div>
        </State>
      </Section>

      <Section title="OptionTile (standalone)">
        <div class="sc-row">
          <div style={{ width: '72px' }}><OptionTile index={0} selected={false} onSelect={() => {}}><Glyph glyph={matrixOptions[0]} /></OptionTile></div>
          <div style={{ width: '72px' }}><OptionTile index={1} selected onSelect={() => {}}><Glyph glyph={matrixOptions[1]} /></OptionTile></div>
          <div style={{ width: '72px' }}><OptionTile index={2} selected={false} disabled onSelect={() => {}}><Glyph glyph={matrixOptions[2]} /></OptionTile></div>
          <div style={{ width: '44px' }}><OptionTile index={3} selected onSelect={() => {}}><Glyph glyph={matrixOptions[3]} /></OptionTile></div>
        </div>
      </Section>

      <Section title="StatusChip">
        <div class="sc-row">
          <StatusChip tone="neutral">Neytral</StatusChip>
          <StatusChip tone="accent">Jarayonda</StatusChip>
          <StatusChip tone="warn">⚠ Ishonchsiz</StatusChip>
          <StatusChip tone="money">To‘langan</StatusChip>
          <StatusChip tone="notice">◷ Dastlabki meʼyorlar</StatusChip>
          <StatusChip tone="danger">Xato</StatusChip>
        </div>
      </Section>

      <Section title="PageHeader">
        <PageHeader eyebrow="IQ testi · 25-sentabr" title="Natijangiz" chip={<StatusChip tone="notice">◷ Dastlabki meʼyorlar</StatusChip>} sub="Barakalla! 27 ta savolga 16 daqiqada javob berdingiz." />
        <State name="long title, no eyebrow">
          <PageHeader title={long} chip={<StatusChip tone="warn">Ishonchsiz</StatusChip>} />
        </State>
      </Section>

      <Section title="Card">
        <Card><p class="sc-p">Default karta — padding l.</p></Card>
        <Card tone="warn" padding="m"><p class="sc-p">Warn karta — padding m.</p></Card>
        <Card tone="notice" padding="s"><p class="sc-p">Notice karta — padding s.</p></Card>
      </Section>

      <Section title="ObjectCard">
        <ObjectCard title="IQ testi" meta="27 savol · ~20 daqiqa" chip={<StatusChip tone="accent">Jarayonda</StatusChip>} progress={0.44}
          action={<Button size="s" block onClick={() => {}}>Davom etish</Button>} onClick={() => {}} />
        <ObjectCard title="Natija · 104–116" meta="25-sentabr 2026" chip={<StatusChip tone="money">Hisobot bor</StatusChip>} onClick={() => {}} />
        <ObjectCard title={long} meta="meta" chip={<StatusChip tone="notice">Dastlabki meʼyorlar</StatusChip>} />
      </Section>

      <Section title="StyleBadge">
        <StyleBadge emoji="🧩" name="Naqsh ovchisi" desc="Qonuniyat va naqshlarni tez ilgʻaysiz" />
        <StyleBadge emoji="⚖️" name="Muvozanatli fikrlovchi" desc="Barcha yoʻnalishlarda bir tekis" />
      </Section>

      <Section title="ScoreBandCard">
        <ScoreBandCard low={104} high={116} pctLow={60} pctHigh={75} label="Taxminiy IQ oraligʻi"
          pctText="100 kishidan taxminan 60–75 tasidan yuqori" chip={<StatusChip tone="notice">◷ Dastlabki meʼyorlar</StatusChip>} />
        <State name="edges: 58–70 · 128–145">
          <ScoreBandCard low={58} high={70} pctLow={1} pctHigh={2} label="Taxminiy IQ oraligʻi" pctText="100 kishidan taxminan 1–2 tasidan yuqori" />
          <ScoreBandCard low={128} high={145} pctLow={97} pctHigh={99} label="Taxminiy IQ oraligʻi" pctText="100 kishidan taxminan 97–99 tasidan yuqori" />
        </State>
        <State name="unreliable · age_pending">
          <ScoreBandCard variant="unreliable" low={0} high={0} pctLow={0} pctHigh={0} label="Taxminiy IQ oraligʻi" pctText=""
            chip={<StatusChip tone="warn">⚠ Ishonchsiz</StatusChip>}
            message="Javoblar juda tez berildi, shuning uchun natijani ishonchli hisoblab boʻlmadi. Testni tinch sharoitda qayta topshiring." />
          <ScoreBandCard variant="age_pending" low={0} high={0} pctLow={0} pctHigh={0} label="Taxminiy IQ oraligʻi" pctText=""
            chip={<StatusChip tone="notice">◷ Kutilmoqda</StatusChip>}
            message="Yoshingiz uchun meʼyorlar hali tayyor emas. Natija tayyor boʻlganda xabar beramiz." />
        </State>
      </Section>

      <Section title="StrengthBars">
        <StrengthBars rows={[
          { label: 'Naqsh', value: 0.9, word: 'kuchli' },
          { label: 'Raqamlar', value: 0.62, word: 'oʻrtacha' },
          { label: 'Fazo', value: 0.12, word: 'rivojlanish zonasi' },
        ]} />
      </Section>

      <Section title="PaywallCard">
        <PaywallCard title="Batafsil hisobot" price="150 ⭐"
          items={['3 boʻlim boʻyicha tahlil', 'Har boʻlim boʻyicha vaqt va aniqlik', '4 haftalik shaxsiy mashq rejasi', 'PDF']}
          terms="Bir martalik toʻlov. Obuna emas. 7 kun ichida pul qaytariladi."
          cta="Hisobotni olish" decline="Hozir emas" onBuy={() => {}} onDecline={() => {}} />
        <State name="loading">
          <PaywallCard title="Batafsil hisobot" price="150 ⭐" items={['PDF']} terms="Bir martalik toʻlov."
            cta="Hisobotni olish" decline="Hozir emas" loading onBuy={() => {}} onDecline={() => {}} />
        </State>
      </Section>

      <Section title="Accordion">
        <div>
          <Accordion title="Bu natija nimani anglatadi?" open>
            <p>Bu natija ijodkorligingiz, bilimingiz, xarakteringiz yoki inson sifatidagi qadringizni oʻlchamaydi.</p>
          </Accordion>
          <Accordion title="Keyingi qadamlar"><p>Rasmiy qayta test — 90 kundan keyin.</p></Accordion>
          <Accordion title={long}><p>Matn.</p></Accordion>
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState icon="🗂️" text="Hali natijalar yoʻq. Birinchi testni topshirib koʻring." action={<Button size="s" onClick={() => {}}>Boshlash</Button>} />
      </Section>

      <Section title="Skeleton">
        <div class="sc-col">
          <Skeleton h={24} w="60%" />
          <Skeleton h={120} r={20} />
          <div class="sc-row"><Skeleton h={44} w={44} r={999} /><Skeleton h={44} w={200} /></div>
        </div>
      </Section>

      <Section title="BottomBar (inline) + Sheet">
        <div class="sc-bb"><BottomBar><Button block onClick={() => setSheet(true)}>Sheet'ni ochish</Button></BottomBar></div>
      </Section>

      <Sheet open={sheet} onClose={() => setSheet(false)} label="Rozilik">
        <h2 class="sc-sheet-title">Davom etishdan oldin</h2>
        <p class="sc-p">Javoblaringiz faqat natijani hisoblash uchun ishlatiladi. Toʻliq matn — havolada.</p>
        <div class="sc-col" style={{ marginTop: '16px' }}>
          <Button block onClick={() => setSheet(false)}>Roziman</Button>
          <Button block variant="ghost" onClick={() => setSheet(false)}>Bekor qilish</Button>
        </div>
      </Sheet>
    </Screen>
  );
}

render(<App />, document.getElementById('app')!);
