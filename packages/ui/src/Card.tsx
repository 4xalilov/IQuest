import type { ComponentChildren } from 'preact';
import { cx } from './util';
import './Card.css';

export interface CardProps {
  children: ComponentChildren;
  tone?: 'default' | 'warn' | 'notice';
  /** 'none' | 's' (12) | 'm' (16) | 'l' (20, default). */
  padding?: 'none' | 's' | 'm' | 'l';
  class?: string;
  /** Extension: element to render (section for landmarks). */
  as?: 'div' | 'section' | 'article';
}

export function Card({ children, tone = 'default', padding = 'l', class: klass, as: Tag = 'div' }: CardProps) {
  return <Tag class={cx('iq-card', `iq-card--${tone}`, `iq-card--p-${padding}`, klass)}>{children}</Tag>;
}
