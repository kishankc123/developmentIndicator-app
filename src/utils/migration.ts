import type { Country } from '../types/worldBank'
import type { KeplerDataset } from './keplerData'

/** Where people born in one country live abroad, as shipped in `public/data/migrant-stock.json`. */
export interface MigrantStock {
  /** Mid-year the counts are for, oldest first; every count array follows this order. */
  years: number[]
  /** By origin ISO3 code. */
  origins: Record<string, OriginStock>
}

export interface OriginStock {
  /** All people born in this country who live abroad, per year (null when unreported). */
  total: (number | null)[]
  /** The largest destinations, biggest first: [destination ISO3, count per year]. */
  to: [string, (number | null)[]][]
}

/** Column names as shown in Kepler's tooltip. */
export const FLOW_FIELDS = {
  from: 'Born in',
  to: 'Living in',
  people: 'People',
  share: 'Share of emigrants %',
  year: 'Year',
  fromLat: 'from_lat',
  fromLng: 'from_lng',
  toLat: 'to_lat',
  toLng: 'to_lng',
} as const

/** Kepler dataset id of the arcs. */
export const FLOWS_DATASET_ID = 'flows'

/** What the caption says about the chosen origin and year. */
export interface FlowsSummary {
  /** People born in the origin who live abroad (all destinations). */
  total: number | null
  /** Share of them living in the plotted destinations, 0 to 100; null when unknown. */
  shownShare: number | null
  /** Destinations that have a count and a map position. */
  arcs: number
}

/** Countries that have flow data, for the picker, in name order. */
export function originsWithData(stock: MigrantStock, countries: readonly Country[]): Country[] {
  return countries.filter((c) => stock.origins[c.code]).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Builds the arcs from one origin country to its main destinations for one year. Both ends need
 * a capital-city position (a missing one must not become 0,0) and a count above 0.
 * Returns null when the origin is unknown, so the caller can tell "no data" from "no arcs".
 */
export function buildFlowsDataset(
  stock: MigrantStock,
  originCode: string,
  yearIndex: number,
  countries: readonly Country[],
): { dataset: KeplerDataset; summary: FlowsSummary } | null {
  const origin = stock.origins[originCode]
  const from = countries.find((c) => c.code === originCode)
  if (!origin || !from) return null

  const byCode = new Map(countries.map((c) => [c.code, c]))
  const total = origin.total[yearIndex] ?? null
  const year = stock.years[yearIndex]
  const rows: KeplerDataset['rows'] = []
  let shown = 0

  for (const [destCode, counts] of origin.to) {
    const people = counts[yearIndex]
    const dest = byCode.get(destCode)
    if (!people || people <= 0 || !dest) continue
    if (from.latitude === null || from.longitude === null) continue
    if (dest.latitude === null || dest.longitude === null) continue
    shown += people
    rows.push([
      from.name,
      dest.name,
      people,
      total ? (people / total) * 100 : null,
      year,
      from.latitude,
      from.longitude,
      dest.latitude,
      dest.longitude,
    ])
  }

  return {
    dataset: {
      fields: [
        { name: FLOW_FIELDS.from, type: 'string' },
        { name: FLOW_FIELDS.to, type: 'string' },
        { name: FLOW_FIELDS.people, type: 'integer' },
        { name: FLOW_FIELDS.share, type: 'real' },
        { name: FLOW_FIELDS.year, type: 'integer' },
        { name: FLOW_FIELDS.fromLat, type: 'real' },
        { name: FLOW_FIELDS.fromLng, type: 'real' },
        { name: FLOW_FIELDS.toLat, type: 'real' },
        { name: FLOW_FIELDS.toLng, type: 'real' },
      ],
      rows,
    },
    summary: { total, shownShare: total ? (shown / total) * 100 : null, arcs: rows.length },
  }
}
