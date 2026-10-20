import type { ValueFormat } from '../utils/format'

/** Dashboard topic an indicator belongs to. */
export type Topic = 'economy' | 'prosperity'

/** Display name for each topic. */
export const TOPIC_LABELS: Record<Topic, string> = {
  economy: 'Economy',
  prosperity: 'Prosperity',
}

/** An indicator the dashboard can show. */
export interface IndicatorDefinition {
  /** World Bank indicator code; each was checked against the live API. */
  id: string
  label: string
  topic: Topic
  format: ValueFormat
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
    description: 'Economic output per person, in current US dollars.',
  },
  {
    id: 'NY.GDP.MKTP.KD.ZG',
    label: 'GDP growth',
    topic: 'economy',
    format: 'percent',
    description: 'Annual change in real GDP.',
  },
  {
    id: 'FP.CPI.TOTL.ZG',
    label: 'Inflation',
    topic: 'economy',
    format: 'percent',
    description: 'Annual change in consumer prices.',
  },
  {
    id: 'SL.UEM.TOTL.ZS',
    label: 'Unemployment',
    topic: 'economy',
    format: 'percent',
    description: 'Share of the labour force without work (modelled ILO estimate).',
  },
  {
    id: 'NY.GNP.PCAP.CD',
    label: 'GNI per capita',
    topic: 'prosperity',
    format: 'usd',
    description: 'Gross national income per person, Atlas method, current US dollars.',
  },
  {
    id: 'SI.POV.GINI',
    label: 'Income inequality (Gini)',
    topic: 'prosperity',
    format: 'index',
    description: 'Gini index: 0 is perfect equality, 100 is maximum inequality. Sparse coverage.',
  },
]
