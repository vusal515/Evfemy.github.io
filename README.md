# Evfemiya Storefront

The storefront of **Evfemiya**, an online store for tableware, kitchenware, small appliances, home textiles and accessories (site content is in Azerbaijani).

The project started as the front end of a PHP-based storefront. Version 2 turns it into a standalone, data-driven static site with four pages: home, category listing (also used for collections and search results), product detail and cart with checkout. Content lives in JSON, shared markup is generated at build time, the JavaScript is split into tested modules, and CI deploys the site to GitHub Pages.

- **Live demo:** https://vusal515.github.io/Evfemy.github.io/ (published by `.github/workflows/deploy.yml`)
- **Stack:** HTML, CSS, vanilla JavaScript (ES modules), Vite, Vitest, ESLint, Prettier, GitHub Actions

---

## 1. Purpose

A storefront front end built to production standards. A visitor can browse the menu, search, filter and sort a category, open a product, choose a quantity, manage a cart that survives page reloads, and fill in a validated checkout form. It is responsive, accessible and fast. Content and products can be changed without editing HTML.

## 2. Features

| Area                | What it does                                                                                                                                                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category navigation | Desktop mega menu that opens on hover **and** keyboard focus. Mobile drawer with accordion sub-menus. Both are generated from `src/data/navigation.json`.                                                                                                                                                         |
| Search              | Instant suggestions with breadcrumbs across products and all 310 menu entries. Ignores Azerbaijani accents, so `caydan` finds `Çaydan`. Pressing Enter opens a results page (`category.html?q=...`); the form also works without JavaScript.                                                                      |
| Home sections       | 9 content sections (category strip, hero, sub-categories, promos, best sellers, discounted, collections, gifts) rendered from `src/data/home.json`. Each has its own carousel preset. Product sections show real product cards.                                                                                   |
| Category listing    | One page for categories, sub-categories, collections (Endirim, Yenilər, Hədiyyə ...) and search results. Sub-category chips with counts, sorting (price, discount), "only discounted" filter. All choices live in the URL, so a filtered list can be shared or bookmarked. Empty states suggest where to go next. |
| Product page        | Breadcrumbs, price with old price and discount badge, 12-month instalment amount, stock level ("Son 3 ədəd"), quantity stepper limited by stock, description, details and related products.                                                                                                                       |
| Cart                | Add from any card or the product page; header badge on every page; quantities, removal and totals (list price, discount, free delivery, total). Stored in `localStorage`, re-checked against the catalogue on load, synced between tabs.                                                                          |
| Checkout            | Delivery form (name, Azerbaijani mobile number, address) validated in the browser and sent together with the cart lines to `POST /orders` through the API layer.                                                                                                                                                  |
| Account forms       | Login / registration tabs with client-side validation (e-mail, Azerbaijani mobile number format, password length and match). Errors appear inline next to the field. Password visibility toggle.                                                                                                                  |
| Order tracking      | Validated form in a native `<dialog>` modal.                                                                                                                                                                                                                                                                      |
| Back-end seam       | Forms and checkout submit through `src/js/services/api.js`. When `VITE_API_BASE_URL` is set, they `POST` JSON with a timeout and error handling. When it is not set, the UI tells the user that no server is connected. It never fakes a successful submission.                                                   |
| Accessibility       | Skip link, landmarks, one `h1`, labelled sections, alt text on every image, ARIA tabs/accordions/dialog, focus management, Escape closes overlays, `prefers-reduced-motion` stops autoplay.                                                                                                                       |
| Performance         | WebP images sized for how they are displayed (17.2 MB → 2.7 MB), lazy loading below the fold, one font family, inline SVG icons instead of icon fonts, hashed and minified bundles.                                                                                                                               |

## 3. Tech stack

