let seq = 0;
/** Unique, stable-per-call id for SVG defs (patterns, clip paths). */
export function uid(prefix = 'iq'): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function px(v: number | string | undefined): string | undefined {
  return typeof v === 'number' ? `${v}px` : v;
}
