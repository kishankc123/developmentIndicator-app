import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AsyncState } from '../hooks/useAsyncData'
import type { PairedObservations } from '../hooks/usePairedIndicators'
import type { Country, Observation } from '../types/worldBank'
import { ComparisonView } from './ComparisonView'

const country = (code: string, name: string): Country => ({
  code,
  name,
  region: 'Test',
  incomeLevel: 'Test',
  latitude: null,
  longitude: null,
})
const countries = [country('AAA', 'Alpha'), country('BBB', 'Beta'), country('CCC', 'Gamma'), country('DDD', 'Delta')]

const obs = (code: string, value: number | null): Observation => ({
  countryCode: code,
  countryName: countries.find((c) => c.code === code)!.name,
  year: 2021,
  value,
})

// DDD has no outcome, so it must be missing from both views.
const data: PairedObservations = {
  drivers: [obs('AAA', 10), obs('BBB', 100), obs('CCC', 1000), obs('DDD', 500)],
  outcomes: [obs('AAA', 50), obs('BBB', 65), obs('CCC', 70), obs('DDD', null)],
}

let state: AsyncState<PairedObservations>
const requestedKeys: string[] = []
vi.mock('../hooks/usePairedIndicators', () => ({
  usePairedIndicators: (comparison: { id: string }) => {
    requestedKeys.push(comparison.id)
    return state
  },
}))

// The real map and chart need WebGL and layout size, which jsdom lacks. These stand-ins expose
// what ComparisonView hands them and let a test fire their callbacks.
vi.mock('./WorldMap', () => ({
  WorldMap: (props: {
    observations: Map<string, Observation>
    selectedCodes: string[]
    onCountryClick: (code: string) => void
    onCountryHover?: (code: string | undefined) => void
  }) => (
    <div>
      <p data-testid="map-outlined">{props.selectedCodes.join(',')}</p>
      <p data-testid="map-values">
        {[...props.observations.values()].map((o) => `${o.countryCode}=${o.value?.toFixed(1)}`).join(' ')}
      </p>
      <button onClick={() => props.onCountryClick('BBB')}>map click Beta</button>
      <button onMouseEnter={() => props.onCountryHover?.('CCC')} onMouseLeave={() => props.onCountryHover?.(undefined)}>
        map hover Gamma
      </button>
    </div>
  ),
}))
vi.mock('./ScatterPlot', () => ({
  ScatterPlot: (props: {
    points: { code: string }[]
    activeCode?: string
    onHover: (code: string | undefined) => void
    onSelect: (code: string) => void
  }) => (
    <div>
      <p data-testid="scatter-points">{props.points.map((p) => p.code).join(',')}</p>
      <p data-testid="scatter-active">{props.activeCode ?? ''}</p>
      <button onMouseEnter={() => props.onHover('AAA')} onMouseLeave={() => props.onHover(undefined)}>
        dot hover Alpha
      </button>
      <button onClick={() => props.onSelect('AAA')}>dot click Alpha</button>
    </div>
  ),
}))

beforeEach(() => {
  state = { status: 'success', data }
  requestedKeys.length = 0
})

describe('ComparisonView', () => {
  it('joins the two indicators and reports how many countries have both values', async () => {
    render(<ComparisonView countries={countries} />)
    expect(await screen.findByTestId('scatter-points')).toHaveTextContent('AAA,BBB,CCC')
    expect(screen.getByText(/3 of 4 countries have both values/)).toBeInTheDocument()
  })

  it('shows loading and error states instead of the views', () => {
    state = { status: 'loading' }
    const { rerender } = render(<ComparisonView countries={countries} />)
    expect(screen.getByText('Loading comparison…')).toBeInTheDocument()
    expect(screen.queryByTestId('scatter-points')).not.toBeInTheDocument()

    state = { status: 'error', error: new Error('boom') }
    rerender(<ComparisonView countries={countries} />)
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })

  it('hovering a chart dot outlines that country on the map, and leaving clears it', async () => {
    const user = userEvent.setup()
    render(<ComparisonView countries={countries} />)
    const dot = await screen.findByRole('button', { name: 'dot hover Alpha' })
    await user.hover(dot)
    expect(screen.getByTestId('map-outlined')).toHaveTextContent('AAA')
    await user.unhover(dot)
    expect(screen.getByTestId('map-outlined')).toBeEmptyDOMElement()
  })

  it('hovering a country on the map highlights its dot in the chart', async () => {
    const user = userEvent.setup()
    render(<ComparisonView countries={countries} />)
    await user.hover(await screen.findByRole('button', { name: 'map hover Gamma' }))
    expect(screen.getByTestId('scatter-active')).toHaveTextContent('CCC')
    expect(screen.getByText(/Gamma: Health spending per person/)).toBeInTheDocument()
  })

  it('a click keeps the selection after the pointer leaves, and a second click clears it', async () => {
    const user = userEvent.setup()
    render(<ComparisonView countries={countries} />)
    const click = await screen.findByRole('button', { name: 'dot click Alpha' })
    await user.click(click)
    expect(screen.getByTestId('scatter-active')).toHaveTextContent('AAA')
    await user.click(click)
    expect(screen.getByTestId('scatter-active')).toBeEmptyDOMElement()
  })

  it('the country picker selects a country in both views and lists only countries with data', async () => {
    const user = userEvent.setup()
    render(<ComparisonView countries={countries} />)
    const picker = await screen.findByRole('combobox', { name: /highlight a country/i })
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['None', 'Alpha', 'Beta', 'Gamma'])
    await user.selectOptions(picker, 'Beta')
    expect(screen.getByTestId('map-outlined')).toHaveTextContent('BBB')
    expect(screen.getByTestId('scatter-active')).toHaveTextContent('BBB')
  })

  it('switches the map from the outcome to the distance from the trend line', async () => {
    const user = userEvent.setup()
    render(<ComparisonView countries={countries} />)
    expect(await screen.findByTestId('map-values')).toHaveTextContent('AAA=50.0 BBB=65.0 CCC=70.0')
    await user.click(screen.getByRole('button', { name: 'Better or worse than expected' }))
    // Residuals of a least-squares line sum to zero, so they cannot equal the raw outcomes.
    expect(screen.getByTestId('map-values')).not.toHaveTextContent('AAA=50.0')
    expect(screen.getByText(/Beats expectation:/)).toBeInTheDocument()
  })

  it('changing the comparison clears the selection and loads the other pair', async () => {
    const user = userEvent.setup()
    render(<ComparisonView countries={countries} />)
    await user.click(await screen.findByRole('button', { name: 'dot click Alpha' }))
    await user.click(screen.getByRole('button', { name: 'Gender gap vs income' }))
    expect(screen.getByTestId('scatter-active')).toBeEmptyDOMElement()
    expect(requestedKeys.at(-1)).toBe('gender-income')
  })
})
