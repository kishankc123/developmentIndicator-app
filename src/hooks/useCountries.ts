import { fetchCountries } from '../api/worldBank'
import type { Country } from '../types/worldBank'
import { useAsyncData, type AsyncState } from './useAsyncData'

/** Loads the list of real countries (no aggregates) once. */
export function useCountries(): AsyncState<Country[]> {
  return useAsyncData('countries', fetchCountries)
}
