import { addDataToMap, layerVisConfigChange, registerEntry, toggleSidePanel } from '@kepler.gl/actions'
import KeplerGl from '@kepler.gl/components'
import { enhanceReduxMiddleware, keplerGlReducer } from '@kepler.gl/reducers'
import { useEffect, useRef, useState } from 'react'
import { Provider } from 'react-redux'
import { applyMiddleware, combineReducers, legacy_createStore } from 'redux'
import { KEPLER_LAYER_ID, buildKeplerConfig, keplerColorRange } from '../config/keplerConfig'
import { MAPBOX_TOKEN } from '../config/mapbox'
import { KEPLER_DATASET_ID, type KeplerDataset } from '../utils/keplerData'
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
  keplerGl?: Record<string, { visState?: { layers?: { id: string }[] } } | undefined>
}

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
  /** Mapbox public access token. Defaults to `VITE_MAPBOX_PUBLIC_ACCESS`. */
  accessToken?: string
}

/** Kepler.gl map: filters, layer styling and tooltips on top of the indicator data. */
export function KeplerMap({
  dataset,
  datasetLabel,
  palette,
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

  // A theme change recolours the existing layer in place (no remount, so no extra Mapbox map
  // load and the user's pan/zoom/styling are kept).
  const appliedPalette = useRef(palette)
  useEffect(() => {
    if (appliedPalette.current === palette) return
    const layer = (store.getState() as KeplerStoreState).keplerGl?.[KEPLER_ID]?.visState?.layers?.find(
      (l) => l.id === KEPLER_LAYER_ID,
    )
    if (!layer) {
      console.log('[kepler] palette change skipped: the layer is not ready yet')
      return
    }
    console.log(`[kepler] recolouring points, palette ${palette[0]}…${palette[palette.length - 1]}`)
    appliedPalette.current = palette
    store.dispatch(
      layerVisConfigChange(layer as KeplerLayer, { colorRange: keplerColorRange(palette) }),
    )
  }, [store, palette])

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
