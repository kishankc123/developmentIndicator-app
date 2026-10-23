import { expect, log, test } from './fixtures.ts'
import { mockWorldBank } from './worldBankMock.ts'

test('page has no horizontal overflow at common widths', async ({ page }) => {
  await mockWorldBank(page)
  await page.goto('/')
  await expect(page.locator('.country-selector__chip')).toHaveCount(3)

  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    // Overflow = how much wider the content is than the visible area (0 or less is fine).
    // Polled because the chart (Recharts) re-measures its container asynchronously after a
    // resize, so right after setViewportSize it can still be as wide as the old viewport.
    const measure = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    await expect
      .poll(measure, { message: `horizontal overflow at ${width}px`, timeout: 5_000 })
      .toBeLessThanOrEqual(0)
    log(`${width}px wide → overflow ${await measure()}px`)
  }
})
