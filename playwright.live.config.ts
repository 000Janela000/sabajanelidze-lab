import { defineConfig } from '@playwright/test'
import local from './playwright.config.ts'

// The same browser tests against a deployed copy, after each deploy:
// LAB_URL=https://lab.sabajanelidze.com pnpm exec playwright test --config playwright.live.config.ts
const url = process.env.LAB_URL
if (!url) throw new Error('Set LAB_URL to the deployed address, for example https://lab.sabajanelidze.com')

export default defineConfig({
  ...local,
  // Pages come over the internet, not from this PC: a test that loads twelve pages needs more than 30 s.
  timeout: 90_000,
  use: { ...local.use, baseURL: url },
  webServer: undefined,
})
