import { expect, test } from './fixtures.ts'
import { mockMigrantStock, mockWorldBank } from './worldBankMock.ts'

test.describe('Kepler migration arcs', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorldBank(page)
    await mockMigrantStock(page)
    await page.goto('/')
  })

  test('does not fetch the migration file until the arcs view is opened', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => r.url().includes('migrant-stock') && requests.push(r.url()))
    await expect(page.getByRole('radio', { name: 'Indicator by country' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.metric-caption')).toContainText('most recent value per country')
    expect(requests).toHaveLength(0)

    await page.getByRole('radio', { name: 'Where people live abroad' }).click()
    await expect(page.locator('.metric-caption')).toContainText('People born in India')
    expect(requests).toHaveLength(1)
  })

  test('shows the focused country, then another one and another year', async ({ page }) => {
    await page.getByRole('radio', { name: 'Where people live abroad' }).click()
    // India is the last of the default countries, so it is the dashboard's focused country.
    await expect(page.getByRole('combobox', { name: 'People born in' })).toHaveValue('IND')
    await expect(page.locator('.metric-caption')).toContainText('mid-2024: 18M in total')

    await page.getByRole('combobox', { name: 'People born in' }).selectOption('NPL')
    await expect(page.locator('.metric-caption')).toContainText('People born in Nepal')
    await expect(page.locator('.metric-caption')).toContainText('2.6M in total')

    await page.getByRole('combobox', { name: 'Year' }).selectOption('1990')
    await expect(page.locator('.metric-caption')).toContainText('mid-1990: 500K in total')
  })

  test('credits the source and says these are stocks, not yearly movement', async ({ page }) => {
    await page.getByRole('radio', { name: 'Where people live abroad' }).click()
    await expect(page.locator('.metric-caption')).toContainText('UN DESA')
    await expect(page.locator('.metric-caption')).toContainText('not movement that year')
  })

  test('going back to the indicator view brings back its metric controls', async ({ page }) => {
    await page.getByRole('radio', { name: 'Where people live abroad' }).click()
    await expect(page.getByRole('radio', { name: 'Latest value' })).toHaveCount(0)
    await page.getByRole('radio', { name: 'Indicator by country' }).click()
    await expect(page.getByRole('radio', { name: 'Latest value' })).toBeVisible()
  })

  test('shows an error when the migration file cannot be loaded', async ({ page }) => {
    test.info().annotations.push({ type: 'expect-errors', description: 'the file request fails on purpose' })
    await page.route('**/data/migrant-stock.json', (route) => route.fulfill({ status: 500, body: '' }))
    await page.getByRole('radio', { name: 'Where people live abroad' }).click()
    await expect(page.locator('.metric-caption')).toContainText('Could not load migration data')
  })
})
