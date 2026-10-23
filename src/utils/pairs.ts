import type { Country, Observation } from '../types/worldBank'
import { toCountryObservations } from './chartData'

/** One country with both values of a comparison. */
export interface PairPoint {
  /** ISO3 code; the join key to the map. */
  code: string
  name: string
  /** Driver value (spending or income). Always above 0 so it can sit on a log axis. */
  x: number
  /** Outcome value. */
  y: number
}

/** A point plus how far it sits from the trend line. */
export interface ResidualPoint extends PairPoint {
  /** Outcome the trend line predicts for this driver value. */
  expected: number
  /** `y - expected`: positive means the country does better than its driver predicts. */
  residual: number
}

/** Least-squares line `y = intercept + slope * log10(x)`. */
export interface TrendFit {
  slope: number
  intercept: number
  /** Share of the outcome's variation the line explains, 0 to 1. */
  r2: number
}

/**
 * Joins two indicators on country code. Only real countries (no aggregates) with a value on
 * both sides are kept, and a driver of 0 or less is dropped because a log axis cannot show it.
 * Sorted by name so the result is stable for the country picker.
 */
export function joinPairs(
  drivers: readonly Observation[],
  outcomes: readonly Observation[],
  countries: readonly Country[],
): PairPoint[] {
  const driverByCode = toCountryObservations(drivers, countries)
  const outcomeByCode = toCountryObservations(outcomes, countries)
  const points: PairPoint[] = []
  for (const [code, driver] of driverByCode) {
    const outcome = outcomeByCode.get(code)
    if (!outcome || driver.value === null || outcome.value === null || driver.value <= 0) continue
    points.push({ code, name: driver.countryName, x: driver.value, y: outcome.value })
  }
  return points.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Fits the outcome against the log of the driver. Log because spending and income are heavily
 * skewed: each doubling tends to add a similar amount to the outcome, not each extra dollar.
 * Returns null with fewer than 3 points or no spread in the driver (no line to draw).
 */
export function fitTrend(points: readonly PairPoint[]): TrendFit | null {
  const n = points.length
  if (n < 3) return null
  const xs = points.map((p) => Math.log10(p.x))
  const ys = points.map((p) => p.y)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - meanX) ** 2
    sxy += (xs[i] - meanX) * (ys[i] - meanY)
    syy += (ys[i] - meanY) ** 2
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const intercept = meanY - slope * meanX
  return { slope, intercept, r2: syy === 0 ? 0 : (sxy * sxy) / (sxx * syy) }
}

/** Outcome the trend line predicts at a driver value. */
export function predict(fit: TrendFit, x: number): number {
  return fit.intercept + fit.slope * Math.log10(x)
}

/** Adds each point's expected outcome and residual. */
export function withResiduals(points: readonly PairPoint[], fit: TrendFit): ResidualPoint[] {
  return points.map((p) => {
    const expected = predict(fit, p.x)
    return { ...p, expected, residual: p.y - expected }
  })
}

/** The countries furthest above and below the trend line. */
export function extremes(
  points: readonly ResidualPoint[],
  count: number,
): { above: ResidualPoint[]; below: ResidualPoint[] } {
  const sorted = [...points].sort((a, b) => b.residual - a.residual)
  return { above: sorted.slice(0, count), below: sorted.slice(-count).reverse() }
}
