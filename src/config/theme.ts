/** Sequential palette for the choropleth map, lowest to highest band. */
export const MAP_PALETTE = [
  '#d9f1ee',
  '#b0e1da',
  '#80cbc4',
  '#4fb2ad',
  '#2b9297',
  '#1b707e',
  '#124d60',
]

/** Line/chip colours for compared countries, assigned in selection order. */
export const SERIES_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#9c36b5']

/** Maximum number of countries compared in the trend chart. */
export const MAX_SELECTED_COUNTRIES = SERIES_COLORS.length

/** Countries compared when the dashboard first loads. */
export const DEFAULT_COUNTRY_CODES = ['USA', 'CHN', 'IND']

/** How many years of history the trend chart requests. */
export const TREND_YEARS = 25
