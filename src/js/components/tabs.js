import { qsa, on } from '../lib/dom.js';

/** WAI-ARIA tabs with arrow-key navigation (login / registration switch). */
export function initTabs(root = document) {
  qsa('[data-tabs]', root).forEach((container) => {
    const tabs = qsa('[role="tab"]', container);
    const select = (tab) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
      });
    };
    tabs.forEach((tab, i) => {
      on(tab, 'click', () => select(tab));
      on(tab, 'keydown', (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  });
}
