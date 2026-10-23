import { useRef, type KeyboardEvent } from 'react'
import { TOPIC_LABELS, TOPIC_ORDER, type IndicatorDefinition, type Topic } from '../config/indicators'
import { THEME_PALETTES } from '../config/theme'
import './IndicatorSelector.css'

/** Props for {@link IndicatorSelector}. */
interface IndicatorSelectorProps {
  /** All selectable indicators; the parent owns this list. */
  indicators: IndicatorDefinition[]
  /** Id of the currently active indicator; its theme is the selected theme. */
  selectedId: string
  /** Called with an indicator id when the user picks an indicator or switches theme. */
  onSelect: (id: string) => void
}

/**
 * Theme tabs and the indicators of the selected theme only. The selected theme comes from
 * the selected indicator, so the parent keeps a single source of truth (and a theme change
 * made elsewhere, such as by the chat assistant, updates the tabs too). Switching theme
 * selects that theme's first indicator so the maps always show something from the theme.
 */
export function IndicatorSelector({ indicators, selectedId, onSelect }: IndicatorSelectorProps) {
  const tabRefs = useRef<Partial<Record<Topic, HTMLButtonElement | null>>>({})

  const topics = TOPIC_ORDER.filter((topic) => indicators.some((i) => i.topic === topic))
  const selected = indicators.find((i) => i.id === selectedId) ?? indicators[0]
  const selectedTopic = selected.topic
  const visible = indicators.filter((i) => i.topic === selectedTopic)

  const selectTopic = (topic: Topic) => {
    if (topic === selectedTopic) return
    const first = indicators.find((i) => i.topic === topic)
    if (!first) return
    console.log(`[theme] selected "${topic}" (was "${selectedTopic}"), showing ${first.id}`)
    onSelect(first.id)
  }

  const selectIndicator = (id: string) => {
    console.log(`[indicator] selected ${id} in theme "${selectedTopic}"`)
    onSelect(id)
  }

  /** Arrow keys, Home and End move between theme tabs (the standard tabs pattern). */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = topics.indexOf(selectedTopic)
    let next: number | undefined
    if (event.key === 'ArrowRight') next = (index + 1) % topics.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + topics.length) % topics.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = topics.length - 1
    if (next === undefined) return
    event.preventDefault()
    const topic = topics[next]
    selectTopic(topic)
    tabRefs.current[topic]?.focus()
  }

  return (
    <div className="indicator-selector">
      <div
        role="tablist"
        aria-label="Theme"
        className="indicator-selector__themes"
        onKeyDown={handleKeyDown}
      >
        {topics.map((topic) => (
          <button
            key={topic}
            ref={(element) => {
              tabRefs.current[topic] = element
            }}
            type="button"
            role="tab"
            id={`theme-tab-${topic}`}
            aria-selected={topic === selectedTopic}
            aria-controls="indicator-panel"
            // Roving tabindex: only the selected tab is in the tab order; arrows move between tabs.
            tabIndex={topic === selectedTopic ? 0 : -1}
            className="indicator-selector__theme"
            onClick={() => selectTopic(topic)}
          >
            <span
              aria-hidden="true"
              className="indicator-selector__swatch"
              style={{ background: THEME_PALETTES[topic][4] }}
            />
            {TOPIC_LABELS[topic]}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="indicator-panel"
        aria-labelledby={`theme-tab-${selectedTopic}`}
        className="indicator-selector__panel"
      >
        <div role="radiogroup" aria-label={TOPIC_LABELS[selectedTopic]} className="indicator-selector__options">
          {visible.map((indicator) => (
            <button
              key={indicator.id}
              type="button"
              role="radio"
              aria-checked={indicator.id === selected.id}
              className="indicator-selector__option"
              onClick={() => selectIndicator(indicator.id)}
            >
              {indicator.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
