import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  COUNTRY_CODE_PROPERTY,
  COUNTRY_SOURCE_LAYER,
  COUNTRY_TILESET_URL,
  MAPBOX_TOKEN,
  MAP_STYLE_DARK,
  MAP_STYLE_LIGHT,
  NODATA_COLOR_DARK,
  NODATA_COLOR_LIGHT,
} from '../config/mapbox'
import type { Observation } from '../types/worldBank'
import { buildColorScale } from '../utils/colorScale'
import { mapboxToWorldBankCode } from '../utils/countryCode'
import { formatValue, type ValueFormat } from '../utils/format'
import { buildFillColorExpression, buildSelectedFilter } from '../utils/mapExpressions'
import { MapLegend } from './MapLegend'
import { StatusMessage } from './StatusMessage'
import './WorldMap.css'

const FILL_LAYER = 'country-fill'
const OUTLINE_LAYER = 'country-outline'
const SOURCE = 'country-boundaries'

/**
 * Keeps only ISO countries in the "all" worldview. Without this the tileset's
 * alternate-worldview and disputed polygons overlap and double-draw borders.
 */
const REAL_COUNTRIES_FILTER: mapboxgl.ExpressionSpecification = [
  'all',
  ['==', ['get', 'disputed'], 'false'],
  ['any', ['==', ['get', 'worldview'], 'all'], ['in', 'US', ['get', 'worldview']]],
]

/** Props for {@link WorldMap}. */
interface WorldMapProps {
  /** Latest reading per country, keyed by World Bank ISO3 code; countries without data are absent. */
  observations: Map<string, Observation>
  /** How values are formatted in the hover readout and legend. */
  format: ValueFormat
  /** Sequential colours (light to dark) for the choropleth; they follow the selected theme. */
  palette: string[]
  /** ISO3 codes currently compared; the map outlines these countries. */
  selectedCodes: string[]
  /** Called with a country's ISO3 code when the user clicks it on the map. */
  onCountryClick: (code: string) => void
  /**
   * Optional. Called with a country's ISO3 code when the pointer moves onto it, and with
   * undefined when it leaves the map's countries; lets a sibling chart mirror the hover.
   */
  onCountryHover?: (code: string | undefined) => void
  /** Mapbox public access token. Defaults to `VITE_MAPBOX_PUBLIC_ACCESS`; override in tests or stories. */
  accessToken?: string
}

