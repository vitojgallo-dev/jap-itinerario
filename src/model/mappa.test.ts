import { expect, test } from 'vitest'
import { giornoDiProva, tappaDiProva, viaggioDiProva } from './fixture'
import { puntiGiorno, puntiViaggio, vicini } from './mappa'

const L = (lat: number, lng: number) => ({ nome: 'x', query: 'x', lat, lng })
const v = viaggioDiProva({
  giorni: [
    giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', luogo: L(35.71, 139.79) }), tappaDiProva({ id: 'b' }), tappaDiProva({ id: 'c', luogo: L(35.66, 139.70) })] }),
    giornoDiProva({ id: 'g1', cittaId: 'kyoto', tappe: [tappaDiProva({ id: 'd', luogo: L(35.71, 139.79) }), tappaDiProva({ id: 'e', luogo: L(35.0, 135.77) })] }),
  ],
})

test('puntiGiorno salta le tappe senza coordinate ma tiene la numerazione del giorno', () => {
  expect(puntiGiorno(v, 0).map(p => [p.id, p.numero, p.colore])).toEqual([['a', 1, '#E4572E'], ['c', 3, '#E4572E']])
  expect(puntiGiorno(v, 9)).toEqual([])
})

test('puntiViaggio', () => {
  expect(puntiViaggio(v).map(p => p.id)).toEqual(['a', 'c', 'd', 'e'])
})

test('vicini: ordinati per distanza, senza doppioni dello stesso posto', () => {
  const r = vicini(v, { lat: 35.70, lng: 139.78 }, 3)
  expect(r.map(p => p.id)).toEqual(['a', 'c', 'e'])
  expect(r[0].km).toBeLessThan(2)
})