| Concern            | Choice                                     | Why                                                                                                                                                 |
| ------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build / dev server | **Vite 8**                                 | Fast dev server, hashed production assets, and a small plugin API that this project uses for build-time rendering.                                  |
| UI                 | **Vanilla JS (ES modules)**, HTML, CSS     | The page is mostly static content. A framework would add runtime cost and little benefit.                                                           |
| Carousels          | **jQuery 3.7.1 + Slick 1.8.1** (npm)       | Kept from the original to preserve the design and behaviour; jQuery upgraded from 1.11.0. See [decisions](#8-technical-improvements-and-decisions). |
| Tests              | **Vitest + jsdom**                         | Unit, DOM and build-output tests in one fast runner.                                                                                                |
| Code quality       | **ESLint 9**, **Prettier 3**, EditorConfig | Consistent style, enforced in CI.                                                                                                                   |
| Images             | **sharp** (`tools/optimize-images.mjs`)    | Repeatable WebP conversion and resizing.                                                                                                            |
| CI / CD            | **GitHub Actions** + GitHub Pages          | Lint, format check, tests and build run on every push and pull request. Pushes to `main` deploy.                                                    |

## 4. Architecture and folder structure

```
.
├── index.html                  # Home page shell; <!-- @render name --> marks generated parts
├── category.html               # Category / collection / search results
├── product.html                # Product detail
├── cart.html                   # Cart and checkout
├── public/images/              # Optimised static images (copied as-is by Vite)
│   ├── banners/ categories/ products/ gifts/
│   ├── brand/                  # Evfemiya logo (dark + light)
│   └── icons/
├── src/
│   ├── main.js                 # Entry: shared features + lazy-loaded page module (data-page on <body>)
│   ├── data/                   # Content: the only files an editor needs to touch
│   │   ├── home.json           #   home page sections; product sections reference product ids
│   │   ├── products.json       #   catalogue: price, old price, stock, category path, tags
│   │   ├── navigation.json     #   categories -> columns -> links (URLs are derived from labels)
│   │   └── footer.json         #   footer link groups
│   ├── render/                 # Build-time rendering (runs in Node, inside Vite)
│   │   ├── html.js             #   html`` template tag that escapes by default
│   │   ├── validate.js         #   content schema checks with precise error messages
│   │   ├── layout/             #   head.html, header.html, footer.html shared by every page
│   │   ├── templates/          #   home.js, navigation.js, footer.js, product.js (also used in the browser)
│   │   └── vite-plugin-content.js
│   ├── js/                     # Browser code
│   │   ├── pages/              #   category.js, product.js, cart.js (render from URL + data)
│   │   ├── cart/               #   cart.js (pure rules), store.js (persistence, subscriptions)
│   │   ├── components/         #   carousels, search, overlays, disclosure, tabs, forms, cart-ui, page-chrome
│   │   ├── lib/                #   catalog, money, routes, search, text, validation, dom (no framework)
│   │   └── services/           #   api.js (HTTP client), shop.js (catalogue + cart instances)
│   └── styles/
│       ├── main.css            #   import order: base -> header -> footer -> home -> components
│       ├── base.css            #   design tokens, reset, accessibility helpers
│       ├── header.css footer.css home.css   # original design, unused rules removed
│       ├── components.css      #   styles for markup introduced in the refactor
│       └── shop.css            #   product cards, listing, product page, cart, toast
├── tests/                      # Vitest suites (unit, DOM, build output, stylesheet checks)
├── tools/optimize-images.mjs
└── .github/workflows/          # ci.yml, deploy.yml
```

### How the page is produced

```
                      build time (Node, inside Vite)                          browser
src/data/*.json ─▶ validate.js ─▶ templates/*.js ─┐
src/render/layout/*.html ─────────────────────────┴▶ vite-plugin-content ─▶ 4 static pages
                                                                              │
                                     src/main.js: shared features (menus, search, cart badge,
                                     add-to-cart, forms) + the page module for data-page
                                                                              │
                    pages/category|product|cart.js read the URL and render with the same
                    product templates, using catalog (products.json) and the cart store
```

1. `vite-plugin-content.js` loads and validates the JSON, then replaces each `<!-- @render name -->` placeholder. Layout partials (header, footer) contain further placeholders, which are resolved until none remain. This runs in `vite dev`, where JSON and template edits reload the page, and in `vite build`.
2. Everything that does not depend on the URL (header, menus, footer, the whole home page) is static HTML that can be read and indexed without JavaScript.
3. Category, product and cart content depends on the query string (`?c=`, `?id=`) or on the visitor's cart, so those page modules render it in the browser. They are loaded with dynamic `import()`, so the home page does not download them.
4. `src/main.js` initialises each feature separately. If one throws, the error is logged and the others keep working.

### Responsibilities

- **Content** (`src/data`) knows nothing about markup.
- **Templates** (`src/render/templates`) turn content into markup. They are pure functions and are unit-tested.
- **Components** (`src/js/components`) attach behaviour to existing markup through `data-*` attributes rather than styling classes, so CSS changes do not break JavaScript.
- **Libraries** (`src/js/lib`) contain logic with no DOM dependency: catalogue queries, sorting and filtering, money, URL building, search ranking, text folding, validation rules.
- **Cart** (`src/js/cart`) is split into pure rules (stock limits, totals, reconciling a saved cart) and a small store that adds persistence and change notifications.
- **Pages** (`src/js/pages`) read the URL, ask the catalogue and the cart for data, and render with the shared templates.
- **Services** (`src/js/services`) are the only code that talks to the network or creates shared instances.

### Adding content

- **New home section:** add an object to `home.json` with a `variant` listed in `VARIANT_CLASS` (`src/render/templates/home.js`). A new variant needs one renderer there and one preset in `src/js/components/carousels.js`. A test fails if the two lists differ.
- **New product:** run `npm run images:optimize -- products path/to/photo.jpg`, then add an entry to `products.json` with `category`, `group` and `subcategory` taken from the menu. It appears in its category, sub-category, search and (through `tags`) collections. To feature it on the home page, add `{ "product": "<id>" }` to a product section.
- Invalid content **fails the build**, and the error lists every problem found. Checks include: unknown variant, missing alt text, missing image file, duplicate id, a product whose category path is not in the menu, an old price lower than the price, an `endirim` tag without an old price, and any home or footer link to a category, sub-category or product that does not exist.

## 5. Installation

Requirements: **Node.js 20.19+** (22 LTS recommended) and npm.

```bash
git clone https://github.com/vusal515/Evfemy.github.io.git
cd Evfemy.github.io
npm ci
```

Optional: copy `.env.example` to `.env` and set `VITE_API_BASE_URL` if you have a back end that implements `POST /auth/login`, `/auth/register`, `/orders/track` and `/orders` (checkout; body: delivery fields plus `items: [{ id, qty }]`).

## 6. Running locally

```bash
npm run dev        # dev server at http://localhost:5173 with live reload
npm run build      # production build in dist/
npm run preview    # serve dist/ at http://localhost:4173
```

## 7. Deployment

The build output is static, so any static host works.

**GitHub Pages (configured):**

1. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. This is a one-time step.
2. Push to `main`. `.github/workflows/deploy.yml` installs dependencies, runs the tests, builds, and publishes `dist/`.

`vite.config.js` sets `base: './'`, so the same build works under `/<repo>/` on GitHub Pages and at a domain root.

**Other hosts** (Netlify, Vercel, Cloudflare Pages, S3): build command `npm run build`, output directory `dist`.

## 8. Technical improvements and decisions

### Problems in the original version

| Problem                                                                                                                                | Effect                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asset paths were absolute and lower-case (`/styles/...`), but the folders were named `Styles/` and `Scripts/`                          | On GitHub Pages **no CSS or JS loaded**, so the live page was unstyled.                                                                             |
| 75 of 131 image references pointed to files that were never in the repository (`/test/cat/...`)                                        | Broken images in the mega menu, a category carousel and the brand strip.                                                                            |
| `header.js` queried `.search_input`, but the markup used `.search_inputs`                                                              | The first statement threw, so **every** header feature (mobile menu, search popup, scroll shadow) stopped working. `Footer.js` failed the same way. |
| A 3,645-line `index.html` saved from server-rendered PHP output                                                                        | Hard to edit. It contained rendered reCAPTCHA iframes, form-tracking attributes and a stray `<body>` inside `<head>`.                               |
| jQuery 1.11.0 (2014)                                                                                                                   | Known XSS vulnerabilities (CVE-2015-9251, CVE-2019-11358, CVE-2020-11022).                                                                          |
| Copies of third-party code in the repository (jQuery, Font Awesome, Google reCAPTCHA, Google Fonts CSS, two browser-extension scripts) | A ~64 MB repository and unclear licensing, for files the page never loaded.                                                                         |
| Analytics, tag-manager, live-chat and reCAPTCHA keys that belong to another site                                                       | Visitor data went to another owner's accounts. reCAPTCHA cannot be verified without a server anyway.                                                |
| Forms posted to `.php` endpoints that do not exist on a static host                                                                    | Submitting a form loaded a 404 page.                                                                                                                |
| 6 Google Font families imported 4 times through CSS `@import`, plus two Font Awesome versions                                          | Render-blocking requests for fonts the page did not use (it only uses Roboto).                                                                      |

### Changes and the reasons behind them

| Decision                                                                                             | Reasoning                                                                                                                                                                                                     | Trade-off                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Build-time rendering from JSON** with a small Vite plugin                                          | Separates content from markup and removes ~3,000 lines of repeated HTML. The output is still plain HTML, which gives a fast first paint, works without JS and can be indexed.                                 | Requires a build step, which Vite already provides.                                                                             |
| **Own `html` template tag that escapes by default** instead of a template library                    | About 30 lines with no dependency. Values are XSS-safe unless explicitly marked `raw()`.                                                                                                                      | Fewer features than a full template engine. This page does not need them.                                                       |
| **Content validation that fails the build**                                                          | Bad data is caught in CI before it reaches production. The first run found two empty menu columns in the original data.                                                                                       | Content editing is stricter.                                                                                                    |
| **Keep jQuery + Slick, upgraded to jQuery 3.7.1**                                                    | Preserves the original carousel design and behaviour. Rewriting nine carousels did not fit the 48-hour scope.                                                                                                 | ~48 KB of JS (gzipped). Next step: replace them with a dependency-free carousel such as Embla or Splide.                        |
| **Behaviour bound through `data-*` attributes**; one `init` per feature, each wrapped in `try/catch` | Prevents the class of bug that disabled the original header. Styling and behaviour can change independently.                                                                                                  | A few more attributes in the markup.                                                                                            |
| **Native `<dialog>`, ARIA tabs and the disclosure pattern**                                          | Built-in focus handling and Escape key support, with correct screen-reader semantics.                                                                                                                         | `<dialog>` needs a current browser (every evergreen browser has supported it since 2022).                                       |
| **`services/api.js` with `ApiNotConfiguredError`**                                                   | The UI is honest that no back end exists, and a real API can be connected with one environment variable. Timeouts and HTTP failures become one `ApiError` type.                                               | None                                                                                                                            |
| **WebP images resized per type, `loading="lazy"`, `<img>` instead of CSS backgrounds**               | Image payload drops from 17.2 MB to 2.7 MB. Images get alt text, and the browser can prioritise them.                                                                                                         | The conversion is a manual step; `tools/optimize-images.mjs` handles new images.                                                |
| **Inline SVG sprite instead of Font Awesome**                                                        | The page uses seven icons. Dropping the icon fonts saves ~180 KB of downloads.                                                                                                                                | Icons are maintained by hand.                                                                                                   |
| **Pruned legacy CSS**                                                                                | Removed rules that matched nothing in the rendered page: the legacy files went from 64 KB to 18 KB, and the final bundle is 24 KB (5 KB gzipped).                                                             | None                                                                                                                            |
| **Scroll listener that is passive and throttled with requestAnimationFrame**                         | Avoids layout work on every scroll event.                                                                                                                                                                     | None                                                                                                                            |
| **Multi-page site with shared layout partials** instead of a single-page app                         | Each page is a real URL that loads fast and works with the back button. Header and footer live once in `src/render/layout/`.                                                                                  | A full page load between pages; acceptable for a shop of this size.                                                             |
| **URL-dependent pages rendered in the browser** with the same templates as the build                 | One `category.html` and one `product.html` serve every category and product, so adding a product needs no new HTML. The product card markup is shared, so it looks identical everywhere.                      | Category and product content is not in the initial HTML. Next step: pre-render one HTML file per product at build time for SEO. |
| **State in the URL** (`?c=&sub=&sort=&discount=`)                                                    | Filtered lists can be shared, bookmarked and restored with the back button. No hidden client state to get out of sync.                                                                                        | Parameters are validated on read; unknown values fall back to defaults.                                                         |
| **Pure cart rules + small store**                                                                    | Stock limits, totals and reconciliation are plain functions with no DOM or storage, so they are easy to test. The store adds persistence and subscriptions, and survives blocked or corrupted `localStorage`. | No framework state library; the store is ~80 lines.                                                                             |
| **Money in integer qəpik**                                                                           | Totals never pick up floating-point errors (`0.1 + 0.2`). Prices are formatted in the Azerbaijani style (`24,90 ₼`).                                                                                          | Conversion at the boundaries.                                                                                                   |
| **Cross-file content validation**                                                                    | Products must sit on a real menu path, and home/footer links must point at existing categories and products, so the build cannot ship a dead internal link.                                                   | Content edits that rename a menu entry must update the products that use it.                                                    |
| **Page modules loaded with dynamic `import()`**                                                      | The home page downloads only shared code; each page module is 2 KB gzipped.                                                                                                                                   | One extra request on the category, product and cart pages.                                                                      |

### Before and after

| Metric                  | Before                                                   | After                                       |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------- |
| Repository size         | ~64 MB                                                   | ~3 MB of images plus source                 |
| Image payload           | 17.2 MB (JPEG/PNG)                                       | 2.7 MB (WebP)                               |
| Broken image references | 75                                                       | 0 (checked by a test)                       |
| `index.html`            | 3,645 lines                                              | ~30 lines plus layout partials and JSON     |
| Pages                   | 1 (home)                                                 | 4 (home, category, product, cart)           |
| Placeholder links (`#`) | 699 of 704 links on the home page                        | 36 of 709 (footer info pages, account menu) |
| CSS shipped             | 4 legacy files, 2 icon-font stylesheets, 6 font families | 24 KB (5 KB gzipped), 1 font family         |
| Third-party trackers    | GA4, GTM, LiveChat, reCAPTCHA                            | None                                        |
| Automated tests         | 0                                                        | 137                                         |

## 9. Testing and verification

```bash
npm test             # Vitest: 137 tests, a few seconds
npm run lint         # ESLint
npm run format:check # Prettier
npm run check        # all of the above plus a production build (the same steps CI runs)
```

| Suite                | What it covers                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `html.test.js`       | Escaping, nested templates, arrays, `raw()`.                                                                                                                                                                                                                                                                                                           |
| `templates.test.js`  | Section markup, lazy vs. eager image loading, hidden headings, mega menu vs. plain links, category URLs built from labels, accordion ids, nested placeholder rendering.                                                                                                                                                                                |
| `validate.test.js`   | The shipped content passes; each rule fails when it should, including product category paths, price/tag consistency and broken internal links.                                                                                                                                                                                                         |
| `search.test.js`     | Letter folding, ranking, breadcrumbs, result limits, de-duplication.                                                                                                                                                                                                                                                                                   |
| `catalog.test.js`    | URL building, category and collection membership, sub-category matching, filter chips, product search, related products, sorting and filtering (sold-out items last), product results in the header search.                                                                                                                                            |
| `money.test.js`      | Integer arithmetic, Azerbaijani price format, discount percentage, instalment rounding.                                                                                                                                                                                                                                                                |
| `cart.test.js`       | Adding and merging lines, stock and per-order limits, removal, immutability, reconciling a saved cart, totals and savings; store persistence, corrupted or blocked storage, change notifications, cross-tab reload.                                                                                                                                    |
| `pages.test.js`      | Category page (URL parsing, chips, count, sorting/filtering in place with URL update, empty states, escaping of the search text), product page (price, discount, instalment, quantity limits, not found), add-to-cart and badge, cart page (totals, quantity changes, removal, confirm before clearing, checkout validation and payload, no back end). |
| `validation.test.js` | E-mail, Azerbaijani mobile number formats, password match, order number.                                                                                                                                                                                                                                                                               |
| `api.test.js`        | Missing base URL, request shape, HTTP errors, network errors, timeouts.                                                                                                                                                                                                                                                                                |
| `components.test.js` | Form errors and focus, the "no server connected" message, reset after success, password toggle, accordions, tabs with arrow keys, drawer focus return and Escape, carousel presets, reduced motion.                                                                                                                                                    |
| `build.test.js`      | Runs a real production build. For all four pages: shared header and footer present, every local asset exists, URLs are relative, one `h1`, `lang="az"`. For the home page: no trackers or `.php` endpoints, `alt` on every image, unique ids, product cards link to product pages, placeholder links below 10%.                                        |
| `styles.test.js`     | Every CSS custom property in use is defined; no remote `@import`.                                                                                                                                                                                                                                                                                      |

Manual browser checks at 1440 px and 375 px wide: mega menu, search suggestions and results page, mobile drawer and accordions, login/registration validation, order-tracking dialog, carousels, back-to-top button, category filters and sorting, product quantity and add to cart, cart totals and checkout validation. No console errors.

## Known limitations

- **No back end in this repository.** Login, registration, order tracking and checkout validate in the browser and then tell the user that no server is connected. The cart is kept in the browser.
- **The catalogue is demo data.** The original site had product photos only. The 22 products in `products.json` were named from those photos; prices, old prices, stock levels and descriptions were written for this demo and are not real store data.
- Most menu sub-categories have no products yet; their pages say so and show the rest of the category.
- Footer information pages (about, careers, return policy ...) and the account menu are still placeholder links.
- Two sections were removed because their images were never committed: the brand logo strip and "popular sets". The sub-category carousel is shown as text tiles for the same reason.

## Credits and licences

- The carousel arrow styles in `src/styles/home.css` were originally written by **JSZ** ([github.com/JavidSelimov](https://github.com/JavidSelimov)).
- [jQuery](https://jquery.com/) (MIT) and [Slick](https://github.com/kenwheeler/slick) (MIT), installed from npm.
- Product photos and campaign banners show products and trademarks of their brands (Karaca, Cerve, Jumbo, BergHOFF and others). They are used here to present the store's product range.
