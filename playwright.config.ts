import { defineConfig, devices } from '@playwright/test'

/** End-to-end tests run against the production build (`vite preview`). */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
