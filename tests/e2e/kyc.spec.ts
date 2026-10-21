import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, test } from '@playwright/test'

/** The console: the game's own words, never the text version further down the page. */
function machine(page: Page): Locator {
  return page.locator('.console.machine')
}

/** On phones the console sits below the ticket: "Find the bug" brings it into view, which starts the normal night. */
async function openTheConsole(page: Page) {
  const find = page.getByRole('link', { name: 'Find the bug' })
  if (await find.isVisible()) await find.click()
  await expect(machine(page).getByText(/^Anna ends up approved\./)).toBeVisible({ timeout: 10000 })
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

/** The night that locks Anna out: lose our answer to #1, then point at the copy of #1. */
async function reproduce(page: Page, tries: number) {
  await page.getByRole('button', { name: 'Lose our answer to #1' }).click()
  await expect(machine(page).getByText(/Which arrival locked her out\?/)).toBeVisible()
  await page.getByRole('button', { name: 'Point at this arrival: message #1, sent again' }).click()
  await expect(machine(page).getByText(`Reproduced on try ${tries}.`)).toBeVisible()
}

test('incident 2 plays from reproduce to the regulator on the real code', async ({ page }) => {
  await page.goto('/day/kyc')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Approved, then “pending” again')
  await expect(
    page.getByText(/^On call · Incident 2 · Identity checks · about 2 minutes · TEST MODE, no real money$/),
  ).toBeVisible()
  await expect(page.getByText(/^Made by Saba Janelidze/)).toBeVisible()

  // On arrival a normal night plays by itself in the console, then it asks for the first move.
  await openTheConsole(page)

  // A safe cut first: the copy of #2 says what #2 said.
  await page.getByRole('button', { name: 'Lose our answer to #2' }).click()
  await expect(machine(page).getByText(/The copy of #2 says what #2 said/)).toBeVisible()

  // The cut that locks her out; a wrong pick first, then the copy of #1.
  await page.getByRole('button', { name: 'Lose our answer to #1' }).click()
  await expect(machine(page).getByText(/Which arrival locked her out\?/)).toBeVisible()
  await expect(machine(page).getByText('LOCKED OUT', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Point at this arrival: message #1', exact: true }).click()
  await expect(machine(page).getByText(/That one came first/)).toBeVisible()
  await page.getByRole('button', { name: 'Point at this arrival: message #1, sent again' }).click()
  await expect(machine(page).getByText('Reproduced on try 2.')).toBeVisible()
  await expect(machine(page).getByText('same ID as #1 · version 1 < 2')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Anna’s record' }).first()).toContainText('pending · v1')

  await page.getByRole('button', { name: 'Next: how often does this happen? →', exact: true }).click()
  await page.getByLabel('Your guess').fill('3')
  await page.getByRole('button', { name: 'Run all 14', exact: true }).click()
  await expect(
    page.getByRole('img', { name: /7 of 14 orders lock Anna out \(your guess: 3\)/ }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Next: fix it →', exact: true }).click()
  await page.getByRole('radio', { name: /Ignore older/ }).check()
  await page.getByRole('button', { name: 'Attack this patch' }).click()
  await expect(machine(page).getByText(/Still locks Anna out in 7 of 14 orders\./)).toBeVisible()
  await expect(machine(page).getByText(/in the same second/)).toBeVisible()

  await page.getByRole('radio', { name: /Refuse/ }).check()
  await page.getByRole('button', { name: 'Attack this patch' }).click()
  await expect(machine(page).getByText(/Still locks Anna out in 4 of 14 orders\./)).toBeVisible()

  await page.getByRole('radio', { name: /in order/ }).check()
  await page.getByRole('button', { name: 'Attack this patch' }).click()
  await expect(page.getByRole('heading', { name: 'Fixed: approved in all 14 orders' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'The result' }).first()).toContainText('refused')

  // The regulator: the record alone proves nothing; the provider's own record does.
  await page.getByRole('button', { name: 'Go deeper: the regulator asks' }).click()
  await page.getByRole('button', { name: 'Search our logs' }).click()
  await expect(machine(page).getByText(/0 of Boris’s messages are on file/)).toBeVisible()
  await page.getByRole('button', { name: 'Ask the provider' }).click()
  await expect(machine(page).getByText(/The provider never sent Boris a version 3/)).toBeVisible()
  await expect(page.getByRole('table', { name: 'Last night’s records' })).toContainText(
    'held · kept as evidence',
  )

  // The card opens and keyboard focus moves into it.
  await page.getByRole('button', { name: 'Read the code and the tests' }).click()
  await expect(page.locator('#proof')).toHaveAttribute('open', '')
  await expect(page.locator('#proof > summary')).toBeFocused()
  await noSidewaysScroll(page)
})

/** Records the console's height on every frame until the returned function is called. */
async function recordConsoleHeights(page: Page) {
  await machine(page).evaluate((element) => {
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

test('the console keeps one height from arrival to the regulator, and fits a laptop screen', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'nights animate only with motion')
  test.setTimeout(90_000)
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/day/kyc')
    await page.evaluate(() => document.fonts.ready)
    await openTheConsole(page)
    const stop = await recordConsoleHeights(page)

    // Every kind of change: a safe night, the locking night, a wrong pick, the code view, each step, a failed patch,
    // the clean-up before and after asking.
    await page.getByRole('button', { name: 'Lose both answers' }).click()
    await expect(machine(page).getByText(/Both copies came in order/)).toBeVisible()
    await page.getByRole('button', { name: 'Lose our answer to #1' }).click()
    await expect(machine(page).getByText(/Which arrival locked her out\?/)).toBeVisible()
    await page.getByRole('button', { name: 'Point at this arrival: message #2', exact: true }).click()
    await page.getByRole('button', { name: 'Point at this arrival: message #1, sent again' }).click()
    await expect(machine(page).getByText('Reproduced on try 2.')).toBeVisible()
    await page.getByRole('button', { name: 'Code', exact: true }).click()
    await page.getByRole('button', { name: 'Night', exact: true }).click()
    await page.getByRole('button', { name: 'Next: how often does this happen? →', exact: true }).click()
    await page.getByLabel('Your guess').fill('7')
    await page.getByRole('button', { name: 'Run all 14', exact: true }).click()
    await expect(page.getByRole('img', { name: /7 of 14 orders lock Anna out/ })).toBeVisible()
    await page.waitForTimeout(1600)
    await page.getByRole('button', { name: 'Next: fix it →', exact: true }).click()
    await page.getByRole('radio', { name: /Ignore older/ }).check()
    await page.getByRole('button', { name: 'Attack this patch' }).click()
    await expect(machine(page).getByText(/Still locks Anna out in 7 of 14 orders\./)).toBeVisible()
    await page.getByRole('button', { name: 'Try another patch' }).click()
    await page.getByRole('radio', { name: /in order/ }).check()
    await page.getByRole('button', { name: 'Attack this patch' }).click()
    await expect(page.getByRole('heading', { name: 'Fixed: approved in all 14 orders' })).toBeVisible()
    await page.waitForTimeout(1600)
    await page.getByRole('button', { name: 'Go deeper: the regulator asks' }).click()
    await page.getByRole('button', { name: 'Answer from our record' }).click()
    await page.getByRole('button', { name: 'Ask the provider' }).click()
    await expect(machine(page).getByText(/The provider never sent Boris a version 3/)).toBeVisible()

    const heights = await stop()
    expect(
      Math.max(...heights) - Math.min(...heights),
      `whole incident at ${viewport.width} px`,
    ).toBeLessThan(1)
    // On a laptop the whole console fits under the site header (as incident 1's does).
    if (viewport.width === 1280) expect(Math.max(...heights)).toBeLessThanOrEqual(643)
  }
})

test('every link back to the portfolio is tagged with the station', async ({ page }) => {
  await page.goto('/day/kyc')
  const hrefs = await page
    .locator('a[href*="sabajanelidze.com"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href))
  expect(hrefs.length).toBeGreaterThan(0)
  for (const href of hrefs) expect(href).toContain('from=lab-kyc')
})

test('no accessibility violations in any step', async ({ page }) => {
  await page.goto('/day/kyc')
  const violations = async (where: string) =>
    (await new AxeBuilder({ page }).analyze()).violations.map((violation) => `${where}: ${violation.id}`)
  expect(await violations('arrival')).toEqual([])
  await openTheConsole(page)
  expect(await violations('first move')).toEqual([])
  await page.getByRole('button', { name: 'Lose our answer to #1' }).click()
  await expect(machine(page).getByText(/Which arrival locked her out\?/)).toBeVisible()
  expect(await violations('pointing at an arrival')).toEqual([])
  await page.getByRole('button', { name: 'Point at this arrival: message #1, sent again' }).click()
  await page.getByRole('button', { name: 'Next: how often does this happen? →', exact: true }).click()
  await page.getByRole('button', { name: 'Run all 14', exact: true }).click()
  await expect(page.getByRole('img', { name: /7 of 14 orders lock Anna out/ })).toBeVisible()
  await page.getByRole('button', { name: 'Next: fix it →', exact: true }).click()
  await page.getByRole('radio', { name: /Refuse/ }).check()
  await page.getByRole('button', { name: 'Attack this patch' }).click()
  await expect(machine(page).getByText(/Still locks Anna out in 4 of 14 orders\./)).toBeVisible()
  expect(await violations('a failed patch')).toEqual([])
  await page.getByRole('button', { name: 'Try another patch' }).click()
  await page.getByRole('radio', { name: /in order/ }).check()
  await page.getByRole('button', { name: 'Attack this patch' }).click()
  await page.getByRole('button', { name: 'Go deeper: the regulator asks' }).click()
  await page.getByRole('button', { name: 'Ask the provider' }).click()
  await expect(machine(page).getByText(/The provider never sent Boris a version 3/)).toBeVisible()
  expect(await violations('the regulator')).toEqual([])
})

test('the proof card shows the fix in TypeScript or Go', async ({ page }) => {
  await page.goto('/day/kyc')
  await page.locator('#proof > summary').click()
  const v1 = page.getByRole('tablist', { name: 'Code language' }).first()
  await expect(v1.getByRole('tab', { name: 'TypeScript' })).toHaveAttribute('aria-selected', 'true')
  await expect(source(page, 'go/kyc/handle_event.go')).toBeHidden()

  await v1.getByRole('tab', { name: 'Go' }).click()
  await expect(source(page, 'go/kyc/handle_event.go')).toBeVisible()
  // Every tab set on the card follows the same choice.
  await expect(source(page, 'go/kyc/postgres.go')).toBeVisible()
  await expect(source(page, 'packages/core/src/kyc/handle-event.ts')).toBeHidden()

  const results = await new AxeBuilder({ page }).include('#proof').analyze()
  expect(results.violations.map((violation) => violation.id)).toEqual([])
  await noSidewaysScroll(page)
})

for (const scheme of ['light', 'dark'] as const) {
  test(`coloured code reads at 4.5:1 or better (${scheme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('/day/kyc')
    await openTheConsole(page)
    await reproduce(page, 1)
    await page.getByRole('button', { name: 'Code', exact: true }).click()
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
    await page.goto('/day/kyc')
    await page.locator('#proof > summary').click()
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(source(page, 'go/kyc/handle_event.go')).toBeVisible()
    await expect(source(page, 'packages/core/src/kyc/handle-event.ts')).toBeVisible()
  })

  test('the whole incident is readable as text, with every order', async ({ page }) => {
    await page.goto('/day/kyc')
    const text = page.locator('.textv')
    await expect(text).toContainText('and Anna ends “pending”: locked out')
    await expect(text).toContainText('7 of them (50%) lock Anna out on build v0.1')
    await expect(text.locator('.orders li')).toHaveCount(14)
    await expect(text).toContainText('1 2 1: locked out')
    await expect(text).toContainText('still locks Anna out in 7 of 14 orders')
    await expect(text).toContainText('still locks Anna out in 4 of 14 orders')
    await expect(text).toContainText('locks Anna out in 0 of 14 orders. This is build v1.')
    await expect(text).toContainText('it gets in only with build v0.1')
  })
})

test('"Find the bug" puts focus on the first cut, after the normal night', async ({ page }) => {
  await page.goto('/day/kyc')
  await page.getByRole('link', { name: 'Find the bug' }).click()
  await expect(page.getByRole('button', { name: 'Lose our answer to #1' })).toBeFocused({ timeout: 8000 })
})

test('"Find the bug" pressed while the game is still loading still ends on the first cut', async ({
  page,
}) => {
  // A slow phone: the game's code arrives 1.5 s after the page. The press must not be lost.
  await page.route(/KycIncident\..*\.js$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })
  await page.goto('/day/kyc', { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: 'Find the bug' }).click()
  await expect(page.getByRole('button', { name: 'Lose our answer to #1' })).toBeFocused({ timeout: 10000 })
})

test("on a phone the next move rides at the screen's foot", async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'the deck rides on phones only')
  await page.goto('/day/kyc')
  await expect(page.locator('.m-deck')).not.toHaveClass(/can-ride/)
  await openTheConsole(page)
  await reproduce(page, 1)
  // On screen without scrolling (a click would scroll for us, so measure instead).
  const next = page.getByRole('button', { name: 'Next: how often does this happen? →', exact: true })
  const box = await next.boundingBox()
  const screen = page.viewportSize()?.height ?? 0
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0)
  expect((box?.y ?? screen) + (box?.height ?? 1)).toBeLessThanOrEqual(screen)
})
