import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { INDICATORS } from '../config/indicators'
import { KEPLER_METRICS, KEPLER_PERIODS, type KeplerMetricId } from '../config/keplerMetrics'
import type { Country } from '../types/worldBank'
import { AppHeader } from './AppHeader'
import { CountrySelector } from './CountrySelector'
import { IndicatorSelector } from './IndicatorSelector'
import { FlowsSelector } from './FlowsSelector'
import { MetricSelector } from './MetricSelector'
import { StatCard } from './StatCard'
import { StatusMessage } from './StatusMessage'
import { ViewSwitch } from './ViewSwitch'

const countries: Country[] = [
  { code: 'NPL', name: 'Nepal', region: 'South Asia', incomeLevel: 'Lower middle income', latitude: null, longitude: null },
  { code: 'USA', name: 'United States', region: 'North America', incomeLevel: 'High income', latitude: null, longitude: null },
  { code: 'IND', name: 'India', region: 'South Asia', incomeLevel: 'Lower middle income', latitude: null, longitude: null },
]

describe('AppHeader', () => {
  it('names the product as the page heading', () => {
    render(<AppHeader />)
    expect(screen.getByRole('heading', { level: 1, name: 'Development Indicator' })).toBeInTheDocument()
  })

  it('explains the data source, the map and the comparison in one paragraph', () => {
    render(<AppHeader />)
    const intro = screen.getByText(/World Bank/)
    // A few lines of prose, not a one-line tagline (about 4-5 lines at the header's width).
    expect((intro.textContent ?? '').length).toBeGreaterThan(300)
    expect(intro).toHaveTextContent(/map/i)
    expect(intro).toHaveTextContent(/compar/i)
    expect(intro).toHaveTextContent(/year/i)
  })
})

describe('StatCard', () => {
  it('shows label, value and detail', () => {
    render(<StatCard label="Highest" value="$1" detail="Monaco, 2024" />)
    expect(screen.getByText('Highest')).toBeInTheDocument()
    expect(screen.getByText('$1')).toBeInTheDocument()
    expect(screen.getByText('Monaco, 2024')).toBeInTheDocument()
  })
})

describe('StatusMessage', () => {
  it('announces errors as alerts', () => {
    render(<StatusMessage kind="error" message="boom" />)
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })
})

