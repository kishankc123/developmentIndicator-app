import {
  addDataToMap,
  layerConfigChange,
  layerVisConfigChange,
  layerVisualChannelConfigChange,
  registerEntry,
  toggleSidePanel,
} from '@kepler.gl/actions'
import KeplerGl from '@kepler.gl/components'
import { enhanceReduxMiddleware, keplerGlReducer } from '@kepler.gl/reducers'
import { useEffect, useRef, useState } from 'react'
import type { MinSavedConfigV1 } from '@kepler.gl/types'
import { Provider } from 'react-redux'
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux'
import {
  FLOWS_LAYER_ID,
  KEPLER_LAYER_ID,
  buildFlowsLayer,
  buildKeplerConfig,
  buildTooltipConfig,
  keplerColorRange,
  keplerDivergingColorRange,
} from '../config/keplerConfig'
import type { KeplerMetric } from '../config/keplerMetrics'
import { DIVERGING_PALETTE } from '../config/theme'
import { MAPBOX_TOKEN } from '../config/mapbox'
import { KEPLER_DATASET_ID, type KeplerDataset } from '../utils/keplerData'
import { FLOWS_DATASET_ID } from '../utils/migration'
import { StatusMessage } from './StatusMessage'
import './KeplerMap.css'

/** Kepler keeps all of its state in Redux; this app has no other Redux, so it gets its own store. */
function createKeplerStore() {
  return legacy_createStore(
    combineReducers({ keplerGl: keplerGlReducer }),
    {},
    applyMiddleware(...enhanceReduxMiddleware([])),
  )
}

/** The layer type the Kepler actions expect. */
type KeplerLayer = Parameters<typeof layerVisConfigChange>[0]

/** Kepler types its store state as `{}`; this describes only the part we read (layer ids). */
type KeplerStoreState = {
  keplerGl?: Record<
    string,
    { visState?: { layers?: { id: string; config?: { isVisible?: boolean } }[] } } | undefined
  >
}

/** What the map shows: the indicator points, or the migration arcs of one country. */
export type KeplerView = 'indicator' | 'flows'

/** The config shape Kepler's channel action takes; its typings omit the channel fields. */
type ChannelConfig = Parameters<typeof layerVisualChannelConfigChange>[1]

/** Pairs a Kepler field name with the type Kepler stores it under. */
const realField = (name: string) => ({ name, type: 'real' })

/** Instance id Kepler uses to find its slice of state. */
const KEPLER_ID = 'indicator-map'

/** Props for {@link KeplerMap}. */
interface KeplerMapProps {
  /** Table of countries to plot (see `buildKeplerDataset`). */
  dataset: KeplerDataset
  /** Label for the dataset in Kepler's layer panel (usually the indicator name). */
  datasetLabel: string
  /** Sequential colours (light to dark) for the points; they follow the selected theme. */
  palette: string[]
  /** What the points are coloured and sized by; change metrics use a diverging scale. */
  metric: KeplerMetric
  /** Largest absolute value of the metric's column, so the diverging scale is centred on zero. */
  extent: number
  /** Which layer is visible. Both stay loaded so switching does not rebuild the map. */
  view?: KeplerView
  /** Arcs for the chosen country (see `buildFlowsDataset`); null until the migration data is loaded. */
  flows?: KeplerDataset | null
  /** Mapbox public access token. Defaults to `VITE_MAPBOX_PUBLIC_ACCESS`. */
  accessToken?: string
}

