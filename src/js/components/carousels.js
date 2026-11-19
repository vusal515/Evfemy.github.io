import $ from 'jquery';
import 'slick-carousel';
import { qsa, prefersReducedMotion } from '../lib/dom.js';

const arrow = (direction, className, icon) =>
  `<button type="button" class="slide-arrow ${className}" aria-label="${direction === 'prev' ? 'Əvvəlki' : 'Növbəti'}">` +
  `<img src="${import.meta.env.BASE_URL}images/icons/${icon}" alt=""></button>`;

const arrows = (prefix) => ({
  prevArrow: arrow('prev', `${prefix}-prev`, 'arrow-left.svg'),
  nextArrow: arrow('next', `${prefix}-next`, 'arrow-right.svg'),
});

const circleArrows = (prefix) => ({
  prevArrow: arrow('prev', `${prefix}-prev`, 'arrow-left-circle.svg'),
  nextArrow: arrow('next', `${prefix}-next`, 'arrow-right-circle.svg'),
});

const responsive = (desktop, tablet = 3, phone = 2, small = 1) => [
  {
    breakpoint: 1024,
    settings: { slidesToShow: Math.min(desktop, tablet), slidesToScroll: Math.min(desktop, tablet) },
  },
  { breakpoint: 600, settings: { slidesToShow: phone, slidesToScroll: phone } },
  { breakpoint: 480, settings: { slidesToShow: small, slidesToScroll: small } },
];

/**
 * Carousel presets keyed by the content variant (see src/render/templates/home.js).
 * Values are carried over from the original mainslider.js so the visual
 * behaviour stays the same.
 */
export const PRESETS = {
  'category-strip': {
    slidesToShow: 8,
    slidesToScroll: 3,
    autoplay: true,
    autoplaySpeed: 3000,
    ...arrows('slick'),
    responsive: [
      { breakpoint: 1224, settings: { slidesToShow: 5, slidesToScroll: 3 } },
      { breakpoint: 600, settings: { slidesToShow: 3, slidesToScroll: 3 } },
    ],
  },
  hero: { infinite: true, speed: 300, slidesToShow: 1, adaptiveHeight: true, ...arrows('one-slick') },
  tiles: {
    infinite: true,
    speed: 300,
    slidesToShow: 4,
    slidesToScroll: 4,
    ...circleArrows('under-big-slick'),
    responsive: responsive(4, 3, 2, 2),
  },
  'promo-pair': {
    slidesToShow: 2,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    arrows: false,
    responsive: responsive(2, 2, 1, 1),
  },
  products: {
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    ...circleArrows('under-big-two-slick'),
    responsive: responsive(5),
  },
  'products-compact': {
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    ...circleArrows('under-big-two-slick'),
    responsive: responsive(4),
  },
  gifts: {
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    ...arrows('under-big-two-slick'),
    responsive: responsive(3),
  },
};

/** Applies user preferences on top of a preset (no autoplay when reduced motion is requested). */
export function resolveOptions(variant, { reducedMotion = false } = {}) {
  const preset = PRESETS[variant];
  if (!preset) return null;
  const options = { ...preset, accessibility: true, pauseOnFocus: true, pauseOnHover: true };
  if (reducedMotion) {
    options.autoplay = false;
    options.speed = 0;
  }
  return options;
}

export function initCarousels(root = document) {
  const reducedMotion = prefersReducedMotion();
  for (const element of qsa('[data-carousel]', root)) {
    const options = resolveOptions(element.dataset.carousel, { reducedMotion });
    if (!options) {
      console.warn(`[carousels] no preset for "${element.dataset.carousel}"`);
      continue;
    }
    $(element).slick(options);
  }
  // Slides measured before images finished loading can have the wrong height.
  window.addEventListener('load', () => $('.slick-initialized').slick('setPosition'), { once: true });
}
