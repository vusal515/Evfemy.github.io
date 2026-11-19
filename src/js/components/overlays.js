import { qs, qsa, on } from '../lib/dom.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Generic full-screen panel (mobile drawer, mobile search):
 * focus moves in on open, Escape closes, focus returns to the trigger,
 * and the page behind does not scroll.
 */
export function createPanel(panel, { onOpen, onClose } = {}) {
  let trigger = null;

  const close = () => {
    if (panel.hidden) return;
    panel.hidden = true;
    document.body.classList.remove('no-scroll');
    qsa(`[aria-controls="${panel.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'false'));
    onClose?.();
    trigger?.focus();
  };

  const open = (from) => {
    trigger = from ?? document.activeElement;
    panel.hidden = false;
    document.body.classList.add('no-scroll');
    qsa(`[aria-controls="${panel.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'true'));
    onOpen?.();
    (qs('[data-autofocus]', panel) ?? qs(FOCUSABLE, panel))?.focus();
  };

  on(panel, 'keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  return { open, close, isOpen: () => !panel.hidden };
}

export function initMobileOverlays(root = document) {
  const drawerEl = qs('#mobile-drawer', root);
  const searchEl = qs('#mobile-search', root);
  if (!drawerEl || !searchEl) return;

  const drawer = createPanel(drawerEl);
  const searchPanel = createPanel(searchEl, {
    onOpen: () => qs('[data-search-input]', searchEl)?.focus(),
  });

  qsa('[data-drawer-open]', root).forEach((b) => on(b, 'click', () => drawer.open(b)));
  qsa('[data-drawer-close]', root).forEach((b) => on(b, 'click', drawer.close));
  qsa('[data-mobile-search-open]', root).forEach((b) =>
    on(b, 'click', () => {
      drawer.close();
      searchPanel.open(b);
    }),
  );
  qsa('[data-mobile-search-close]', root).forEach((b) => on(b, 'click', searchPanel.close));
}

/** Native <dialog> modals opened by [data-modal-open="<id>"]. Escape is handled by the browser. */
export function initModals(root = document) {
  qsa('[data-modal-open]', root).forEach((button) =>
    on(button, 'click', () => {
      const dialog = document.getElementById(button.dataset.modalOpen);
      if (!dialog || dialog.open) return;
      qs('#mobile-drawer:not([hidden]) [data-drawer-close]')?.click();
      dialog.showModal();
    }),
  );
  qsa('dialog', root).forEach((dialog) => {
    on(dialog, 'click', (event) => {
      // Clicks on the backdrop target the dialog element itself.
      if (event.target === dialog) dialog.close();
    });
    qsa('[data-modal-close]', dialog).forEach((b) => on(b, 'click', () => dialog.close()));
  });
}
