import { lazy, Suspense, useMemo, useState } from 'react'
import { COMPARISONS } from '../config/comparisons'
import { DIVERGING_PALETTE, THEME_PALETTES } from '../config/theme'
import { usePairedIndicators } from '../hooks/usePairedIndicators'
import type { Country, Observation } from '../types/worldBank'
import { formatValue } from '../utils/format'
import { extremes, fitTrend, joinPairs, withResiduals, type PairPoint } from '../utils/pairs'
import { ChartDialog } from './ChartDialog'
import { Panel } from './Panel'
import { ScatterPlot } from './ScatterPlot'
import { StatusMessage } from './StatusMessage'
import './ComparisonView.css'

// Same lazy chunk as the main map: Mapbox GL loads once, after the page shell renders.
const WorldMap = lazy(() => import('./WorldMap').then((m) => ({ default: m.WorldMap })))

/** What the map is coloured by. */
type MapView = 'outcome' | 'residual'

const EXTREME_COUNT = 3

/** Props for {@link ComparisonView}. */
interface ComparisonViewProps {
  /** Real countries (no aggregates); the join key set and the source of display names. */
  countries: Country[]
}

/**
 * "Compare two indicators" panel: pick a question, see a scatter plot and a world map of the
 * same countries side by side. Hovering or clicking a country in either highlights it in the
 * other. The map shows the outcome, or how far each country is from the trend line.
 */
