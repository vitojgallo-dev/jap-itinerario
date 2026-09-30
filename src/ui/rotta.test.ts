import { expect, test } from 'vitest'
import { hrefRotta, leggiOverride, leggiRotta } from './rotta'

test('leggiRotta', () => {
  expect(leggiRotta('')).toEqual({ schermata: 'oggi', indice: null })
  expect(leggiRotta('#/programma/7')).toEqual({ schermata: 'programma', indice: 7 })
  expect(leggiRotta('#/mappa')).toEqual({ schermata: 'mappa', indice: null })
  expect(leggiRotta('#/boh/x')).toEqual({ schermata: 'oggi', indice: null })
})

test('hrefRotta', () => {
  expect(hrefRotta('programma', 3)).toBe('#/programma/3')
  expect(hrefRotta('viaggio')).toBe('#/viaggio')
})

test('leggiOverride per provare l\'app "durante" il viaggio', () => {
  expect(leggiOverride('?oggi=2027-08-16T10:15')?.toISOString()).toBe('2027-08-16T01:15:00.000Z')
  expect(leggiOverride('?oggi=2027-08-16')?.toISOString()).toBe('2027-08-16T00:00:00.000Z')
  expect(leggiOverride('')).toBeNull()
  expect(leggiOverride('?oggi=boh')).toBeNull()
})
