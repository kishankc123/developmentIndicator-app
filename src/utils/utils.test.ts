import { describe, expect, it } from 'vitest'
import type { Observation } from '../types/worldBank'
import { toChartRows } from './chartRows'
import { buildColorScale } from './colorScale'
import { mapboxToWorldBankCode, worldBankToMapboxCode } from './countryCode'
import { hexToRgb } from './color'
import { CHAT_STORAGE_KEY, loadHistory, saveHistory, trimHistory } from './chatHistory'
import { buildBarRows, parseToolResult, toCountryObservations } from './chartData'
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
    expect(formatValue(72.235, 'years')).toBe('72.2 years')
    expect(formatValue(72.235, 'years', true)).toBe('72.2')
    expect(formatValue(1463865525, 'count')).toBe('1.46B')
    expect(formatValue(29618118, 'count', true)).toBe('29.6M')
    expect(formatValue(980, 'count')).toBe('980')
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

describe('buildBarRows', () => {
  const countries = ['AAA', 'BBB', 'CCC', 'DDD'].map((code) => ({
    code,
    name: `Country ${code}`,
    region: 'R',
    incomeLevel: 'I',
    latitude: null,
    longitude: null,
  }))
  const observations = new Map([
    ['AAA', obs('AAA', 2020, 10)],
    ['BBB', obs('BBB', 2021, 30)],
    ['CCC', obs('CCC', 2022, 20)],
    ['DDD', obs('DDD', 2022, null)],
  ])

  it('ranks the highest values first by default and skips countries without data', () => {
    const { rows } = buildBarRows(observations, countries, { top: 2 })
    expect(rows.map((r) => r.code)).toEqual(['BBB', 'CCC'])
  })
  it('ranks the lowest values but still displays highest first', () => {
    const { rows } = buildBarRows(observations, countries, { top: 2, order: 'lowest' })
    expect(rows.map((r) => r.code)).toEqual(['CCC', 'AAA'])
  })
  it('takes named countries from the dashboard data and reports the ones it cannot chart', () => {
    const { rows, unresolved } = buildBarRows(observations, countries, {
      names: ['Country AAA', 'bbb', 'Country DDD', 'Atlantis', 'AAA'],
    })
    expect(rows.map((r) => [r.code, r.value, r.year])).toEqual([
      ['BBB', 30, 2021],
      ['AAA', 10, 2020],
    ])
    expect(unresolved).toEqual(['Country DDD', 'Atlantis'])
  })
  it('clamps the ranking size', () => {
    expect(buildBarRows(observations, countries, { top: 0 }).rows).toHaveLength(1)
    expect(buildBarRows(observations, countries, { top: 99 }).rows).toHaveLength(3)
  })
})

describe('parseToolResult', () => {
  it('parses JSON and returns undefined for missing or malformed input', () => {
    expect(parseToolResult<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
    expect(parseToolResult(undefined)).toBeUndefined()
    expect(parseToolResult('{oops')).toBeUndefined()
  })
})

describe('trimHistory', () => {
  const m = (id: string, role: string) => ({ id, role })

  it('returns everything when under the limit', () => {
    const history = [m('1', 'user'), m('2', 'assistant')]
    expect(trimHistory(history, 10)).toEqual(history)
  })
  it('keeps only the most recent messages', () => {
    const history = [m('1', 'user'), m('2', 'assistant'), m('3', 'user'), m('4', 'assistant')]
    expect(trimHistory(history, 2).map((x) => x.id)).toEqual(['3', '4'])
  })
  it('never starts mid-turn: a cut that lands on a tool result moves on to the next user message', () => {
    const history = [
      m('1', 'user'),
      m('2', 'assistant'), // requested the tool
      m('3', 'tool'), // its result
      m('4', 'assistant'),
      m('5', 'user'),
      m('6', 'assistant'),
    ]
    // Limit 4 would start at the tool result (3); it must skip to the user message (5).
    expect(trimHistory(history, 4).map((x) => x.id)).toEqual(['5', '6'])
  })
  it('returns an empty history when no user message remains in the window', () => {
    expect(trimHistory([m('1', 'user'), m('2', 'assistant'), m('3', 'tool')], 2)).toEqual([])
  })
})

describe('chat history storage', () => {
  const memory = () => {
    const data = new Map<string, string>()
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    }
  }

  it('round-trips messages', () => {
    const storage = memory()
    saveHistory(storage, [{ id: '1', role: 'user', content: 'hi' }])
    expect(loadHistory(storage)).toEqual([{ id: '1', role: 'user', content: 'hi' }])
  })
  it('removes the saved entry when the history is empty', () => {
    const storage = memory()
    saveHistory(storage, [{ id: '1', role: 'user' }])
    saveHistory(storage, [])
    expect(storage.getItem(CHAT_STORAGE_KEY)).toBeNull()
  })
  it('treats malformed or tampered storage as an empty history', () => {
    const storage = memory()
    storage.setItem(CHAT_STORAGE_KEY, '{not json')
    expect(loadHistory(storage)).toEqual([])
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ not: 'an array' }))
    expect(loadHistory(storage)).toEqual([])
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify([{ id: '1', role: 'user' }, 42, { id: 3 }, null]))
    expect(loadHistory(storage)).toEqual([{ id: '1', role: 'user' }])
  })
  it('does not throw when storage is missing or failing', () => {
    expect(loadHistory(undefined)).toEqual([])
    expect(() => saveHistory(undefined, [{ id: '1', role: 'user' }])).not.toThrow()
    const broken = {
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {},
    }
    expect(() => saveHistory(broken, [{ id: '1', role: 'user' }])).not.toThrow()
  })
})

describe('toCountryObservations', () => {
  const country = (code: string) => ({
    code,
    name: code,
    region: 'R',
    incomeLevel: 'I',
    latitude: null,
    longitude: null,
  })
  it('keeps real countries with a value and drops aggregates and empty readings', () => {
    const result = toCountryObservations(
      [obs('AAA', 2020, 1), obs('WLD', 2020, 5), obs('BBB', 2020, null), obs('CCC', 2021, 3)],
      [country('AAA'), country('BBB'), country('CCC')],
    )
    expect([...result.keys()]).toEqual(['AAA', 'CCC'])
  })
})

describe('hexToRgb', () => {
  it('converts a 6-digit hex colour to an [r, g, b] triple', () => {
    expect(hexToRgb('#1b707e')).toEqual([27, 112, 126])
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255])
  })
  it('rejects anything that is not a 6-digit hex colour', () => {
    expect(() => hexToRgb('teal')).toThrow()
    expect(() => hexToRgb('#fff')).toThrow()
  })
})
