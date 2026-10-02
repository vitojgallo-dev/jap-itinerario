import { dataGiorno } from './date'
import type { Citta, Giorno, Tappa, Viaggio } from './tipi'

export interface VoceBiglietto {
  indice: number
  data: string
  giorno: Giorno
  tappa: Tappa
}

/** Tutte le tappe che richiedono un biglietto, in ordine di viaggio. */
export function bigliettiDaPrenotare(v: Viaggio): VoceBiglietto[] {
  return v.giorni.flatMap((giorno, indice) =>
    giorno.tappe
      .filter(t => t.biglietti && t.stato !== 'saltata')
      .map(tappa => ({ indice, data: dataGiorno(v, indice), giorno, tappa })),
  )
}

export function statistiche(v: Viaggio) {
  const tappe = v.giorni.flatMap(g => g.tappe)
  return {
    giorni: v.giorni.length,
    citta: new Set(v.giorni.map(g => g.cittaId)).size,
    tappe: tappe.length,
    fatte: tappe.filter(t => t.stato === 'fatta').length,
  }
}

/** Vero se non c'è un backup o l'ultimo ha più di `giorni` giorni. */
export function backupDaFare(ultimo: string | undefined, adesso: Date, giorni = 3): boolean {
  if (!ultimo) return true
  return adesso.getTime() - new Date(ultimo).getTime() > giorni * 86_400_000
}

export const CITTA_SCONOSCIUTA: Citta = {
  id: '', nome: 'Senza città', kanji: '', romaji: '', colore: '#8E8E93',
  lat: 36.2, lng: 138.2, intro: '', clima: { max: 30, min: 22 },
}

export function cittaDi(v: Viaggio, g: Giorno): Citta {
  return v.citta.find(c => c.id === g.cittaId) ?? CITTA_SCONOSCIUTA
}

/**
 * Quello che un'importazione o un ripristino sostituirebbe su questo telefono e che nessun altro ha: "12 spese e 3 allegati".
 * Stringa vuota se non c'è né l'uno né l'altro.
 */
export function cosaSiPerde(v: Viaggio): string {
  const spese = v.spese.length
  const allegati = v.prenotazioni.reduce((n, p) => n + p.allegati.length, 0)
  const parti = [
    spese > 0 ? (spese === 1 ? '1 spesa' : `${spese} spese`) : '',
    allegati > 0 ? (allegati === 1 ? '1 allegato' : `${allegati} allegati`) : '',
  ].filter(Boolean)
  return parti.join(' e ')
}
