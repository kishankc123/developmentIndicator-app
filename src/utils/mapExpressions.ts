import type { ExpressionSpecification } from 'mapbox-gl'
import { COUNTRY_CODE_PROPERTY } from '../config/mapbox'
import type { Observation } from '../types/worldBank'
import type { ColorScale } from './colorScale'
import { worldBankToMapboxCode } from './countryCode'

/**
 * Builds a Mapbox `fill-color` expression that colours each country by its value.
 * Countries are grouped by colour (`match` accepts a list of labels per output),
 * which keeps the expression to about one entry per palette colour instead of
 * one per country. Countries not listed fall back to `noDataColor`.
 */
export function buildFillColorExpression(
  observations: Map<string, Observation>,
  scale: ColorScale | null,
  noDataColor: string,
): string | ExpressionSpecification {
  const codesByColor = new Map<string, string[]>()
  if (scale) {
    for (const [code, observation] of observations) {
      if (observation.value === null) continue
      const color = scale.colorFor(observation.value)
      const codes = codesByColor.get(color) ?? []
      codes.push(worldBankToMapboxCode(code))
      codesByColor.set(color, codes)
    }
  }
  // `match` needs at least one label/output pair, so a plain colour covers "no data at all".
  if (codesByColor.size === 0) return noDataColor

  const expression: unknown[] = ['match', ['get', COUNTRY_CODE_PROPERTY]]
  for (const [color, codes] of codesByColor) expression.push(codes, color)
  expression.push(noDataColor)
  return expression as ExpressionSpecification
}

/**
 * Filter for the outline layer: real countries whose code is in `worldBankCodes`.
 * `['literal', [...]]` is required so Mapbox treats the array as data, not an expression.
 */
export function buildSelectedFilter(worldBankCodes: string[]): ExpressionSpecification {
  return [
    'in',
    ['get', COUNTRY_CODE_PROPERTY],
    ['literal', worldBankCodes.map(worldBankToMapboxCode)],
  ] as ExpressionSpecification
}
