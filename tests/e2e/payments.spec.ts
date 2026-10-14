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
  await expect(page.getByRole('note').first()).toContainText('TEST MODE')

  // The briefing card comes first: the situation, the steps, Start.
  await expect(page.getByText('YOUR SHIFT · INCIDENT 1')).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('tap a numbered line. Request A gets slow right after it.')).toBeVisible()

  // A safe line first: no money lost.
  await page.getByRole('button', { name: /Make request A slow after line 1/ }).click()
  await expect(page.getByText(/With request A slow after line 1, both requests behaved/)).toBeVisible()

  // The line that loses money: the books turn red and get stamped.
  await page.getByRole('button', { name: /Make request A slow after line 2/ }).click()
  await expect(page.getByText(/^Reproduced on try 2\./)).toBeVisible()
  await expect(page.getByRole('region', { name: 'The books' }).first()).toContainText('80.00')
  await expect(page.getByText('MONEY LOST')).toBeVisible()

  await page.getByRole('button', { name: 'Next: how often does this happen?' }).click()
  await page.getByLabel('Your guess').fill('20')
  await page.getByRole('button', { name: 'Run all 54' }).click()
  await expect(
    page.getByRole('img', { name: /36 of 54 ways to run lose money \(your guess: 20\)/ }),
  ).toBeVisible()

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
    const text = page.locator('.textv')
    await expect(text).toContainText('Only one of the 4 places loses money: after line 2')
    await expect(text).toContainText('36 of them (67%) lose money')
    await expect(text).toContainText('still loses in 120 of 182 ways to run (66%)')
    await expect(text).toContainText('loses in 0 of 24 ways to run')
  })
})

test('the home page opens with the situation and leads to incident 1', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'A customer was paid 160 from a balance of 100.',
  )
  await page.getByRole('link', { name: 'Take incident 1' }).click()
  await expect(page).toHaveURL(/\/day\/payments$/)
})

test('"Skip to the code" goes straight to the proof card', async ({ page }) => {
  await page.goto('/day/payments')
  await page.getByRole('link', { name: 'Skip to the code' }).click()
  await expect(page).toHaveURL(/#proof$/)
})