/** Kepler.gl map: filters, layer styling and tooltips on top of the indicator data. */
export function KeplerMap({
  dataset,
  datasetLabel,
  palette,
  metric,
  extent,
  view = 'indicator',
  flows = null,
  accessToken = MAPBOX_TOKEN,
}: KeplerMapProps) {
  const [store] = useState(createKeplerStore)
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // First load applies our layer config; later loads must keep the user's own tweaks.
  const loadedRef = useRef(false)

  // Kepler needs explicit pixel dimensions, so track the container's width.
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // Kepler drops actions sent before its component mounts, and the component only mounts
    // once the container has a width. Registering the instance first lets data arrive early;
    // `mint={false}` below makes the component adopt this state instead of starting empty.
    if (!loadedRef.current) {
      store.dispatch(
        registerEntry({
          id: KEPLER_ID,
          mint: false,
          mapboxApiAccessToken: accessToken,
          // Start with the side panel collapsed so the map is visible; users open it to filter/restyle.
          initialUiState: { activeSidePanel: null },
        }),
      )
    }
    store.dispatch(
      addDataToMap({
        datasets: { info: { id: KEPLER_DATASET_ID, label: datasetLabel }, data: dataset },
        // Fit the view to the data once; later indicator switches must not reset the user's pan/zoom.
        options: { centerMap: !loadedRef.current, readOnly: false, keepExistingConfig: loadedRef.current },
        ...(loadedRef.current ? {} : { config: buildKeplerConfig(palette) }),
      }),
    )
    // Loading data opens the layer panel; keep it closed so the map stays visible.
    store.dispatch(toggleSidePanel(null))
    loadedRef.current = true
    // `palette` is read only on the first load; later theme changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, dataset, datasetLabel, accessToken])

  // A theme or metric change restyles the existing layer in place (no remount, so no extra
  // Mapbox map load and the user's pan/zoom/styling are kept).
  const appliedStyle = useRef({ palette, metricId: 'latest' as string, extent: 0 })
  useEffect(() => {
    const applied = appliedStyle.current
    if (applied.palette === palette && applied.metricId === metric.id && applied.extent === extent) return
    const findLayer = () =>
      (store.getState() as KeplerStoreState).keplerGl?.[KEPLER_ID]?.visState?.layers?.find(
        (l) => l.id === KEPLER_LAYER_ID,
      ) as KeplerLayer | undefined
    const layer = findLayer()
    if (!layer) {
      console.log('[kepler] style change skipped: the layer is not ready yet')
      return
    }
    console.log(`[kepler] styling points by "${metric.label}" (${metric.diverging ? 'diverging' : 'sequential'})`)
    appliedStyle.current = { palette, metricId: metric.id, extent }
    // Each action replaces the layer object in the store, so re-read it before the next one.
    store.dispatch(
      layerVisualChannelConfigChange(
        layer,
        { colorField: realField(metric.field), colorScale: metric.diverging ? 'custom' : 'quantile' } as ChannelConfig,
        'color',
      ),
    )
    store.dispatch(
      layerVisConfigChange(findLayer() ?? layer, {
        colorRange: metric.diverging
          ? keplerDivergingColorRange(DIVERGING_PALETTE, extent)
          : keplerColorRange(palette),
      }),
    )
    store.dispatch(
      layerVisualChannelConfigChange(findLayer() ?? layer, { sizeField: realField(metric.sizeField) } as ChannelConfig, 'size'),
    )
  }, [store, palette, metric, extent])

  /** The layer with this id from Kepler's store, or undefined while it does not exist yet. */
  const findLayerById = (id: string) =>
    (store.getState() as KeplerStoreState).keplerGl?.[KEPLER_ID]?.visState?.layers?.find((l) => l.id === id)

  // Arcs: load the dataset for the chosen country. Kepler builds datasets asynchronously, so the
  // arc layer and its tooltip travel with the first load (as saved-map config) instead of being
  // added afterwards; later loads only replace the rows and the same layer follows them.
  const flowsLayerRequested = useRef(false)
  useEffect(() => {
    if (!flows) return
    const first = !flowsLayerRequested.current
    flowsLayerRequested.current = true
    if (first) console.log('[kepler] adding the migration arc layer')
    store.dispatch(
      addDataToMap({
        datasets: { info: { id: FLOWS_DATASET_ID, label: 'Where people live abroad' }, data: flows },
        options: { centerMap: false, readOnly: false, keepExistingConfig: true },
        ...(first
          ? {
              config: {
                version: 'v1',
                config: {
                  visState: {
                    layers: [buildFlowsLayer(palette)],
                    interactionConfig: { tooltip: buildTooltipConfig(true) },
                  },
                },
              } as MinSavedConfigV1,
            }
          : {}),
      }),
    )
    store.dispatch(toggleSidePanel(null))
    // `palette` only colours a newly created layer; later theme changes are handled below.
    // findLayerById only reads the store, which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, flows])

  // A theme change recolours the arcs too, once their layer exists.
  const appliedArcPalette = useRef(palette)
  useEffect(() => {
    const layer = findLayerById(FLOWS_LAYER_ID)
    if (!layer || appliedArcPalette.current === palette) return
    appliedArcPalette.current = palette
    store.dispatch(layerVisConfigChange(layer as KeplerLayer, { colorRange: keplerColorRange(palette) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, palette])

  // Show one layer at a time; runs after the effects above so a layer they create is covered too.
  useEffect(() => {
    const visibility: [string, boolean][] = [
      [KEPLER_LAYER_ID, view === 'indicator'],
      [FLOWS_LAYER_ID, view === 'flows'],
    ]
    for (const [id, visible] of visibility) {
      const layer = findLayerById(id)
      if (layer && layer.config?.isVisible !== visible) {
        store.dispatch(layerConfigChange(layer as KeplerLayer, { isVisible: visible }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, view, flows])

  if (!accessToken) {
    return (
      <StatusMessage
        kind="error"
        message="Map unavailable: add a public Mapbox token as VITE_MAPBOX_PUBLIC_ACCESS in .env.local."
      />
    )
  }

  return (
    <div ref={containerRef} className="kepler-map">
      {width > 0 && (
        <Provider store={store}>
          <KeplerGl
            id={KEPLER_ID}
            mint={false}
            mapboxApiAccessToken={accessToken}
            width={width}
            height={640}
          />
        </Provider>
      )}
    </div>
  )
}
