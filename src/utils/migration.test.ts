import { describe, expect, it } from 'vitest'
import type { Country } from '../types/worldBank'
import { buildFlowsDataset, originsWithData, type MigrantStock } from './migration'

const country = (code: string, latitude: number | null, longitude: number | null): Country => ({
  code,
  name: `Country ${code}`,
  region: 'R',
  incomeLevel: 'I',
  latitude,
  longitude,
})

const stock: MigrantStock = {
  years: [2000, 2024],
  origins: {
    AAA: {
      total: [100, 1000],
      to: [
        ['BBB', [60, 600]],
        ['CCC', [20, 300]],
        ['DDD', [10, null]],
        ['EEE', [5, 50]],
      ],
    },
  },
}
const countries = [country('AAA', 1, 2), country('BBB', 3, 4), country('CCC', null, null), country('DDD', 5, 6)]

describe('buildFlowsDataset', () => {
  const result = buildFlowsDataset(stock, 'AAA', 1, countries)!

  it('draws one arc per destination that has a count and a position', () => {
    // CCC has no position, DDD no 2024 count, EEE is not in the country list.
    expect(result.dataset.rows).toHaveLength(1)
    expect(result.dataset.rows[0]).toEqual(['Country AAA', 'Country BBB', 600, 60, 2024, 1, 2, 3, 4])
    expect(result.dataset.rows[0]).toHaveLength(result.dataset.fields.length)
  })

  it('reports the total and the share the arcs account for', () => {
    expect(result.summary).toEqual({ total: 1000, shownShare: 60, arcs: 1 })
  })

  it('uses the chosen year', () => {
    const early = buildFlowsDataset(stock, 'AAA', 0, countries)!
    expect(early.dataset.rows.map((r) => r[2])).toEqual([60, 10])
    expect(early.summary.total).toBe(100)
  })

  it('is null for an origin without data or without a country entry', () => {
    expect(buildFlowsDataset(stock, 'ZZZ', 1, countries)).toBeNull()
    expect(buildFlowsDataset(stock, 'AAA', 1, [country('BBB', 3, 4)])).toBeNull()
  })

  it('draws no arcs (not 0,0 arcs) when the origin has no position', () => {
    const noPosition = [country('AAA', null, null), country('BBB', 3, 4)]
    expect(buildFlowsDataset(stock, 'AAA', 1, noPosition)!.dataset.rows).toHaveLength(0)
  })
})

describe('originsWithData', () => {
  it('lists only countries with flow data, by name', () => {
    expect(originsWithData(stock, countries).map((c) => c.code)).toEqual(['AAA'])
  })
})