describe('IndicatorSelector', () => {
  const setup = (selectedId: string = INDICATORS[0].id) => {
    const onSelect = vi.fn()
    render(<IndicatorSelector indicators={INDICATORS} selectedId={selectedId} onSelect={onSelect} />)
    return { onSelect }
  }
  const radioNames = () => screen.getAllByRole('radio').map((r) => r.textContent)

  it('shows one tab per theme and marks the theme of the selected indicator', () => {
    setup()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Economy', 'Prosperity', 'People & quality of life'])
    expect(screen.getByRole('tab', { name: 'Economy' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Prosperity' })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows only the indicators of the selected theme', () => {
    setup()
    expect(radioNames()).toEqual(['GDP per capita', 'GDP growth', 'Inflation', 'Unemployment'])
    expect(screen.queryByRole('radio', { name: 'Population' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'GNI per capita' })).not.toBeInTheDocument()
  })

  it('shows the people indicators when one of them is selected', () => {
    setup('SP.POP.TOTL')
    expect(screen.getByRole('tab', { name: 'People & quality of life' })).toHaveAttribute('aria-selected', 'true')
    expect(radioNames()).toEqual(['Life expectancy', 'Population', 'Internet use'])
    expect(screen.getByRole('radio', { name: 'Population' })).toBeChecked()
  })

  it('marks the selected indicator and reports clicks on an indicator', async () => {
    const { onSelect } = setup()
    expect(screen.getByRole('radio', { name: 'GDP per capita' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Inflation' }))
    expect(onSelect).toHaveBeenCalledWith('FP.CPI.TOTL.ZG')
  })

  it('selects the first indicator of a theme when its tab is clicked', async () => {
    const { onSelect } = setup()
    await userEvent.click(screen.getByRole('tab', { name: 'Prosperity' }))
    expect(onSelect).toHaveBeenCalledWith('NY.GNP.PCAP.CD')
  })

  it('does nothing when the tab of the current theme is clicked', async () => {
    const { onSelect } = setup()
    await userEvent.click(screen.getByRole('tab', { name: 'Economy' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('moves between themes with the arrow keys, wrapping around', async () => {
    const { onSelect } = setup()
    screen.getByRole('tab', { name: 'Economy' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onSelect).toHaveBeenLastCalledWith('NY.GNP.PCAP.CD')
    await userEvent.keyboard('{ArrowLeft}')
    // From Economy (the first theme) ArrowLeft wraps to the last theme, People.
    expect(onSelect).toHaveBeenLastCalledWith('SP.DYN.LE00.IN')
  })

  it('logs theme and indicator choices to the console', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    setup()
    await userEvent.click(screen.getByRole('tab', { name: 'Prosperity' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Inflation' }))
    const lines = log.mock.calls.map((call) => call.join(' '))
    expect(lines.some((l) => l.includes('[theme]') && l.includes('prosperity'))).toBe(true)
    expect(lines.some((l) => l.includes('[indicator]') && l.includes('FP.CPI.TOTL.ZG'))).toBe(true)
    log.mockRestore()
  })
})

describe('CountrySelector', () => {
  const setup = (selectedCodes: string[], max = 3) => {
    const onAdd = vi.fn()
    const onRemove = vi.fn()
    render(
      <CountrySelector
        countries={countries}
        selectedCodes={selectedCodes}
        colors={{ NPL: 'red', USA: 'blue' }}
        max={max}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    )
    return { onAdd, onRemove }
  }

  it('adds a country from the dropdown and offers only unselected ones', async () => {
    const { onAdd } = setup(['NPL'])
    const select = screen.getByRole('combobox', { name: /add a country/i })
    expect(screen.queryByRole('option', { name: 'Nepal' })).not.toBeInTheDocument()
    await userEvent.selectOptions(select, 'USA')
    expect(onAdd).toHaveBeenCalledWith('USA')
  })

  it('removes a country via its chip button', async () => {
    const { onRemove } = setup(['NPL', 'USA'])
    await userEvent.click(screen.getByRole('button', { name: 'Remove Nepal' }))
    expect(onRemove).toHaveBeenCalledWith('NPL')
  })

  it('disables adding when the maximum is reached', () => {
    setup(['NPL', 'USA'], 2)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})

describe('MetricSelector', () => {
  const metrics = KEPLER_METRICS.filter((m) => m.kinds.includes('rate'))
  const setup = (metricId: KeplerMetricId) => {
    const onMetricChange = vi.fn()
    const onPeriodChange = vi.fn()
    render(
      <MetricSelector
        metrics={metrics}
        metricId={metricId}
        periods={KEPLER_PERIODS}
        period={10}
        onMetricChange={onMetricChange}
        onPeriodChange={onPeriodChange}
      />,
    )
    return { onMetricChange, onPeriodChange }
  }

  it('lists only the metrics it is given and marks the chosen one', () => {
    setup('change')
    expect(screen.getAllByRole('radio', { name: /Latest value|Change|Volatility/ })).toHaveLength(3)
    expect(screen.queryByRole('radio', { name: '% change' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Change' })).toBeChecked()
  })

  it('disables the period for the latest value', () => {
    setup('latest')
    expect(screen.getByRole('radio', { name: '5 years' })).toBeDisabled()
  })

  it('reports metric and period choices', async () => {
    const { onMetricChange, onPeriodChange } = setup('change')
    await userEvent.click(screen.getByRole('radio', { name: 'Volatility' }))
    await userEvent.click(screen.getByRole('radio', { name: '20 years' }))
    expect(onMetricChange).toHaveBeenCalledWith('volatility')
    expect(onPeriodChange).toHaveBeenCalledWith(20)
  })
})

describe('ViewSwitch', () => {
  it('marks the current view and reports a change', async () => {
    const onChange = vi.fn()
    render(<ViewSwitch view="indicator" onChange={onChange} />)
    expect(screen.getByRole('radio', { name: 'Indicator by country' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Where people live abroad' }))
    expect(onChange).toHaveBeenCalledWith('flows')
  })
})

describe('FlowsSelector', () => {
  const setup = (originCode: string | undefined) => {
    const onOriginChange = vi.fn()
    const onYearChange = vi.fn()
    render(
      <FlowsSelector
        origins={countries}
        originCode={originCode}
        years={[1990, 2024]}
        yearIndex={1}
        onOriginChange={onOriginChange}
        onYearChange={onYearChange}
      />,
    )
    return { onOriginChange, onYearChange }
  }

  it('shows the chosen country and year and reports changes', async () => {
    const { onOriginChange, onYearChange } = setup('NPL')
    expect(screen.getByRole('combobox', { name: 'People born in' })).toHaveValue('NPL')
    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('1')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'People born in' }), 'USA')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Year' }), '0')
    expect(onOriginChange).toHaveBeenCalledWith('USA')
    expect(onYearChange).toHaveBeenCalledWith(0)
  })

  it('asks for a country when the dashboard one has no data', () => {
    setup(undefined)
    expect(screen.getByRole('option', { name: 'Choose a country…' })).toBeInTheDocument()
  })
})
