import type { ComponentChildren } from 'preact';
import './PageHeader.css';

export interface PageHeaderProps {
  eyebrow?: ComponentChildren;
  title: ComponentChildren;
  chip?: ComponentChildren;
  /** Extension: one line of supporting text below the title. */
  sub?: ComponentChildren;
}

export function PageHeader({ eyebrow, title, chip, sub }: PageHeaderProps) {
  return (
    <header class="iq-header">
      {eyebrow && <span class="iq-header__eyebrow">{eyebrow}</span>}
      <div class="iq-header__row">
        <h1 class="iq-header__title">{title}</h1>
        {chip}
      </div>
      {sub && <p class="iq-header__sub">{sub}</p>}
    </header>
  );
}
