import { describe, expect, it } from 'vitest'
import { mapCountryResponse } from './mapCountryResponse'
import type { RawCountry } from './types'

const spain: RawCountry = {
  name: 'Spain',
  flag: '🇪🇸',
  flags: { png: 'https://flagcdn.com/w320/es.png', svg: 'https://flagcdn.com/es.svg' },
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  languages: [{ name: 'Spanish', iso639_1: 'es', iso639_2: 'spa' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  area: 505992,
}

describe('mapCountryResponse', () => {
  it('maps full API country to card fields', () => {
    const card = mapCountryResponse(spain)

    expect(card).toMatchObject({
      name: 'Spain',
      flag: '🇪🇸',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      languages: ['Spanish'],
    })
  })

  it('exposes detail fields for the detail view', () => {
    const card = mapCountryResponse(spain)

    expect(card.area).toBe(505992)
    expect(card.borders).toEqual(['AND', 'FRA', 'GIB', 'PRT', 'MAR'])
    expect(card.languageList).toEqual([{ name: 'Spanish', iso639_1: 'es' }])
    expect(card.currencies).toHaveLength(1)
    expect(card.currencies[0]).toMatchObject({ code: 'EUR', name: 'Euro' })
  })

  it('prefers emoji flag, falls back to flags.png', () => {
    expect(mapCountryResponse({ ...spain, flag: undefined }).flag).toBe(
      'https://flagcdn.com/w320/es.png',
    )
    expect(
      mapCountryResponse({ ...spain, flag: undefined, flags: undefined }).flag,
    ).toBe('')
  })

  it('handles missing languages and population', () => {
    const card = mapCountryResponse({
      ...spain,
      languages: undefined,
      population: undefined,
    })

    expect(card.languages).toEqual([])
    expect(card.population).toBe(0)
    expect(card.languageList).toEqual([])
    expect(card.currencies).toHaveLength(1)
    expect(card.currencies[0]).toMatchObject({ code: 'EUR', name: 'Euro' })
  })

  it('is pure: does not mutate the input', () => {
    const before = JSON.parse(JSON.stringify(spain))
    mapCountryResponse(spain)
    expect(spain).toEqual(before)
  })
})
