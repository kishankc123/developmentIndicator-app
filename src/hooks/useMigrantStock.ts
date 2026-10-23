import type { MigrantStock } from '../utils/migration'
import { useAsyncData, type AsyncState } from './useAsyncData'

/**
 * Loads the migrant-stock file (about 170 KB, built by `scripts/build_migrant_stock.py`) once
 * `enabled` is true, so the page does not fetch it until the "where people live abroad" view
 * is opened. While disabled the data is null.
 */
export function useMigrantStock(enabled: boolean): AsyncState<MigrantStock | null> {
  return useAsyncData(enabled ? 'migrant-stock' : 'migrant-stock:off', async (signal) => {
    if (!enabled) return null
    const response = await fetch(`${import.meta.env.BASE_URL}data/migrant-stock.json`, { signal })
    if (!response.ok) throw new Error(`Migration data request failed (${response.status})`)
    return (await response.json()) as MigrantStock
  })
}
