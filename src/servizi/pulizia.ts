import { validaViaggio } from '../model/validazione'
import type { Viaggio } from '../model/tipi'
import { CHIAVE_SCARTATO, CHIAVE_VIAGGIO } from '../store/avvio'
import { archivioIndexedDb, eliminaSeOrfani, idAllegati, type ArchivioAllegati } from './allegati'

/** Quel che serve a sapere quando una modifica annullabile non lo è più: la parte dello store che interessa. */
export interface NegozioAnnullabile {
  getState(): { viaggio: Viaggio; precedente: Viaggio | null }
  subscribe(ascolta: (stato: { viaggio: Viaggio; precedente: Viaggio | null }) => void): () => void
}

/**
 * Cancella `ids` dall'archivio (se nessuna prenotazione li usa) appena la modifica che ha lasciato `prima` come `precedente`
 * non si può più annullare: un'altra modifica ha preso il suo posto, oppure l'annullamento è già avvenuto.
 * Il controllo è sul viaggio vivo, quindi dopo un "Annulla" i riferimenti ripristinati proteggono i file.
 * Niente timer: il toast può restare in pausa (scheda nascosta, dito sopra) e "Annulla" funziona finché serve.
 */
export function pulisciQuandoNonAnnullabile(ids: string[], prima: Viaggio, negozio: NegozioAnnullabile, archivio: ArchivioAllegati = archivioIndexedDb): void {
  if (ids.length === 0) return
  let fatto = false
  let disiscrivi: (() => void) | null = null
  const controlla = (stato: { viaggio: Viaggio; precedente: Viaggio | null }) => {
    if (fatto || stato.precedente === prima) return
    fatto = true
    disiscrivi?.()
    void eliminaSeOrfani(ids, stato.viaggio, archivio)
  }
  disiscrivi = negozio.subscribe(controlla)
  // Se nel frattempo è già cambiato (o chi chiama ha passato un `prima` che non è più il precedente), niente attesa.
  controlla(negozio.getState())
}

/**
 * Una volta, dopo il caricamento dei dati: toglie dall'archivio gli allegati che il viaggio attuale non usa.
 * Non fa niente se c'è un salvataggio scartato (`giappone-viaggio-scartato`) o se quello in uso non è valido:
 * in quei casi un salvataggio che l'app non ha letto potrebbe ancora puntare a quei file.
 * Non lancia mai. Ritorna quanti file ha tolto.
 */
export async function spazzaOrfani(v: Viaggio, archivio: ArchivioAllegati = archivioIndexedDb, storage: Pick<Storage, 'getItem'> = localStorage): Promise<number> {
  if (!archivio.chiavi) return 0
  try {
    if (storage.getItem(CHIAVE_SCARTATO) !== null) return 0
    const salvato = storage.getItem(CHIAVE_VIAGGIO)
    // Senza salvataggio il viaggio in memoria è quello di base (primo avvio, o localStorage svuotato dal browser mentre IndexedDB no):
    // non dice quali allegati servono, e toglierli tutti sarebbe irreversibile.
    if (salvato === null) return 0
    if (!validaViaggio((JSON.parse(salvato) as { state?: { viaggio?: unknown } } | null)?.state?.viaggio).ok) return 0
    const usati = new Set(idAllegati(v))
    const orfani = (await archivio.chiavi()).filter(id => !usati.has(id))
    await eliminaSeOrfani(orfani, v, archivio)
    return orfani.length
  } catch {
    return 0
  }
}
