import { expect, test } from '@playwright/test'

test('each page names the address it is served at, the same as the sitemap, and a missing page is not indexed', async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  const addresses = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  expect(addresses).toEqual(['https://lab.sabajanelidze.com/', 'https://lab.sabajanelidze.com/day/payments'])
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
