import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCountries, fetchLatestByCountry, fetchSeries } from './worldBank'

/** Replaces global fetch with a stub that returns `body` as JSON. */
function mockFetch(body: unknown, ok = true) {
  const stub = vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body })
  vi.stubGlobal('fetch', stub)
  return stub
}

const meta = { page: 1, pages: 1, per_page: 1000, total: 1 }
const row = (iso3: string, date: string, value: number | null) => ({
  indicator: { id: 'X', value: 'X' },
  country: { id: iso3.slice(0, 2), value: `Country ${iso3}` },
  countryiso3code: iso3,
  date,
  value,
})

afterEach(() => vi.unstubAllGlobals())

describe('fetchCountries', () => {
  it('drops aggregates and trims padded names', async () => {
    mockFetch([
      meta,
      [
        { id: 'NPL', name: 'Nepal', region: { id: 'SAS', value: 'South Asia ' }, incomeLevel: { id: 'LMC', value: 'Lower middle income' }, latitude: '27.6939', longitude: '85.3157' },
        { id: 'ARB', name: 'Arab World', region: { id: 'NA', value: 'Aggregates' }, incomeLevel: { id: 'NA', value: 'Aggregates' }, latitude: '', longitude: '' },
      ],
    ])
    expect(await fetchCountries()).toEqual([
      { code: 'NPL', name: 'Nepal', region: 'South Asia', incomeLevel: 'Lower middle income', latitude: 27.6939, longitude: 85.3157 },
    ])
  })
})

describe('fetchLatestByCountry', () => {
  it('maps rows and requests the most recent non-empty value', async () => {
    const stub = mockFetch([meta, [row('NPL', '2025', 4.4), row('', '2025', 1)]])
    const result = await fetchLatestByCountry('NY.GDP.MKTP.KD.ZG')
    expect(result).toEqual([{ countryCode: 'NPL', countryName: 'Country NPL', year: 2025, value: 4.4 }])
    expect(String(stub.mock.calls[0][0])).toContain('mrnev=1')
  })
})

describe('fetchSeries', () => {
  it('sorts oldest first and skips the request for no countries', async () => {
    mockFetch([meta, [row('NPL', '2022', 2), row('NPL', '2020', 1)]])
    const result = await fetchSeries('X', ['NPL'], 2020, 2022)
    expect(result.map((o) => o.year)).toEqual([2020, 2022])
    expect(await fetchSeries('X', [], 2020, 2022)).toEqual([])
  })
})

describe('error handling', () => {
  it('throws the API message when it reports an error with HTTP 200', async () => {
    mockFetch([{ message: [{ id: '120', key: 'Invalid value', value: 'The provided parameter value is not valid' }] }])
    await expect(fetchLatestByCountry('BAD')).rejects.toThrow('not valid')
  })
  it('throws on a non-OK status', async () => {
    mockFetch({}, false)
    await expect(fetchLatestByCountry('X')).rejects.toThrow('500')
  })
  it('treats null rows as no data', async () => {
    mockFetch([meta, null])
    expect(await fetchLatestByCountry('X')).toEqual([])
  })
})
