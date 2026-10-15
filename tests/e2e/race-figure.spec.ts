import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

/** The shared <race-figure> element, as the lab's home page shows it (the portfolio embeds the same files). */
const LOST = /Both passed the check\. Balance 20, paid out 160\./

async function reducedMotion(page: Page) {
  return page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
}

test('the race figure plays once when visible and ends on a recorded result', async ({ page }) => {
  await page.goto('/')
  test.skip(await reducedMotion(page), 'nothing plays with reduced motion (tested below)')
  const figure = page.locator('race-figure')
  await figure.scrollIntoViewIfNeeded()
  await expect(figure.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(figure.locator('figcaption')).toHaveText(/^Order \d+ of 54\. /, { timeout: 8000 })
  await expect(figure.locator('figcaption')).toContainText(LOST)
  await expect(figure.getByRole('button', { name: 'Pause' })).toBeHidden()

  // Another order is one of the 54 recorded runs: it plays, then names itself.
  await figure.getByRole('button', { name: 'Run another order' }).click()
  await expect(figure.locator('figcaption')).toHaveText('')
  await expect(figure.locator('figcaption')).toHaveText(/^Order \d+ of 54\. /, { timeout: 8000 })
})

test('the pause control stops the run and goes on from the same step', async ({ page }) => {
  await page.goto('/')
  test.skip(await reducedMotion(page), 'nothing plays with reduced motion')
  const figure = page.locator('race-figure')
  await figure.scrollIntoViewIfNeeded()
  await figure.getByRole('button', { name: 'Pause' }).click()
  const paid = await figure.locator('[data-rf="paid"]').textContent()
  await page.waitForTimeout(1500)
  await expect(figure.locator('[data-rf="paid"]')).toHaveText(paid ?? '')
  await expect(figure.locator('figcaption')).toHaveText('')
  await figure.getByRole('button', { name: 'Play' }).click()
  await expect(figure.locator('figcaption')).toContainText(LOST, { timeout: 8000 })
})

test('on a phone the figure keeps one height from the first step to the result', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  test.skip(await reducedMotion(page), 'nothing plays with reduced motion')
  // The portfolio's base styles (Tailwind 4) hide every [hidden] element with !important; the figure must still hold.
  await page.addStyleTag({
    content: '@layer base { [hidden]:where(:not([hidden=until-found])) { display: none !important; } }',
  })
  const figure = page.locator('race-figure')
  // Every frame's height, from before the run (idle) to its result: the digits change, the height must not.
  await figure.evaluate((element) => {
    const heights: number[] = []
    ;(window as unknown as { heights: number[] }).heights = heights
    const sample = () => {
      heights.push(element.getBoundingClientRect().height)
      requestAnimationFrame(sample)
    }
    sample()
  })
  await figure.scrollIntoViewIfNeeded()
  await expect(figure.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(figure.getByRole('button', { name: 'Run another order' })).toBeVisible({ timeout: 8000 })
  const heights = await page.evaluate(() => (window as unknown as { heights: number[] }).heights)
  expect(heights.length).toBeGreaterThan(30)
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1)
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('nothing moves; another order shows its result at once', async ({ page }) => {
    await page.goto('/')
    const figure = page.locator('race-figure')
    const caption = figure.locator('figcaption')
    await expect(caption).toContainText(LOST)
    await expect(figure.getByRole('button', { name: 'Pause' })).toBeHidden()
    const before = await caption.textContent()
    await figure.getByRole('button', { name: 'Run another order' }).click()
    await expect(caption).not.toHaveText(before ?? '')
    await expect(caption).toHaveText(/^Order \d+ of 54\. /)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the end state is in the page: the result, the caption and the link to the lab', async ({ page }) => {
    await page.goto('/')
    const figure = page.locator('race-figure')
    await expect(figure.locator('figcaption')).toContainText(LOST)
    await expect(figure.locator('[data-rf="short"]')).toHaveText('80')
    await expect(figure.getByRole('button')).toHaveCount(0)
    await expect(figure.getByRole('link', { name: 'Reproduce it yourself →' })).toHaveAttribute(
      'href',
      '/day/payments',
    )
  })
})

for (const scheme of ['light', 'dark'] as const) {
  test(`the race figure passes the accessibility scan (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/')
    await expect(page.locator('race-figure figcaption')).toContainText(LOST, { timeout: 8000 })
    const results = await new AxeBuilder({ page }).include('race-figure').analyze()
    expect(results.violations.map((violation) => violation.id)).toEqual([])
  })
}
