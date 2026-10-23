import { fetchIndicatorForYear } from '../api/worldBank'
import type { ComparisonDefinition } from '../config/comparisons'
import type { Observation } from '../types/worldBank'
import { useAsyncData, type AsyncState } from './useAsyncData'

/** Both indicators of a comparison for its year; join them with `joinPairs`. */
export interface PairedObservations {
  drivers: Observation[]
  outcomes: Observation[]
}

/**
 * Loads the two indicators of a comparison in parallel. The state is one unit: it is
 * loading until both have arrived and fails if either fails, so the view never shows a
 * half-loaded pair.
 */
export function usePairedIndicators(
  comparison: ComparisonDefinition,
): AsyncState<PairedObservations> {
  const { driver, outcome, year } = comparison
  return useAsyncData(`pair:${driver.id}:${outcome.id}:${year}`, async (signal) => {
    const [drivers, outcomes] = await Promise.all([
      fetchIndicatorForYear(driver.id, year, signal),
      fetchIndicatorForYear(outcome.id, year, signal),
    ])
    console.log(
      `[compare] loaded ${driver.id} (${drivers.length} rows) and ${outcome.id} (${outcomes.length} rows) for ${year}`,
    )
    return { drivers, outcomes }
  })
}
