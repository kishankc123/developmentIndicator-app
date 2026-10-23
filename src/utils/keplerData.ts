import type { Country, Observation } from '../types/worldBank'
import { absoluteChange, cagr, percentChange, seriesEnds, volatility } from './changeMetrics'

/** Kepler dataset id; the layer config below refers to it. */
export const KEPLER_DATASET_ID = 'countries'

/** Column names as shown in Kepler's tooltip and filter UI. */
export const KEPLER_FIELDS = {
  country: 'Country',
  code: 'ISO3',
  region: 'Region',
  income: 'Income level',
  year: 'Year',
  value: 'Value',
  change: 'Change',
  percent: '% change',
  cagr: 'Yearly growth (CAGR) %',
  volatility: 'Volatility',
  // Absolute values of the signed metrics: Kepler sizes by a column, and a big decline
  // should draw as large as an equally big rise.
  sizeChange: 'Size: |change|',
  sizePercent: 'Size: |% change|',
  sizeCagr: 'Size: |growth|',
  fromYear: 'From year',
  toYear: 'To year',
  latitude: 'latitude',
  longitude: 'longitude',
} as const

/** Kepler's table input: typed columns plus one array of cells per row. */
export interface KeplerDataset {
  fields: { name: string; type: 'string' | 'integer' | 'real' }[]
  /** null is an empty cell (a metric that cannot be computed for that country). */
  rows: (string | number | null)[][]
}

/**
 * Builds the table Kepler plots: one row per country that has both a value and a
 * capital-city location. Countries missing either are left out, since Kepler
 * cannot place them (and a missing coordinate must not become 0,0).
 *
 * `history` (yearly readings per country code) adds the change columns; a metric that cannot
 * be computed for a country (too few readings, zero base) is left empty rather than 0.
 * `isRate` indicators get no % change or CAGR: a percentage of a percentage misleads.
 */
export function buildKeplerDataset(
  countries: Country[],
  observations: Map<string, Observation>,
  history: Map<string, Observation[]> = new Map(),
  isRate = false,
): KeplerDataset {
  const rows: KeplerDataset['rows'] = []
  for (const country of countries) {
    const observation = observations.get(country.code)
    if (!observation || observation.value === null) continue
    if (country.latitude === null || country.longitude === null) continue
    const series = history.get(country.code) ?? []
    const ends = seriesEnds(series)
    const change = absoluteChange(series)
    const percent = isRate ? null : percentChange(series)
    const growth = isRate ? null : cagr(series)
    rows.push([
      country.name,
      country.code,
      country.region,
      country.incomeLevel,
      observation.year,
      observation.value,
      change,
      percent,
      growth,
      volatility(series),
      change === null ? null : Math.abs(change),
      percent === null ? null : Math.abs(percent),
      growth === null ? null : Math.abs(growth),
      ends?.first.year ?? null,
      ends?.last.year ?? null,
      country.latitude,
      country.longitude,
    ])
  }
  return {
    fields: [
      { name: KEPLER_FIELDS.country, type: 'string' },
      { name: KEPLER_FIELDS.code, type: 'string' },
      { name: KEPLER_FIELDS.region, type: 'string' },
      { name: KEPLER_FIELDS.income, type: 'string' },
      { name: KEPLER_FIELDS.year, type: 'integer' },
      { name: KEPLER_FIELDS.value, type: 'real' },
      { name: KEPLER_FIELDS.change, type: 'real' },
      { name: KEPLER_FIELDS.percent, type: 'real' },
      { name: KEPLER_FIELDS.cagr, type: 'real' },
      { name: KEPLER_FIELDS.volatility, type: 'real' },
      { name: KEPLER_FIELDS.sizeChange, type: 'real' },
      { name: KEPLER_FIELDS.sizePercent, type: 'real' },
      { name: KEPLER_FIELDS.sizeCagr, type: 'real' },
      { name: KEPLER_FIELDS.fromYear, type: 'integer' },
      { name: KEPLER_FIELDS.toYear, type: 'integer' },
      { name: KEPLER_FIELDS.latitude, type: 'real' },
      { name: KEPLER_FIELDS.longitude, type: 'real' },
    ],
    rows,
  }
}

/** Largest absolute value in a numeric column, or 0 when it has none. */
export function columnExtent(dataset: KeplerDataset, field: string): number {
  const index = dataset.fields.findIndex((f) => f.name === field)
  if (index < 0) return 0
  let max = 0
  for (const row of dataset.rows) {
    const cell = row[index]
    if (typeof cell === 'number' && Number.isFinite(cell)) max = Math.max(max, Math.abs(cell))
  }
  return max
}

/** Groups yearly readings by ISO3 code, keeping only real countries (aggregates are dropped). */
export function groupHistory(
  observations: readonly Observation[],
  countries: readonly Country[],
): Map<string, Observation[]> {
  const known = new Set(countries.map((c) => c.code))
  const byCode = new Map<string, Observation[]>()
  for (const o of observations) {
    if (!known.has(o.countryCode)) continue
    const list = byCode.get(o.countryCode)
    if (list) list.push(o)
    else byCode.set(o.countryCode, [o])
  }
  return byCode
}
