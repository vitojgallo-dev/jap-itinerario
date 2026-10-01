import { describe, expect, test } from 'vitest'
import { giornoDiProva, prenotazioneDiProva as p, tappaDiProva, viaggioDiProva } from './fixture'
import {
  aggiornaPrenotazione, aggiungiPrenotazione, controllaPrenotazione, descriviIstante, descriviQuando, eliminaPrenotazione,
  etichetteDate, gruppiDocumenti, notteCoperta, nuovaPrenotazione, scadenza, sostituisciPrenotazione, tappaCollegata,
} from './prenotazioni'

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
  test('se due si sovrappongono vince il check-in più recente', () => {
    const w = viaggioDiProva({
      prenotazioni: [
        p({ id: 'vecchio', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-10T15:00', fine: '2027-08-14T10:00' }),
        p({ id: 'nuovo', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-12T15:00', fine: '2027-08-16T10:00' }),
      ],
    })
    expect(notteCoperta(w, '2027-08-13')?.id).toBe('nuovo')
    expect(notteCoperta(w, '2027-08-11')?.id).toBe('vecchio')
  })
  test('a parità di check-in la scelta è deterministica', () => {
    const lista = [
      p({ id: 'b', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-10T15:00', fine: '2027-08-14T10:00' }),
      p({ id: 'a', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-10T15:00', fine: '2027-08-14T10:00' }),
    ]
    expect(notteCoperta(viaggioDiProva({ prenotazioni: lista }), '2027-08-11')?.id).toBe('a')
    expect(notteCoperta(viaggioDiProva({ prenotazioni: [...lista].reverse() }), '2027-08-11')?.id).toBe('a')
  })
  test('solo hotel prenotati, con check-in e check-out', () => {
    expect(notteCoperta(v, '2027-08-21')).toBeNull()
    expect(notteCoperta(v, '2027-08-16')?.id).toBe('kyoto')
    expect(notteCoperta(v, '2027-08-24')).toBeNull()
  })
})

describe('operazioni', () => {
  test('nuova, aggiungi, sostituisci, aggiorna, elimina', () => {
    const n = nuovaPrenotazione('hotel')
    expect(n).toMatchObject({ tipo: 'hotel', titolo: '', stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [] })
    expect(n.id).toMatch(/^pr-/)
    const v = aggiungiPrenotazione(viaggioDiProva(), { ...n, titolo: 'Hotel' })
    expect(v.prenotazioni.map(x => x.titolo)).toEqual(['Hotel'])
    expect(sostituisciPrenotazione(v, { ...n, titolo: 'Ryokan' }).prenotazioni[0].titolo).toBe('Ryokan')
    expect(aggiornaPrenotazione(v, n.id, { stato: 'prenotata', codice: 'X1' }).prenotazioni[0]).toMatchObject({ titolo: 'Hotel', stato: 'prenotata', codice: 'X1' })
    expect(eliminaPrenotazione(v, n.id).prenotazioni).toEqual([])
    expect(() => aggiornaPrenotazione(v, 'boh', {})).toThrow('prenotazione boh')
  })
})

describe('controllaPrenotazione', () => {
  test('titolo obbligatorio', () => {
    expect(controllaPrenotazione(p({ id: 'a', titolo: '  ' }))).toEqual(['Scrivi un titolo.'])
  })
  test('fine prima dell\'inizio, confrontate ognuna nel suo fuso', () => {
    const volo = p({ id: 'v', tipo: 'volo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome', fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo' })
    expect(controllaPrenotazione(volo)).toEqual([])
    // Le 07:00 di Tokyo del 7 agosto sono la mezzanotte di Roma: prima della partenza delle 12:30.
    expect(controllaPrenotazione({ ...volo, fine: '2027-08-07T07:00' })).toEqual(["La fine è prima dell'inizio."])
    expect(controllaPrenotazione(p({ id: 'h', tipo: 'hotel', inizio: '2027-08-15T15:00', fine: '2027-08-15T10:00' }))).toEqual(['Il check-out è prima del check-in.'])
  })
  test('una fine senza inizio', () => {
    expect(controllaPrenotazione(p({ id: 'h', tipo: 'hotel', fine: '2027-08-15T10:00' }))).toEqual(['Manca il check-in.'])
  })
})

describe('scadenza', () => {
  const entro = p({ id: 'a', daPrenotareEntro: '2027-07-15' })
  test('vicina da 7 giorni prima, poi scaduta', () => {
    expect(scadenza(entro, '2027-07-07')).toBe('lontana')
    expect(scadenza(entro, '2027-07-08')).toBe('vicina')
    expect(scadenza(entro, '2027-07-15')).toBe('vicina')
    expect(scadenza(entro, '2027-07-16')).toBe('scaduta')
  })
  test('niente scadenza se è già prenotata o manca la data', () => {
    expect(scadenza({ ...entro, stato: 'prenotata' }, '2027-07-16')).toBeNull()
    expect(scadenza(p({ id: 'b' }), '2027-07-16')).toBeNull()
  })
})

test('gruppiDocumenti: per tipo, da prenotare in cima, poi in ordine di inizio', () => {
  const g = gruppiDocumenti([
    p({ id: 'h2', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-15T15:00' }),
    p({ id: 'b1', inizio: '2027-08-09T11:15' }),
    p({ id: 'h1', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-08T15:00' }),
    p({ id: 'h3', tipo: 'hotel', inizio: '2027-08-20T15:00' }),
    p({ id: 'v1', tipo: 'volo', inizio: '2027-08-27T20:00', daPrenotareEntro: '2027-06-01' }),
    p({ id: 'v2', tipo: 'volo', inizio: '2027-08-07T12:30' }),
  ])
  expect(g.map(x => [x.tipo, x.voci.map(v => v.id)])).toEqual([
    ['volo', ['v1', 'v2']],
    ['hotel', ['h3', 'h1', 'h2']],
    ['biglietto', ['b1']],
  ])
})

describe('descrizioni', () => {
  test('descriviIstante nel fuso della prenotazione', () => {
    expect(descriviIstante('2027-08-07T12:30', 'Europe/Rome')).toBe('sab 7 ago · 12:30 ora italiana')
    expect(descriviIstante('2027-08-09T11:15', 'Asia/Tokyo')).toBe('lun 9 ago · 11:15')
    expect(descriviIstante('2027-08-09T11:15', 'America/New_York')).toBe('lun 9 ago · 11:15 America/New_York')
  })
  test('descriviQuando', () => {
    expect(descriviQuando(p({ id: 'v', tipo: 'volo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome' }))).toBe('sab 7 ago · 12:30 ora italiana')
    expect(descriviQuando(p({ id: 'h', tipo: 'hotel', inizio: '2027-08-15T15:00', fine: '2027-08-20T10:00' }))).toBe('dom 15 ago → ven 20 ago')
    expect(descriviQuando(p({ id: 'x' }))).toBe('')
  })
  test('etichetteDate', () => {
    expect(etichetteDate('hotel')).toEqual(['Check-in', 'Check-out'])
    expect(etichetteDate('volo')).toEqual(['Partenza', 'Arrivo'])
    expect(etichetteDate('biglietto')).toEqual(['Inizio', 'Fine'])
  })
})

test('tappaCollegata', () => {
  const v = viaggioDiProva({ giorni: [giornoDiProva({ id: 'g0' }), giornoDiProva({ id: 'g1', tappe: [tappaDiProva({ id: 't1', titolo: 'Skytree' })] })] })
  expect(tappaCollegata(v, 't1')).toMatchObject({ indice: 1, tappa: { titolo: 'Skytree' } })
  expect(tappaCollegata(v, 'z')).toBeNull()
  expect(tappaCollegata(v, undefined)).toBeNull()
})
