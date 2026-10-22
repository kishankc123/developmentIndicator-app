import { test as base, expect } from '@playwright/test'

/**
 * Prints a line to the terminal. Tests run in Node, so this shows in the `npm run test:e2e`
 * output (use `--workers=1` to keep lines from different tests from interleaving).
 */
export function log(message: string) {
  console.log(`    ▸ ${message}`)
}

/**
 * Extended `test` that watches every page automatically. Always logs problems (browser errors,
 * failed requests). Set E2E_VERBOSE=1 to also log every console message and World Bank call:
 *   E2E_VERBOSE=1 npx playwright test --workers=1 --project=chromium
 */
export const test = base.extend<{ watchPage: void }>({
  watchPage: [
    async ({ page }, use, testInfo) => {
      const verbose = !!process.env.E2E_VERBOSE
      const tag = `[${testInfo.project.name}]`
      // Tests that fail requests on purpose add { type: 'expect-errors' } so the noise is labelled.
      const mark = () => (testInfo.annotations.some((a) => a.type === 'expect-errors') ? '○ (expected)' : '✖')

      page.on('pageerror', (error) => console.log(`    ${mark()} ${tag} uncaught error in page: ${error.message}`))
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.log(`    ${mark()} ${tag} console.error: ${msg.text()}`)
        else if (verbose) console.log(`    · ${tag} console.${msg.type()}: ${msg.text()}`)
      })
      page.on('requestfailed', (req) => console.log(`    ${mark()} ${tag} request failed: ${req.url()}`))
      if (verbose) {
        page.on('response', (res) => {
          const url = res.url()
          if (url.includes('api.worldbank.org')) {
            // Show the path only, e.g. "country/all/indicator/NY.GDP.PCAP.CD".
            console.log(`    · ${tag} World Bank ${res.status()} ← ${new URL(url).pathname.replace('/v2/', '')}`)
          }
        })
      }
      await use()
    },
    { auto: true },
  ],
})

export { expect }
