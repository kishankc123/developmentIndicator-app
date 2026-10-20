import type { Country, Observation } from '../types/worldBank'
import { findCountry } from './countryLookup'

/** One bar: a country's latest value. */
export interface BarRow {
  code: string
  country: string
  value: number
  /** Year of the reading; years differ between countries. */
  year: number
}

/** What the chat asks for: named countries, or a top/bottom ranking. */
export interface BarRequest {
  /** Country names or ISO3 codes; takes priority over `top`. */
  names?: string[]
  /** How many to rank when no names are given (clamped to 1-15, default 5). */
  top?: number
  /** Ranking direction when no names are given. */
  order?: 'highest' | 'lowest'
}

/** Rows to draw plus the requests that could not be satisfied. */
export interface BarRows {
  rows: BarRow[]
  /** Names that matched no unique country, or matched one with no data. */
  unresolved: string[]
}

const MAX_BARS = 15
const DEFAULT_TOP = 5

/**
 * Picks the bars for a comparison chart from the dashboard's own data, so every number
 * on the chart is the one shown elsewhere (the chat model never types a value).
 * Rows are returned highest first, which reads best as a horizontal bar chart.
 */
export function buildBarRows(
  observations: Map<string, Observation>,
  countries: Country[],
  request: BarRequest,
): BarRows {
  const unresolved: string[] = []
  let picked: BarRow[] = []

  if (request.names && request.names.length > 0) {
    const seen = new Set<string>()
    for (const name of request.names.slice(0, MAX_BARS)) {
      const country = findCountry(name, countries)
      const observation = country ? observations.get(country.code) : undefined
      if (!country || !observation || observation.value === null) {
        unresolved.push(name)
        continue
      }
      if (seen.has(country.code)) continue
      seen.add(country.code)
      picked.push({
        code: country.code,
        country: country.name,
        value: observation.value,
        year: observation.year,
      })
    }
  } else {
    const count = Math.min(Math.max(Math.round(request.top ?? DEFAULT_TOP), 1), MAX_BARS)
    picked = [...observations.values()]
      .filter((o): o is Observation & { value: number } => o.value !== null)
      .map((o) => ({ code: o.countryCode, country: o.countryName, value: o.value, year: o.year }))
      .sort((a, b) => (request.order === 'lowest' ? a.value - b.value : b.value - a.value))
      .slice(0, count)
  }

  return { rows: picked.sort((a, b) => b.value - a.value), unresolved }
}

/** Parses a tool result string; returns undefined while it is missing or malformed. */
export function parseToolResult<T>(result: string | undefined): T | undefined {
  if (!result) return undefined
  try {
    return JSON.parse(result) as T
  } catch {
    return undefined
  }
}
