import type { ComponentChildren } from 'preact';
import { Button } from './Button';
import './PaywallCard.css';

export interface PaywallCardProps {
  title: ComponentChildren;
  /** e.g. "150 ⭐" — rendered in --money with tabular figures. */
  price: ComponentChildren;
  items: string[];
  terms: ComponentChildren;
  cta: ComponentChildren;
  decline: ComponentChildren;
  onBuy: () => void;
  onDecline: () => void;
  /** Extension: invoice in progress. */
  loading?: boolean;
}

/** Two equal-weight buttons: declining is as easy as buying (§15). */
export function PaywallCard({ title, price, items, terms, cta, decline, onBuy, onDecline, loading }: PaywallCardProps) {
  return (
    <section class="iq-paywall">
      <div class="iq-paywall__head">
        <h2 class="iq-paywall__title">{title}</h2>
        <span class="iq-paywall__price">{price}</span>
      </div>
      <ul class="iq-paywall__list">
        {items.map((it) => (
          <li key={it}>
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8.4 6.6 11.5 12.5 4.8" /></svg>
            <span>{it}</span>
          </li>
        ))}
      </ul>
      <p class="iq-paywall__terms">{terms}</p>
      <div class="iq-paywall__actions">
        <Button variant="secondary" block loading={loading} onClick={onBuy}>{cta}</Button>
        <Button variant="secondary" block disabled={loading} onClick={onDecline}>{decline}</Button>
      </div>
    </section>
  );
}
