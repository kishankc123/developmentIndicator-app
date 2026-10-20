/** Public Mapbox access token from `.env.local`; undefined when not configured. */
export const MAPBOX_TOKEN: string | undefined = import.meta.env.VITE_MAPBOX_TOKEN || undefined

/** Mapbox basemap styles; chosen by the user's light/dark preference. */
export const MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11'
export const MAP_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11'

/** Free Mapbox vector tileset of country polygons (docs: "Mapbox Countries v1"). */
export const COUNTRY_TILESET_URL = 'mapbox://mapbox.country-boundaries-v1'
/** Layer name inside that tileset. */
export const COUNTRY_SOURCE_LAYER = 'country_boundaries'
/** Tileset property holding the ISO 3166-1 alpha-3 code; the join key to World Bank data. */
export const COUNTRY_CODE_PROPERTY = 'iso_3166_1_alpha_3'

/** Fill colour for countries with no data (Mapbox paint cannot use CSS variables). */
export const NODATA_COLOR_LIGHT = '#d3d9e0'
export const NODATA_COLOR_DARK = '#2a3541'
