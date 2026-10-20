import { numericToAlpha3 } from 'i18n-iso-countries'

/**
 * Converts a map feature id to the ISO3 code the World Bank uses.
 * The `world-atlas` map identifies countries by ISO 3166-1 *numeric* code
 * (e.g. "524"), while the API uses alpha-3 (e.g. "NPL"), so this is the join key.
 * Returns undefined for features with no id or no match (e.g. Kosovo, which has
 * no numeric id in the atlas); those render as "no data".
 */
export function featureIdToIso3(id: string | number | undefined): string | undefined {
  if (id === undefined || id === null) return undefined
  return numericToAlpha3(String(id))
}
