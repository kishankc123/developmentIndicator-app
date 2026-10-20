import { fetchLatestByCountry } from '../api/worldBank'
import type { Observation } from '../types/worldBank'
import { useAsyncData, type AsyncState } from './useAsyncData'

/**
 * Loads the latest value of one indicator for every economy.
 * Contains aggregates too; the caller filters against the country list.
 */
export function useIndicator(indicatorId: string): AsyncState<Observation[]> {
  return useAsyncData(`latest:${indicatorId}`, (signal) =>
    fetchLatestByCountry(indicatorId, signal),
  )
}
