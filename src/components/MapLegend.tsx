import type { ColorBin } from '../utils/colorScale'
import { formatValue, type ValueFormat } from '../utils/format'
import './MapLegend.css'

/** Props for {@link MapLegend}. */
interface MapLegendProps {
  /** Colour bands from lowest to highest, as built by `buildColorScale`. */
  bins: ColorBin[]
  /** How to format the two end labels. */
  format: ValueFormat
}

/** Colour-ramp legend for the map, with the lowest and highest values labelled. */
export function MapLegend({ bins, format }: MapLegendProps) {
  if (bins.length === 0) return null
  return (
    <div className="map-legend">
      <span className="map-legend__label">{formatValue(bins[0].from, format, true)}</span>
      <div className="map-legend__ramp" aria-hidden="true">
        {bins.map((bin) => (
          <span key={bin.color} style={{ background: bin.color }} />
        ))}
      </div>
      <span className="map-legend__label">
        {formatValue(bins[bins.length - 1].to, format, true)}
      </span>
      <span className="map-legend__nodata">
        <span className="map-legend__nodata-swatch" aria-hidden="true" />
        No data
      </span>
    </div>
  )
}
