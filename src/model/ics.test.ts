import { describe, expect, test } from 'vitest'
import { giornoDiProva, prenotazioneDiProva as p, tappaDiProva, viaggioDiProva } from './fixture'
import { eventiCalendario, generaIcs, istanteIcs, piegaRiga, testoIcs, voloDiRitorno } from './ics'

const adesso = new Date('2026-10-01T08:00:00Z')
const byte = (s: string) => new TextEncoder().encode(s).length

// Viaggio di prova: tre giorni, dall'8 al 10 agosto 2027.
const viaggio = () => viaggioDiProva({
  giorni: [
    giornoDiProva({
      id: 'g0',
      tappe: [
        tappaDiProva({ id: 't-a', ora: '11:15', durataMin: 90, titolo: 'Tokyo Skytree', luogo: { nome: 'Skytree', query: 'Tokyo Skytree' } }),
        tappaDiProva({ id: 't-b', titolo: 'Senza ora' }),
      ],
    }),
    giornoDiProva({ id: 'g1' }),
    giornoDiProva({ id: 'g2', cittaId: 'kyoto' }),
  ],
  prenotazioni: [
    p({ id: 'andata', tipo: 'volo', titolo: 'Volo Roma → Tokyo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome', fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo', codice: 'ABC123' }),
    p({ id: 'hotel', tipo: 'hotel', titolo: 'Kyoto Gion Hotel', stato: 'prenotata', inizio: '2027-08-09T15:00', fine: '2027-08-10T10:00', luogo: { nome: 'Kyoto Gion Hotel', query: 'x', indirizzoJa: '京都市東山区' } }),
    p({ id: 'museo', titolo: 'Museo, biglietto; intero', inizio: '2027-08-09T10:00', daPrenotareEntro: '2027-07-15', link: 'https://www.kanazawa21.jp/' }),
    p({ id: 'senza-data', titolo: 'Da decidere' }),
    p({ id: 'ritorno', tipo: 'volo', titolo: 'Volo Tokyo → Roma', inizio: '2027-08-10T20:00' }),
  ],
})

test('istanteIcs: UTC compatto', () => {
  expect(istanteIcs(new Date('2027-08-07T10:30:00Z'))).toBe('20270807T103000Z')
})

test('testoIcs: escaping RFC 5545', () => {
  expect(testoIcs('Cena, sushi; sake\\ e\nbasta')).toBe('Cena\\, sushi\\; sake\\\\ e\\nbasta')
})

describe('piegaRiga', () => {
  test('le righe corte restano intere', () => {
    expect(piegaRiga('SUMMARY:Ciao')).toBe('SUMMARY:Ciao')
  })
  test('spezza a 75 ottetti, la continuazione comincia con uno spazio', () => {
    const riga = 'DESCRIPTION:' + 'x'.repeat(100)
    const parti = piegaRiga(riga).split('\r\n')
    expect(parti.map(byte)).toEqual([75, 38])
    expect(parti[1].startsWith(' ')).toBe(true)
    expect(piegaRiga(riga).replace(/\r\n /g, '')).toBe(riga)
  })
  test('non spezza a metà un carattere giapponese', () => {
    const riga = 'LOCATION:' + 'あ'.repeat(40)
    for (const r of piegaRiga(riga).split('\r\n')) expect(byte(r)).toBeLessThanOrEqual(75)
    expect(piegaRiga(riga).replace(/\r\n /g, '')).toBe(riga)
  })
})

describe('eventiCalendario', () => {
  test('ogni prenotazione con inizio, in UTC dal suo fuso', () => {
    const e = eventiCalendario(viaggio(), { tappe: false })
    const andata = e.find(x => x.uid === 'prenotazione-andata@jap-itinerario')!
    expect(andata.quando).toEqual({ tipo: 'ore', inizio: new Date('2027-08-07T10:30:00Z'), fine: new Date('2027-08-08T05:00:00Z') })
    expect(andata.avviso).toBe('-PT3H')
    expect(andata.descrizione).toBe('Codice: ABC123')
    const hotel = e.find(x => x.uid === 'prenotazione-hotel@jap-itinerario')!
    expect(hotel.avviso).toBe('-PT1H')
    expect(hotel.luogo).toBe('Kyoto Gion Hotel · 京都市東山区')
    const museo = e.find(x => x.uid === 'prenotazione-museo@jap-itinerario')!
    expect(museo.quando).toEqual({ tipo: 'ore', inizio: new Date('2027-08-09T01:00:00Z'), fine: new Date('2027-08-09T02:00:00Z') })
    expect(e.some(x => x.uid.includes('senza-data'))).toBe(false)
  })
  test('promemoria per prenotare entro la scadenza, alle 9 di quel giorno', () => {
    const e = eventiCalendario(viaggio(), { tappe: false }).find(x => x.uid === 'prenotare-museo@jap-itinerario')
    expect(e).toEqual({
      uid: 'prenotare-museo@jap-itinerario', quando: { tipo: 'giorno', data: '2027-07-15' },
      titolo: 'Prenotare: Museo, biglietto; intero', descrizione: 'https://www.kanazawa21.jp/', avviso: 'PT9H',
    })
  })
  test('una prenotazione già fatta non ha il promemoria della scadenza', () => {
    const v = viaggio()
    v.prenotazioni[2] = { ...v.prenotazioni[2], stato: 'prenotata' }
    expect(eventiCalendario(v, { tappe: false }).some(x => x.uid.startsWith('prenotare-'))).toBe(false)
  })
  test('tax-free 4 ore prima del volo di ritorno', () => {
    const v = viaggio()
    expect(voloDiRitorno(v)?.id).toBe('ritorno')
    const t = eventiCalendario(v, { tappe: false }).find(x => x.uid === 'taxfree@jap-itinerario')!
    expect(t.titolo).toBe('Tax-free: rimborso in aeroporto prima del check-in')
    expect(t.quando).toEqual({ tipo: 'ore', inizio: new Date('2027-08-10T07:00:00Z'), fine: new Date('2027-08-10T07:30:00Z') })
  })
  test('senza volo di ritorno niente tax-free: il volo di andata non conta', () => {
    const v = viaggio()
    v.prenotazioni = v.prenotazioni.filter(x => x.id !== 'ritorno')
    expect(voloDiRitorno(v)).toBeNull()
    expect(eventiCalendario(v, { tappe: false }).some(x => x.uid === 'taxfree@jap-itinerario')).toBe(false)
  })
  test('le tappe solo con l\'interruttore, e senza avviso', () => {
    expect(eventiCalendario(viaggio(), { tappe: false }).some(x => x.uid.startsWith('tappa-'))).toBe(false)
    const tappe = eventiCalendario(viaggio(), { tappe: true }).filter(x => x.uid.startsWith('tappa-'))
    expect(tappe).toEqual([{
      uid: 'tappa-t-a@jap-itinerario', titolo: 'Tokyo Skytree', luogo: 'Skytree',
      quando: { tipo: 'ore', inizio: new Date('2027-08-08T02:15:00Z'), fine: new Date('2027-08-08T03:45:00Z') },
    }])
  })
})

describe('generaIcs', () => {
  test('calendario con CRLF, UID stabili, UTC e VALARM', () => {
    const testo = generaIcs(viaggio(), { tappe: false, adesso })
    expect(testo.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(testo.endsWith('END:VCALENDAR\r\n')).toBe(true)
    const righe = testo.replace(/\r\n /g, '').split('\r\n')
    expect(righe).toEqual(expect.arrayContaining([
      'UID:prenotazione-andata@jap-itinerario',
      'DTSTAMP:20261001T080000Z',
      'DTSTART:20270807T103000Z',
      'DTEND:20270808T050000Z',
      'SUMMARY:Volo Roma → Tokyo',
      'TRIGGER:-PT3H',
      'DTSTART;VALUE=DATE:20270715',
      'DTEND;VALUE=DATE:20270716',
      'TRIGGER:PT9H',
      'SUMMARY:Prenotare: Museo\\, biglietto\\; intero',
    ]))
    // andata, hotel, museo, ritorno, scadenza del museo, tax-free
    expect(righe.filter(r => r === 'BEGIN:VEVENT').length).toBe(6)
    expect(righe.filter(r => r === 'END:VEVENT').length).toBe(6)
    expect(righe.filter(r => r === 'BEGIN:VALARM').length).toBe(6)
  })
  test('rigenerato un altro giorno, gli UID non cambiano', () => {
    const uid = (t: string) => t.split('\r\n').filter(r => r.startsWith('UID:'))
    expect(uid(generaIcs(viaggio(), { tappe: true, adesso }))).toEqual(uid(generaIcs(viaggio(), { tappe: true, adesso: new Date('2027-08-01T00:00:00Z') })))
  })
  test('nessuna riga supera i 75 ottetti', () => {
    const v = viaggio()
    v.prenotazioni[0].note = 'Nota lunghissima con virgole, punti e virgola; e a capo\n'.repeat(10)
    for (const r of generaIcs(v, { tappe: true, adesso }).split('\r\n')) expect(byte(r)).toBeLessThanOrEqual(75)
  })
})

describe('robustezza', () => {
  test('un id con a capo non inietta righe: UID solo con caratteri sicuri', () => {
    const cattivo = 'x\r\nEND:VCALENDAR\r\nBEGIN:VEVENT'
    const v = viaggioDiProva({
      giorni: [giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: cattivo, ora: '10:00' })] })],
      prenotazioni: [p({ id: cattivo, inizio: '2027-08-09T10:00' })],
    })
    const testo = generaIcs(v, { tappe: true, adesso })
    const righe = testo.split('\r\n')
    expect(righe.filter(r => r === 'BEGIN:VCALENDAR').length).toBe(1)
    expect(righe.filter(r => r === 'END:VCALENDAR').length).toBe(1)
    const uid = righe.filter(r => r.startsWith('UID:'))
    expect(uid.length).toBe(2)
    for (const u of uid) expect(u).toMatch(/^UID:[A-Za-z0-9._@-]+$/)
  })
  test('inizio o fuso malformati: nessuna eccezione, prenotazione saltata', () => {
    const v = viaggioDiProva({
      prenotazioni: [
        p({ id: 'a', inizio: 'abc' }),
        p({ id: 'b', inizio: '2027-08-07' }),
        p({ id: 'c', inizio: '2027-08-09T10:00', fuso: 'Marte/Olimpo' }),
        p({ id: 'd', tipo: 'volo', inizio: '2027-08-10T20:00', fuso: 'Marte/Olimpo' }),
        p({ id: 'e', tipo: 'volo', inizio: 'abc' }),
      ],
    })
    expect(() => generaIcs(v, { tappe: true, adesso })).not.toThrow()
    const e = eventiCalendario(v, { tappe: false })
    expect(e.some(x => x.uid.startsWith('prenotazione-'))).toBe(false)
    expect(voloDiRitorno(v)).toBeNull()
  })
  test('fine malformata o fusoFine ignoto: un\'ora dopo l\'inizio', () => {
    const v = viaggioDiProva({
      prenotazioni: [
        p({ id: 'a', inizio: '2027-08-09T10:00', fine: 'boh' }),
        p({ id: 'b', inizio: '2027-08-09T10:00', fine: '2027-08-09T12:00', fusoFine: 'Marte/Olimpo' }),
      ],
    })
    for (const x of eventiCalendario(v, { tappe: false })) {
      expect(x.quando).toEqual({ tipo: 'ore', inizio: new Date('2027-08-09T01:00:00Z'), fine: new Date('2027-08-09T02:00:00Z') })
    }
  })
  test('una tappa con ora malformata è saltata senza eccezioni', () => {
    const v = viaggioDiProva({ giorni: [giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 't', ora: '25' })] })] })
    expect(() => eventiCalendario(v, { tappe: true })).not.toThrow()
    expect(eventiCalendario(v, { tappe: true }).some(x => x.uid.startsWith('tappa-'))).toBe(false)
  })
  test('una tappa collegata a una prenotazione non compare due volte', () => {
    const v = viaggioDiProva({
      giorni: [giornoDiProva({ id: 'g0', tappe: [
        tappaDiProva({ id: 't-coll', ora: '11:00', titolo: 'Collegata' }),
        tappaDiProva({ id: 't-lib', ora: '12:00', titolo: 'Libera' }),
      ] })],
      prenotazioni: [p({ id: 'x', inizio: '2027-08-08T11:00', tappaId: 't-coll' })],
    })
    const tappe = eventiCalendario(v, { tappe: true }).filter(x => x.uid.startsWith('tappa-'))
    expect(tappe.map(x => x.uid)).toEqual(['tappa-t-lib@jap-itinerario'])
  })
})
