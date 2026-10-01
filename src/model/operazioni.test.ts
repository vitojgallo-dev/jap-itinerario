import { describe, expect, test } from 'vitest'
import { giornoDiProva, prenotazioneDiProva, tappaDiProva as t, viaggioDiProva } from './fixture'
import * as op from './operazioni'

const base = () => viaggioDiProva({
  giorni: [
    giornoDiProva({ id: 'g0', alloggio: { nome: 'Hotel A', query: 'Hotel A' }, tappe: [t({ id: 'a', ora: '09:00' }), t({ id: 'b', ora: '12:00' })] }),
    giornoDiProva({ id: 'g1', alloggio: { nome: 'Hotel A', query: 'Hotel A' }, tappe: [t({ id: 'c', ora: '10:00', stato: 'fatta', nota: 'bello' })] }),
    giornoDiProva({ id: 'g2', cittaId: 'kyoto' }),
  ],
})

describe('tappe', () => {
  test('aggiornaTappa non muta l\'originale e riordina se cambia l\'ora', () => {
    const v = base()
    const n = op.aggiornaTappa(v, 'g0', 'a', { ora: '13:00', titolo: 'A2' })
    expect(v.giorni[0].tappe[0].titolo).toBe('a')
    expect(n.giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
    expect(n.giorni[0].tappe[1].titolo).toBe('A2')
  })
  test('aggiornaTappa senza ora non riordina', () => {
    const v = op.spostaTappa(base(), 'g0', 0, 1)
    expect(op.aggiornaTappa(v, 'g0', 'a', { nota: 'x' }).giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
  })
  test('aggiungiTappa la mette al posto giusto per ora', () => {
    const n = op.aggiungiTappa(base(), 'g0', t({ id: 'n', ora: '10:30' }))
    expect(n.giorni[0].tappe.map(x => x.id)).toEqual(['a', 'n', 'b'])
    const senzaOra = op.aggiungiTappa(base(), 'g0', t({ id: 'm' }))
    expect(senzaOra.giorni[0].tappe.map(x => x.id)).toEqual(['a', 'b', 'm'])
  })
  test('eliminaTappa e spostaTappa', () => {
    expect(op.eliminaTappa(base(), 'g0', 'a').giorni[0].tappe.map(x => x.id)).toEqual(['b'])
    expect(op.spostaTappa(base(), 'g0', 1, 0).giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
  })
  test('id sconosciuti lanciano un errore', () => {
    expect(() => op.aggiornaTappa(base(), 'g9', 'a', {})).toThrow('giorno g9')
    expect(() => op.aggiornaTappa(base(), 'g0', 'z', {})).toThrow('tappa z')
  })
  test('spostaTappa con da fuori range lancia errore', () => {
    expect(() => op.spostaTappa(base(), 'g0', 5, 0)).toThrow('posizione 5 fuori dall\'elenco')
  })
  test('nuovaTappa ha valori di partenza', () => {
    const n = op.nuovaTappa({ titolo: 'X' })
    expect(n).toMatchObject({ titolo: 'X', ora: null, tipo: 'visita', stato: 'da-fare', nota: '', descrizione: '', consiglio: '', sera: false })
    expect(n.id).toMatch(/^t-/)
  })
})

describe('giorni', () => {
  test('aggiungiGiorno dopo un indice', () => {
    const n = op.aggiungiGiorno(base(), 0, 'kyoto')
    expect(n.giorni).toHaveLength(4)
    expect(n.giorni[1]).toMatchObject({ cittaId: 'kyoto', tappe: [], titolo: 'Nuovo giorno' })
  })
  test('duplicaGiorno cambia gli id e azzera stati e note', () => {
    const n = op.duplicaGiorno(base(), 'g1')
    expect(n.giorni).toHaveLength(4)
    const copia = n.giorni[2]
    expect(copia.id).not.toBe('g1')
    expect(copia.tappe[0].id).not.toBe('c')
    expect(copia.tappe[0]).toMatchObject({ stato: 'da-fare', nota: '' })
  })
  test('eliminaGiorno, spostaGiorno, aggiornaGiorno', () => {
    expect(op.eliminaGiorno(base(), 'g1').giorni.map(g => g.id)).toEqual(['g0', 'g2'])
    expect(op.spostaGiorno(base(), 2, 0).giorni.map(g => g.id)).toEqual(['g2', 'g0', 'g1'])
    expect(op.aggiornaGiorno(base(), 'g2', { cittaId: 'tokyo', titolo: 'T' }).giorni[2]).toMatchObject({ cittaId: 'tokyo', titolo: 'T' })
  })
  test('spostaGiorno con a fuori range si clampizza al limite', () => {
    expect(op.spostaGiorno(base(), 0, 99).giorni.map(g => g.id)).toEqual(['g1', 'g2', 'g0'])
  })
  test('duplicaGiorno non muta il viaggio originale', () => {
    const v = base()
    const n = op.duplicaGiorno(v, 'g1')
    expect(v.giorni).toHaveLength(3)
    expect(v.giorni[1].id).toBe('g1')
    expect(v.giorni[1].tappe[0].stato).toBe('fatta')
    expect(v.giorni[1].tappe[0].nota).toBe('bello')
    expect(n.giorni).toHaveLength(4)
  })
  test('aggiornaAlloggio cambia tutti i giorni con lo stesso hotel', () => {
    const n = op.aggiornaAlloggio(base(), 'Hotel A', { indirizzoJa: '東京都台東区' })
    expect(n.giorni.slice(0, 2).map(g => g.alloggio?.indirizzoJa)).toEqual(['東京都台東区', '東京都台東区'])
    expect(n.giorni[2].alloggio).toBeNull()
  })
})

describe('città, viaggio, impostazioni', () => {
  test('aggiungiCitta, aggiornaCitta, eliminaCitta', () => {
    const { viaggio, id } = op.aggiungiCitta(base(), { nome: 'Nara', kanji: '奈良', romaji: 'Nara', colore: '#123456', lat: 34.68, lng: 135.8, intro: '', clima: { max: 33, min: 23 } })
    expect(viaggio.citta.find(c => c.id === id)?.nome).toBe('Nara')
    expect(op.aggiornaCitta(viaggio, id, { colore: '#000000' }).citta.find(c => c.id === id)?.colore).toBe('#000000')
    expect(op.eliminaCitta(viaggio, id).citta.some(c => c.id === id)).toBe(false)
    expect(() => op.eliminaCitta(viaggio, 'kyoto')).toThrow('usata')
  })
  test('aggiornaViaggio, aggiornaPersona, aggiornaImpostazioni', () => {
    const n = op.aggiornaImpostazioni(op.aggiornaPersona(op.aggiornaViaggio(base(), { dataPartenza: '2027-08-09' }), 'p1', 'V'), { tema: 'scuro' })
    expect(n.dataPartenza).toBe('2027-08-09')
    expect(n.persone[0].nome).toBe('V')
    expect(n.impostazioni.tema).toBe('scuro')
  })
})

describe('sostituisciTappa', () => {
  test('toglie davvero i campi eliminati e riordina', () => {
    const v = op.aggiornaTappa(base(), 'g0', 'a', { evento: { nome: 'E', affidabilita: 'certa' } })
    const senzaEvento = { ...v.giorni[0].tappe[0], ora: '15:00' }
    delete senzaEvento.evento
    const n = op.sostituisciTappa(v, 'g0', senzaEvento)
    expect(n.giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
    expect('evento' in n.giorni[0].tappe[1]).toBe(false)
  })
  test('senza cambio di ora sostituisce sul posto e conserva l ordine manuale', () => {
    const v = op.spostaTappa(base(), 'g0', 1, 0)
    expect(v.giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
    const n = op.sostituisciTappa(v, 'g0', { ...v.giorni[0].tappe[1], descrizione: 'nuova' })
    expect(n.giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
    expect(n.giorni[0].tappe[1].descrizione).toBe('nuova')
  })
  test('una tappa inesistente lancia', () => {
    expect(() => op.sostituisciTappa(base(), 'g0', t({ id: 'z' }))).toThrow('tappa z')
  })
})

describe('integraDatiDiPartenza', () => {
  const base = viaggioDiProva({
    giorni: [giornoDiProva({ id: 'g0', tappe: [t({ id: 'a', orari: { chiusoIl: [1], fonte: 'base' } }), t({ id: 'b', orari: { chiusoIl: [], apre: '09:00', fonte: 'base' } })] })],
    prenotazioni: [prenotazioneDiProva({ id: 'pr-1', tappaId: 'a' }), prenotazioneDiProva({ id: 'pr-2', tappaId: 'z' }), prenotazioneDiProva({ id: 'pr-3' })],
  })
  test('aggiunge solo quello che manca', () => {
    const mio = viaggioDiProva({
      giorni: [giornoDiProva({ id: 'g0', tappe: [t({ id: 'a' }), t({ id: 'b', orari: { chiusoIl: [3], fonte: 'manuale' } })] })],
      prenotazioni: [prenotazioneDiProva({ id: 'pr-3', codice: 'MIO' })],
    })
    const r = op.integraDatiDiPartenza(mio, base)
    expect(r.prenotazioni).toBe(2)
    expect(r.orari).toBe(1)
    expect(r.viaggio.prenotazioni.map(p => p.id)).toEqual(['pr-3', 'pr-1', 'pr-2'])
    expect(r.viaggio.prenotazioni[0].codice).toBe('MIO')
    expect(r.viaggio.giorni[0].tappe[0].orari).toEqual({ chiusoIl: [1], fonte: 'base' })
    expect(r.viaggio.giorni[0].tappe[1].orari).toEqual({ chiusoIl: [3], fonte: 'manuale' })
  })
  test('un collegamento a una tappa che non c\'è più viene tolto', () => {
    const r = op.integraDatiDiPartenza(viaggioDiProva({ giorni: [giornoDiProva({ id: 'g0', tappe: [t({ id: 'a' })] })] }), base)
    expect(r.viaggio.prenotazioni.find(p => p.id === 'pr-1')?.tappaId).toBe('a')
    expect('tappaId' in r.viaggio.prenotazioni.find(p => p.id === 'pr-2')!).toBe(false)
  })
  test('già tutto presente: niente da aggiungere', () => {
    const r = op.integraDatiDiPartenza(base, base)
    expect([r.prenotazioni, r.orari]).toEqual([0, 0])
  })
})
