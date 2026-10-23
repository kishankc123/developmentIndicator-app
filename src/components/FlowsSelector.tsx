import type { Country } from '../types/worldBank'
import './MetricSelector.css'

/** Props for {@link FlowsSelector}. */
interface FlowsSelectorProps {
  /** Countries that have migration data, by name. */
  origins: Country[]
  /** ISO3 code of the origin country shown, or undefined when the dashboard's country has no data. */
  originCode: string | undefined
  years: number[]
  yearIndex: number
  onOriginChange: (code: string) => void
  onYearChange: (index: number) => void
}

/** Which country's emigrants to map, and for which year. Styled like the metric selector. */
export function FlowsSelector({
  origins,
  originCode,
  years,
  yearIndex,
  onOriginChange,
  onYearChange,
}: FlowsSelectorProps) {
  return (
    <div className="metric-selector">
      <label className="metric-selector__group">
        <span className="metric-selector__label">People born in</span>
        <select
          className="metric-selector__select"
          value={originCode ?? ''}
          onChange={(event) => onOriginChange(event.target.value)}
        >
          {!originCode && <option value="">Choose a country…</option>}
          {origins.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="metric-selector__group">
        <span className="metric-selector__label">Year</span>
        <select
          className="metric-selector__select"
          value={yearIndex}
          onChange={(event) => onYearChange(Number(event.target.value))}
        >
          {years.map((year, index) => (
            <option key={year} value={index}>
              {year}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
