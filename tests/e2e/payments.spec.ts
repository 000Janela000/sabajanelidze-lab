import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

async function noSidewaysScroll(page: Page) {
  const widths = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ])
  expect(widths[0]).toBeLessThanOrEqual(widths[1] ?? 0)
}

test('incident 1 plays from reproduce to clean-up on the real code', async ({ page }) => {
  await page.goto('/day/payments')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The bank paid out twice')
  await expect(page.getByRole('note')).toContainText('TEST MODE')

  // A safe line first: no money lost.
  await page.getByRole('button', { name: /Make request A slow after line 1/ }).click()
  await expect(page.getByText(/No money lost with request A slow after line 1/)).toBeVisible()

  // The line that loses money.
  await page.getByRole('button', { name: /Make request A slow after line 2/ }).click()
  await expect(page.getByText(/^Reproduced\./)).toBeVisible()
  await expect(page.getByText('80.00', { exact: false }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Next: how often does this happen?' }).click()
  await page.getByLabel('Your guess').fill('20')
  await page.getByRole('button', { name: 'Run all 54' }).click()
  await expect(page.getByText(/36 of 54 ways to run lose money \(your guess: 20\)/)).toBeVisible()

  await page.getByRole('button', { name: 'Next: fix it' }).click()
  await page.getByRole('radio', { name: /Check the balance twice/ }).check()
  await page.getByRole('button', { name: 'Attack this patch' }).click()
  await expect(page.getByText(/Still loses money in 120 of 182 ways to run/)).toBeVisible()

  await page.getByRole('radio', { name: /Reserve, then settle/ }).check()
  await page.getByRole('button', { name: 'Attack this patch' }).click()
  await expect(page.getByRole('heading', { name: 'Fixed: it holds in all 24 ways to run' })).toBeVisible()

  await page.getByRole('button', { name: 'Go deeper: the bank stops answering' }).click()
  await page.getByRole('button', { name: 'Send the payout again' }).click()
  await expect(page.getByText(/Now it has paid twice/)).toBeVisible()
  await page.getByRole('button', { name: 'Ask the bank what happened to this payout' }).click()
  await expect(page.getByText(/The bank says payout-1 was paid/)).toBeVisible()

  await page.getByRole('button', { name: 'Read the code and the tests' }).click()
  await expect(page.locator('#proof')).toHaveAttribute('open', '')
  await noSidewaysScroll(page)
})

test('every link back to the portfolio is tagged with the station', async ({ page }) => {
  await page.goto('/day/payments')
  const hrefs = await page
    .locator('a[href*="sabajanelidze.com"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href))
  expect(hrefs.length).toBeGreaterThan(0)
  for (const href of hrefs) expect(href).toContain('from=lab-payments')
})

test('pages have no accessibility violations', async ({ page }) => {
  for (const path of ['/', '/day/payments']) {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.map((violation) => `${path}: ${violation.id}`)).toEqual([])
  }
})

test.describe('without JavaScript (bots, AI crawlers, screen readers before load)', () => {
  test.use({ javaScriptEnabled: false })

  test('the whole incident is readable as text', async ({ page }) => {
    await page.goto('/day/payments')
    const text = page.locator('.text-version')
    await expect(text).toContainText('Only one of the 4 places loses money: after line 2')
    await expect(text).toContainText('36 of them (67%) lose money')
    await expect(text).toContainText('still loses in 120 of 182 ways to run (66%)')
    await expect(text).toContainText('loses in 0 of 24 ways to run')
  })
})
