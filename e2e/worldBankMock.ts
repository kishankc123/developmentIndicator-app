import type { Page, Route } from '@playwright/test'

/** Fixture countries. WLD is an aggregate (region "NA") that the app must filter out. */
const COUNTRIES = [
  { id: 'USA', name: 'United States', region: 'North America', lat: '38.89', lon: '-77.03' },
  { id: 'CHN', name: 'China', region: 'East Asia & Pacific', lat: '39.91', lon: '116.39' },
  { id: 'IND', name: 'India', region: 'South Asia', lat: '28.64', lon: '77.22' },
  { id: 'NPL', name: 'Nepal', region: 'South Asia', lat: '27.71', lon: '85.32' },
  { id: 'WLD', name: 'World', region: 'NA', lat: '', lon: '' },
]

/** Latest GDP-per-capita-style values; every indicator reuses these so assertions stay simple. */
const LATEST: Record<string, number> = { USA: 85000, CHN: 12600, IND: 2500, NPL: 1400, WLD: 13000 }

function envelope(rows: unknown[]) {
  return [{ page: 1, pages: 1, per_page: 1000, total: rows.length }, rows]
}

function countryRows() {
  return COUNTRIES.map((c) => ({
    id: c.id,
    iso2Code: c.id.slice(0, 2),
    name: c.name,
    region: { id: c.region === 'NA' ? 'NA' : c.id, value: c.region },
    incomeLevel: { id: 'HIC', value: 'High income' },
    capitalCity: '',
    latitude: c.lat,
    longitude: c.lon,
  }))
}

function observation(code: string, indicator: string, year: number, value: number) {
  const country = COUNTRIES.find((c) => c.id === code)!
  return {
    indicator: { id: indicator, value: indicator },
    country: { id: code.slice(0, 2), value: country.name },
    countryiso3code: code,
    date: String(year),
    value,
  }
}

/** Answers World Bank API calls with fixtures, so tests are fast, offline and deterministic. */
export async function mockWorldBank(page: Page, options: { failIndicator?: string } = {}) {
  await page.route('https://api.worldbank.org/v2/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const parts = url.pathname.replace('/v2/', '').split('/')

    if (parts[0] === 'country' && parts.length === 1) {
      return route.fulfill({ json: envelope(countryRows()) })
    }

    const indicator = parts[3]
    if (options.failIndicator && indicator === options.failIndicator) {
      return route.fulfill({ status: 500, body: 'boom' })
    }

    // The Kepler history request: every economy over a date range (the latest-value call has no range).
    if (parts[1] === 'all' && url.searchParams.has('date')) {
      const [from, to] = url.searchParams.get('date')!.split(':').map(Number)
      const rows = Object.entries(LATEST).flatMap(([code, v]) =>
        Array.from({ length: to - from + 1 }, (_, i) => observation(code, indicator, from + i, v * (0.8 + (i / (to - from)) * 0.2))),
      )
      return route.fulfill({ json: envelope(rows) })
    }

    if (parts[1] === 'all') {
      return route.fulfill({
        json: envelope(Object.entries(LATEST).map(([code, v]) => observation(code, indicator, 2023, v))),
      })
    }

    const codes = parts[1].split(';')
    const [from, to] = (url.searchParams.get('date') ?? '2000:2024').split(':').map(Number)
    const rows = codes.flatMap((code) =>
      Array.from({ length: to - from + 1 }, (_, i) =>
        observation(code, indicator, from + i, LATEST[code] * (0.9 + (i / (to - from)) * 0.1)),
      ),
    )
    return route.fulfill({ json: envelope(rows) })
  })
}

/**
 * Small stand-in for public/data/migrant-stock.json (built from UN DESA data), so tests do not
 * depend on the real 170 KB file. India has two destinations; Nepal has one it can be drawn to.
 */
export async function mockMigrantStock(page: Page) {
  await page.route('**/data/migrant-stock.json', (route) =>
    route.fulfill({
      json: {
        years: [1990, 2024],
        origins: {
          IND: { total: [3000000, 18000000], to: [['USA', [400000, 2800000]], ['CHN', [10000, 50000]]] },
          NPL: { total: [500000, 2600000], to: [['IND', [400000, 600000]], ['USA', [10000, 260000]]] },
        },
      },
    }),
  )
}
