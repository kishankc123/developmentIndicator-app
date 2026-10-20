import type { Observation } from '../types/worldBank'

/** Summary of one indicator across countries. */
export interface IndicatorSummary {
  highest: Observation
  lowest: Observation
  median: number
  count: number
}

/** Computes highest, lowest and median over observations with a value; null if none. */
export function summarize(observations: Observation[]): IndicatorSummary | null {
  const withValue = observations.filter(
    (o): o is Observation & { value: number } => o.value !== null,
  )
  if (withValue.length === 0) return null
  const sorted = [...withValue].sort((a, b) => a.value - b.value)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1].value + sorted[mid].value) / 2 : sorted[mid].value
  return { highest: sorted[sorted.length - 1], lowest: sorted[0], median, count: sorted.length }
}
