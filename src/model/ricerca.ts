import { dataGiorno } from './date'
import type { Giorno, Prenotazione, Tappa, Viaggio } from './tipi'

/** Minuscole e senza accenti né macron: "Tōdai" e "TODAI" diventano "todai". */
export function normalizzaTesto(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export interface GiornoTrovato { indice: number; data: string; giorno: Giorno; tappe: Tappa[] }
export interface Risultati { giorni: GiornoTrovato[]; prenotazioni: Prenotazione[]; totale: number }

/** Cerca in titoli, descrizioni, note e consigli delle tappe, e in titoli, codici e note delle prenotazioni. */
export function cerca(v: Viaggio, testo: string): Risultati {
  const q = normalizzaTesto(testo.trim())
  if (q.length < 2) return { giorni: [], prenotazioni: [], totale: 0 }
  const trova = (...campi: (string | undefined)[]) => campi.some(c => c !== undefined && normalizzaTesto(c).includes(q))
  const giorni = v.giorni.flatMap((giorno, indice) => {
    const tappe = giorno.tappe.filter(t => trova(t.titolo, t.descrizione, t.nota, t.consiglio))
    return tappe.length ? [{ indice, data: dataGiorno(v, indice), giorno, tappe }] : []
  })
  const prenotazioni = v.prenotazioni.filter(p => trova(p.titolo, p.codice, p.note))
  return { giorni, prenotazioni, totale: giorni.reduce((n, g) => n + g.tappe.length, 0) + prenotazioni.length }
}
