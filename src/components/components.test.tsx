import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { INDICATORS } from '../config/indicators'
import type { Country } from '../types/worldBank'
import { CountrySelector } from './CountrySelector'
import { IndicatorSelector } from './IndicatorSelector'
import { StatCard } from './StatCard'
import { StatusMessage } from './StatusMessage'

const countries: Country[] = [
  { code: 'NPL', name: 'Nepal', region: 'South Asia', incomeLevel: 'Lower middle income', latitude: null, longitude: null },
  { code: 'USA', name: 'United States', region: 'North America', incomeLevel: 'High income', latitude: null, longitude: null },
  { code: 'IND', name: 'India', region: 'South Asia', incomeLevel: 'Lower middle income', latitude: null, longitude: null },
]

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
  it('marks the selected indicator and reports clicks', async () => {
    const onSelect = vi.fn()
    render(<IndicatorSelector indicators={INDICATORS} selectedId={INDICATORS[0].id} onSelect={onSelect} />)
    expect(screen.getByRole('radio', { name: 'GDP per capita' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Inflation' }))
    expect(onSelect).toHaveBeenCalledWith('FP.CPI.TOTL.ZG')
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
