import { expect, test } from 'vitest'
import { leggiNominatim, urlNominatim } from './luoghi'

test('leggiNominatim', () => {
  const j = [
    { name: 'Kinkaku-ji', display_name: 'Kinkaku-ji, Kita, Kyoto, Giappone', lat: '35.0394', lon: '135.7292' },
    { name: '', display_name: 'Via senza nome, Osaka', lat: '34.7', lon: '135.5' },
    { name: 'rotto', display_name: 'x', lat: 'boh', lon: '1' },
  ]
  expect(leggiNominatim(j)).toEqual([
    { nome: 'Kinkaku-ji', indirizzo: 'Kinkaku-ji, Kita, Kyoto, Giappone', lat: 35.0394, lng: 135.7292 },
    { nome: 'Via senza nome', indirizzo: 'Via senza nome, Osaka', lat: 34.7, lng: 135.5 },
  ])
  expect(leggiNominatim({ errore: 1 })).toEqual([])
})

test('urlNominatim cerca solo in Giappone', () => {
  expect(urlNominatim('Kinkaku-ji')).toBe('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=jp&accept-language=it,en&q=Kinkaku-ji')
})
