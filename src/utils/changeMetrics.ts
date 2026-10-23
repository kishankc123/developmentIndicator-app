/** One yearly reading; `value` is null when the World Bank has no data for that year. */
export interface SeriesPoint {
  year: number
  value: number | null
}

/** First and last usable readings of a series. */
export interface SeriesEnds {
  first: { year: number; value: number }
  last: { year: number; value: number }
}

/** Keeps readings with a value, oldest first. */
function usable(points: readonly SeriesPoint[]): { year: number; value: number }[] {
  return points
    .filter((p): p is { year: number; value: number } => p.value !== null && Number.isFinite(p.value))
    .sort((a, b) => a.year - b.year)
}

/**
 * Earliest and latest non-empty readings, or null with fewer than two distinct years.
 * Countries report different years, so the ends are per country rather than fixed years.
 */
export function seriesEnds(points: readonly SeriesPoint[]): SeriesEnds | null {
  const data = usable(points)
  if (data.length < 2) return null
  return { first: data[0], last: data[data.length - 1] }
}

/** Last minus first value (percentage points for rate indicators). Null without two readings. */
export function absoluteChange(points: readonly SeriesPoint[]): number | null {
  const ends = seriesEnds(points)
  return ends ? ends.last.value - ends.first.value : null
}

/**
 * Change as a percentage of the starting value. Null when the start is 0 or negative: the
 * ratio is undefined or flips sign, which would draw a misleading colour.
 */
export function percentChange(points: readonly SeriesPoint[]): number | null {
  const ends = seriesEnds(points)
  if (!ends || ends.first.value <= 0) return null
  return ((ends.last.value - ends.first.value) / ends.first.value) * 100
}

/**
 * Compound annual growth rate in percent per year between the first and last reading.
 * Null when either end is 0 or negative (a root of a negative ratio is undefined).
 */
export function cagr(points: readonly SeriesPoint[]): number | null {
  const ends = seriesEnds(points)
  if (!ends || ends.first.value <= 0 || ends.last.value <= 0) return null
  const years = ends.last.year - ends.first.year
  return ((ends.last.value / ends.first.value) ** (1 / years) - 1) * 100
}

/**
 * Standard deviation of year-on-year changes, in the indicator's own unit. Only consecutive
 * years count, so a gap in the data does not inflate the figure. Needs 3 readings (2 changes).
 */
export function volatility(points: readonly SeriesPoint[]): number | null {
  const data = usable(points)
  const changes: number[] = []
  for (let i = 1; i < data.length; i++) {
    if (data[i].year - data[i - 1].year === 1) changes.push(data[i].value - data[i - 1].value)
  }
  if (changes.length < 2) return null
  const mean = changes.reduce((sum, c) => sum + c, 0) / changes.length
  const variance = changes.reduce((sum, c) => sum + (c - mean) ** 2, 0) / (changes.length - 1)
  return Math.sqrt(variance)
}
