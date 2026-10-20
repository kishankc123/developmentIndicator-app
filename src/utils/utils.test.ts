import { describe, expect, it } from 'vitest'
import type { Observation } from '../types/worldBank'
import { toChartRows } from './chartRows'
import { buildColorScale } from './colorScale'
import { mapboxToWorldBankCode, worldBankToMapboxCode } from './countryCode'
import { findCountry } from './countryLookup'
import { buildKeplerDataset } from './keplerData'
import { buildFillColorExpression, buildSelectedFilter } from './mapExpressions'
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

describe('country code translation', () => {
  it('passes ordinary codes through unchanged', () => {
    expect(worldBankToMapboxCode('NPL')).toBe('NPL')
    expect(mapboxToWorldBankCode('USA')).toBe('USA')
  })
  it('translates Kosovo between World Bank (XKX) and Mapbox (XKS)', () => {
    expect(worldBankToMapboxCode('XKX')).toBe('XKS')
    expect(mapboxToWorldBankCode('XKS')).toBe('XKX')
  })
  it('returns undefined for features without a code', () => {
    expect(mapboxToWorldBankCode(undefined)).toBeUndefined()
    expect(mapboxToWorldBankCode('')).toBeUndefined()
  })
})

describe('map expressions', () => {
  const scale = buildColorScale([1, 2, 3, 4], ['low', 'high'])
  it('groups countries by colour in a match expression with a no-data fallback', () => {
    const map = new Map([
      ['AAA', obs('AAA', 2020, 1)],
      ['BBB', obs('BBB', 2020, 2)],
      ['XKX', obs('XKX', 2020, 4)],
    ])
    const expression = buildFillColorExpression(map, scale, 'grey') as unknown[]
    expect(expression[0]).toBe('match')
    expect(expression).toContainEqual(['AAA', 'BBB'])
    expect(expression).toContainEqual(['XKS'])
    expect(expression[expression.length - 1]).toBe('grey')
  })
  it('falls back to a plain colour when there is no data', () => {
    expect(buildFillColorExpression(new Map(), null, 'grey')).toBe('grey')
  })
  it('wraps selected codes in a literal and translates them', () => {
    expect(buildSelectedFilter(['USA', 'XKX'])).toEqual([
      'in',
      ['get', 'iso_3166_1_alpha_3'],
      ['literal', ['USA', 'XKS']],
    ])
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

describe('buildKeplerDataset', () => {
  const country = (code: string, latitude: number | null, longitude: number | null) => ({
    code,
    name: code,
    region: 'R',
    incomeLevel: 'I',
    latitude,
    longitude,
  })
  it('keeps only countries that have both a value and a location', () => {
    const observations = new Map([
      ['AAA', obs('AAA', 2020, 5)],
      ['BBB', obs('BBB', 2020, 6)],
      ['CCC', obs('CCC', 2020, null)],
    ])
    const { rows, fields } = buildKeplerDataset(
      [country('AAA', 1, 2), country('BBB', null, null), country('CCC', 3, 4), country('DDD', 5, 6)],
      observations,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual(['AAA', 'AAA', 'R', 'I', 2020, 5, 1, 2])
    expect(rows[0]).toHaveLength(fields.length)
  })
})

describe('findCountry', () => {
  const countries = [
    { code: 'NPL', name: 'Nepal', region: 'R', incomeLevel: 'I', latitude: null, longitude: null },
    { code: 'USA', name: 'United States', region: 'R', incomeLevel: 'I', latitude: null, longitude: null },
    { code: 'ARE', name: 'United Arab Emirates', region: 'R', incomeLevel: 'I', latitude: null, longitude: null },
  ]
  it('matches ISO3 code and exact name ignoring case', () => {
    expect(findCountry('npl', countries)?.code).toBe('NPL')
    expect(findCountry('  Nepal ', countries)?.code).toBe('NPL')
  })
  it('matches a unique partial name', () => {
    expect(findCountry('states', countries)?.code).toBe('USA')
  })
  it('refuses ambiguous or unknown text instead of guessing', () => {
    expect(findCountry('united', countries)).toBeUndefined()
    expect(findCountry('atlantis', countries)).toBeUndefined()
    expect(findCountry('', countries)).toBeUndefined()
  })
})
