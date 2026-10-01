import type { Viaggio } from '../model/tipi'
import { spazzaOrfani, pulisciQuandoNonAnnullabile as pulisciQuando } from '../servizi/pulizia'
import { useViaggio } from '../store/viaggio'

/**
 * Cancella gli allegati `ids` che nessuno usa più, ma solo quando la modifica annullabile appena fatta (quella che ha lasciato
 * `prima` come viaggio precedente) non si può più annullare. Chi chiama passa il viaggio com'era prima di `applicaAnnullabile`.
 */
export function pulisciQuandoNonAnnullabile(ids: string[], prima: Viaggio): void {
  pulisciQuando(ids, prima, useViaggio)
}

/** All'avvio, a dati caricati: toglie dall'archivio gli allegati che nessuna prenotazione usa. */
export function avviaPulizia(): void {
  const via = () => { void spazzaOrfani(useViaggio.getState().viaggio) }
  if (useViaggio.persist.hasHydrated()) via()
  else useViaggio.persist.onFinishHydration(via)
}
