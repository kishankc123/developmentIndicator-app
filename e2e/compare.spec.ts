import type { Page } from '@playwright/test'
import { expect, log, test } from './fixtures.ts'
import { mockWorldBank } from './worldBankMock.ts'

const chips = (page: Page) => page.locator('.country-selector__chip')
const picker = (page: Page) => page.getByLabel('Add a country to compare')

/** Logs the countries currently compared, e.g. "United States, China, India (3)". */
async function logChips(page: Page, when: string) {
  const names = (await chips(page).allInnerTexts()).map((t) => t.replace('×', '').trim())
  log(`${when}: ${names.join(', ') || '(none)'} [${names.length}]`)
}

test.describe('country comparison', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorldBank(page)
    await page.goto('/')
    // The chips only render after the country list loads, so this also waits for data.
    await expect(chips(page)).toHaveCount(3)
  })

  test('starts with the default countries', async ({ page }) => {
    await logChips(page, 'on load')
    await expect(chips(page)).toContainText(['United States', 'China', 'India'])
  })

  test('adds a country from the dropdown and resets the dropdown', async ({ page }) => {
    log('selecting "Nepal" in the dropdown')
    await picker(page).selectOption({ label: 'Nepal' })
    await expect(chips(page)).toHaveCount(4)
    await logChips(page, 'after adding Nepal')
    await expect(chips(page).last()).toContainText('Nepal')
    await expect(page.locator('.trend-chart .recharts-line')).toHaveCount(4)

    // The newest selection becomes the "focus" country on the first stat card.
    const card = page.locator('.stat-card', { hasText: 'Nepal' })
    log(`focus card: ${(await card.innerText()).replace(/\n+/g, ' | ')}`)
    await expect(card).toContainText('$1,400')
  })

  test('disables adding once the maximum is reached and re-enables after removal', async ({ page }) => {
    // MAX_SELECTED_COUNTRIES is 4 (one colour per country in config/theme.ts).
    await picker(page).selectOption({ label: 'Nepal' })
    await logChips(page, 'at the limit')
    log(`dropdown disabled: ${await picker(page).isDisabled()}`)
    await expect(picker(page)).toBeDisabled()
    await expect(picker(page).locator('option').first()).toHaveText('Up to 4 countries')

    log('removing China')
    await page.getByRole('button', { name: 'Remove China' }).click()
    await logChips(page, 'after removal')
    await expect(chips(page)).toHaveCount(3)
    await expect(picker(page)).toBeEnabled()
  })

  test('removes a country from the chips and the chart', async ({ page }) => {
    log('removing India')
    await page.getByRole('button', { name: 'Remove India' }).click()
    await expect(chips(page)).toHaveCount(2)
    await logChips(page, 'chips now')
    await expect(page.locator('.trend-chart .recharts-line')).toHaveCount(2)
    await expect(page.locator('.trend-chart .recharts-legend-item-text', { hasText: 'India' })).toHaveCount(0)
  })

  test('does not offer already selected countries or aggregates in the dropdown', async ({ page }) => {
    const options = await picker(page).locator('option').allTextContents()
    log(`dropdown options: ${options.join(', ')}`)
    expect(options).toContain('Nepal')
    expect(options).not.toContain('India') // already selected
    expect(options).not.toContain('World') // aggregate, filtered out by fetchCountries
  })

  test('shows an empty state when every country is removed', async ({ page }) => {
    for (const name of ['United States', 'China', 'India']) {
      log(`removing ${name}`)
      await page.getByRole('button', { name: `Remove ${name}` }).click()
    }
    await logChips(page, 'after removing all')
    await expect(page.getByText('No data for the selected countries.')).toBeVisible()
  })
})