export function ComparisonView({ countries }: ComparisonViewProps) {
  const [comparisonId, setComparisonId] = useState(COMPARISONS[0].id)
  const [view, setView] = useState<MapView>('outcome')
  // Two separate pieces of state: hover is transient, selection stays until clicked again.
  const [hoverCode, setHoverCode] = useState<string>()
  const [selectedCode, setSelectedCode] = useState<string>()
  const [enlarged, setEnlarged] = useState(false)

  const comparison = COMPARISONS.find((c) => c.id === comparisonId) ?? COMPARISONS[0]
  const { driver, outcome } = comparison
  const pair = usePairedIndicators(comparison)
  const loaded = pair.status === 'success' ? pair.data : undefined

  const points = useMemo(
    () => (loaded ? joinPairs(loaded.drivers, loaded.outcomes, countries) : []),
    [loaded, countries],
  )
  const fit = useMemo(() => fitTrend(points), [points])
  const residuals = useMemo(() => (fit ? withResiduals(points, fit) : []), [points, fit])
  const { above, below } = useMemo(() => extremes(residuals, EXTREME_COUNT), [residuals])

  // The map reads Observations; build them for the chosen view. Stable between hovers so the
  // map does not repaint every country each time the pointer moves.
  const year = comparison.year
  const observations = useMemo(() => {
    const result = new Map<string, Observation>()
    const add = (p: PairPoint, value: number) =>
      result.set(p.code, { countryCode: p.code, countryName: p.name, year, value })
    if (view === 'residual') for (const p of residuals) add(p, p.residual)
    else for (const p of points) add(p, p.y)
    return result
  }, [view, points, residuals, year])

  const activeCode = hoverCode ?? selectedCode
  // Outline the active country on the map; a new array only when the code changes.
  const outlined = useMemo(() => (activeCode ? [activeCode] : []), [activeCode])
  const activePoint = points.find((p) => p.code === activeCode)
  const activeResidual = residuals.find((p) => p.code === activeCode)?.residual

  /** Selecting a category resets the selection: a country picked in one pair may have no data in the next. */
  const chooseComparison = (id: string) => {
    setComparisonId(id)
    setSelectedCode(undefined)
    setHoverCode(undefined)
  }
  const toggleSelected = (code: string) => setSelectedCode((prev) => (prev === code ? undefined : code))

  const readout = activePoint
    ? `${activePoint.name}: ${driver.label} ${formatValue(activePoint.x, driver.format)}, ${outcome.label} ${formatValue(activePoint.y, outcome.format)}` +
      (activeResidual === undefined
        ? ''
        : ` (${activeResidual >= 0 ? '+' : ''}${activeResidual.toFixed(1)} vs expected)`)
    : activeCode
      ? 'No data for this country in this comparison.'
      : 'Hover or click a country on the map or the chart.'

  const residualView = view === 'residual' && fit !== null
  const palette = residualView ? DIVERGING_PALETTE : THEME_PALETTES[comparison.topic]

  return (
    <Panel
      title="Compare two indicators"
      subtitle={`${comparison.question} Both indicators are for ${comparison.year}.`}
    >
      <div className="comparison-view" data-topic={comparison.topic}>
        <div className="comparison-view__controls">
          <div className="comparison-view__row">
            <span className="comparison-view__label" id="comparison-label">
              Comparison
            </span>
            <div role="group" aria-labelledby="comparison-label" className="comparison-view__choices">
              {COMPARISONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === comparison.id}
                  className="comparison-view__choice"
                  onClick={() => chooseComparison(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {/* The category fixes both indicators; say which is which so the buttons below read as colouring only. */}
          <p className="comparison-view__pair">
            Compares <strong>{driver.label}</strong> (chart x-axis) with <strong>{outcome.label}</strong> (chart
            y-axis and map colour).
          </p>
          <div className="comparison-view__row">
            <span className="comparison-view__label" id="map-colour-label">
              Colour the map by
            </span>
            <div role="group" aria-labelledby="map-colour-label" className="comparison-view__choices">
              <button
                type="button"
                aria-pressed={view === 'outcome'}
                className="comparison-view__choice"
                onClick={() => setView('outcome')}
              >
                Actual {outcome.label.toLowerCase()}
              </button>
              <button
                type="button"
                aria-pressed={view === 'residual'}
                className="comparison-view__choice"
                disabled={!fit}
                onClick={() => setView('residual')}
              >
                Better or worse than expected
              </button>
            </div>
            <label className="comparison-view__picker">
              <span>Highlight a country</span>
              <select
                value={selectedCode ?? ''}
                onChange={(event) => setSelectedCode(event.target.value || undefined)}
                disabled={points.length === 0}
              >
                <option value="">None</option>
                {points.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {pair.status === 'error' ? (
          <StatusMessage kind="error" message={`Could not load comparison: ${pair.error.message}`} />
        ) : pair.status === 'loading' ? (
          <StatusMessage kind="loading" message="Loading comparison…" />
        ) : (
          <>
            <p className="comparison-view__summary" aria-live="polite">
              {points.length} of {countries.length} countries have both values.
              {fit && ` ${driver.label} accounts for ${Math.round(fit.r2 * 100)}% of the differences in ${outcome.label.toLowerCase()}.`}
            </p>

            <div className="comparison-view__grid">
              <div className="comparison-view__map">
                <Suspense fallback={<StatusMessage kind="loading" message="Loading map…" />}>
                  <WorldMap
                    observations={observations}
                    format={outcome.format}
                    palette={palette}
                    selectedCodes={outlined}
                    onCountryClick={toggleSelected}
                    onCountryHover={setHoverCode}
                  />
                </Suspense>
                {residualView && (
                  <p className="comparison-view__note">
                    Colour = {outcome.label.toLowerCase()} minus what the trend line expects at that{' '}
                    {driver.label.toLowerCase()}. Purple beats expectation; orange falls short.
                  </p>
                )}
              </div>
              <div className="comparison-view__chart">
                <button
                  type="button"
                  className="comparison-view__enlarge"
                  aria-label="Enlarge chart"
                  title="Enlarge chart"
                  onClick={() => setEnlarged(true)}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <ScatterPlot
                  points={points}
                  fit={fit}
                  driver={driver}
                  outcome={outcome}
                  activeCode={activeCode}
                  onHover={setHoverCode}
                  onSelect={toggleSelected}
                />
              </div>
            </div>

            <ChartDialog
              open={enlarged}
              title={`${driver.label} vs ${outcome.label}, ${comparison.year}`}
              onClose={() => setEnlarged(false)}
            >
              {/* Same points and hover/selection state as the small chart, just taller. */}
              <div className="comparison-view__chart-large">
                <ScatterPlot
                  points={points}
                  fit={fit}
                  driver={driver}
                  outcome={outcome}
                  activeCode={activeCode}
                  onHover={setHoverCode}
                  onSelect={toggleSelected}
                  height="100%"
                />
              </div>
              <p className="comparison-view__readout" aria-live="polite">
                {readout}
              </p>
            </ChartDialog>

            <p className="comparison-view__readout" aria-live="polite">
              {readout}
            </p>

            {fit && (
              <div className="comparison-view__extremes">
                <p>
                  <strong>Beats expectation:</strong> {above.map((p) => p.name).join(', ')}
                </p>
                <p>
                  <strong>Falls short:</strong> {below.map((p) => p.name).join(', ')}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}
