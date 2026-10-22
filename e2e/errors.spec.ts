import { expect, log, test } from './fixtures.ts'
import { mockWorldBank } from './worldBankMock.ts'

test.describe('failure handling', () => {
  test('shows an alert when the indicator request fails, and recovers on another indicator', async ({ page }) => {
    test.info().annotations.push({ type: 'expect-errors' })
    // The mock answers HTTP 500 for GDP per capita only; every other indicator still works.
    log('mocking a 500 for NY.GDP.PCAP.CD (the default indicator)')
    await mockWorldBank(page, { failIndicator: 'NY.GDP.PCAP.CD' })
    await page.goto('/')

    const alert = page.getByRole('alert').filter({ hasText: 'Could not load data' })
    await expect(alert).toBeVisible()
    log(`alert shown: "${await alert.innerText()}"`)

    log('switching to Inflation, which is not failing')
    await page.getByRole('radio', { name: 'Inflation' }).click()
    await expect(alert).toHaveCount(0)
    await expect(page.locator('.stat-card', { hasText: 'Highest' })).toContainText('United States')
    log('alert is gone and data is back')
  })

  test('shows an alert when the country list cannot be loaded', async ({ page }) => {
    test.info().annotations.push({ type: 'expect-errors' })
    log('mocking a 503 for every World Bank request')
    await page.route('https://api.worldbank.org/v2/**', (route) => route.fulfill({ status: 503, body: '' }))
    await page.goto('/')
    const alert = page.getByRole('alert').first()
    await expect(alert).toContainText('World Bank request failed (503)')
    log(`alert shown: "${await alert.innerText()}"`)
  })
})
