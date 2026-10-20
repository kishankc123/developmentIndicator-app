/**
 * Mapbox and the World Bank both use ISO 3166-1 alpha-3 codes, so the join is
 * direct except for Kosovo: Mapbox uses "XKS" (per its docs) while the World
 * Bank API uses "XKX". These helpers translate at the boundary so the rest of
 * the app only ever sees World Bank codes.
 */
const WORLD_BANK_TO_MAPBOX: Record<string, string> = { XKX: 'XKS' }
const MAPBOX_TO_WORLD_BANK: Record<string, string> = { XKS: 'XKX' }

/** Converts a World Bank country code to the code Mapbox's tileset uses. */
export function worldBankToMapboxCode(code: string): string {
  return WORLD_BANK_TO_MAPBOX[code] ?? code
}

/**
 * Converts a Mapbox tileset code to a World Bank code.
 * Returns undefined when the tile feature has no code (disputed areas).
 */
export function mapboxToWorldBankCode(code: unknown): string | undefined {
  if (typeof code !== 'string' || code === '') return undefined
  return MAPBOX_TO_WORLD_BANK[code] ?? code
}
