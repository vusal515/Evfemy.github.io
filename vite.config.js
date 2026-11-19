import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (name) => resolve(import.meta.dirname, name);
import contentPlugin from './src/render/vite-plugin-content.js';

export default defineConfig({
  // Relative base so the same build works on GitHub Pages (/<repo>/) and at a domain root.
  base: './',
  plugins: [contentPlugin()],
  build: {
    target: 'es2020',
    sourcemap: true,
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: {
        home: page('index.html'),
        category: page('category.html'),
        product: page('product.html'),
        cart: page('cart.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: { include: ['src/**/*.js'] },
  },
});
