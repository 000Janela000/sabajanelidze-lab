import { expect, test } from '@playwright/test'

test('each page names the address it is served at, the same as the sitemap, and a missing page is not indexed', async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const addresses = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  expect(addresses).toEqual([
    'https://lab.sabajanelidze.com/',
    'https://lab.sabajanelidze.com/day/payments',
    'https://lab.sabajanelidze.com/day/kyc',
  ])
  for (const address of addresses) {
    if (!address) continue
    await page.goto(new URL(address).pathname)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', address)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://lab.sabajanelidze.com/og-image.png',
    )
  }

  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Sitemap: https://lab.sabajanelidze.com/sitemap.xml')

  const missing = await page.goto('/no-such-page')
  expect(missing?.status()).toBe(404)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  await expect(page.getByRole('link', { name: 'Go to the incidents' })).toHaveAttribute('href', '/')
})

test('Cloudflare Web Analytics loads on the live address only, so test runs are never counted', async ({
  page,
  baseURL,
}) => {
  const beacons: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('cloudflareinsights.com')) beacons.push(request.url())
  })
  await page.goto('/day/payments')
  const live = new URL(baseURL ?? '').hostname === 'lab.sabajanelidze.com'
  if (live) {
    // The script, then its report of the visit.
    await expect
      .poll(() => beacons.some((url) => url.includes('/cdn-cgi/rum')), { timeout: 15000 })
      .toBe(true)
  } else {
    await page.waitForLoadState('networkidle')
    expect(beacons).toEqual([])
  }
})
