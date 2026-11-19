# Evfemiya Storefront

The home page of **Evfemiya**, an online store for tableware, kitchenware, small appliances, home textiles and accessories (site content is in Azerbaijani).

The project started as the front end of a PHP-based storefront. Version 2 turns it into a standalone, data-driven static site: content lives in JSON, markup is generated at build time, the JavaScript is split into tested modules, and CI deploys the page to GitHub Pages.

- **Live demo:** https://vusal515.github.io/Evfemy.github.io/ (published by `.github/workflows/deploy.yml`)
- **Stack:** HTML, CSS, vanilla JavaScript (ES modules), Vite, Vitest, ESLint, Prettier, GitHub Actions

---

## 1. Purpose

A storefront home page built to production standards: category navigation, campaign banners, product carousels, gift ideas, account forms and order tracking. It is responsive, accessible and fast. Content can be changed without editing HTML.

## 2. Features

| Area                | What it does                                                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category navigation | Desktop mega menu that opens on hover **and** keyboard focus. Mobile drawer with accordion sub-menus. Both are generated from `src/data/navigation.json`.                                                                                          |
| Category search     | Instant suggestions with breadcrumbs across all 310 navigation entries. Ignores Azerbaijani accents, so `caydan` finds `Çaydan`. Works on desktop and mobile.                                                                                      |
| Home sections       | 9 content sections (category strip, hero, sub-categories, promos, best sellers, discounted, collections, gifts) rendered from `src/data/home.json`. Each has its own carousel preset.                                                              |
| Account forms       | Login / registration tabs with client-side validation (e-mail, Azerbaijani mobile number format, password length and match). Errors appear inline next to the field. Password visibility toggle.                                                   |
| Order tracking      | Validated form in a native `<dialog>` modal.                                                                                                                                                                                                       |
| Back-end seam       | Forms submit through `src/js/services/api.js`. When `VITE_API_BASE_URL` is set, they `POST` JSON with a timeout and error handling. When it is not set, the UI tells the user that no server is connected. It never fakes a successful submission. |
| Accessibility       | Skip link, landmarks, one `h1`, labelled sections, alt text on every image, ARIA tabs/accordions/dialog, focus management, Escape closes overlays, `prefers-reduced-motion` stops autoplay.                                                        |
| Performance         | WebP images sized for how they are displayed (17.2 MB → 2.7 MB), lazy loading below the fold, one font family, inline SVG icons instead of icon fonts, hashed and minified bundles.                                                                |

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
├── index.html                  # Page shell; <!-- @render name --> marks generated parts
├── public/images/              # Optimised static images (copied as-is by Vite)
│   ├── banners/ categories/ products/ gifts/
│   ├── brand/                  # Evfemiya logo (dark + light)
│   └── icons/
├── src/
│   ├── main.js                 # Entry: imports styles, initialises each feature in isolation
│   ├── data/                   # Content: the only files an editor needs to touch
│   │   ├── home.json           #   home page sections and items
│   │   ├── navigation.json     #   categories -> columns -> links
│   │   └── footer.json         #   footer link groups
│   ├── render/                 # Build-time rendering (runs in Node, inside Vite)
│   │   ├── html.js             #   html`` template tag that escapes by default
│   │   ├── validate.js         #   content schema checks with precise error messages
│   │   ├── templates/          #   home.js, navigation.js, footer.js
│   │   └── vite-plugin-content.js
│   ├── js/                     # Browser code
│   │   ├── components/         #   carousels, search, overlays, disclosure, tabs, forms, page-chrome
│   │   ├── lib/                #   dom, search, text, validation (pure, no framework)
│   │   └── services/api.js     #   HTTP client for form submissions
│   └── styles/
│       ├── main.css            #   import order: base -> header -> footer -> home -> components
│       ├── base.css            #   design tokens, reset, accessibility helpers
│       ├── header.css footer.css home.css   # original design, unused rules removed
│       └── components.css      #   styles for markup introduced in the refactor
├── tests/                      # Vitest suites (unit, DOM, build output, stylesheet checks)
├── tools/optimize-images.mjs
└── .github/workflows/          # ci.yml, deploy.yml
```

### How the page is produced

```
src/data/*.json ─▶ validate.js ─▶ templates/*.js ─▶ vite-plugin-content ─▶ static index.html
                                                                              │
                                              src/main.js adds behaviour: carousels, search,
                                              menus, dialog, forms
```

1. `vite-plugin-content.js` loads the JSON, validates it, and replaces each `<!-- @render name -->` placeholder in `index.html` with HTML from the templates. This runs in `vite dev`, where JSON edits reload the page, and in `vite build`.
2. The browser receives complete HTML, so content can be read and indexed without JavaScript.
3. `src/main.js` initialises each feature separately. If one throws, the error is logged and the others keep working.

### Responsibilities

- **Content** (`src/data`) knows nothing about markup.
- **Templates** (`src/render/templates`) turn content into markup. They are pure functions and are unit-tested.
- **Components** (`src/js/components`) attach behaviour to existing markup through `data-*` attributes rather than styling classes, so CSS changes do not break JavaScript.
- **Libraries** (`src/js/lib`) contain logic with no DOM dependency: search ranking, text folding, validation rules.
- **Services** (`src/js/services`) are the only code that talks to the network.

### Adding content

- **New home section:** add an object to `home.json` with a `variant` listed in `VARIANT_CLASS` (`src/render/templates/home.js`). A new variant needs one renderer there and one preset in `src/js/components/carousels.js`. A test fails if the two lists differ.
- **New image:** run `npm run images:optimize -- products path/to/photo.jpg`, then reference `products/photo.webp` in `home.json`.
- Invalid content (unknown variant, missing alt text, missing image file, duplicate id) **fails the build**, and the error lists every problem found.

## 5. Installation

Requirements: **Node.js 20.19+** (22 LTS recommended) and npm.

```bash
git clone https://github.com/vusal515/Evfemy.github.io.git
cd Evfemy.github.io
npm ci
```

Optional: copy `.env.example` to `.env` and set `VITE_API_BASE_URL` if you have a back end that implements `POST /auth/login`, `/auth/register` and `/orders/track`.

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

| Decision                                                                                             | Reasoning                                                                                                                                                                     | Trade-off                                                                                                |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Build-time rendering from JSON** with a small Vite plugin                                          | Separates content from markup and removes ~3,000 lines of repeated HTML. The output is still plain HTML, which gives a fast first paint, works without JS and can be indexed. | Requires a build step, which Vite already provides.                                                      |
| **Own `html` template tag that escapes by default** instead of a template library                    | About 30 lines with no dependency. Values are XSS-safe unless explicitly marked `raw()`.                                                                                      | Fewer features than a full template engine. This page does not need them.                                |
| **Content validation that fails the build**                                                          | Bad data is caught in CI before it reaches production. The first run found two empty menu columns in the original data.                                                       | Content editing is stricter.                                                                             |
| **Keep jQuery + Slick, upgraded to jQuery 3.7.1**                                                    | Preserves the original carousel design and behaviour. Rewriting nine carousels did not fit the 48-hour scope.                                                                 | ~48 KB of JS (gzipped). Next step: replace them with a dependency-free carousel such as Embla or Splide. |
| **Behaviour bound through `data-*` attributes**; one `init` per feature, each wrapped in `try/catch` | Prevents the class of bug that disabled the original header. Styling and behaviour can change independently.                                                                  | A few more attributes in the markup.                                                                     |
| **Native `<dialog>`, ARIA tabs and the disclosure pattern**                                          | Built-in focus handling and Escape key support, with correct screen-reader semantics.                                                                                         | `<dialog>` needs a current browser (every evergreen browser has supported it since 2022).                |
| **`services/api.js` with `ApiNotConfiguredError`**                                                   | The UI is honest that no back end exists, and a real API can be connected with one environment variable. Timeouts and HTTP failures become one `ApiError` type.               | None                                                                                                     |
| **WebP images resized per type, `loading="lazy"`, `<img>` instead of CSS backgrounds**               | Image payload drops from 17.2 MB to 2.7 MB. Images get alt text, and the browser can prioritise them.                                                                         | The conversion is a manual step; `tools/optimize-images.mjs` handles new images.                         |
| **Inline SVG sprite instead of Font Awesome**                                                        | The page uses seven icons. Dropping the icon fonts saves ~180 KB of downloads.                                                                                                | Icons are maintained by hand.                                                                            |
| **Pruned legacy CSS**                                                                                | Removed rules that matched nothing in the rendered page: the legacy files went from 64 KB to 18 KB, and the final bundle is 24 KB (5 KB gzipped).                             | None                                                                                                     |
| **Scroll listener that is passive and throttled with requestAnimationFrame**                         | Avoids layout work on every scroll event.                                                                                                                                     | None                                                                                                     |

### Before and after

| Metric                  | Before                                                   | After                               |
| ----------------------- | -------------------------------------------------------- | ----------------------------------- |
| Repository size         | ~64 MB                                                   | ~3 MB of images plus source         |
| Image payload           | 17.2 MB (JPEG/PNG)                                       | 2.7 MB (WebP)                       |
| Broken image references | 75                                                       | 0 (checked by a test)               |
| `index.html`            | 3,645 lines                                              | ~520 lines plus 3 JSON files        |
| CSS shipped             | 4 legacy files, 2 icon-font stylesheets, 6 font families | 24 KB (5 KB gzipped), 1 font family |
| Third-party trackers    | GA4, GTM, LiveChat, reCAPTCHA                            | None                                |
| Automated tests         | 0                                                        | 65                                  |

## 9. Testing and verification

```bash
npm test             # Vitest: 65 tests, about 1 second
npm run lint         # ESLint
npm run format:check # Prettier
npm run check        # all of the above plus a production build (the same steps CI runs)
```

| Suite                | What it covers                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `html.test.js`       | Escaping, nested templates, arrays, `raw()`.                                                                                                                                                                                    |
| `templates.test.js`  | Section markup, lazy vs. eager image loading, hidden headings, mega menu vs. plain links, accordion ids.                                                                                                                        |
| `validate.test.js`   | The shipped content passes; each validation rule fails when it should; missing image files are reported.                                                                                                                        |
| `search.test.js`     | Letter folding, ranking, breadcrumbs, result limits, de-duplication.                                                                                                                                                            |
| `validation.test.js` | E-mail, Azerbaijani mobile number formats, password match, order number.                                                                                                                                                        |
| `api.test.js`        | Missing base URL, request shape, HTTP errors, network errors, timeouts.                                                                                                                                                         |
| `components.test.js` | Form errors and focus, the "no server connected" message, reset after success, password toggle, accordions, tabs with arrow keys, drawer focus return and Escape, carousel presets, reduced motion.                             |
| `build.test.js`      | Runs a real production build and checks that every local asset exists, URLs are relative, no trackers or `.php` endpoints remain, every image has `alt`, ids are unique, the page has exactly one `h1`, and `lang="az"` is set. |
| `styles.test.js`     | Every CSS custom property in use is defined; no remote `@import`.                                                                                                                                                               |

Manual browser checks at 1440 px and 375 px wide: mega menu, category search, mobile drawer and accordions, login/registration validation, order-tracking dialog, carousels, back-to-top button. No console errors.

## Known limitations

- **No back end in this repository.** Login, registration and order tracking validate in the browser and then tell the user that no server is connected.
- **Catalogue and product pages are out of scope.** Category and product links are placeholders (`#`).
- The source data has **no product names or prices**, so product cards show an image with descriptive alt text only.
- Two sections were removed because their images were never committed: the brand logo strip and "popular sets". The sub-category carousel is shown as text tiles for the same reason.

## Credits and licences

- The carousel arrow styles in `src/styles/home.css` were originally written by **JSZ** ([github.com/JavidSelimov](https://github.com/JavidSelimov)).
- [jQuery](https://jquery.com/) (MIT) and [Slick](https://github.com/kenwheeler/slick) (MIT), installed from npm.
- Product photos and campaign banners show products and trademarks of their brands (Karaca, Cerve, Jumbo, BergHOFF and others). They are used here to present the store's product range.
