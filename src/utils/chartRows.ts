import type { Observation } from '../types/worldBank'

/** One chart row: a year plus a value per country code (null = no data that year). */
export type ChartRow = { year: number } & Record<string, number | null>

/**
 * Pivots long-format observations into one row per year for the line chart.
 * Years where a country has no value stay `null` so the line shows a gap
 * instead of silently interpolating or plotting zero.
 */
export function toChartRows(observations: Observation[], codes: string[]): ChartRow[] {
  const byYear = new Map<number, ChartRow>()
  for (const o of observations) {
    if (!codes.includes(o.countryCode)) continue
    let row = byYear.get(o.year)
    if (!row) {
      row = { year: o.year, ...Object.fromEntries(codes.map((c) => [c, null])) } as ChartRow
      byYear.set(o.year, row)
    }
    row[o.countryCode] = o.value
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
}
