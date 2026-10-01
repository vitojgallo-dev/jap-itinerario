import { differenzaGiorni, formatoData } from './date'
import { utcDaLocale } from './fusi'
import { istanteSicuro } from './ics'
import { nuovoId } from './id'
import { TIPI_PRENOTAZIONE, type Prenotazione, type Tappa, type TipoPrenotazione, type Viaggio } from './tipi'

/**
 * L'hotel prenotato che copre la notte di `data`: dal giorno del check-in al giorno prima del check-out.
 * Se due si sovrappongono vince quello col check-in più recente. Senza prenotazione, chi chiama usa `Giorno.alloggio`.
 */
export function notteCoperta(v: Viaggio, data: string): Prenotazione | null {
  const coprono = v.prenotazioni.filter(p =>
    p.tipo === 'hotel' && p.stato === 'prenotata' && p.inizio && p.fine
    && p.inizio.slice(0, 10) <= data && data < p.fine.slice(0, 10))
  coprono.sort((a, b) => b.inizio!.localeCompare(a.inizio!) || a.id.localeCompare(b.id))
  return coprono[0] ?? null
}

export function nuovaPrenotazione(tipo: TipoPrenotazione = 'biglietto'): Prenotazione {
  return { id: nuovoId('pr'), tipo, titolo: '', stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [] }
}

function conPrenotazione(v: Viaggio, id: string, fn: (p: Prenotazione) => Prenotazione): Viaggio {
  if (!v.prenotazioni.some(p => p.id === id)) throw new Error(`prenotazione ${id} inesistente`)
  return { ...v, prenotazioni: v.prenotazioni.map(p => (p.id === id ? fn(p) : p)) }
}

export function aggiungiPrenotazione(v: Viaggio, p: Prenotazione): Viaggio {
  return { ...v, prenotazioni: [...v.prenotazioni, p] }
}

export function sostituisciPrenotazione(v: Viaggio, p: Prenotazione): Viaggio {
  return conPrenotazione(v, p.id, () => p)
}

export function aggiornaPrenotazione(v: Viaggio, id: string, modifiche: Partial<Omit<Prenotazione, 'id'>>): Viaggio {
  return conPrenotazione(v, id, p => ({ ...p, ...modifiche }))
}

export function eliminaPrenotazione(v: Viaggio, id: string): Viaggio {
  return { ...v, prenotazioni: v.prenotazioni.filter(p => p.id !== id) }
}

/** "Check-in"/"Check-out" per gli hotel, "Partenza"/"Arrivo" per voli e treni, altrimenti "Inizio"/"Fine". */
export function etichetteDate(tipo: TipoPrenotazione): [string, string] {
  if (tipo === 'hotel') return ['Check-in', 'Check-out']
  if (tipo === 'volo' || tipo === 'treno') return ['Partenza', 'Arrivo']
  return ['Inizio', 'Fine']
}

/** I messaggi in linea dell'editor. Le date si confrontano come istanti, ognuna nel suo fuso. */
export function controllaPrenotazione(p: Prenotazione): string[] {
  const e: string[] = []
  const hotel = p.tipo === 'hotel'
  if (!p.titolo.trim()) e.push('Scrivi un titolo.')
  if (p.fine && !p.inizio) e.push(hotel ? 'Manca il check-in.' : "Manca l'inizio.")
  if (p.inizio && p.fine && utcDaLocale(p.fine, p.fusoFine ?? p.fuso).getTime() < utcDaLocale(p.inizio, p.fuso).getTime()) {
    e.push(hotel ? 'Il check-out è prima del check-in.' : "La fine è prima dell'inizio.")
  }
  return e
}

export type Scadenza = 'scaduta' | 'vicina' | 'lontana'

/** Per le prenotazioni ancora da fare con una data limite: "vicina" da 7 giorni prima, poi "scaduta". */
export function scadenza(p: Prenotazione, oggi: string): Scadenza | null {
  if (p.stato !== 'da-prenotare' || !p.daPrenotareEntro) return null
  const d = differenzaGiorni(oggi, p.daPrenotareEntro)
  return d < 0 ? 'scaduta' : d <= 7 ? 'vicina' : 'lontana'
}

/** Confronto di testi dove quello che manca va in fondo. */
function confronta(a: string | undefined, b: string | undefined): number {
  if (a === b) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return a < b ? -1 : 1
}

export interface GruppoDocumenti { tipo: TipoPrenotazione; voci: Prenotazione[] }

/** Un gruppo per tipo; in ognuno prima le "da prenotare" (per scadenza), poi le prenotate, in ordine di inizio. */
export function gruppiDocumenti(ps: Prenotazione[]): GruppoDocumenti[] {
  const ordina = (a: Prenotazione, b: Prenotazione) =>
    (a.stato === b.stato ? 0 : a.stato === 'da-prenotare' ? -1 : 1)
    || (a.stato === 'da-prenotare' ? confronta(a.daPrenotareEntro, b.daPrenotareEntro) : 0)
    || confronta(a.inizio, b.inizio)
    || confronta(a.titolo, b.titolo)
  return TIPI_PRENOTAZIONE
    .map(tipo => ({ tipo, voci: ps.filter(p => p.tipo === tipo).sort(ordina) }))
    .filter(g => g.voci.length > 0)
}

const NOMI_FUSO = new Map([['Asia/Tokyo', ''], ['Europe/Rome', 'ora italiana']])

/** Niente per l'ora del Giappone, "ora italiana" per Roma, il nome IANA per gli altri. */
export function etichettaFuso(fuso: string): string {
  return NOMI_FUSO.get(fuso) ?? fuso
}

/** "sab 7 ago · 12:30 ora italiana". */
export function descriviIstante(locale: string, fuso: string): string {
  const f = etichettaFuso(fuso)
  return `${formatoData(locale.slice(0, 10), 'breve')} · ${locale.slice(11, 16)}${f ? ` ${f}` : ''}`
}

/** La riga dell'elenco: data e ora nel fuso della prenotazione; per gli hotel, check-in → check-out. */
export function descriviQuando(p: Prenotazione): string {
  if (!p.inizio) return ''
  if (p.tipo === 'hotel' && p.fine) return `${formatoData(p.inizio.slice(0, 10), 'breve')} → ${formatoData(p.fine.slice(0, 10), 'breve')}`
  return descriviIstante(p.inizio, p.fuso)
}

export function tappaCollegata(v: Viaggio, tappaId: string | undefined): { indice: number; tappa: Tappa } | null {
  if (!tappaId) return null
  for (const [indice, g] of v.giorni.entries()) {
    const tappa = g.tappe.find(t => t.id === tappaId)
    if (tappa) return { indice, tappa }
  }
  return null
}

/** La prenotazione che comincia prima, fra adesso e le prossime 24 ore, e quanti minuti mancano. */
export function prossimaPrenotazione(v: Viaggio, adesso: Date): { prenotazione: Prenotazione; minuti: number } | null {
  let migliore: { prenotazione: Prenotazione; minuti: number } | null = null
  for (const p of v.prenotazioni) {
    // Gli istanti non validi (dati importati) si saltano: la card non deve mai far cadere Oggi.
    const inizio = istanteSicuro(p.inizio, p.fuso)
    if (!inizio) continue
    const minuti = Math.round((inizio.getTime() - adesso.getTime()) / 60_000)
    if (minuti <= 0 || minuti > 24 * 60) continue
    if (!migliore || minuti < migliore.minuti) migliore = { prenotazione: p, minuti }
  }
  return migliore
}
