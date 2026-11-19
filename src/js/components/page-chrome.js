import { qs, on } from '../lib/dom.js';

/** Scroll-dependent UI: mobile header shadow and the back-to-top button. */
export function initScrollEffects(root = document) {
  const header = qs('[data-mobile-header]', root);
  const upButton = qs('[data-back-to-top]', root);
  let scheduled = false;

  const update = () => {
    scheduled = false;
    const scrolled = window.scrollY > 0;
    header?.classList.toggle('scrollShadow', scrolled);
    if (upButton) upButton.hidden = !(scrolled && window.innerWidth >= 769);
  };

  // rAF throttling: at most one layout read per frame.
  on(
    window,
    'scroll',
    () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

export function initCurrentYear(root = document) {
  const el = qs('[data-current-year]', root);
  if (el) el.textContent = String(new Date().getFullYear());
}
