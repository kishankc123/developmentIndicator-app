import type { KeplerMetric, KeplerMetricId, KeplerPeriod } from '../config/keplerMetrics'
import './MetricSelector.css'

/** Props for {@link MetricSelector}. */
interface MetricSelectorProps {
  /** Metrics that apply to the current indicator; the parent decides which. */
  metrics: KeplerMetric[]
  metricId: KeplerMetricId
  periods: readonly KeplerPeriod[]
  period: KeplerPeriod
  onMetricChange: (id: KeplerMetricId) => void
  onPeriodChange: (period: KeplerPeriod) => void
}

/** What the Kepler points show (latest value or a change over time) and how far back to look. */
export function MetricSelector({
  metrics,
  metricId,
  periods,
  period,
  onMetricChange,
  onPeriodChange,
}: MetricSelectorProps) {
  // The latest value has no period, so the period buttons only matter for the others.
  const usesPeriod = metricId !== 'latest'
  return (
    <div className="metric-selector">
      <div className="metric-selector__group">
        <span className="metric-selector__label" id="metric-label">
          Show
        </span>
        <div role="radiogroup" aria-labelledby="metric-label" className="metric-selector__options">
          {metrics.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={m.id === metricId}
              className="metric-selector__option"
              onClick={() => onMetricChange(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="metric-selector__group">
        <span className="metric-selector__label" id="period-label">
          Over the last
        </span>
        <div role="radiogroup" aria-labelledby="period-label" className="metric-selector__options">
          {periods.map((years) => (
            <button
              key={years}
              type="button"
              role="radio"
              aria-checked={years === period}
              disabled={!usesPeriod}
              className="metric-selector__option"
              onClick={() => onPeriodChange(years)}
            >
              {years} years
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
