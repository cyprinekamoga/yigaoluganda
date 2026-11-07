import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@content': path.resolve(import.meta.dirname, 'content'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'content/**/*.test.ts'],
    environment: 'node',
  },
});
