import type { CountryCard, RawCountry } from './types'

export function mapCountryResponse(raw: RawCountry): CountryCard {
  return {
    name: raw.name,
    flag: raw.flag ?? raw.flags?.png ?? '',
    capital: raw.capital ?? '',
    region: raw.region ?? '',
    population: raw.population ?? 0,
    languages: (raw.languages ?? []).map((language) => language.name),
  }
}
