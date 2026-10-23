import type {
  Country,
  Observation,
  RawCountry,
  RawErrorResponse,
  RawObservation,
  RawPageMeta,
} from '../types/worldBank'

const BASE_URL = 'https://api.worldbank.org/v2'
// Large enough that every request we make fits on one page; pagination below is a safety net.
const PAGE_SIZE = 1000

/**
 * Splits a raw `[meta, rows]` response into page count and rows.
 * The API reports errors as `[{ message: [...] }]` with HTTP 200, and returns
 * `rows: null` when a query matches nothing, so both are handled here.
 */
function parseEnvelope<T>(body: unknown): { pages: number; rows: T[] } {
  const first: unknown = Array.isArray(body) ? body[0] : undefined
  if (first && typeof first === 'object' && 'message' in first) {
    const { message } = first as RawErrorResponse
    throw new Error(`World Bank API error: ${message.map((m) => m.value).join('; ')}`)
  }
  if (!Array.isArray(body) || body.length < 2) {
    throw new Error('Unexpected World Bank response shape')
  }
  const meta = body[0] as RawPageMeta
  return { pages: meta.pages, rows: (body[1] as T[] | null) ?? [] }
}

/** GETs every page of a World Bank endpoint and returns all rows. */
async function fetchAllRows<T>(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1, pages = 1; page <= pages; page++) {
    const query = new URLSearchParams({
      format: 'json',
      per_page: String(PAGE_SIZE),
      page: String(page),
      ...params,
    })
    const response = await fetch(`${BASE_URL}/${path}?${query}`, { signal })
    if (!response.ok) throw new Error(`World Bank request failed (${response.status})`)
    const parsed = parseEnvelope<T>(await response.json())
    pages = parsed.pages
    rows.push(...parsed.rows)
  }
  return rows
}

/** Converts a raw row to an Observation, or null when it has no usable country code. */
function toObservation(raw: RawObservation): Observation | null {
  // Some aggregate rows could lack an ISO3 code; they cannot join to the map, so skip them.
  if (!raw.countryiso3code) return null
  return {
    countryCode: raw.countryiso3code,
    countryName: raw.country.value,
    year: Number(raw.date),
    value: raw.value,
  }
}

/** Parses an API coordinate string; the API uses "" for unknown, which must not become 0. */
function parseCoordinate(raw: string | undefined): number | null {
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** Fetches all countries, excluding regional and income aggregates. */
export async function fetchCountries(signal?: AbortSignal): Promise<Country[]> {
  const rows = await fetchAllRows<RawCountry>('country', {}, signal)
  return (
    rows
      // Aggregates (e.g. "Arab World") are the only rows whose region id is "NA".
      .filter((row) => row.region.id !== 'NA')
      .map((row) => ({
        code: row.id,
        name: row.name.trim(),
        // The API pads region names with trailing spaces.
        region: row.region.value.trim(),
        incomeLevel: row.incomeLevel.value.trim(),
        latitude: parseCoordinate(row.latitude),
        longitude: parseCoordinate(row.longitude),
      }))
  )
}

/**
 * Fetches the most recent non-empty value of an indicator for every economy.
 * `mrnev=1` means "most recent non-empty value", so years differ per country.
 * The result still contains aggregates; filter it against `fetchCountries`.
 */
export async function fetchLatestByCountry(
  indicatorId: string,
  signal?: AbortSignal,
): Promise<Observation[]> {
  const rows = await fetchAllRows<RawObservation>(
    `country/all/indicator/${indicatorId}`,
    { mrnev: '1' },
    signal,
  )
  return rows.map(toObservation).filter((o): o is Observation => o !== null)
}

/**
 * Fetches one indicator for every economy in a single year, so two indicators fetched for
 * the same year can be compared like for like (unlike `mrnev`, where years differ per country).
 * The result still contains aggregates and null values; filter against `fetchCountries`.
 */
export async function fetchIndicatorForYear(
  indicatorId: string,
  year: number,
  signal?: AbortSignal,
): Promise<Observation[]> {
  const rows = await fetchAllRows<RawObservation>(
    `country/all/indicator/${indicatorId}`,
    { date: String(year) },
    signal,
  )
  return rows.map(toObservation).filter((o): o is Observation => o !== null)
}

/** Fetches a yearly series for the given countries, sorted oldest to newest. */
export async function fetchSeries(
  indicatorId: string,
  countryCodes: string[],
  fromYear: number,
  toYear: number,
  signal?: AbortSignal,
): Promise<Observation[]> {
  if (countryCodes.length === 0) return []
  const rows = await fetchAllRows<RawObservation>(
    `country/${countryCodes.join(';')}/indicator/${indicatorId}`,
    { date: `${fromYear}:${toYear}` },
    signal,
  )
  return rows
    .map(toObservation)
    .filter((o): o is Observation => o !== null)
    .sort((a, b) => a.year - b.year)
}
