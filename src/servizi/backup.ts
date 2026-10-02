import { istanteTokyo } from '../model/date'
import { mimeAmmesso } from '../model/mime'
import type { Viaggio } from '../model/tipi'
import { validaViaggio } from '../model/validazione'
import { PDF_MASSIMO } from './allegati'
import { condividiFile } from './condividi'

export const TIPO_FILE = 'viaggio-giappone'

/** Quanti byte, decodificati, possono pesare in tutto gli allegati di un backup importato. */
export const ALLEGATI_BACKUP_MASSIMO = 200 * 1024 * 1024

/** I dati degli allegati delle prenotazioni, in base64, sotto il loro id. */
export type AllegatiBackup = Record<string, { mime: string; dati: string }>

export interface FileBackup {
  tipo: typeof TIPO_FILE
  creato: string
  viaggio: Viaggio
  /** Assente nei backup della fase 1. */
  allegati?: AllegatiBackup
}

export function creaBackup(v: Viaggio, adesso: Date, allegati: AllegatiBackup = {}): FileBackup {
  return { tipo: TIPO_FILE, creato: adesso.toISOString(), viaggio: v, allegati }
}

function allegatiValidi(x: unknown): x is AllegatiBackup {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false
  return Object.values(x).every(a => {
    const o = a as { mime?: unknown; dati?: unknown } | null
    return typeof o === 'object' && o !== null && typeof o.mime === 'string' && typeof o.dati === 'string'
  })
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/

/** I byte che il base64 `s` decodifica, o null se non è base64 valido. Non decodifica: serve a decidere prima di riempire la memoria. */
function byteDecodificati(s: string): number | null {
  if (s.length === 0 || s.length % 4 !== 0) return null
  // Più grande del massimo per voce: inutile controllare i caratteri, la voce verrà scartata.
  if ((s.length / 4) * 3 > PDF_MASSIMO + 3) return PDF_MASSIMO + 1
  if (!BASE64.test(s)) return null
  const riempimento = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0
  return (s.length / 4) * 3 - riempimento
}

/**
 * Tiene solo gli allegati che il viaggio usa davvero, di un tipo ammesso, in base64 valido e nei limiti di peso
 * (15 MB a voce, 200 MB in tutto). Il file di backup non è fidato: il resto si scarta e si conta.
 */
function filtraAllegati(grezzi: AllegatiBackup, v: Viaggio): { allegati: AllegatiBackup; scartati: number; mancanti: number } {
  const usati = new Set(v.prenotazioni.flatMap(p => p.allegati.map(a => a.id)))
  // Senza prototipo: su un oggetto normale un id come "__proto__" (chiave propria dopo JSON.parse) cambierebbe il prototipo invece di entrare, e "toString" risulterebbe già presente.
  const allegati: AllegatiBackup = Object.create(null)
  let scartati = 0
  let totale = 0
  for (const [id, a] of Object.entries(grezzi)) {
    const byte = usati.has(id) && mimeAmmesso(a.mime) ? byteDecodificati(a.dati) : null
    if (byte === null || byte > PDF_MASSIMO || totale + byte > ALLEGATI_BACKUP_MASSIMO) { scartati++; continue }
    totale += byte
    allegati[id] = a
  }
  let mancanti = 0
  for (const id of usati) if (!(id in allegati)) mancanti++
  return { allegati, scartati, mancanti }
}

export type EsitoLettura =
  | { ok: true; viaggio: Viaggio; allegati: AllegatiBackup; scartati: number; mancanti: number }
  | { ok: false; errore: string }

/** `scartati`: voci di allegati del file non valide o non usate; `mancanti`: allegati del viaggio che nel file non hanno i dati. */
export function leggiBackup(testo: string): EsitoLettura {
  let dati: unknown
  try {
    dati = JSON.parse(testo)
  } catch {
    return { ok: false, errore: 'Il file non è un JSON leggibile.' }
  }
  if (!dati || typeof dati !== 'object' || (dati as { tipo?: unknown }).tipo !== TIPO_FILE) {
    return { ok: false, errore: "Il file non è un backup di quest'app." }
  }
  const esito = validaViaggio((dati as { viaggio?: unknown }).viaggio)
  if (!esito.ok) return { ok: false, errore: `Il backup contiene errori: ${esito.errori.slice(0, 3).join('; ')}` }
  const grezzi = (dati as { allegati?: unknown }).allegati
  const allegati = grezzi === undefined ? {} : grezzi
  if (!allegatiValidi(allegati)) return { ok: false, errore: 'Il backup contiene allegati non validi.' }
  return { ok: true, viaggio: esito.viaggio, ...filtraAllegati(allegati, esito.viaggio) }
}

export function nomeFileBackup(adesso: Date): string {
  return `giappone-backup-${istanteTokyo(adesso).data}.json`
}

/** Sul telefono apre il menu di condivisione (WhatsApp, File…); altrove scarica il file. */
export function condividiOScarica(b: FileBackup, adesso = new Date()): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  return condividiFile(new File([JSON.stringify(b)], nomeFileBackup(adesso), { type: 'application/json' }), 'Itinerario Giappone')
}
