import { TOPIC_LABELS, type IndicatorDefinition, type Topic } from '../config/indicators'
import './IndicatorSelector.css'

/** Props for {@link IndicatorSelector}. */
interface IndicatorSelectorProps {
  /** All selectable indicators; the parent owns this list. */
  indicators: IndicatorDefinition[]
  /** Id of the currently active indicator. */
  selectedId: string
  /** Called with an indicator id when the user picks a different indicator. */
  onSelect: (id: string) => void
}

/** Radio-style buttons for choosing the indicator, grouped by topic. */
export function IndicatorSelector({ indicators, selectedId, onSelect }: IndicatorSelectorProps) {
  const topics = [...new Set(indicators.map((i) => i.topic))] as Topic[]

  return (
    <div className="indicator-selector">
      {topics.map((topic) => (
        <div key={topic} className="indicator-selector__group">
          <span className="indicator-selector__topic" id={`topic-${topic}`}>
            {TOPIC_LABELS[topic]}
          </span>
          <div role="radiogroup" aria-labelledby={`topic-${topic}`} className="indicator-selector__options">
            {indicators
              .filter((i) => i.topic === topic)
              .map((indicator) => (
                <button
                  key={indicator.id}
                  type="button"
                  role="radio"
                  aria-checked={indicator.id === selectedId}
                  className="indicator-selector__option"
                  onClick={() => onSelect(indicator.id)}
                >
                  {indicator.label}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
