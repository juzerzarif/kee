import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';

const demoSiteConfig = defineConfig({
  root: 'demo',
  build: {
    outDir: '../demo-static',
    emptyOutDir: true,
  },
});

const libConfig = defineConfig({
  plugins: [dts({ include: ['src'], exclude: ['**/__tests__/**'] })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/kee.ts',
      fileName: 'kee',
      formats: ['es', 'cjs'],
    },
    minify: false,
  },
});

const testConfig = defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'jsdom',
  },
});

export default defineConfig(({ mode }) => {
  return mode === 'demo' ? demoSiteConfig : mode === 'test' ? testConfig : libConfig;
});
