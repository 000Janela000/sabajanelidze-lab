import { expect, test } from '@playwright/test'

/** The home page: the game's name and hook first, then who made it, and only what can be played. */
test('the home page names the game, says who made it, and lists only playable incidents', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByText(/^On call · a 2-minute puzzle at a made-up crypto exchange · TEST MODE, no real money$/),
  ).toBeVisible()
  const maker = page.locator('main .maker')
  await expect(maker).toContainText('Made by Saba Janelidze')
  await expect(maker.getByRole('link', { name: 'Book a call →' })).toHaveAttribute(
    'href',
    'https://www.sabajanelidze.com/book?from=lab-home',
  )
  await expect(page.getByRole('link', { name: 'Play this incident' })).toHaveCount(1)
  await expect(page.getByText(/^Next: incident 2, new customers/)).toBeVisible()
  await expect(page.getByText('Not built yet')).toHaveCount(0)
  await expect(page.getByText(/\bof 5\b/)).toHaveCount(0)
})

test('on a laptop screen the maker line and its "Book a call" are on the first screen', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'a desktop layout check')
  await page.setViewportSize({ width: 1280, height: 720 })
  for (const path of ['/', '/day/payments']) {
    await page.goto(path)
    const box = await page.locator('main .maker').boundingBox()
    expect(box, path).not.toBeNull()
    expect((box?.y ?? 0) + (box?.height ?? 0), path).toBeLessThanOrEqual(720)
  }
})
