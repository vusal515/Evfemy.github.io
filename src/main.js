import 'slick-carousel/slick/slick.css';
import './styles/main.css';

import { initCarousels } from './js/components/carousels.js';
import { initSearch } from './js/components/search.js';
import { initAccordions } from './js/components/disclosure.js';
import { initMobileOverlays, initModals } from './js/components/overlays.js';
import { initTabs } from './js/components/tabs.js';
import { initForms } from './js/components/forms.js';
import { initCurrentYear, initScrollEffects } from './js/components/page-chrome.js';

/**
 * Each feature initialises independently: one failure is logged and the rest
 * of the page keeps working. (In the original site a single missing element
 * threw in header.js and silently disabled every header feature.)
 */
const features = {
  carousels: initCarousels,
  search: initSearch,
  accordions: initAccordions,
  overlays: initMobileOverlays,
  modals: initModals,
  tabs: initTabs,
  forms: initForms,
  scroll: initScrollEffects,
  year: initCurrentYear,
};

for (const [name, init] of Object.entries(features)) {
  try {
    init(document);
  } catch (error) {
    console.error(`[init] "${name}" failed`, error);
  }
}
