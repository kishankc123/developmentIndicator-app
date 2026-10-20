import type { Country, Observation } from '../types/worldBank'

/** Kepler dataset id; the layer config below refers to it. */
export const KEPLER_DATASET_ID = 'countries'

/** Column names as shown in Kepler's tooltip and filter UI. */
export const KEPLER_FIELDS = {
  country: 'Country',
  code: 'ISO3',
  region: 'Region',
  income: 'Income level',
  year: 'Year',
  value: 'Value',
  latitude: 'latitude',
  longitude: 'longitude',
} as const

/** Kepler's table input: typed columns plus one array of cells per row. */
export interface KeplerDataset {
  fields: { name: string; type: 'string' | 'integer' | 'real' }[]
  rows: (string | number)[][]
}

/**
 * Builds the table Kepler plots: one row per country that has both a value and a
 * capital-city location. Countries missing either are left out, since Kepler
 * cannot place them (and a missing coordinate must not become 0,0).
 */
export function buildKeplerDataset(
  countries: Country[],
  observations: Map<string, Observation>,
): KeplerDataset {
  const rows: KeplerDataset['rows'] = []
  for (const country of countries) {
    const observation = observations.get(country.code)
    if (!observation || observation.value === null) continue
    if (country.latitude === null || country.longitude === null) continue
    rows.push([
      country.name,
      country.code,
      country.region,
      country.incomeLevel,
      observation.year,
      observation.value,
      country.latitude,
      country.longitude,
    ])
  }
  return {
    fields: [
      { name: KEPLER_FIELDS.country, type: 'string' },
      { name: KEPLER_FIELDS.code, type: 'string' },
      { name: KEPLER_FIELDS.region, type: 'string' },
      { name: KEPLER_FIELDS.income, type: 'string' },
      { name: KEPLER_FIELDS.year, type: 'integer' },
      { name: KEPLER_FIELDS.value, type: 'real' },
      { name: KEPLER_FIELDS.latitude, type: 'real' },
      { name: KEPLER_FIELDS.longitude, type: 'real' },
    ],
    rows,
  }
}
