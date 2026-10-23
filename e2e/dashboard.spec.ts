import { expect, log, test } from './fixtures.ts'
import { mockWorldBank } from './worldBankMock.ts'

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Every World Bank call is answered from fixtures (see worldBankMock.ts), so no real network.
    await mockWorldBank(page)
    await page.goto('/')
  })

  test('shows the header and the default indicator', async ({ page }) => {
    log(`page title: "${await page.title()}"`)
    await expect(page).toHaveTitle(/.+/)
    await expect(page.getByRole('heading', { level: 1, name: 'Development Indicator' })).toBeVisible()

    // The first entry in config/indicators.ts is selected on load.
    const selected = page.getByRole('radio', { checked: true })
    log(`indicator selected on load: "${await selected.innerText()}"`)
    await expect(page.getByRole('radio', { name: 'GDP per capita' })).toHaveAttribute('aria-checked', 'true')

    // `exact: true` because the Kepler panel is titled "Explore: GDP per capita" and would also match.
    await expect(page.getByRole('heading', { level: 2, name: 'GDP per capita', exact: true })).toBeVisible()
  })

  test('computes the stat cards from the latest values, ignoring aggregates', async ({ page }) => {
    // Fixtures: USA 85000, CHN 12600, IND 2500, NPL 1400, plus "World" 13000 (an aggregate).
    // If aggregates leaked through, the count would be 5 and the median $12,600 instead.
    const cards = page.locator('.stat-card')
    await expect(cards).toHaveCount(3)
    log(`stat cards: ${JSON.stringify((await cards.allInnerTexts()).map((t) => t.replace(/\n+/g, ' | ')))}`)

    // The first card follows the last selected country (default order USA, CHN, IND → India).
    await expect(cards.filter({ hasText: 'India' })).toContainText('$2,500')
    await expect(cards.filter({ hasText: 'Highest' })).toContainText('$85,000')
    await expect(cards.filter({ hasText: 'Highest' })).toContainText('United States, 2023')

    // Median of [1400, 2500, 12600, 85000] = (2500 + 12600) / 2 = 7550.
    await expect(cards.filter({ hasText: 'Median country' })).toContainText('Across 4 countries')
    await expect(cards.filter({ hasText: 'Median country' })).toContainText('$7,550')
  })

  test('switching indicator updates the panel, selection and number format', async ({ page }) => {
    log('clicking "Inflation"')
    await page.getByRole('radio', { name: 'Inflation' }).click()
    await expect(page.getByRole('radio', { name: 'Inflation' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: 'GDP per capita' })).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('heading', { level: 2, name: 'Inflation', exact: true })).toBeVisible()

    // Inflation is a percent indicator, so the same fixture value 85000 renders as "85000.0%"
    // (this proves the format changed from usd to percent, not that 85000% is realistic).
    const highest = page.locator('.stat-card', { hasText: 'Highest' })
    log(`"Highest" card after switching: ${(await highest.innerText()).replace(/\n+/g, ' | ')}`)
    await expect(highest).toContainText('85000.0%')
  })

  test('shows life expectancy in years', async ({ page }) => {
    // Switching theme selects that theme's first indicator, which is Life expectancy.
    await page.getByRole('tab', { name: 'People & quality of life' }).click()
    await expect(page.getByRole('radio', { name: 'Life expectancy' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('heading', { level: 2, name: 'Life expectancy', exact: true })).toBeVisible()
    // Fixture value 85000 for the USA is not a real age; this checks the "years" unit and 1 decimal.
    const highest = page.locator('.stat-card', { hasText: 'Highest' })
    log(`"Highest" card for life expectancy: ${(await highest.innerText()).replace(/\n+/g, ' | ')}`)
    await expect(highest).toContainText('85000.0 years')
  })

  test('shows population as an abbreviated count', async ({ page }) => {
    await page.getByRole('tab', { name: 'People & quality of life' }).click()
    await page.getByRole('radio', { name: 'Population' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Population', exact: true })).toBeVisible()
    // Fixtures: USA 85000 → "85K"; median of [1400, 2500, 12600, 85000] = 7550 → "7.55K".
    const cards = page.locator('.stat-card')
    log(`stat cards for population: ${JSON.stringify((await cards.allInnerTexts()).map((t) => t.replace(/\n+/g, ' | ')))}`)
    await expect(cards.filter({ hasText: 'Highest' })).toContainText('85K')
    await expect(cards.filter({ hasText: 'Median country' })).toContainText('7.55K')
  })

  test('shows one tab per theme and only the selected theme\'s indicators', async ({ page }) => {
    // config/indicators.ts: 3 themes, 9 indicators in total, but only one theme's are visible at a time.
    const themes: Record<string, string[]> = {
      Economy: ['GDP per capita', 'GDP growth', 'Inflation', 'Unemployment'],
      Prosperity: ['GNI per capita', 'Income inequality (Gini)'],
      'People & quality of life': ['Life expectancy', 'Population', 'Internet use'],
    }
    log(`theme tabs: ${(await page.getByRole('tab').allInnerTexts()).join(' | ')}`)
    await expect(page.getByRole('tab')).toHaveCount(3)
    await expect(page.getByRole('radiogroup')).toHaveCount(1)

    for (const [theme, labels] of Object.entries(themes)) {
      await page.getByRole('tab', { name: theme }).click()
      await expect(page.getByRole('tab', { name: theme })).toHaveAttribute('aria-selected', 'true')
      log(`${theme}: ${(await page.getByRole('radio').allInnerTexts()).join(', ')}`)
      await expect(page.getByRole('radio')).toHaveText(labels)
      // The first indicator of the theme is selected when the theme is chosen.
      await expect(page.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true')
    }
  })

  test('hides the indicators of the other themes', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'Population' })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'GNI per capita' })).toHaveCount(0)
    await page.getByRole('tab', { name: 'People & quality of life' }).click()
    await expect(page.getByRole('radio', { name: 'GDP growth' })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Population' })).toBeVisible()
  })

  test('changes the colour theme when the theme changes', async ({ page }) => {
    const app = page.locator('.app')
    const accentOf = () => app.evaluate((el) => getComputedStyle(el).getPropertyValue('--color-accent').trim())
    const seen: Record<string, string> = {}
    for (const [theme, topic] of [
      ['Economy', 'economy'],
      ['Prosperity', 'prosperity'],
      ['People & quality of life', 'people'],
    ]) {
      await page.getByRole('tab', { name: theme }).click()
      await expect(app).toHaveAttribute('data-topic', topic)
      seen[topic] = await accentOf()
      log(`${topic}: accent ${seen[topic]}`)
    }
    // Three themes, three different accent colours.
    expect(new Set(Object.values(seen)).size).toBe(3)
  })

  test('shows internet use as a percentage', async ({ page }) => {
    await page.getByRole('tab', { name: 'People & quality of life' }).click()
    await page.getByRole('radio', { name: 'Internet use' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Internet use', exact: true })).toBeVisible()
    const highest = page.locator('.stat-card', { hasText: 'Highest' })
    log(`"Highest" card for internet use: ${(await highest.innerText()).replace(/\n+/g, ' | ')}`)
    await expect(highest).toContainText('85000.0%')
  })

  test('moves between theme tabs with the arrow keys', async ({ page }) => {
    await page.getByRole('tab', { name: 'Economy' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Prosperity' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Prosperity' })).toBeFocused()
    await page.keyboard.press('End')
    await expect(page.getByRole('tab', { name: 'People & quality of life' })).toHaveAttribute('aria-selected', 'true')
  })

  test('renders the trend chart with a legend entry per selected country', async ({ page }) => {
    const chart = page.locator('.trend-chart')
    // Recharts draws one <g class="recharts-line"> per country.
    await expect(chart.locator('.recharts-line')).toHaveCount(3)
    log(`legend entries: ${(await chart.locator('.recharts-legend-item-text').allInnerTexts()).join(', ')}`)
    for (const name of ['United States', 'China', 'India']) {
      await expect(chart.locator('.recharts-legend-item-text', { hasText: name })).toBeVisible()
    }
  })

  test('shows the map fallback instead of crashing when no Mapbox token is set', async ({ page }) => {
    // playwright.config.ts blanks VITE_MAPBOX_PUBLIC_ACCESS, so the maps cannot start (by design).
    const notice = page.getByText(/Map unavailable/).first()
    await expect(notice).toBeVisible()
    log(`map fallback text: "${(await notice.innerText()).slice(0, 60)}…"`)
  })

  test('credits the data source', async ({ page }) => {
    await expect(page.getByText('Source: World Bank Open Data')).toBeVisible()
  })
})
