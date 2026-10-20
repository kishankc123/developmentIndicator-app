import type { Country } from '../types/worldBank'
import './CountrySelector.css'

/** Props for {@link CountrySelector}. */
interface CountrySelectorProps {
  /** Every selectable country; the parent loads and owns this list. */
  countries: Country[]
  /** ISO3 codes currently compared, in selection order. */
  selectedCodes: string[]
  /** Chip colour per selected code; the parent assigns these so chart lines match. */
  colors: Record<string, string>
  /** Maximum countries that can be compared; the add control disables at this count. */
  max: number
  /** Called with a country's ISO3 code when the user picks one to add. */
  onAdd: (code: string) => void
  /** Called with a country's ISO3 code when the user removes its chip. */
  onRemove: (code: string) => void
}

/** Chips for the compared countries plus a dropdown to add another. */
export function CountrySelector({
  countries,
  selectedCodes,
  colors,
  max,
  onAdd,
  onRemove,
}: CountrySelectorProps) {
  const nameOf = (code: string) => countries.find((c) => c.code === code)?.name ?? code
  const available = countries
    .filter((c) => !selectedCodes.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name))
  const isFull = selectedCodes.length >= max

  return (
    <div className="country-selector">
      <ul className="country-selector__chips">
        {selectedCodes.map((code) => (
          <li key={code} className="country-selector__chip">
            <span
              className="country-selector__dot"
              style={{ background: colors[code] }}
              aria-hidden="true"
            />
            {nameOf(code)}
            <button
              type="button"
              className="country-selector__remove"
              aria-label={`Remove ${nameOf(code)}`}
              onClick={() => onRemove(code)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <label className="country-selector__add">
        <span className="visually-hidden">Add a country to compare</span>
        <select
          value=""
          disabled={isFull}
          onChange={(event) => event.target.value && onAdd(event.target.value)}
        >
          <option value="">{isFull ? `Up to ${max} countries` : 'Add a country…'}</option>
          {available.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
