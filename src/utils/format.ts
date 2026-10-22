/** How an indicator's numbers are displayed. */
export type ValueFormat = 'usd' | 'percent' | 'index' | 'years' | 'count'

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
    case 'years':
      // Axes and legends have little room, so the unit is dropped there ("72.2"); the panel
      // subtitle and stat cards say "years".
      return compact ? value.toFixed(1) : `${value.toFixed(1)} years`
    case 'count':
      // Always abbreviated ("1.46B"): a population is only accurate to a few digits, and a
      // 13-digit figure would not fit a stat card.
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: compact ? 1 : 2,
      }).format(value)
  }
}
