import { expect, test } from 'vitest'
import base from '../data/itinerario-base.json'
import { cittaDiProva, giornoDiProva, tappaDiProva, viaggioDiProva } from './fixture'
import { validaViaggio } from './validazione'

test('accetta un viaggio corretto', () => {
  expect(validaViaggio(viaggioDiProva()).ok).toBe(true)
})

test('rifiuta cose che non sono un viaggio', () => {
  expect(validaViaggio(null).ok).toBe(false)
  expect(validaViaggio({ cities: [] }).ok).toBe(false)
  expect(validaViaggio({ ...viaggioDiProva(), versione: 3 }).ok).toBe(false)
})

test('elenca gli errori interni', () => {
  const v = viaggioDiProva({
    dataPartenza: '8 agosto',
    giorni: [
      giornoDiProva({ id: 'g0', cittaId: 'marte', tappe: [tappaDiProva({ id: 'a', ora: '8:00' })] }),
      giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', stato: 'boh' as never, tipo: 'x' as never })] }),
    ],
  })
  const r = validaViaggio(v)
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.errori).toEqual(expect.arrayContaining([
      'dataPartenza non valida: 8 agosto',
      'giorno g0: città "marte" inesistente',
      'id giorno duplicato: g0',
      'tappa a: ora non valida "8:00"',
      'id tappa duplicato: a',
      'tappa a: stato non valido "boh"',
      'tappa a: tipo non valido "x"',
    ]))
  }
})

const rifiutato = (x: unknown) => {
  const r = validaViaggio(x)
  expect(r.ok).toBe(false)
  return r.ok ? [] : r.errori
}

test('rifiuta una città senza clima', () => {
  const { clima: _, ...senza } = cittaDiProva[0]
  expect(rifiutato(viaggioDiProva({ citta: [senza as never, cittaDiProva[1]] }))).toContain('città tokyo: clima mancante')
})

test('rifiuta uno speciale vuoto', () => {
  const v = viaggioDiProva({ giorni: [giornoDiProva({ id: 'g0', speciale: {} as never })] })
  expect(rifiutato(v)).toContain('giorno g0: speciale non valido')
})

test('rifiuta un link dei biglietti che non è un testo', () => {
  const v = viaggioDiProva({ giorni: [giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', biglietti: { link: 5 as never } })] })] })
  expect(rifiutato(v)).toContain('tappa a: biglietti non validi')
})

test('rifiuta una latitudine scritta come testo', () => {
  const luogo = { nome: 'X', query: 'X', lat: '35' as never, lng: 139 }
  const v = viaggioDiProva({ giorni: [giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', luogo })] })] })
  expect(rifiutato(v)).toContain('tappa a: lat del luogo deve essere un numero')
})

test('rifiuta date di partenza che non esistono', () => {
  expect(rifiutato(viaggioDiProva({ dataPartenza: '9999-99-99' }))).toContain('dataPartenza non valida: 9999-99-99')
  expect(rifiutato(viaggioDiProva({ dataPartenza: '2027-02-31' }))).toContain('dataPartenza non valida: 2027-02-31')
})

test('rifiuta una persona nulla', () => {
  expect(rifiutato(viaggioDiProva({ persone: [null as never] }))).toContain('persona non valida')
})

test('rifiuta un tema sconosciuto', () => {
  expect(rifiutato(viaggioDiProva({ impostazioni: { tema: 'rosa' as never } }))).toContain('tema non valido: rosa')
})

test('l\'itinerario base resta valido', () => {
  const r = validaViaggio(structuredClone(base))
  expect(r.ok ? [] : r.errori).toEqual([])
})
