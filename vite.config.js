import { defineConfig } from 'vite';
import contentPlugin from './src/render/vite-plugin-content.js';

export default defineConfig({
  // Relative base so the same build works on GitHub Pages (/<repo>/) and at a domain root.
  base: './',
  plugins: [contentPlugin()],
  build: {
    target: 'es2020',
    sourcemap: true,
    assetsInlineLimit: 2048,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: { include: ['src/**/*.js'] },
  },
});
