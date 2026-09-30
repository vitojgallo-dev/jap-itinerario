import base from '../data/itinerario-base.json'
import extra from '../data/legacy-extra.json'
import { migraV1, type V1Data, type V1Extra } from '../model/migrazioneV1'
import type { Viaggio } from '../model/tipi'

export const CHIAVE_V1 = 'japan_itinerary_v1'
/** Dove vive il viaggio salvato dall'app nuova. */
export const CHIAVE_VIAGGIO = 'giappone-viaggio'
/** Copia di un salvataggio messo da parte perché danneggiato: non viene mai cancellata. */
export const CHIAVE_SCARTATO = 'giappone-viaggio-scartato'
/** L'avviso quando i dati della versione vecchia non si lasciano recuperare. */
export const ERRORE_V1 = 'Non riesco a leggere i dati della versione vecchia: resta il nuovo itinerario.'

/** I dati salvati dalla vecchia app su questo telefono, se ci sono. */
export function leggiV1(storage: Pick<Storage, 'getItem'>): V1Data | null {
  const raw = storage.getItem(CHIAVE_V1)
  if (!raw) return null
  try {
    const d = JSON.parse(raw)
    return d && typeof d === 'object' && Array.isArray(d.cities) ? (d as V1Data) : null
  } catch {
    return null
  }
}

export function viaggioDaV1(v1: V1Data): Viaggio {
  return migraV1(v1, extra as unknown as V1Extra, { dataPartenza: v1.tripStart || '2027-08-09' })
}

export function viaggioBase(): Viaggio {
  return structuredClone(base as unknown as Viaggio)
}
