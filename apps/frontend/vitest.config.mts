import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';
const directory = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({ test: { environment: 'jsdom', include: ['apps/frontend/tests/**/*.test.tsx'], globals: true }, resolve: { alias: { '@': path.resolve(directory, 'src') } } });
