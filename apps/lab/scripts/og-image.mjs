// The link-preview picture (public/og-image.png, 1200 x 630): the home page's first screen in the light theme,
// with the race figure's end state (reduced motion). Run it with the preview server on, after a text or look change:
//   pnpm --filter @lab/site build && pnpm --filter @lab/site exec astro preview --port 4391
//   node apps/lab/scripts/og-image.mjs
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const out = fileURLToPath(new URL('../public/og-image.png', import.meta.url))
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
})
await page.goto(process.env.LAB_URL ?? 'http://127.0.0.1:4391/')
await page.evaluate(() => document.fonts.ready)
// Only the first screen's content: nothing of the next section peeks in at the bottom edge.
await page.addStyleTag({ content: 'main > :not(:first-child), .site-foot { visibility: hidden; }' })
await page.screenshot({ path: out })
await browser.close()
console.log(`wrote ${out}`)
