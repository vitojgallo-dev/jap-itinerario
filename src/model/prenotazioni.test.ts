import { describe, expect, test } from 'vitest'
import { prenotazioneDiProva as p, viaggioDiProva } from './fixture'
import { notteCoperta } from './prenotazioni'

describe('notteCoperta', () => {
  const v = viaggioDiProva({
    prenotazioni: [
      p({ id: 'nikko', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-12T15:00', fine: '2027-08-13T10:00' }),
      p({ id: 'kanazawa', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-13T15:00', fine: '2027-08-15T10:00' }),
      p({ id: 'kyoto', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-15T15:00', fine: '2027-08-20T10:00' }),
      p({ id: 'osaka', tipo: 'hotel', stato: 'da-prenotare', inizio: '2027-08-20T15:00', fine: '2027-08-24T10:00' }),
      p({ id: 'museo', tipo: 'biglietto', stato: 'prenotata', inizio: '2027-08-16T10:00', fine: '2027-08-17T10:00' }),
      p({ id: 'senza-fine', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-24T15:00' }),
    ],
  })
  test('dal giorno del check-in al giorno prima del check-out', () => {
    expect(notteCoperta(v, '2027-08-15')?.id).toBe('kyoto')
    expect(notteCoperta(v, '2027-08-19')?.id).toBe('kyoto')
    expect(notteCoperta(v, '2027-08-20')).toBeNull()
  })
  test('il giorno del cambio di hotel conta quello nuovo', () => {
    expect(notteCoperta(v, '2027-08-12')?.id).toBe('nikko')
    expect(notteCoperta(v, '2027-08-13')?.id).toBe('kanazawa')
  })
  test('solo hotel prenotati, con check-in e check-out', () => {
    expect(notteCoperta(v, '2027-08-21')).toBeNull()
    expect(notteCoperta(v, '2027-08-16')?.id).toBe('kyoto')
    expect(notteCoperta(v, '2027-08-24')).toBeNull()
  })
})
