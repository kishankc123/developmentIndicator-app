import { fetchSeries } from '../api/worldBank'
import { TREND_YEARS } from '../config/theme'
import type { Observation } from '../types/worldBank'
import { useAsyncData, type AsyncState } from './useAsyncData'

/** Loads the last `TREND_YEARS` years of one indicator for the given country codes. */
export function useTrend(indicatorId: string, countryCodes: string[]): AsyncState<Observation[]> {
  // Sorted so selecting the same countries in a different order reuses the key.
  const key = `trend:${indicatorId}:${[...countryCodes].sort().join(',')}`
  return useAsyncData(key, (signal) => {
    const toYear = new Date().getFullYear()
    return fetchSeries(indicatorId, countryCodes, toYear - TREND_YEARS, toYear, signal)
  })
}
