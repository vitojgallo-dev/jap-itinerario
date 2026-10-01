import { expect, test } from 'vitest'
import base from '../data/itinerario-base.json'
import { cittaDiProva, giornoDiProva, prenotazioneDiProva, spesaDiProva, tappaDiProva, viaggioDiProva } from './fixture'
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

const tre = [{ id: 'p1', nome: 'Vito' }, { id: 'p2', nome: 'Anna' }, { id: 'p3', nome: 'Luca' }]

test('accetta prenotazioni, spese, orari e impostazioni nuove', () => {
  const v = viaggioDiProva({
    persone: tre,
    giorni: [giornoDiProva({
      id: 'g0',
      tappe: [tappaDiProva({ id: 'a', ora: '10:00', orari: { chiusoIl: [1, 3], apre: '09:00', chiude: '17:00', nota: 'verifica', fonte: 'base' } })],
    })],
    prenotazioni: [prenotazioneDiProva({
      id: 'pr-1', tipo: 'volo', titolo: 'Volo Roma → Tokyo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome',
      fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo', luogo: { nome: 'Fiumicino', query: 'Rome Fiumicino Airport', lat: 41.8, lng: 12.24 },
      codice: 'ABC123', riferimento: 'AZ 784', daPrenotareEntro: '2027-07-15', costo: { importo: 850, valuta: 'EUR' },
      link: 'https://www.ita-airways.com', allegati: [{ id: 'a-1', nome: 'carta.jpg', mime: 'image/jpeg', byte: 120000 }], tappaId: 'a',
    })],
    spese: [
      spesaDiProva({ id: 's-1', pagatoDa: 'p2', divisaFra: ['p1', 'p2', 'p3'] }),
      spesaDiProva({ id: 's-2', valuta: 'EUR', importo: 12.5, metodo: 'carta', rimborso: true }),
    ],
    impostazioni: { tema: 'auto', budgetGiornaliero: { importo: 15000, valuta: 'JPY' }, cambioManuale: 160, ultimoCambio: { valore: 162.4, data: '2027-08-10' } },
  })
  const r = validaViaggio(v)
  expect(r.ok ? [] : r.errori).toEqual([])
})

test('rifiuta prenotazioni sbagliate', () => {
  const v = viaggioDiProva({
    prenotazioni: [
      prenotazioneDiProva({ id: 'x', tipo: 'nave' as never, inizio: '2027-08-07 12:30', fuso: 'Marte/Olimpo', allegati: [{ id: 'a', nome: 'x', mime: 'image/jpeg' } as never] }),
      prenotazioneDiProva({ id: 'x', stato: 'forse' as never, costo: { importo: -1, valuta: 'JPY' }, daPrenotareEntro: '2027-02-31' }),
    ],
  })
  expect(rifiutato(v)).toEqual(expect.arrayContaining([
    'prenotazione x: tipo non valido "nave"',
    'prenotazione x: inizio non valido "2027-08-07 12:30"',
    'prenotazione x: fuso non valido "Marte/Olimpo"',
    'prenotazione x: allegato non valido',
    'id prenotazione duplicato: x',
    'prenotazione x: stato non valido "forse"',
    'prenotazione x: costo non valido',
    'prenotazione x: data entro cui prenotare non valida',
  ]))
})

test('rifiuta spese sbagliate', () => {
  const v = viaggioDiProva({
    spese: [
      spesaDiProva({ id: 's', importo: 0, divisaFra: [] }),
      spesaDiProva({ id: 't', pagatoDa: 'p9', metodo: 'bitcoin' as never, valuta: 'USD' as never, cambio: 0 }),
      spesaDiProva({ id: 'u', divisaFra: ['p1', 'p1'], data: '10 agosto' }),
    ],
  })
  expect(rifiutato(v)).toEqual(expect.arrayContaining([
    'spesa s: importo non valido',
    'spesa s: divisione non valida',
    'spesa t: chi ha pagato non è fra le persone',
    'spesa t: metodo non valido "bitcoin"',
    'spesa t: valuta non valida "USD"',
    'spesa t: cambio non valido',
    'spesa u: divisione non valida',
    'spesa u: data non valida',
  ]))
})

test('rifiuta orari e impostazioni sbagliati', () => {
  const v = viaggioDiProva({
    giorni: [giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', orari: { chiusoIl: [7], apre: '9:00', fonte: 'sito' as never } })] })],
    impostazioni: { tema: 'auto', budgetGiornaliero: { importo: -5, valuta: 'JPY' }, cambioManuale: 0, ultimoCambio: { valore: 160, data: 'ieri' } },
  })
  expect(rifiutato(v)).toEqual(expect.arrayContaining([
    'tappa a: giorni di chiusura non validi',
    'tappa a: ora di apertura non valida',
    'tappa a: fonte degli orari non valida',
    'budget giornaliero non valido',
    'cambio manuale non valido',
    'ultimo cambio non valido',
  ]))
})

test('un viaggio della fase 1, senza niente di nuovo, resta valido', () => {
  expect(validaViaggio(viaggioDiProva({ prenotazioni: [], spese: [] })).ok).toBe(true)
})
