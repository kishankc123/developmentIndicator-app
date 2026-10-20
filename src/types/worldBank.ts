/**
 * Types for the World Bank v2 API (https://api.worldbank.org/v2).
 * Field names mirror real responses checked on 2026-10-19; the "Raw" types are
 * the wire format, the unprefixed types are what the rest of the app uses.
 */

/** Pagination metadata: first element of every `[meta, rows]` JSON response. */
export interface RawPageMeta {
  page: number
  pages: number
  // A number on indicator endpoints but a string on the country endpoint.
  per_page: number | string
  total: number
}

/** One row of `country/{codes}/indicator/{id}`. `value` is null when no data exists. */
export interface RawObservation {
  indicator: { id: string; value: string }
  country: { id: string; value: string }
  countryiso3code: string
  // Four-digit year as a string for annual indicators.
  date: string
  value: number | null
}

/** One row of the `country` endpoint (includes regional/income aggregates). */
export interface RawCountry {
  id: string
  iso2Code: string
  name: string
  region: { id: string; value: string }
  incomeLevel: { id: string; value: string }
  capitalCity: string
}

/** Error payload the API returns with HTTP 200, e.g. for an invalid parameter. */
export interface RawErrorResponse {
  message: { id: string; key: string; value: string }[]
}

/** A single indicator reading for one country and year. */
export interface Observation {
  /** ISO 3166-1 alpha-3 code (e.g. "NPL"); the join key to the map. */
  countryCode: string
  countryName: string
  year: number
  value: number | null
}

/** A real country (not a regional/income aggregate). */
export interface Country {
  /** ISO 3166-1 alpha-3 code. */
  code: string
  name: string
  region: string
  incomeLevel: string
}