/** Interactive Mapbox GL choropleth: countries are coloured by the selected indicator. */
export function WorldMap({
  observations,
  format,
  palette,
  selectedCodes,
  onCountryClick,
  onCountryHover,
  accessToken = MAPBOX_TOKEN,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  // The map is created once; these refs let its event handlers always call the latest callbacks.
  const onClickRef = useRef(onCountryClick)
  const onHoverRef = useRef(onCountryHover)
  const hoveredCodeRef = useRef<string | undefined>(undefined)
  const noDataColorRef = useRef(NODATA_COLOR_LIGHT)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<{ name: string; code?: string } | null>(null)

  useEffect(() => {
    onClickRef.current = onCountryClick
    onHoverRef.current = onCountryHover
  })

  // Memoised so a parent re-render that only changes `selectedCodes` (a hover elsewhere on the
  // page) does not rebuild the scale and repaint every country.
  const scale = useMemo(() => {
    const values = [...observations.values()]
      .map((o) => o.value)
      .filter((v): v is number => v !== null)
    return buildColorScale(values, palette)
  }, [observations, palette])

  // Create the map once per token; tear it down on unmount (frees the WebGL context).
  useEffect(() => {
    if (!accessToken || !containerRef.current) return
    // Paint properties cannot read CSS variables, so pick colours from the OS theme once.
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    noDataColorRef.current = isDark ? NODATA_COLOR_DARK : NODATA_COLOR_LIGHT

    const map = new mapboxgl.Map({
      container: containerRef.current,
      accessToken,
      style: isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
      // Fit the inhabited world (no polar caps) at any container width instead of a fixed zoom.
      bounds: [
        [-168, -56],
        [179, 76],
      ],
      projection: 'mercator',
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.addSource(SOURCE, { type: 'vector', url: COUNTRY_TILESET_URL })
      // Insert below the basemap's labels so country names stay readable on top of the fill.
      const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
      map.addLayer(
        {
          id: FILL_LAYER,
          type: 'fill',
          source: SOURCE,
          'source-layer': COUNTRY_SOURCE_LAYER,
          filter: REAL_COUNTRIES_FILTER,
          paint: { 'fill-color': noDataColorRef.current, 'fill-opacity': 0.88 },
        },
        firstLabel,
      )
      map.addLayer(
        {
          id: OUTLINE_LAYER,
          type: 'line',
          source: SOURCE,
          'source-layer': COUNTRY_SOURCE_LAYER,
          filter: ['all', REAL_COUNTRIES_FILTER, buildSelectedFilter([])],
          paint: { 'line-color': isDark ? '#ffffff' : '#16202a', 'line-width': 2 },
        },
        firstLabel,
      )
      setReady(true)
    })

    map.on('mousemove', FILL_LAYER, (event) => {
      const properties = event.features?.[0]?.properties
      if (!properties) return
      map.getCanvas().style.cursor = 'pointer'
      const next = {
        name: String(properties.name_en ?? ''),
        code: mapboxToWorldBankCode(properties[COUNTRY_CODE_PROPERTY]),
      }
      // mousemove fires constantly; only update state when the hovered country changes.
      setHover((prev) => (prev?.code === next.code && prev?.name === next.name ? prev : next))
      // Tell the parent only on a change; an updater function must stay free of side effects.
      if (hoveredCodeRef.current !== next.code) {
        hoveredCodeRef.current = next.code
        onHoverRef.current?.(next.code)
      }
    })
    map.on('mouseleave', FILL_LAYER, () => {
      map.getCanvas().style.cursor = ''
      setHover(null)
      hoveredCodeRef.current = undefined
      onHoverRef.current?.(undefined)
    })
    map.on('click', FILL_LAYER, (event) => {
      const code = mapboxToWorldBankCode(event.features?.[0]?.properties?.[COUNTRY_CODE_PROPERTY])
      if (code) onClickRef.current(code)
    })
    map.on('error', (event) => {
      // Tile errors are common and recoverable; only a rejected token is worth surfacing.
      const status = (event.error as { status?: number } | undefined)?.status
      if (status === 401 || status === 403) {
        setError('Mapbox rejected the access token. Check VITE_MAPBOX_PUBLIC_ACCESS.')
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [accessToken])

  // Recolour when the data changes (new indicator) or the layers first become available.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    console.log(
      `[map] recolouring ${observations.size} countries, palette ${palette[0]}…${palette[palette.length - 1]}`,
    )
    map.setPaintProperty(
      FILL_LAYER,
      'fill-color',
      buildFillColorExpression(observations, scale, noDataColorRef.current),
    )
  }, [ready, observations, scale, palette])

  // Redraw the outlines when the compared countries change.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.setFilter(OUTLINE_LAYER, ['all', REAL_COUNTRIES_FILTER, buildSelectedFilter(selectedCodes)])
  }, [ready, selectedCodes])

  if (!accessToken) {
    return (
      <StatusMessage
        kind="error"
        message="Map unavailable: add a public Mapbox token as VITE_MAPBOX_PUBLIC_ACCESS in .env.local, then restart the dev server."
      />
    )
  }

  const hovered = hover?.code ? observations.get(hover.code) : undefined

  return (
    <div className="world-map">
      {error && <StatusMessage kind="error" message={error} />}
      <div
        ref={containerRef}
        className="world-map__canvas"
        role="region"
        aria-label="World map coloured by the selected indicator"
      />
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
