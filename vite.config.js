import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative Pfade: der Build funktioniert unter jedem Unterpfad (z. B. /konfigurator/) und im iFrame.
  base: './',
  plugins: [tailwindcss()],
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
      include: ['src/core/**', 'src/services/**', 'src/data/**', 'src/ui/**'],
      exclude: ['src/ui/icons.js'],
      reporter: ['text', 'html'],
    },
  },
});
