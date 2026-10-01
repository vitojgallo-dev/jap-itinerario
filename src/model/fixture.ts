import type { Citta, Giorno, Prenotazione, Spesa, Tappa, Viaggio } from './tipi'

export function tappaDiProva(p: Partial<Tappa> & { id: string }): Tappa {
  return { ora: null, titolo: p.id, descrizione: '', consiglio: '', tipo: 'visita', sera: false, stato: 'da-fare', nota: '', ...p }
}

export function giornoDiProva(p: Partial<Giorno> & { id: string }): Giorno {
  return { cittaId: 'tokyo', titolo: p.id, intro: '', note: '', alloggio: null, consigli: [], avvisi: [], suggerimenti: [], speciale: null, tappe: [], ...p }
}

export const cittaDiProva: Citta[] = [
  { id: 'tokyo', nome: 'Tokyo', kanji: '東京', romaji: 'Tōkyō', colore: '#E4572E', lat: 35.68, lng: 139.65, intro: '', clima: { max: 31, min: 24 } },
  { id: 'kyoto', nome: 'Kyoto', kanji: '京都', romaji: 'Kyōto', colore: '#3A6EA5', lat: 35.01, lng: 135.77, intro: '', clima: { max: 34, min: 24 } },
]

export function viaggioDiProva(p: Partial<Viaggio> = {}): Viaggio {
  return {
    versione: 2, titolo: 'Prova', dataPartenza: '2027-08-08',
    persone: [{ id: 'p1', nome: 'Vito' }], citta: cittaDiProva,
    giorni: [giornoDiProva({ id: 'g0' }), giornoDiProva({ id: 'g1' }), giornoDiProva({ id: 'g2', cittaId: 'kyoto' })],
    prenotazioni: [], spese: [], checklist: [], impostazioni: { tema: 'auto' },
    ...p,
  }
}

export function prenotazioneDiProva(p: Partial<Prenotazione> & { id: string }): Prenotazione {
  return { tipo: 'biglietto', titolo: p.id, stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [], ...p }
}

export function spesaDiProva(p: Partial<Spesa> & { id: string }): Spesa {
  return {
    data: '2027-08-10', importo: 1000, valuta: 'JPY', cambio: 160, categoria: 'cibo', descrizione: p.id,
    pagatoDa: 'p1', divisaFra: ['p1'], metodo: 'contanti', ...p,
  }
}
