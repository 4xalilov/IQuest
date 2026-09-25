/** Lucide icons used by the app (1.75px stroke, currentColor). */
const P = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;

export const CheckIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M20 6 9 17l-5-5" {...P} stroke-width={2} />
  </svg>
);

export const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" {...P} stroke-width={2} />
  </svg>
);

export const ChevronIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="m9 18 6-6-6-6" {...P} />
  </svg>
);
