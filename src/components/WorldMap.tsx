import { useState, type ComponentProps } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import worldTopologyUrl from 'world-atlas/countries-110m.json?url'
import { MAP_PALETTE } from '../config/theme'
import type { Observation } from '../types/worldBank'
import { buildColorScale } from '../utils/colorScale'
import { featureIdToIso3 } from '../utils/countryCode'
import { formatValue, type ValueFormat } from '../utils/format'
import { MapLegend } from './MapLegend'
import './WorldMap.css'

/** Props for {@link WorldMap}. */
interface WorldMapProps {
  /** Latest reading per country, keyed by ISO3 code; countries without data are absent. */
  observations: Map<string, Observation>
  /** How values are formatted in the hover readout and legend. */
  format: ValueFormat
  /** ISO3 codes currently compared; the map outlines these countries. */
  selectedCodes: string[]
  /** Called with a country's ISO3 code when the user clicks it on the map. */
  onCountryClick: (code: string) => void
  /** Map shape source (URL or GeoJSON/TopoJSON). Defaults to the bundled world atlas; override in tests. */
  geography?: ComponentProps<typeof Geographies>['geography']
}

/** Choropleth world map: countries are coloured by the selected indicator. */
export function WorldMap({
  observations,
  format,
  selectedCodes,
  onCountryClick,
  geography = worldTopologyUrl,
}: WorldMapProps) {
  const [hover, setHover] = useState<{ name: string; code?: string } | null>(null)

  const values = [...observations.values()]
    .map((o) => o.value)
    .filter((v): v is number => v !== null)
  const scale = buildColorScale(values, MAP_PALETTE)

  const hovered = hover?.code ? observations.get(hover.code) : undefined

  return (
    <div className="world-map">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 165 }}
        width={980}
        height={500}
        className="world-map__svg"
        role="img"
        aria-label="World map coloured by the selected indicator"
      >
        <Geographies geography={geography}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const code = featureIdToIso3(geo.id)
              const observation = code ? observations.get(code) : undefined
              const value = observation?.value ?? null
              const fill =
                value !== null && scale ? scale.colorFor(value) : 'var(--color-nodata)'
              const isSelected = code !== undefined && selectedCodes.includes(code)
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  className={`world-map__country${isSelected ? ' is-selected' : ''}`}
                  onMouseEnter={() => setHover({ name: String(geo.properties?.name ?? ''), code })}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => code && onCountryClick(code)}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      <p className="world-map__readout" aria-live="polite">
        {hover
          ? `${hover.name}: ${
              hovered?.value != null
                ? `${formatValue(hovered.value, format)} (${hovered.year})`
                : 'no data'
            }`
          : 'Hover a country for its value; click to compare.'}
      </p>
      {scale && <MapLegend bins={scale.bins} format={format} />}
    </div>
  )
}
