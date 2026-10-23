import type { Topic } from './indicators'

/**
 * Sequential palette for each theme's map, lowest to highest band. Mapbox and Kepler paint
 * from JavaScript and cannot read CSS variables, so the palettes live here; the matching
 * accent colour for buttons and charts lives in styles/themes.css.
 */
export const THEME_PALETTES: Record<Topic, string[]> = {
  // Teal
  economy: ['#d9f1ee', '#b0e1da', '#80cbc4', '#4fb2ad', '#2b9297', '#1b707e', '#124d60'],
  // Amber
  prosperity: ['#fdf1d6', '#fbe0a8', '#f7c874', '#f0a93f', '#d98516', '#b0650c', '#7c4508'],
  // Violet
  people: ['#ece7fb', '#d4c9f5', '#b8a6ec', '#9a80de', '#7b5bc9', '#5d3fa6', '#41297a'],
}

/** Line/chip colours for compared countries, assigned in selection order. */
export const SERIES_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#9c36b5']

/** Maximum number of countries compared in the trend chart. */
export const MAX_SELECTED_COUNTRIES = SERIES_COLORS.length

/** Countries compared when the dashboard first loads. */
export const DEFAULT_COUNTRY_CODES = ['USA', 'CHN', 'IND']

/** How many years of history the trend chart requests. */
export const TREND_YEARS = 25
