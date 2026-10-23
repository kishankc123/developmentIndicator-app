import type { ValueFormat } from '../utils/format'

/** Dashboard topic an indicator belongs to. */
export type Topic = 'economy' | 'prosperity' | 'people'

/** Order the themes are shown in (tabs, default theme = first). */
export const TOPIC_ORDER: Topic[] = ['economy', 'prosperity', 'people']

/** Display name for each topic. */
export const TOPIC_LABELS: Record<Topic, string> = {
  economy: 'Economy',
  prosperity: 'Prosperity',
  people: 'People & quality of life',
}

/** An indicator the dashboard can show. */
export interface IndicatorDefinition {
  /** World Bank indicator code; each was checked against the live API. */
  id: string
  label: string
  topic: Topic
  format: ValueFormat
  /**
   * `level` is an amount (GDP, population); `rate` is already a percentage or index
   * (growth, inflation). A % change of a rate is misleading, so rates only get absolute change.
   */
  kind: 'level' | 'rate'
  /** One-line plain-language explanation shown under the map. */
  description: string
}

/** Indicators shown on the dashboard, in display order. */
export const INDICATORS: IndicatorDefinition[] = [
  {
    id: 'NY.GDP.PCAP.CD',
    label: 'GDP per capita',
    topic: 'economy',
    format: 'usd',
    kind: 'level',
    description: 'Economic output per person, in current US dollars.',
  },
  {
    id: 'NY.GDP.MKTP.KD.ZG',
    label: 'GDP growth',
    topic: 'economy',
    format: 'percent',
    kind: 'rate',
    description: 'Annual change in real GDP.',
  },
  {
    id: 'FP.CPI.TOTL.ZG',
    label: 'Inflation',
    topic: 'economy',
    format: 'percent',
    kind: 'rate',
    description: 'Annual change in consumer prices.',
  },
  {
    id: 'SL.UEM.TOTL.ZS',
    label: 'Unemployment',
    topic: 'economy',
    format: 'percent',
    kind: 'rate',
    description: 'Share of the labour force without work (modelled ILO estimate).',
  },
  {
    id: 'NY.GNP.PCAP.CD',
    label: 'GNI per capita',
    topic: 'prosperity',
    format: 'usd',
    kind: 'level',
    description: 'Gross national income per person, Atlas method, current US dollars.',
  },
  {
    id: 'SI.POV.GINI',
    label: 'Income inequality (Gini)',
    topic: 'prosperity',
    format: 'index',
    kind: 'rate',
    description: 'Gini index: 0 is perfect equality, 100 is maximum inequality. Sparse coverage.',
  },
  {
    id: 'SP.DYN.LE00.IN',
    label: 'Life expectancy',
    topic: 'people',
    format: 'years',
    kind: 'level',
    description: 'Years a newborn would live if current mortality patterns stayed the same.',
  },
  {
    id: 'SP.POP.TOTL',
    label: 'Population',
    topic: 'people',
    format: 'count',
    kind: 'level',
    description: 'Total number of people living in the country.',
  },
  {
    id: 'IT.NET.USER.ZS',
    label: 'Internet use',
    topic: 'people',
    format: 'percent',
    kind: 'rate',
    description: 'Share of the population that used the internet in the last three months.',
  },
]

/** Indicators that belong to a theme, in display order. */
export function indicatorsForTopic(topic: Topic): IndicatorDefinition[] {
  return INDICATORS.filter((indicator) => indicator.topic === topic)
}

/** The indicator shown when a theme is first selected. */
export function firstIndicatorOf(topic: Topic): IndicatorDefinition {
  const [first] = indicatorsForTopic(topic)
  if (!first) throw new Error(`Theme "${topic}" has no indicators`)
  return first
}
