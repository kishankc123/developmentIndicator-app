import type { MinSavedConfigV1 } from '@kepler.gl/types'
import { KEPLER_DATASET_ID, KEPLER_FIELDS } from '../utils/keplerData'
import { FLOWS_DATASET_ID, FLOW_FIELDS } from '../utils/migration'
import { hexToRgb } from '../utils/color'

/** Id of the arc layer (where people born in one country live abroad). */
export const FLOWS_LAYER_ID = 'migration-arcs'

/** Id of the country layer, used to find it again when the theme's colours change. */
export const KEPLER_LAYER_ID = 'country-points'

/** Kepler's colour-range object for one of our sequential palettes. */
export function keplerColorRange(palette: string[]) {
  return { name: 'Development Indicator', type: 'sequential', category: 'Custom', colors: palette }
}

/** Fields whose tooltip numbers are formatted with thousands separators and up to 3 decimals. */
const NUMERIC_TOOLTIP_FIELDS: string[] = [
  KEPLER_FIELDS.value,
  KEPLER_FIELDS.change,
  KEPLER_FIELDS.percent,
  KEPLER_FIELDS.cagr,
  KEPLER_FIELDS.volatility,
]

/**
 * Colour range for a change metric, centred on zero. Kepler's quantize scale spans the data's
 * own min to max, which would put "no change" off-centre, so equal bands over [-extent, extent]
 * are given explicitly as a custom colour map (upper edge of each band -> colour).
 */
export function keplerDivergingColorRange(palette: string[], extent: number) {
  const bands = palette.length
  const limit = extent > 0 ? extent : 1
  return {
    name: 'Change',
    type: 'diverging',
    category: 'Custom',
    colors: palette,
    colorMap: palette.map((color, i) => [-limit + (2 * limit * (i + 1)) / bands, color] as [number, string]),
  }
}

const tooltipFields = (names: string[], numeric: string[]) =>
  names.map((name) => ({ name, format: numeric.includes(name) ? ',.3~f' : null }))

/**
 * Tooltip config. Kepler replaces the whole object on a change, so the arc dataset's fields
 * are included whenever it is loaded.
 */
export function buildTooltipConfig(withFlows: boolean) {
  return {
    enabled: true,
    compareMode: false,
    compareType: 'absolute' as const,
    fieldsToShow: {
      [KEPLER_DATASET_ID]: tooltipFields(
        [
          KEPLER_FIELDS.country,
          KEPLER_FIELDS.region,
          KEPLER_FIELDS.income,
          KEPLER_FIELDS.value,
          KEPLER_FIELDS.year,
          KEPLER_FIELDS.change,
          KEPLER_FIELDS.percent,
          KEPLER_FIELDS.cagr,
          KEPLER_FIELDS.volatility,
          KEPLER_FIELDS.fromYear,
          KEPLER_FIELDS.toYear,
        ],
        NUMERIC_TOOLTIP_FIELDS,
      ),
      ...(withFlows
        ? {
            [FLOWS_DATASET_ID]: tooltipFields(
              [FLOW_FIELDS.from, FLOW_FIELDS.to, FLOW_FIELDS.people, FLOW_FIELDS.share, FLOW_FIELDS.year],
              [FLOW_FIELDS.people, FLOW_FIELDS.share],
            ),
          }
        : {}),
    },
  }
}

/**
 * Saved-map layer for the migration arcs: one arc per destination, from the origin's capital to
 * the destination's, with width and colour following the number of people.
 */
export function buildFlowsLayer(palette: string[]) {
  return {
    id: FLOWS_LAYER_ID,
    type: 'arc',
    config: {
      dataId: FLOWS_DATASET_ID,
      label: 'Where people live abroad',
      color: hexToRgb(palette[5]),
      columns: {
        lat0: FLOW_FIELDS.fromLat,
        lng0: FLOW_FIELDS.fromLng,
        lat1: FLOW_FIELDS.toLat,
        lng1: FLOW_FIELDS.toLng,
      },
      isVisible: true,
      visConfig: {
        opacity: 0.85,
        thickness: 2,
        sizeRange: [1, 12],
        colorRange: keplerColorRange(palette),
        targetColor: null,
      },
    },
    visualChannels: {
      colorField: { name: FLOW_FIELDS.people, type: 'integer' },
      colorScale: 'quantile',
      sizeField: { name: FLOW_FIELDS.people, type: 'integer' },
      sizeScale: 'sqrt',
    },
  }
}

/**
 * Kepler "saved map" config (schema v1): one point layer per country capital, sized
 * and coloured by the indicator value, with a tooltip. Applied once on first load, with
 * the palette of the theme showing at that moment; later data changes keep whatever the
 * user has adjusted in Kepler's side panel, and theme changes update only the colours.
 */
export function buildKeplerConfig(palette: string[]): MinSavedConfigV1 {
  return {
  version: 'v1',
  config: {
    visState: {
      layers: [
        {
          id: KEPLER_LAYER_ID,
          type: 'point',
          config: {
            dataId: KEPLER_DATASET_ID,
            label: 'Countries',
            color: hexToRgb(palette[5]),
            columns: {
              lat: KEPLER_FIELDS.latitude,
              lng: KEPLER_FIELDS.longitude,
            },
            isVisible: true,
            visConfig: {
              radius: 12,
              fixedRadius: false,
              opacity: 0.85,
              outline: true,
              thickness: 1,
              strokeColor: [255, 255, 255],
              radiusRange: [4, 38],
              colorRange: keplerColorRange(palette),
            },
          },
          visualChannels: {
            colorField: { name: KEPLER_FIELDS.value, type: 'real' },
            colorScale: 'quantile',
            strokeColorField: null,
            strokeColorScale: 'quantile',
            sizeField: { name: KEPLER_FIELDS.value, type: 'real' },
            sizeScale: 'sqrt',
          },
        },
      ],
      interactionConfig: { tooltip: buildTooltipConfig(false) },
    },
    mapStyle: { styleType: 'dark' },
  },
}
}
