import { scaleQuantile } from 'd3-scale'

/** One colour band of the map legend. */
export interface ColorBin {
  color: string
  from: number
  to: number
}

/** Maps values to palette colours and describes the bands for a legend. */
export interface ColorScale {
  colorFor: (value: number) => string
  bins: ColorBin[]
}

/**
 * Builds a quantile colour scale: each colour covers the same number of
 * countries. Indicators like GDP per capita are heavily skewed, so a linear
 * scale would paint nearly every country the same colour.
 * Returns null when there are no values to scale.
 */
export function buildColorScale(values: number[], palette: string[]): ColorScale | null {
  if (values.length === 0) return null
  const scale = scaleQuantile<string>().domain(values).range(palette)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const edges = [min, ...scale.quantiles(), max]
  const bins = palette.map((color, i) => ({ color, from: edges[i], to: edges[i + 1] }))
  return { colorFor: (value) => scale(value), bins }
}
