import { giornoSettimana, minutiDaOra, SETTIMANA } from './date'
import type { OrariTappa, Tappa } from './tipi'

export type StatoApertura = 'chiuso-oggi' | 'fuori-orario' | 'aperto' | 'sconosciuto'
type ConOrari = Pick<Tappa, 'ora' | 'durataMin' | 'orari'>

/** Lunedì prima, domenica in fondo: l'ordine in cui si leggono i giorni. */
export const ORDINE_SETTIMANA = [1, 2, 3, 4, 5, 6, 0]

const conArticolo = (g: number) => `${g === 0 ? 'la' : 'il'} ${SETTIMANA[g]}`

/** Guarda il giorno della settimana della data e confronta ora e durata della tappa con apertura e chiusura. */
export function statoApertura(tappa: ConOrari, data: string): StatoApertura {
  const o = tappa.orari
  if (!o) return 'sconosciuto'
  if (o.chiusoIl.includes(giornoSettimana(data))) return 'chiuso-oggi'
  const inizio = minutiDaOra(tappa.ora)
  const apre = minutiDaOra(o.apre ?? null)
  const chiude = minutiDaOra(o.chiude ?? null)
  if (inizio === null || (apre === null && chiude === null)) return 'sconosciuto'
  if (apre !== null && inizio < apre) return 'fuori-orario'
  if (chiude !== null && inizio + (tappa.durataMin ?? 0) > chiude) return 'fuori-orario'
  return 'aperto'
}

/** Il testo del badge: "Chiuso il mercoledì", "Apre alle 10:00", "Chiude alle 17:00"; null se non c'è niente da dire. */
export function avvisoApertura(tappa: ConOrari, data: string): string | null {
  const o = tappa.orari
  const stato = statoApertura(tappa, data)
  if (!o) return null
  if (stato === 'chiuso-oggi') return `Chiuso ${conArticolo(giornoSettimana(data))}`
  if (stato !== 'fuori-orario') return null
  const inizio = minutiDaOra(tappa.ora)
  const apre = minutiDaOra(o.apre ?? null)
  return apre !== null && inizio !== null && inizio < apre ? `Apre alle ${o.apre}` : `Chiude alle ${o.chiude}`
}

/** "10:00–18:00 · chiuso il lunedì". */
export function descriviOrari(o: OrariTappa): string {
  const parti: string[] = []
  if (o.apre && o.chiude) parti.push(`${o.apre}–${o.chiude}`)
  else if (o.apre) parti.push(`dalle ${o.apre}`)
  else if (o.chiude) parti.push(`fino alle ${o.chiude}`)
  const chiusi = ORDINE_SETTIMANA.filter(g => o.chiusoIl.includes(g)).map(conArticolo)
  if (chiusi.length) parti.push(`chiuso ${chiusi.length === 1 ? chiusi[0] : `${chiusi.slice(0, -1).join(', ')} e ${chiusi[chiusi.length - 1]}`}`)
  return parti.length ? parti.join(' · ') : 'Orari non indicati'
}
