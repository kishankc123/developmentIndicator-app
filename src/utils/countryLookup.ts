import type { Country } from '../types/worldBank'

/**
 * Finds a country from free text such as "Nepal", "nepal", "NPL" or "united sta".
 * Order: exact ISO3 code, exact name, then a name containing the text, but only when
 * that is unambiguous (the chat model may pass partial names; a wrong guess would
 * silently compare the wrong country).
 */
export function findCountry(query: string, countries: Country[]): Country | undefined {
  const text = query.trim().toLowerCase()
  if (!text) return undefined
  const byCode = countries.find((c) => c.code.toLowerCase() === text)
  if (byCode) return byCode
  const byName = countries.find((c) => c.name.toLowerCase() === text)
  if (byName) return byName
  const partial = countries.filter((c) => c.name.toLowerCase().includes(text))
  return partial.length === 1 ? partial[0] : undefined
}
