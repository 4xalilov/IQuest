import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { Card } from './Card';
import { cx, uid } from './util';
import './ScoreBandCard.css';

export interface ScoreBandCardProps {
  low: number;
  high: number;
  pctLow: number;
  pctHigh: number;
  /** Eyebrow, e.g. "Taxminiy IQ oraligʻi". */
  label: ComponentChildren;
  /** Localised percentile sentence, e.g. "100 kishidan taxminan 60–75 tasidan yuqori". */
  pctText: ComponentChildren;
  /** Status chip, e.g. <StatusChip tone="notice">Dastlabki meʼyorlar</StatusChip>. */
  chip?: ComponentChildren;
  /** Extensions: non-normal variants render a notice card with no number. */
  variant?: 'normal' | 'unreliable' | 'age_pending';
  message?: ComponentChildren;
}

const AX_MIN = 55;
const AX_MAX = 145;
const W = 300;
const H = 80;
const BASE = H - 3;
const PEAK = 6;

const xOf = (v: number) => ((Math.max(AX_MIN, Math.min(AX_MAX, v)) - AX_MIN) / (AX_MAX - AX_MIN)) * W;
const yOf = (v: number) => BASE - (BASE - PEAK) * Math.exp(-(((v - 100) / 15) ** 2) / 2);

/** Normal curve (mean 100, SD 15) over the 55–145 axis. */
function curvePath(): string {
  let d = '';
  for (let v = AX_MIN; v <= AX_MAX; v += 2.5) d += `${d ? 'L' : 'M'}${xOf(v).toFixed(1)} ${yOf(v).toFixed(1)}`;
  return d;
}
const CURVE = curvePath();
const AREA = `${CURVE}L${W} ${BASE}L0 ${BASE}Z`;

export function ScoreBandCard({ low, high, pctLow, pctHigh, label, pctText, chip, variant = 'normal', message }: ScoreBandCardProps) {
  const clipId = useMemo(() => uid('iq-band'), []);

  if (variant !== 'normal') {
    return (
      <Card tone={variant === 'unreliable' ? 'warn' : 'notice'} class={cx('iq-band', 'iq-band--notice', `iq-band--${variant}`)}>
        <div class="iq-band__head">
          <span class="iq-band__label">{label}</span>
          {chip}
        </div>
        {message && <p class="iq-band__message">{message}</p>}
      </Card>
    );
  }

  const x1 = xOf(Math.min(low, high));
  const x2 = xOf(Math.max(low, high));
  const w = Math.max(x2 - x1, 4);
  return (
    <Card class="iq-band">
      <div class="iq-band__head">
        <span class="iq-band__label">{label}</span>
        {chip}
      </div>
      <div class="iq-band__value" data-pct-low={pctLow} data-pct-high={pctHigh}>{low}–{high}</div>
      <svg class="iq-band__curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs><clipPath id={clipId}><path d={AREA} /></clipPath></defs>
        <line class="iq-band__axis" x1="0" y1={BASE} x2={W} y2={BASE} vector-effect="non-scaling-stroke" />
        <g clip-path={`url(#${clipId})`}>
          <rect class="iq-band__hl iq-band__fill" x={x1} y="0" width={w} height={H} />
        </g>
        <path class="iq-band__line" d={CURVE} vector-effect="non-scaling-stroke" />
        <rect class="iq-band__hl iq-band__base" x={x1} y={BASE - 2} width={w} height="4" rx="2" />
      </svg>
      <div class="iq-band__ticks" aria-hidden="true">
        <span style={{ left: `${(xOf(70) / W) * 100}%` }}>70</span>
        <span style={{ left: `${(xOf(100) / W) * 100}%` }}>100</span>
        <span style={{ left: `${(xOf(130) / W) * 100}%` }}>130</span>
      </div>
      <p class="iq-band__pct">{pctText}</p>
    </Card>
  );
}
