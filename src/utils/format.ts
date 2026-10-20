/** How an indicator's numbers are displayed. */
export type ValueFormat = 'usd' | 'percent' | 'index'

/**
 * Formats an indicator value for display.
 * `compact` shortens large numbers (e.g. "$12K") for chart axes and legends.
 */
export function formatValue(value: number, format: ValueFormat, compact = false): string {
  switch (format) {
    case 'usd':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        notation: compact ? 'compact' : 'standard',
      }).format(value)
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'index':
      return value.toFixed(1)
  }
}
