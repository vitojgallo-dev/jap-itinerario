import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { leggiLegacy } from '../../scripts/legacy'
import { CHIAVE_V1, leggiV1, viaggioBase, viaggioDaV1 } from './avvio'

const memoria = (valori: Record<string, string>) => ({ getItem: (k: string) => valori[k] ?? null })

test('leggiV1 riconosce solo dati v1 validi', () => {
  expect(leggiV1(memoria({}))).toBeNull()
  expect(leggiV1(memoria({ [CHIAVE_V1]: 'non json' }))).toBeNull()
  expect(leggiV1(memoria({ [CHIAVE_V1]: '{"altro":1}' }))).toBeNull()
  expect(leggiV1(memoria({ [CHIAVE_V1]: '{"title":"x","cities":[]}' }))).toEqual({ title: 'x', cities: [] })
})

test('viaggioDaV1 usa la data di partenza salvata, o il 9 agosto 2027', () => {
  const html = readFileSync(new URL('../../legacy/index-v1.html', import.meta.url), 'utf8')
  const { dati } = leggiLegacy(html)
  expect(viaggioDaV1(dati).dataPartenza).toBe('2027-08-09')
  expect(viaggioDaV1({ ...dati, tripStart: '2027-08-10' }).dataPartenza).toBe('2027-08-10')
  expect(viaggioDaV1(dati).giorni).toHaveLength(18)
})

test('viaggioBase restituisce una copia nuova ogni volta', () => {
  const a = viaggioBase()
  a.titolo = 'cambiato'
  expect(viaggioBase().titolo).toBe('Giappone — agosto 2027')
})
