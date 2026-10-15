import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

/** On phones the console sits below the ticket: "Find the bug" brings it into view, which starts the first run. */
async function openTheConsole(page: Page) {
  const find = page.getByRole('link', { name: 'Find the bug' })
  if (await find.isVisible()) await find.click()
  await expect(page.getByText(/^That one was fine/)).toBeVisible()
}

/** A code block's source link on the proof card, by its file (phones show only the file name, so the title has the path). */
function source(page: Page, file: string) {
  return page.locator(`#proof a[title^="${file}:"]`).first()
}

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
  await expect(
    page.getByText(/^On call · Incident 1 · Payments · about 2 minutes · TEST MODE, no real money$/),
  ).toBeVisible()
  await expect(page.getByText(/^Made by Saba Janelidze/)).toBeVisible()

  // On arrival one safe run plays by itself in the console, then it asks for the run that breaks.
  await openTheConsole(page)

  // A safe step first: no money lost.
  await page.getByRole('button', { name: /Make request A slow after step 1/ }).click()
  await expect(page.getByText(/No money lost after step 1/)).toBeVisible()

  // The step that loses money: the books turn red and get stamped.
  await page.getByRole('button', { name: /Make request A slow after step 2/ }).click()
  await expect(page.getByText(/^Reproduced on try 2\./)).toBeVisible()
  await expect(page.getByRole('region', { name: 'The books' }).first()).toContainText('80.00')
  await expect(page.getByText('MONEY LOST', { exact: true })).toBeVisible()

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

  // The card opens and keyboard focus moves into it (a Codex finding: it used to stay on the button).
  await page.getByRole('button', { name: 'Read the code and the tests' }).click()
  await expect(page.locator('#proof')).toHaveAttribute('open', '')
  await expect(page.locator('#proof > summary')).toBeFocused()
  await noSidewaysScroll(page)
})

/** Records the console's height on every frame until the returned function is called. */
async function recordConsoleHeights(page: Page) {
  await page.locator('.console').evaluate((element) => {
    const heights: number[] = []
    const holder = window as unknown as { heights: number[]; stop: boolean }
    holder.heights = heights
    holder.stop = false
    const sample = () => {
      heights.push(element.getBoundingClientRect().height)
      if (!holder.stop) requestAnimationFrame(sample)
    }
    sample()
  })
  return () =>
    page.evaluate(() => {
      const holder = window as unknown as { heights: number[]; stop: boolean }
      holder.stop = true
      return holder.heights
    })
}

test('nothing in the console jumps while a run plays: one height from start to result', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'runs animate only with motion')
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/day/payments')
    await openTheConsole(page)

    // A safe run: the pause control, the step values, the books and the message all keep their size.
    let stop = await recordConsoleHeights(page)
    await page.getByRole('button', { name: /Make request A slow after step 1/ }).click()
    await expect(page.getByText(/No money lost after step 1/)).toBeVisible()
    let heights = await stop()
    expect(Math.max(...heights) - Math.min(...heights), `safe run at ${viewport.width} px`).toBeLessThan(1)

    // The losing run adds the "Next" row under the books (new content under the result). A replay then holds still.
    await page.getByRole('button', { name: /Make request A slow after step 2/ }).click()
    await expect(page.getByText(/^Reproduced on try 2\./)).toBeVisible()
    stop = await recordConsoleHeights(page)
    await page.getByRole('button', { name: 'Replay the losing order' }).click()
    await expect(page.getByRole('button', { name: 'Replay the losing order' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Replay the losing order' })).toBeEnabled({
      timeout: 10000,
    })
    heights = await stop()
    expect(Math.max(...heights) - Math.min(...heights), `replay at ${viewport.width} px`).toBeLessThan(1)
  }
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

