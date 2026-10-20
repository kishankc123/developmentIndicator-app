import { lazy, Suspense, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { CountrySelector } from './components/CountrySelector'
import { IndicatorSelector } from './components/IndicatorSelector'
import { Panel } from './components/Panel'
import { StatCard } from './components/StatCard'
import { StatusMessage } from './components/StatusMessage'
import { TrendChart, type TrendSeries } from './components/TrendChart'
import { INDICATORS } from './config/indicators'
import { DEFAULT_COUNTRY_CODES, MAX_SELECTED_COUNTRIES, SERIES_COLORS } from './config/theme'
import { useCountries } from './hooks/useCountries'
import { useIndicator } from './hooks/useIndicator'
import { useTrend } from './hooks/useTrend'
import type { Observation } from './types/worldBank'
import { formatValue } from './utils/format'
import { summarize } from './utils/stats'
import './App.css'

// Lazy so the large Mapbox GL library loads as its own chunk, after the page shell renders.
const WorldMap = lazy(() => import('./components/WorldMap').then((m) => ({ default: m.WorldMap })))

/** Dashboard root: owns the selected indicator and countries and wires data to panels. */
function App() {
  const [indicatorId, setIndicatorId] = useState(INDICATORS[0].id)
  const [selectedCodes, setSelectedCodes] = useState(DEFAULT_COUNTRY_CODES)

  const indicator = INDICATORS.find((i) => i.id === indicatorId) ?? INDICATORS[0]
  const countries = useCountries()
  const latest = useIndicator(indicator.id)
  const trend = useTrend(indicator.id, selectedCodes)

  /** Adds a country, dropping the oldest selection if the comparison is full. */
  const addCountry = (code: string) =>
    setSelectedCodes((codes) =>
      codes.includes(code) ? codes : [...codes, code].slice(-MAX_SELECTED_COUNTRIES),
    )
  /** Removes a country from the comparison. */
  const removeCountry = (code: string) =>
    setSelectedCodes((codes) => codes.filter((c) => c !== code))
  /** Map click: toggles the clicked country in the comparison. */
  const toggleCountry = (code: string) =>
    selectedCodes.includes(code) ? removeCountry(code) : addCountry(code)

  // The latest-value call also returns aggregates (e.g. "World"); keep only real countries
  // that have a value, keyed by ISO3 code for the map join.
  // While a new indicator loads we keep the previous data so the map stays mounted
  // (rebuilding it would reload tiles and count as another Mapbox map load).
  const latestData = latest.status === 'success' ? latest.data : latest.status === 'loading' ? latest.previous : undefined
  const countryObservations = new Map<string, Observation>()
  if (countries.status === 'success' && latestData) {
    const countryCodes = new Set(countries.data.map((c) => c.code))
    for (const o of latestData) {
      if (countryCodes.has(o.countryCode) && o.value !== null) {
        countryObservations.set(o.countryCode, o)
      }
    }
  }

  // Colours follow selection order so chips, lines and (later) map outlines agree.
  const colors = Object.fromEntries(selectedCodes.map((c, i) => [c, SERIES_COLORS[i]]))
  const nameOf = (code: string) =>
    countries.status === 'success'
      ? (countries.data.find((c) => c.code === code)?.name ?? code)
      : code
  const series: TrendSeries[] = selectedCodes.map((code) => ({
    code,
    name: nameOf(code),
    color: colors[code],
  }))

  const focusCode = selectedCodes[selectedCodes.length - 1]
  const focus = focusCode ? countryObservations.get(focusCode) : undefined
  const summary = summarize([...countryObservations.values()])
  const show = (o: Observation | undefined) =>
    o?.value != null ? formatValue(o.value, indicator.format) : '—'

  // Only block the panel on first load; later switches keep the map and dim it (see `refreshing`).
  const mapLoading = countries.status === 'loading' || (latest.status === 'loading' && !latest.previous)
  const refreshing = latest.status === 'loading' && latest.previous !== undefined
  const mapError = countries.status === 'error' ? countries : latest.status === 'error' ? latest : null

  return (
    <div className="app">
      <AppHeader />
      <IndicatorSelector
        indicators={INDICATORS}
        selectedId={indicator.id}
        onSelect={setIndicatorId}
      />

      <div className="app__stats">
        <StatCard
          label={focusCode ? nameOf(focusCode) : 'Selected country'}
          value={show(focus)}
          detail={focus ? `Latest: ${focus.year}` : 'No data for this indicator'}
        />
        <StatCard
          label="Highest"
          value={show(summary?.highest)}
          detail={summary ? `${summary.highest.countryName}, ${summary.highest.year}` : undefined}
        />
        <StatCard
          label="Median country"
          value={summary ? formatValue(summary.median, indicator.format) : '—'}
          detail={summary ? `Across ${summary.count} countries` : undefined}
        />
      </div>

      <Panel title={indicator.label} subtitle={indicator.description}>
        {mapError ? (
          <StatusMessage kind="error" message={`Could not load data: ${mapError.error.message}`} />
        ) : mapLoading ? (
          <StatusMessage kind="loading" message="Loading map data…" />
        ) : (
          <Suspense fallback={<StatusMessage kind="loading" message="Loading map…" />}>
            <div className={refreshing ? 'app__map app__map--refreshing' : 'app__map'} aria-busy={refreshing}>
            <WorldMap
              observations={countryObservations}
              format={indicator.format}
              selectedCodes={selectedCodes}
              onCountryClick={toggleCountry}
            />
            </div>
          </Suspense>
        )}
        <p className="app__footnote">
          Each country shows its most recent available year, so years differ between countries.
        </p>
      </Panel>

      <Panel
        title="Compare over time"
        subtitle={`${indicator.label}, last 25 years`}
        actions={
          countries.status === 'success' && (
            <CountrySelector
              countries={countries.data}
              selectedCodes={selectedCodes}
              colors={colors}
              max={MAX_SELECTED_COUNTRIES}
              onAdd={addCountry}
              onRemove={removeCountry}
            />
          )
        }
      >
        {trend.status === 'error' ? (
          <StatusMessage kind="error" message={`Could not load trend: ${trend.error.message}`} />
        ) : trend.status === 'loading' ? (
          <StatusMessage kind="loading" message="Loading trend…" />
        ) : (
          <TrendChart observations={trend.data} series={series} format={indicator.format} />
        )}
      </Panel>

      <footer className="app__footer">
        Source: World Bank Open Data (World Development Indicators).
      </footer>
    </div>
  )
}

export default App
