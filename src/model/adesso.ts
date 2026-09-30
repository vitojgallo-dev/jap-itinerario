import { differenzaGiorni, istanteTokyo, minutiDaOra } from './date'
import type { Tappa, Viaggio } from './tipi'

export type FaseViaggio =
  | { fase: 'prima'; giorniMancanti: number }
  | { fase: 'durante'; indice: number }
  | { fase: 'dopo' }

/** In che momento del viaggio siamo, contando i giorni nel fuso di Tokyo. */
export function faseViaggio(v: Viaggio, adesso: Date): FaseViaggio {
  const diff = differenzaGiorni(v.dataPartenza, istanteTokyo(adesso).data)
  if (diff < 0) return { fase: 'prima', giorniMancanti: -diff }
  if (diff < v.giorni.length) return { fase: 'durante', indice: diff }
  return { fase: 'dopo' }
}

export interface AdessoDopo {
  adesso: Tappa | null
  dopo: Tappa | null
  minutiAlDopo: number | null
}

/**
 * "Adesso" è l'ultima tappa già iniziata, se non è stata segnata fatta;
 * "dopo" è la prima tappa da fare che inizia più tardi. Le saltate e le
 * tappe senza ora non contano.
 */
export function tappeAdessoDopo(tappe: Tappa[], minuti: number): AdessoDopo {
  const ordinate = tappe
    .filter(t => t.ora !== null && t.stato !== 'saltata')
    .map(t => ({ t, m: minutiDaOra(t.ora)! }))
    .sort((a, b) => a.m - b.m)
  let corrente = -1
  ordinate.forEach((x, i) => { if (x.m <= minuti) corrente = i })
  const adesso = corrente >= 0 && ordinate[corrente].t.stato === 'da-fare' ? ordinate[corrente].t : null
  const prossima = ordinate.slice(corrente + 1).find(x => x.t.stato === 'da-fare')
  return { adesso, dopo: prossima?.t ?? null, minutiAlDopo: prossima ? prossima.m - minuti : null }
}

export type Promemoria = 'prenota-ora' | 'oggi' | 'futuro' | 'passato'

/** Il giorno prima di una visita con biglietto è quello in cui prenotare. */
export function promemoriaBiglietto(dataVisita: string, oggi: string): Promemoria {
  const d = differenzaGiorni(oggi, dataVisita)
  if (d === 1) return 'prenota-ora'
  if (d === 0) return 'oggi'
  return d > 1 ? 'futuro' : 'passato'
}
