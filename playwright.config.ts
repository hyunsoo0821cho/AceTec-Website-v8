import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/a11y',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 4321,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'a11y',
      use: { browserName: 'chromium' },
    },
  ],
});
