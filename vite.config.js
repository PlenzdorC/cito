import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Content-Security-Policy für den Produktions-Build (im Dev-Server würde sie HMR blockieren).
 * Hinweis: frame-ancestors lässt sich nicht per <meta> setzen – für das Partner-Embedding
 * muss der Webserver diesen Header bewusst offen lassen bzw. auf Partner-Domains beschränken.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const cspPlugin = {
  name: 'citodomus-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
};

export default defineConfig({
  // Relative Pfade: der Build funktioniert unter jedem Unterpfad (z. B. /konfigurator/) und im iFrame.
  base: './',
  plugins: [tailwindcss(), cspPlugin],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      // viewer.js braucht einen WebGL-Renderer (jsdom hat keinen) und wird im Browser verifiziert.
      include: ['src/app/**', 'src/core/**', 'src/services/**', 'src/data/**', 'src/ui/**', 'src/scene/**'],
      exclude: ['src/ui/icon-paths.js', 'src/scene/viewer.js'],
      thresholds: { statements: 80, branches: 75, functions: 75, lines: 80 },
      reporter: ['text', 'html'],
    },
  },
});
