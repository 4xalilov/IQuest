import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  plugins: [preact()],
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2020' },
});
