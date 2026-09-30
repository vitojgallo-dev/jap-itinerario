import { istanteTokyo } from '../model/date'
import type { Viaggio } from '../model/tipi'
import { validaViaggio } from '../model/validazione'

export const TIPO_FILE = 'viaggio-giappone'

export interface FileBackup {
  tipo: typeof TIPO_FILE
  creato: string
  viaggio: Viaggio
}

export function creaBackup(v: Viaggio, adesso: Date): FileBackup {
  return { tipo: TIPO_FILE, creato: adesso.toISOString(), viaggio: v }
}

export function leggiBackup(testo: string): { ok: true; viaggio: Viaggio } | { ok: false; errore: string } {
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
  return { ok: true, viaggio: esito.viaggio }
}

export function nomeFileBackup(adesso: Date): string {
  return `giappone-backup-${istanteTokyo(adesso).data}.json`
}

/** Sul telefono apre il menu di condivisione (WhatsApp, File…); altrove scarica il file. */
export async function condividiOScarica(b: FileBackup, adesso = new Date()): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  const nome = nomeFileBackup(adesso)
  const file = new File([JSON.stringify(b)], nome, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Itinerario Giappone' })
      return 'condiviso'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'annullato'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'scaricato'
}