test('the proof card shows the fix in TypeScript or Go, by click or by keyboard', async ({ page }) => {
  await page.goto('/day/payments')
  await page.locator('#proof > summary').click()
  const v1 = page.getByRole('tablist', { name: 'Code language' }).first()
  await expect(v1.getByRole('tab', { name: 'TypeScript' })).toHaveAttribute('aria-selected', 'true')
  await expect(source(page, 'go/payments/withdraw.go')).toBeHidden()

  await v1.getByRole('tab', { name: 'Go' }).click()
  await expect(source(page, 'go/payments/withdraw.go')).toBeVisible()
  // Every tab set on the card follows the same choice.
  await expect(source(page, 'go/payments/postgres.go')).toBeVisible()
  await expect(source(page, 'packages/core/src/payments/withdraw.ts')).toBeHidden()

  await page.keyboard.press('ArrowLeft')
  await expect(v1.getByRole('tab', { name: 'TypeScript' })).toBeFocused()
  await expect(source(page, 'packages/core/src/payments/withdraw.ts')).toBeVisible()

  const results = await new AxeBuilder({ page }).include('#proof').analyze()
  expect(results.violations.map((violation) => violation.id)).toEqual([])
  await noSidewaysScroll(page)
})

for (const scheme of ['light', 'dark'] as const) {
  test(`coloured code reads at 4.5:1 or better (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/day/payments')
    await openTheConsole(page)
    // The red "money lost" line and the highlighted line are the hardest backgrounds.
    await page.getByRole('button', { name: /Make request A slow after step 2/ }).click()
    await expect(page.getByText('MONEY LOST', { exact: true })).toBeVisible()
    await page.getByText('Show the code it runs').click()
    await page.locator('#proof > summary').click()
    const contrast = async () =>
      (
        await new AxeBuilder({ page }).include('code').withRules(['color-contrast']).analyze()
      ).violations.flatMap((violation) => violation.nodes.map((node) => node.target.join(' ')))
    expect(await contrast()).toEqual([])
    await page
      .getByRole('tablist', { name: 'Code language' })
      .first()
      .getByRole('tab', { name: 'Go' })
      .click()
    expect(await contrast()).toEqual([])
  })
}

test.describe('without JavaScript (bots, AI crawlers, screen readers before load)', () => {
  test.use({ javaScriptEnabled: false })

  test('the proof card shows both languages, one under the other', async ({ page }) => {
    await page.goto('/day/payments')
    await page.locator('#proof > summary').click()
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(source(page, 'go/payments/withdraw.go')).toBeVisible()
    await expect(source(page, 'packages/core/src/payments/withdraw.ts')).toBeVisible()
  })

  test('the whole incident is readable as text', async ({ page }) => {
    await page.goto('/day/payments')
    const text = page.locator('.textv')
    await expect(text).toContainText('Only one of the 4 places loses money: after step 2')
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
  await page.getByRole('link', { name: 'Play incident 1' }).click()
  await expect(page).toHaveURL(/\/day\/payments$/)
})

test('"Find the bug" puts focus on the first step the visitor can tap, after the first run', async ({
  page,
}) => {
  await page.goto('/day/payments')
  await page.getByRole('link', { name: 'Find the bug' }).click()
  await expect(page.getByRole('button', { name: /Make request A slow after step 1/ })).toBeFocused({
    timeout: 8000,
  })
  await expect(page.getByText(/Your turn: tap a step on lane A\./)).toBeVisible()
})

test('"Read the code and tests" goes straight to the proof card', async ({ page }) => {
  await page.goto('/day/payments')
  await page.getByRole('link', { name: /Read the code and tests/ }).click()
  await expect(page).toHaveURL(/#proof$/)
})

test('the theme switch in the footer picks Light, Dark or Auto, and remembers it', async ({ page }) => {
  await page.goto('/')
  const theme = page.getByRole('group', { name: 'Theme:' })
  await theme.getByRole('button', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(theme.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
  await theme.getByRole('button', { name: 'Auto' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/)
})
