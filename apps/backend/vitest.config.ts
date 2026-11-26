import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    setupFiles: ['tests/setup.ts'],
    environment: 'node',
    testTimeout: 20000,
    include: [
      'tests/**/*.test.ts',
      '../../tests/**/*.test.ts'
    ],
  },
  resolve: {
    alias: {
      '@clientsphere/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
});
