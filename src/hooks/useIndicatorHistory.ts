import { fetchHistoryAll } from '../api/worldBank'
import type { Observation } from '../types/worldBank'
import { useAsyncData, type AsyncState } from './useAsyncData'

/**
 * Loads the last `years` years of one indicator for every economy (aggregates included;
 * the caller filters against the country list).
 */
export function useIndicatorHistory(indicatorId: string, years: number): AsyncState<Observation[]> {
  return useAsyncData(`history:${indicatorId}:${years}`, (signal) => {
    const toYear = new Date().getFullYear()
    return fetchHistoryAll(indicatorId, toYear - years, toYear, signal)
  })
}
