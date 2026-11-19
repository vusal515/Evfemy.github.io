import fs from 'node:fs';
import path from 'node:path';
import { renderHome } from './templates/home.js';
import { renderDesktopNav, renderMobileNav } from './templates/navigation.js';
import { renderFooterAccordion, renderFooterColumns } from './templates/footer.js';
import { validateFooter, validateHome, validateNavigation } from './validate.js';

const PLACEHOLDER = /<!--\s*@render\s+([\w-]+)\s*-->/g;

export function loadContent(root) {
  const dataDir = path.join(root, 'src', 'data');
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
  return {
    files: ['home.json', 'navigation.json', 'footer.json'].map((f) => path.join(dataDir, f)),
    home: validateHome(read('home.json'), { publicDir: path.join(root, 'public') }),
    navigation: validateNavigation(read('navigation.json')),
    footer: validateFooter(read('footer.json')),
  };
}

export function buildPartials(content) {
  return {
    'home-sections': () => renderHome(content.home),
    'desktop-nav': () => renderDesktopNav(content.navigation),
    'mobile-nav': () => renderMobileNav(content.navigation),
    'footer-columns': () => renderFooterColumns(content.footer),
    'footer-accordion': () => renderFooterAccordion(content.footer),
  };
}

/** Replaces every placeholder; unknown names fail loudly instead of rendering nothing. */
export function injectPartials(source, partials) {
  return source.replace(PLACEHOLDER, (_, name) => {
    const partial = partials[name];
    if (!partial) throw new Error(`Unknown render placeholder "${name}" in index.html`);
    return String(partial());
  });
}

/**
 * Build-time rendering: content lives in src/data/*.json, markup in templates,
 * and the browser receives plain static HTML (no client-side rendering cost,
 * fully indexable). JSON edits trigger a full reload in dev.
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
      handler(source) {
        const content = loadContent(root);
        return injectPartials(source, buildPartials(content));
      },
    },
  };
}
