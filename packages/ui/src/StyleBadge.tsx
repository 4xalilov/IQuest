import type { ComponentChildren } from 'preact';
import './StyleBadge.css';

export interface StyleBadgeProps {
  emoji: string;
  name: ComponentChildren;
  desc: ComponentChildren;
}

export function StyleBadge({ emoji, name, desc }: StyleBadgeProps) {
  return (
    <div class="iq-style">
      <span class="iq-style__emoji" aria-hidden="true">{emoji}</span>
      <div class="iq-style__text">
        <h2 class="iq-style__name">{name}</h2>
        <p class="iq-style__desc">{desc}</p>
      </div>
    </div>
  );
}
