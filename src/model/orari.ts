import { giornoSettimana, minutiDaOra, SETTIMANA } from './date'
import type { OrariTappa, Tappa } from './tipi'

export type StatoApertura = 'chiuso-oggi' | 'fuori-orario' | 'aperto' | 'sconosciuto'
type ConOrari = Pick<Tappa, 'ora' | 'durataMin' | 'orari'>

/** Lunedì prima, domenica in fondo: l'ordine in cui si leggono i giorni. */
export const ORDINE_SETTIMANA = [1, 2, 3, 4, 5, 6, 0]

const conArticolo = (g: number) => `${g === 0 ? 'la' : 'il'} ${SETTIMANA[g]}`

type Verdetto = 'aperto' | 'prima' | 'dopo' | 'sconosciuto'

/** Confronta ora e durata con apertura e chiusura; con chiusura <= apertura (18:00–02:00, 11:00–00:00) la chiusura è il giorno dopo. */
function verdetto(tappa: ConOrari, o: OrariTappa): Verdetto {
  const inizio = minutiDaOra(tappa.ora)
  const apre = minutiDaOra(o.apre ?? null)
  const chiude = minutiDaOra(o.chiude ?? null)
  if (inizio === null || (apre === null && chiude === null)) return 'sconosciuto'
  const durata = tappa.durataMin ?? 0
  if (apre !== null && chiude !== null && chiude <= apre) {
    // Dopo mezzanotte e prima della chiusura si è ancora nell'apertura della sera prima.
    const x = inizio < chiude ? inizio + 1440 : inizio
    if (x < apre) return 'prima'
    return x + durata > chiude + 1440 ? 'dopo' : 'aperto'
  }
  if (apre !== null && inizio < apre) return 'prima'
  if (chiude !== null && inizio + durata > chiude) return 'dopo'
  return 'aperto'
}

/** Guarda il giorno della settimana della data e confronta ora e durata della tappa con apertura e chiusura. */
export function statoApertura(tappa: ConOrari, data: string): StatoApertura {
  const o = tappa.orari
  if (!o) return 'sconosciuto'
  if (o.chiusoIl.includes(giornoSettimana(data))) return 'chiuso-oggi'
  const v = verdetto(tappa, o)
  if (v === 'sconosciuto') return 'sconosciuto'
  return v === 'aperto' ? 'aperto' : 'fuori-orario'
}

/** Il testo del badge: "Chiuso il mercoledì", "Apre alle 10:00", "Chiude alle 17:00"; null se non c'è niente da dire. */
export function avvisoApertura(tappa: ConOrari, data: string): string | null {
  const o = tappa.orari
  if (!o) return null
  if (o.chiusoIl.includes(giornoSettimana(data))) return `Chiuso ${conArticolo(giornoSettimana(data))}`
  const v = verdetto(tappa, o)
  if (v === 'prima') return `Apre alle ${o.apre}`
  if (v === 'dopo') return `Chiude alle ${o.chiude}`
  return null
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

/** Gli orari senza campi vuoti, giorni in ordine e senza doppioni; undefined se non resta niente da dire. */
export function orariPuliti(o: OrariTappa | undefined): OrariTappa | undefined {
  if (!o) return undefined
  const p: OrariTappa = { chiusoIl: [...new Set(o.chiusoIl)].sort((a, b) => a - b) }
  if (o.apre) p.apre = o.apre
  if (o.chiude) p.chiude = o.chiude
  const nota = o.nota?.trim()
  if (nota) p.nota = nota
  if (p.chiusoIl.length === 0 && !p.apre && !p.chiude && !p.nota) return undefined
  if (o.fonte) p.fonte = o.fonte
  return p
}
