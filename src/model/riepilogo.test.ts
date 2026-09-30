import { expect, test } from 'vitest'
import { backupDaFare, bigliettiDaPrenotare, cittaDi, statistiche } from './riepilogo'
import { giornoDiProva, tappaDiProva, viaggioDiProva } from './fixture'

const v = viaggioDiProva({
  giorni: [
    giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', biglietti: { link: null } }), tappaDiProva({ id: 'b', stato: 'fatta' })] }),
    giornoDiProva({ id: 'g1', cittaId: 'kyoto', tappe: [tappaDiProva({ id: 'c', biglietti: { link: 'https://x' }, stato: 'saltata' }), tappaDiProva({ id: 'd', biglietti: { link: 'https://y' } })] }),
  ],
})

test('bigliettiDaPrenotare esclude le saltate e porta la data', () => {
  const r = bigliettiDaPrenotare(v)
  expect(r.map(x => [x.tappa.id, x.data, x.indice])).toEqual([['a', '2027-08-08', 0], ['d', '2027-08-09', 1]])
})

test('statistiche', () => {
  expect(statistiche(v)).toEqual({ giorni: 2, citta: 2, tappe: 4, fatte: 1 })
})

test('backupDaFare', () => {
  const adesso = new Date('2027-08-10T12:00:00Z')
  expect(backupDaFare(undefined, adesso)).toBe(true)
  expect(backupDaFare('2027-08-09T12:00:00Z', adesso)).toBe(false)
  expect(backupDaFare('2027-08-06T12:00:00Z', adesso)).toBe(true)
})

test('cittaDi con città mancante restituisce un segnaposto', () => {
  expect(cittaDi(v, v.giorni[1]).nome).toBe('Kyoto')
  expect(cittaDi(v, giornoDiProva({ id: 'z', cittaId: 'boh' })).nome).toBe('Senza città')
})
