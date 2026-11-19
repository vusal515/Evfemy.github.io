/**
 * Public asset URLs. At build time (inside the Vite plugin) `import.meta.env`
 * is undefined, so paths start with "/" and Vite rewrites them to the
 * configured base. In the browser BASE_URL is used directly, which keeps
 * client-rendered images working under a sub-path such as GitHub Pages.
 */
const BASE = import.meta.env?.BASE_URL ?? '/';

export const imageUrl = (path) => `${BASE}images/${path}`;
export const iconUrl = (name) => `${BASE}images/icons/${name}`;
