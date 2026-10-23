// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  INDICATORS,
  TOPIC_LABELS,
  TOPIC_ORDER,
  firstIndicatorOf,
  indicatorsForTopic,
} from './indicators'
import { THEME_PALETTES } from './theme'

describe('topics', () => {
  it('lists three themes in display order, each with a label', () => {
    expect(TOPIC_ORDER).toEqual(['economy', 'prosperity', 'people'])
    expect(Object.keys(TOPIC_LABELS).sort()).toEqual([...TOPIC_ORDER].sort())
  })

  it('puts every indicator under a known theme, and every theme has indicators', () => {
    for (const indicator of INDICATORS) expect(TOPIC_ORDER).toContain(indicator.topic)
    for (const topic of TOPIC_ORDER) expect(indicatorsForTopic(topic).length).toBeGreaterThan(0)
  })

  it('has no duplicate indicator ids', () => {
    const ids = INDICATORS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns the indicators of a theme in config order', () => {
    expect(indicatorsForTopic('people').map((i) => i.label)).toEqual([
      'Life expectancy',
      'Population',
      'Internet use',
    ])
  })

  it('picks the first indicator of a theme as its default', () => {
    expect(firstIndicatorOf('economy').id).toBe('NY.GDP.PCAP.CD')
    expect(firstIndicatorOf('prosperity').id).toBe('NY.GNP.PCAP.CD')
    expect(firstIndicatorOf('people').id).toBe('SP.DYN.LE00.IN')
  })

  it('defines internet use as a percentage of the population', () => {
    const internet = INDICATORS.find((i) => i.id === 'IT.NET.USER.ZS')
    expect(internet).toMatchObject({ label: 'Internet use', topic: 'people', format: 'percent' })
  })
})

describe('theme colours', () => {
  it('gives every theme a 7-step hex palette', () => {
    for (const topic of TOPIC_ORDER) {
      expect(THEME_PALETTES[topic]).toHaveLength(7)
      for (const colour of THEME_PALETTES[topic]) expect(colour).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('uses a different palette for each theme', () => {
    const joined = TOPIC_ORDER.map((topic) => THEME_PALETTES[topic].join())
    expect(new Set(joined).size).toBe(TOPIC_ORDER.length)
  })

  it('has an accent colour rule in themes.css for every theme, in light and dark', () => {
    const css = readFileSync(new URL('../styles/themes.css', import.meta.url), 'utf8')
    for (const topic of TOPIC_ORDER) {
      const rule = new RegExp(`\\[data-topic='${topic}'\\]`, 'g')
      // One rule for light mode and one inside the dark-mode media query.
      expect(css.match(rule)?.length).toBeGreaterThanOrEqual(2)
    }
  })
})
