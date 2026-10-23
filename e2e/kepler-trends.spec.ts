import { expect, test } from './fixtures.ts'
import { mockWorldBank } from './worldBankMock.ts'

test.describe('Kepler trend metrics', () => {
  test.beforeEach(async ({ page }) => {
    await mockWorldBank(page)
    await page.goto('/')
  })

  test('starts on the latest value, with the period choice disabled', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'Latest value' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: '10 years' })).toBeDisabled()
    await expect(page.locator('.metric-caption')).toContainText('most recent value per country')
  })

  test('choosing a change metric explains it and enables the period', async ({ page }) => {
    await page.getByRole('radio', { name: 'Change', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Change', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.metric-caption')).toContainText('over the last 10 years')
    await expect(page.locator('.metric-caption')).toContainText('Purple = rose, orange = fell')

    await page.getByRole('radio', { name: '5 years' }).click()
    await expect(page.locator('.metric-caption')).toContainText('over the last 5 years')
  })

  test('a rate indicator offers no % change or growth rate, and falls back from one', async ({ page }) => {
    await page.getByRole('radio', { name: '% change' }).click()
    await expect(page.locator('.metric-caption')).toContainText('% change')

    // Inflation is already a percentage, so a % change of it would mislead.
    await page.getByRole('radio', { name: 'Inflation' }).click()
    await expect(page.getByRole('radio', { name: '% change' })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Yearly growth (CAGR)' })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Latest value' })).toHaveAttribute('aria-checked', 'true')
  })
})
