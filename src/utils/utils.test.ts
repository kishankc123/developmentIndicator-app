import { describe, expect, it } from 'vitest'
import type { Observation } from '../types/worldBank'
import { toChartRows } from './chartRows'
import { buildColorScale } from './colorScale'
import { featureIdToIso3 } from './countryCode'
import { formatValue } from './format'
import { summarize } from './stats'

/** Builds an observation with sensible defaults for tests. */
const obs = (countryCode: string, year: number, value: number | null): Observation => ({
  countryCode,
  countryName: countryCode,
  year,
  value,
})

describe('formatValue', () => {
  it('formats each kind of indicator', () => {
    expect(formatValue(1234.5, 'usd')).toBe('$1,235')
    expect(formatValue(12000, 'usd', true)).toBe('$12K')
    expect(formatValue(2.345, 'percent')).toBe('2.3%')
    expect(formatValue(30, 'index')).toBe('30.0')
  })
})

describe('featureIdToIso3', () => {
  it('maps ISO numeric ids from the map to World Bank ISO3 codes', () => {
    expect(featureIdToIso3('524')).toBe('NPL')
    expect(featureIdToIso3(840)).toBe('USA')
  })
  it('returns undefined when there is no id or no match', () => {
    expect(featureIdToIso3(undefined)).toBeUndefined()
    expect(featureIdToIso3('000')).toBeUndefined()
  })
})

describe('summarize', () => {
  it('finds highest, lowest and median, ignoring nulls', () => {
    const result = summarize([obs('A', 2020, 1), obs('B', 2020, 5), obs('C', 2020, 3), obs('D', 2020, null)])
    expect(result?.highest.countryCode).toBe('B')
    expect(result?.lowest.countryCode).toBe('A')
    expect(result?.median).toBe(3)
    expect(result?.count).toBe(3)
  })
  it('averages the middle pair for an even count', () => {
    expect(summarize([obs('A', 2020, 1), obs('B', 2020, 3)])?.median).toBe(2)
  })
  it('returns null with no values', () => {
    expect(summarize([obs('A', 2020, null)])).toBeNull()
  })
})

describe('buildColorScale', () => {
  it('returns null for no values', () => {
    expect(buildColorScale([], ['#000'])).toBeNull()
  })
  it('assigns low and high values to the first and last colours', () => {
    const scale = buildColorScale([1, 2, 3, 4, 5, 6], ['low', 'mid', 'high'])
    expect(scale?.colorFor(1)).toBe('low')
    expect(scale?.colorFor(6)).toBe('high')
    expect(scale?.bins).toHaveLength(3)
    expect(scale?.bins[0].from).toBe(1)
    expect(scale?.bins[2].to).toBe(6)
  })
})

describe('toChartRows', () => {
  it('pivots by year and keeps gaps as null', () => {
    const rows = toChartRows(
      [obs('A', 2021, 2), obs('A', 2020, 1), obs('B', 2021, 9), obs('Z', 2021, 7)],
      ['A', 'B'],
    )
    expect(rows).toEqual([
      { year: 2020, A: 1, B: null },
      { year: 2021, A: 2, B: 9 },
    ])
  })
})
