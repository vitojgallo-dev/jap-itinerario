import { expect, test } from 'vitest'
import { tappaDiProva as t } from './fixture'
import { avvisoApertura, descriviOrari, statoApertura } from './orari'

// 2027-08-11 è mercoledì, 2027-08-08 domenica, 2027-08-12 giovedì.
const MERCOLEDI = '2027-08-11'

test('giorno chiuso', () => {
  const x = t({ id: 'a', ora: '10:00', orari: { chiusoIl: [3] } })
  expect(statoApertura(x, MERCOLEDI)).toBe('chiuso-oggi')
  expect(avvisoApertura(x, MERCOLEDI)).toBe('Chiuso il mercoledì')
  expect(avvisoApertura(t({ id: 'b', ora: null, orari: { chiusoIl: [0] } }), '2027-08-08')).toBe('Chiuso la domenica')
  expect(statoApertura(x, '2027-08-12')).toBe('sconosciuto')
})

test('prima dell\'apertura', () => {
  const x = t({ id: 'a', ora: '09:30', orari: { chiusoIl: [], apre: '10:00', chiude: '18:00' } })
  expect(statoApertura(x, MERCOLEDI)).toBe('fuori-orario')
  expect(avvisoApertura(x, MERCOLEDI)).toBe('Apre alle 10:00')
})

test('la durata sfora la chiusura', () => {
  const x = t({ id: 'a', ora: '16:30', durataMin: 60, orari: { chiusoIl: [], apre: '09:00', chiude: '17:00' } })
  expect(statoApertura(x, MERCOLEDI)).toBe('fuori-orario')
  expect(avvisoApertura(x, MERCOLEDI)).toBe('Chiude alle 17:00')
  expect(statoApertura({ ...x, durataMin: 30 }, MERCOLEDI)).toBe('aperto')
  expect(avvisoApertura({ ...x, durataMin: 30 }, MERCOLEDI)).toBeNull()
})

test('dati mancanti', () => {
  expect(statoApertura(t({ id: 'a', ora: '10:00' }), MERCOLEDI)).toBe('sconosciuto')
  expect(statoApertura(t({ id: 'a', ora: null, orari: { chiusoIl: [], apre: '09:00', chiude: '17:00' } }), MERCOLEDI)).toBe('sconosciuto')
  expect(avvisoApertura(t({ id: 'a', ora: '10:00' }), MERCOLEDI)).toBeNull()
})

test('descriviOrari', () => {
  expect(descriviOrari({ chiusoIl: [1], apre: '10:00', chiude: '18:00' })).toBe('10:00–18:00 · chiuso il lunedì')
  expect(descriviOrari({ chiusoIl: [0, 3] })).toBe('chiuso il mercoledì e la domenica')
  expect(descriviOrari({ chiusoIl: [0, 1, 2] })).toBe('chiuso il lunedì, il martedì e la domenica')
  expect(descriviOrari({ chiusoIl: [], apre: '07:30' })).toBe('dalle 07:30')
  expect(descriviOrari({ chiusoIl: [], chiude: '22:30' })).toBe('fino alle 22:30')
  expect(descriviOrari({ chiusoIl: [] })).toBe('Orari non indicati')
})

test('orario che passa la mezzanotte', () => {
  const notte = { chiusoIl: [], apre: '18:00', chiude: '02:00' }
  const v = (ora: string, durataMin?: number) => t({ id: 'a', ora, durataMin, orari: notte })
  expect(statoApertura(v('20:00'), MERCOLEDI)).toBe('aperto')
  expect(avvisoApertura(v('20:00'), MERCOLEDI)).toBeNull()
  expect(statoApertura(v('01:00'), MERCOLEDI)).toBe('aperto')
  expect(avvisoApertura(v('01:00'), MERCOLEDI)).toBeNull()
  expect(statoApertura(v('03:00'), MERCOLEDI)).toBe('fuori-orario')
  expect(avvisoApertura(v('03:00'), MERCOLEDI)).toBe('Apre alle 18:00')
  expect(statoApertura(v('17:00'), MERCOLEDI)).toBe('fuori-orario')
  expect(avvisoApertura(v('17:00'), MERCOLEDI)).toBe('Apre alle 18:00')
  expect(statoApertura(v('01:00', 90), MERCOLEDI)).toBe('fuori-orario')
  expect(avvisoApertura(v('01:00', 90), MERCOLEDI)).toBe('Chiude alle 02:00')
})

test('chiusura a mezzanotte', () => {
  const x = (durataMin: number) => t({ id: 'a', ora: '23:30', durataMin, orari: { chiusoIl: [], apre: '11:00', chiude: '00:00' } })
  expect(statoApertura(x(20), MERCOLEDI)).toBe('aperto')
  expect(statoApertura(x(45), MERCOLEDI)).toBe('fuori-orario')
  expect(avvisoApertura(x(45), MERCOLEDI)).toBe('Chiude alle 00:00')
})

test('finire esattamente alla chiusura è aperto', () => {
  const x = t({ id: 'a', ora: '16:00', durataMin: 60, orari: { chiusoIl: [], apre: '09:00', chiude: '17:00' } })
  expect(statoApertura(x, MERCOLEDI)).toBe('aperto')
})

test('il giorno chiuso vince anche con gli orari', () => {
  const x = t({ id: 'a', ora: '12:00', orari: { chiusoIl: [3], apre: '09:00', chiude: '17:00' } })
  expect(statoApertura(x, MERCOLEDI)).toBe('chiuso-oggi')
  expect(avvisoApertura(x, MERCOLEDI)).toBe('Chiuso il mercoledì')
})
