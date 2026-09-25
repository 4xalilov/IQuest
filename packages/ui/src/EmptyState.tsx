import type { ComponentChildren } from 'preact';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: ComponentChildren;
  text: ComponentChildren;
  action?: ComponentChildren;
}

export function EmptyState({ icon, text, action }: EmptyStateProps) {
  return (
    <div class="iq-empty">
      {icon && <div class="iq-empty__icon" aria-hidden="true">{icon}</div>}
      <p class="iq-empty__text">{text}</p>
      {action && <div class="iq-empty__action">{action}</div>}
    </div>
  );
}
