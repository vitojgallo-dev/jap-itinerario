import { expect, test } from 'vitest'
import { giornoDiProva, prenotazioneDiProva as p, tappaDiProva as t, viaggioDiProva } from './fixture'
import { cerca, normalizzaTesto } from './ricerca'

const v = viaggioDiProva({
  giorni: [
    giornoDiProva({ id: 'g0', tappe: [t({ id: 'a', titolo: 'Tōdai-ji', descrizione: 'Grande Buddha' }), t({ id: 'b', titolo: 'Pranzo', nota: 'Caffè buonissimo' })] }),
    giornoDiProva({ id: 'g1', tappe: [t({ id: 'c', titolo: 'Kinkaku-ji', consiglio: 'Arrivate presto, prima del TODAI' })] }),
    giornoDiProva({ id: 'g2', cittaId: 'kyoto' }),
  ],
  prenotazioni: [p({ id: 'x', titolo: 'Volo', codice: 'AB12CD' }), p({ id: 'y', titolo: 'Hotel', note: 'Colazione vicino al todai' })],
})

test('normalizzaTesto toglie accenti e maiuscole', () => {
  expect(normalizzaTesto('Tōdai-ji Caffè')).toBe('todai-ji caffe')
})

test('ignora maiuscole e accenti', () => {
  expect(cerca(v, 'TODAI').giorni.flatMap(g => g.tappe.map(x => x.id))).toEqual(['a', 'c'])
  expect(cerca(v, 'caffe').giorni.flatMap(g => g.tappe.map(x => x.id))).toEqual(['b'])
})

test('raggruppa le tappe per giorno con la data, e a parte le prenotazioni', () => {
  const r = cerca(v, 'todai')
  expect(r.giorni.map(g => [g.indice, g.data, g.giorno.id, g.tappe.length])).toEqual([[0, '2027-08-08', 'g0', 1], [1, '2027-08-09', 'g1', 1]])
  expect(r.prenotazioni.map(x => x.id)).toEqual(['y'])
  expect(r.totale).toBe(3)
})

test('cerca anche nei codici delle prenotazioni', () => {
  expect(cerca(v, 'ab12').prenotazioni.map(x => x.id)).toEqual(['x'])
})

test('meno di due lettere: niente', () => {
  expect(cerca(v, ' t ')).toEqual({ giorni: [], prenotazioni: [], totale: 0 })
})
