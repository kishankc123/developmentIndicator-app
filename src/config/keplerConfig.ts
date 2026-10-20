import type { MinSavedConfigV1 } from '@kepler.gl/types'
import { KEPLER_DATASET_ID, KEPLER_FIELDS } from '../utils/keplerData'
import { MAP_PALETTE } from './theme'

/**
 * Kepler "saved map" config (schema v1): one point layer per country capital, sized
 * and coloured by the indicator value, with a tooltip. Applied once on first load;
 * later data changes keep whatever the user has adjusted in Kepler's side panel.
 */
export const KEPLER_CONFIG: MinSavedConfigV1 = {
  version: 'v1',
  config: {
    visState: {
      layers: [
        {
          id: 'country-points',
          type: 'point',
          config: {
            dataId: KEPLER_DATASET_ID,
            label: 'Countries',
            color: [27, 112, 126],
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
              colorRange: {
                name: 'Development Indicator',
                type: 'sequential',
                category: 'Custom',
                colors: MAP_PALETTE,
              },
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
      interactionConfig: {
        tooltip: {
          enabled: true,
          compareMode: false,
          compareType: 'absolute' as const,
          fieldsToShow: {
            [KEPLER_DATASET_ID]: [
              KEPLER_FIELDS.country,
              KEPLER_FIELDS.region,
              KEPLER_FIELDS.income,
              KEPLER_FIELDS.value,
              KEPLER_FIELDS.year,
            ].map((name) => ({
              name,
              // Thousands separators and at most 3 decimals for the value; others stay raw.
              format: name === KEPLER_FIELDS.value ? ',.3~f' : null,
            })),
          },
        },
      },
    },
    mapStyle: { styleType: 'dark' },
  },
}
