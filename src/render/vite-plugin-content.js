import fs from 'node:fs';
import path from 'node:path';
import { renderHome } from './templates/home.js';
import { renderDesktopNav, renderMobileNav } from './templates/navigation.js';
import { renderFooterAccordion, renderFooterColumns } from './templates/footer.js';
import { validateFooter, validateHome, validateNavigation, validateProducts } from './validate.js';
import { createCatalog } from '../js/lib/catalog.js';

const PLACEHOLDER = /<!--\s*@render\s+([\w-]+)\s*-->/g;
const LAYOUTS = { 'head-common': 'head.html', 'site-header': 'header.html', 'site-footer': 'footer.html' };
const MAX_DEPTH = 5;

export function loadContent(root) {
  const dataDir = path.join(root, 'src', 'data');
  const publicDir = path.join(root, 'public');
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));

  const navigation = validateNavigation(read('navigation.json'));
  const products = validateProducts(read('products.json'), { navigation, publicDir });
  const catalog = createCatalog(products, navigation);
  return {
    files: ['home.json', 'navigation.json', 'footer.json', 'products.json'].map((f) => path.join(dataDir, f)),
    home: validateHome(read('home.json'), { publicDir, catalog }),
    navigation,
    footer: validateFooter(read('footer.json'), { catalog }),
    catalog,
  };
}

/** Layout partials are plain HTML files that may contain further placeholders. */
export function loadLayouts(root) {
  const dir = path.join(root, 'src', 'render', 'layout');
  return Object.fromEntries(
    Object.entries(LAYOUTS).map(([name, file]) => [name, () => fs.readFileSync(path.join(dir, file), 'utf8')]),
  );
}

export function buildPartials(content, layouts = {}) {
  return {
    ...layouts,
    'home-sections': () => renderHome(content.home, { getProduct: content.catalog.getProduct }),
    'desktop-nav': () => renderDesktopNav(content.navigation),
    'mobile-nav': () => renderMobileNav(content.navigation),
    'footer-columns': () => renderFooterColumns(content.footer),
    'footer-accordion': () => renderFooterAccordion(content.footer),
  };
}

/**
 * Replaces placeholders until none are left (layouts contain content
 * placeholders). Unknown names fail loudly instead of rendering nothing.
 */
export function injectPartials(source, partials, { page = 'page' } = {}) {
  let output = source;
  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    let replaced = false;
    output = output.replace(PLACEHOLDER, (_, name) => {
      const partial = partials[name];
      if (!partial) throw new Error(`Unknown render placeholder "${name}" in ${page}`);
      replaced = true;
      return String(partial());
    });
    if (!replaced) return output;
  }
  throw new Error(`Render placeholders nested deeper than ${MAX_DEPTH} levels in ${page}`);
}

/**
 * Build-time rendering: content lives in src/data/*.json, markup in templates,
 * and the browser receives static HTML for everything that does not depend on
 * the URL. JSON, template and layout edits trigger a full reload in dev.
 */
export default function contentPlugin() {
  let root = process.cwd();
  return {
    name: 'evfemiya-content',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      const dataDir = path.join(root, 'src', 'data');
      server.watcher.add(dataDir);
      server.watcher.on('change', (file) => {
        if (file.startsWith(dataDir) || file.includes(`${path.sep}render${path.sep}`)) {
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(source, ctx) {
        const content = loadContent(root);
        return injectPartials(source, buildPartials(content, loadLayouts(root)), { page: ctx.path });
      },
    },
  };
}
