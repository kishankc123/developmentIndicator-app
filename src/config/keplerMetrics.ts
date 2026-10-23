import { KEPLER_FIELDS } from '../utils/keplerData'
import type { IndicatorDefinition } from './indicators'

/** What the Kepler layer is coloured and sized by. */
export type KeplerMetricId = 'latest' | 'change' | 'percent' | 'cagr' | 'volatility'

/** How far back the change metrics look, in years. */
export const KEPLER_PERIODS = [5, 10, 20] as const
export type KeplerPeriod = (typeof KEPLER_PERIODS)[number]
export const DEFAULT_KEPLER_PERIOD: KeplerPeriod = 10

export interface KeplerMetric {
  id: KeplerMetricId
  label: string
  /** Kepler column this metric reads. */
  field: string
  /** Change metrics are centred on zero and use a diverging palette; the others are sequential. */
  diverging: boolean
  /** Column that sizes the points: the field itself, or its absolute value for signed metrics. */
  sizeField: string
  /** Indicator kinds the metric makes sense for. */
  kinds: IndicatorDefinition['kind'][]
}

export const KEPLER_METRICS: KeplerMetric[] = [
  { id: 'latest', label: 'Latest value', field: KEPLER_FIELDS.value, sizeField: KEPLER_FIELDS.value, diverging: false, kinds: ['level', 'rate'] },
  { id: 'change', label: 'Change', field: KEPLER_FIELDS.change, sizeField: KEPLER_FIELDS.sizeChange, diverging: true, kinds: ['level', 'rate'] },
  { id: 'percent', label: '% change', field: KEPLER_FIELDS.percent, sizeField: KEPLER_FIELDS.sizePercent, diverging: true, kinds: ['level'] },
  { id: 'cagr', label: 'Yearly growth (CAGR)', field: KEPLER_FIELDS.cagr, sizeField: KEPLER_FIELDS.sizeCagr, diverging: true, kinds: ['level'] },
  { id: 'volatility', label: 'Volatility', field: KEPLER_FIELDS.volatility, sizeField: KEPLER_FIELDS.volatility, diverging: false, kinds: ['level', 'rate'] },
]

/** Metrics that apply to an indicator (rates get no % change or CAGR). */
export function metricsFor(indicator: IndicatorDefinition): KeplerMetric[] {
  return KEPLER_METRICS.filter((m) => m.kinds.includes(indicator.kind))
}

/** The metric with this id, or the latest-value metric. */
export function getMetric(id: KeplerMetricId): KeplerMetric {
  return KEPLER_METRICS.find((m) => m.id === id) ?? KEPLER_METRICS[0]
}
