import { istanteTokyo } from '../model/date'
import type { Viaggio } from '../model/tipi'
import { validaViaggio } from '../model/validazione'
import { condividiFile } from './condividi'

export const TIPO_FILE = 'viaggio-giappone'

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

export function leggiBackup(testo: string): { ok: true; viaggio: Viaggio; allegati: AllegatiBackup } | { ok: false; errore: string } {
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
  return { ok: true, viaggio: esito.viaggio, allegati }
}

export function nomeFileBackup(adesso: Date): string {
  return `giappone-backup-${istanteTokyo(adesso).data}.json`
}

/** Sul telefono apre il menu di condivisione (WhatsApp, File…); altrove scarica il file. */
export function condividiOScarica(b: FileBackup, adesso = new Date()): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  return condividiFile(new File([JSON.stringify(b)], nomeFileBackup(adesso), { type: 'application/json' }), 'Itinerario Giappone')
}
