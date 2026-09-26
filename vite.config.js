import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths, so the built game works at a domain root or in a subfolder.
  base: './',
  build: {
    outDir: 'dist',
    // Each map is its own file, loaded when you open it.
    chunkSizeWarningLimit: 800,
  },
  server: { host: true },
});
