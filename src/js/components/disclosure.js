import { qsa, on } from '../lib/dom.js';

/** Toggles a button[aria-controls] and its region. Used by the mobile menu and mobile footer. */
export function toggleDisclosure(button, force) {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  if (!panel) return false;
  const open = force ?? button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
  return open;
}

export function initAccordions(root = document) {
  // One delegated listener instead of one per button.
  return on(root, 'click', (event) => {
    const button = event.target.closest?.('[data-accordion]');
    if (!button) return;
    const open = toggleDisclosure(button);
    if (open) {
      // Keep one group open at a time within the same list, like the original footer.
      const list = button.closest('ul');
      qsa(':scope > li > [data-accordion][aria-expanded="true"]', list)
        .filter((other) => other !== button)
        .forEach((other) => toggleDisclosure(other, false));
    }
  });
}
