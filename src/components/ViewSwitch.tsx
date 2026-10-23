import type { KeplerView } from './KeplerMap'
import './MetricSelector.css'

/** Props for {@link ViewSwitch}. */
interface ViewSwitchProps {
  view: KeplerView
  onChange: (view: KeplerView) => void
}

const VIEWS: { id: KeplerView; label: string }[] = [
  { id: 'indicator', label: 'Indicator by country' },
  { id: 'flows', label: 'Where people live abroad' },
]

/** Switches the Kepler panel between the indicator points and the migration arcs. */
export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div className="metric-selector">
      <div className="metric-selector__group">
        <span className="metric-selector__label" id="kepler-view-label">
          View
        </span>
        <div role="radiogroup" aria-labelledby="kepler-view-label" className="metric-selector__options">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === view}
              className="metric-selector__option"
              onClick={() => onChange(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
