import { defineConfig, devices } from '@playwright/test'

// End-to-end checks of the built site: every incident on desktop and phone, with and without motion.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4399',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'phone, reduced motion',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' },
    },
  ],
  webServer: {
    command: 'pnpm --filter @lab/site exec astro preview --port 4399 --host 127.0.0.1',
    url: 'http://127.0.0.1:4399',
    reuseExistingServer: !process.env.CI,
  },
})
