import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'tests/system/**/*.test.ts'],
    exclude: ['tests/a11y/**'],
  },
});
