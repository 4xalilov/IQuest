import type { ComponentChildren } from 'preact';
import './util.css';
import './Accordion.css';

export interface AccordionProps {
  title: ComponentChildren;
  children: ComponentChildren;
  /** Extension: initially open. */
  open?: boolean;
}

export function Accordion({ title, children, open }: AccordionProps) {
  return (
    <details class="iq-acc" open={open}>
      <summary class="iq-acc__summary iq-ring">
        <span>{title}</span>
        <svg class="iq-acc__chev" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 7.5 5 5 5-5" /></svg>
      </summary>
      <div class="iq-acc__body">{children}</div>
    </details>
  );
}
