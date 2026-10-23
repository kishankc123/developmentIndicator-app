import type { ValueFormat } from '../utils/format'
import type { Topic } from './indicators'

/** One side of a comparison: a World Bank indicator and how to show it. */
export interface ComparisonAxis {
  /** World Bank indicator code; each was checked against the live API. */
  id: string
  label: string
  format: ValueFormat
}

/** A pair of indicators the dashboard relates to each other for every country. */
export interface ComparisonDefinition {
  id: string
  /** Short name for the category button. */
  label: string
  /** One-line question the comparison answers. */
  question: string
  /** Theme whose map palette colours the outcome map. */
  topic: Topic
  /** Both indicators are read for this single year so countries are compared like for like. */
  year: number
  /** The explanatory side (x axis): spending or income. Plotted on a log scale. */
  driver: ComparisonAxis
  /** The result side (y axis, map colour). */
  outcome: ComparisonAxis
}

/**
 * Comparisons shown in the "Compare two indicators" panel.
 * 2021 is the latest year where health spending is still reported for ~190 countries
 * (checked against the live API on 2026-10-23: 192 / 182 countries have both values).
 */
export const COMPARISONS: ComparisonDefinition[] = [
  {
    id: 'spending-outcomes',
    label: 'Spending vs outcomes',
    question: 'Does spending more on health buy longer lives?',
    topic: 'people',
    year: 2021,
    driver: { id: 'SH.XPD.CHEX.PC.CD', label: 'Health spending per person', format: 'usd' },
    outcome: { id: 'SP.DYN.LE00.IN', label: 'Life expectancy', format: 'years' },
  },
  {
    id: 'gender-income',
    label: 'Gender gap vs income',
    question: 'Do richer countries have more women in the labour force?',
    topic: 'prosperity',
    year: 2021,
    driver: { id: 'NY.GDP.PCAP.CD', label: 'GDP per capita', format: 'usd' },
    outcome: { id: 'SL.TLF.CACT.FE.ZS', label: 'Women in the labour force', format: 'percent' },
  },
]
