import { expect, type Page, test } from '@playwright/test'

/*
 * The cookie-free counter, page side (decisions/0002-cookie-free-counter.md). The pages count only on the live
 * address and never in an automated browser, so these tests turn counting on with the page's test flag and catch the
 * messages before they leave the browser: nothing here is ever counted.
 */

/** Turns counting on for this page and keeps every message it sends to the counter. */
async function catchCounts(page: Page) {
  const messages: unknown[] = []
  await page.addInitScript(() => {
    ;(window as { labCountForTests?: boolean }).labCountForTests = true
  })
  await page.route('**/api/count', async (route) => {
    messages.push(JSON.parse(route.request().postData() ?? 'null'))
    await route.fulfill({ status: 204 })
  })
  return messages
}

function machine(page: Page) {
  return page.locator('.console.machine')
}

test('a visit to incident 2 counts its first move, its win and a click on the code, each once', async ({
  page,
}) => {
  const messages = await catchCounts(page)
  await page.goto('/day/kyc?from=portfolio-home')
  const find = page.getByRole('link', { name: 'Find the bug' })
  if (await find.isVisible()) await find.click()
  await expect(machine(page).getByText(/^Anna ends up approved\./)).toBeVisible({ timeout: 10000 })

  // Two cuts are still one first move.
  await page.getByRole('button', { name: 'Lose our answer to #2' }).click()
  await expect(machine(page).getByText(/The copy of #2 says what #2 said/)).toBeVisible()
  await page.getByRole('button', { name: 'Lose our answer to #1' }).click()
  await page.getByRole('button', { name: 'Point at this arrival: message #1, sent again' }).click()
  await page.getByRole('button', { name: 'Next: how often does this happen? →', exact: true }).click()
  await page.getByRole('button', { name: 'Run all 14', exact: true }).click()
  await expect(page.getByRole('img', { name: /7 of 14 orders lock Anna out/ })).toBeVisible()
  await page.getByRole('button', { name: 'Next: fix it →', exact: true }).click()
  await page.getByRole('radio', { name: /in order/ }).check()
  await page.getByRole('button', { name: 'Attack this patch' }).click()
  await expect(page.getByRole('heading', { name: 'Fixed: approved in all 14 orders' })).toBeVisible()

  // Two clicks on the code are one code click. The links stay on the page (the clicks would leave for GitHub).
  await page.locator('#proof > summary').click()
  const codeLinks = page.locator('#proof a[href^="https://github.com/sabajanelidze/sabajanelidze-lab"]')
  await codeLinks.evaluateAll((links) => {
    for (const link of links) link.addEventListener('click', (event) => event.preventDefault())
  })
  await codeLinks.first().click()
  await codeLinks.nth(1).click()

  await expect.poll(() => messages.length).toBe(3)
  expect(messages).toEqual([
    { event: 'STARTED', station: 'kyc', from: 'portfolio-home' },
    { event: 'FINISHED', station: 'kyc', from: 'portfolio-home' },
    { event: 'CODE_CLICK', station: 'kyc', from: 'portfolio-home' },
  ])
})

test("incident 1's first move counts for payments", async ({ page }) => {
  const messages = await catchCounts(page)
  await page.goto('/day/payments')
  const find = page.getByRole('link', { name: 'Find the bug' })
  if (await find.isVisible()) await find.click()
  await expect(page.getByText(/^That one was fine/)).toBeVisible()
  await page.getByRole('button', { name: /Make request A slow after step 1/ }).click()
  await expect.poll(() => messages).toEqual([{ event: 'STARTED', station: 'payments', from: '' }])
})

test('without the live address nothing is sent at all', async ({ page }) => {
  const sent: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/count')) sent.push(request.url())
  })
  await page.goto('/day/kyc')
  const find = page.getByRole('link', { name: 'Find the bug' })
  if (await find.isVisible()) await find.click()
  await expect(machine(page).getByText(/^Anna ends up approved\./)).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'Lose our answer to #1' }).click()
  await expect(machine(page).getByText(/Which arrival locked her out\?/)).toBeVisible()
  expect(sent).toEqual([])
})
