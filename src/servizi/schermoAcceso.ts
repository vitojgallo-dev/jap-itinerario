/** Quel che serve del WakeLockSentinel: il blocco, e se il sistema l'ha già tolto. */
export interface BloccoSchermo {
  readonly released: boolean
  release(): Promise<void>
}

/**
 * Tiene al massimo un blocco dello schermo. `chiedi` può essere chiamata quante volte si vuole (all'accensione, a ogni ritorno
 * in primo piano): se una richiesta è già in corso o il blocco c'è ancora, non ne parte un'altra, altrimenti due richieste
 * concorrenti finirebbero in due blocchi e il primo, sovrascritto, non verrebbe mai rilasciato.
 * Se `rilascia` arriva mentre una richiesta è in corso, il blocco che ne esce viene rilasciato appena nasce.
 */
export function creaGestoreBlocco(richiedi: () => Promise<BloccoSchermo>, alErrore: () => void) {
  let blocco: BloccoSchermo | null = null
  let inCorso = false
  let attivo = true
  return {
    async chiedi(): Promise<void> {
      if (!attivo || inCorso || (blocco && !blocco.released)) return
      inCorso = true
      try {
        const nuovo = await richiedi()
        if (attivo) blocco = nuovo
        else void nuovo.release().catch(() => {})
      } catch {
        if (attivo) alErrore()
      } finally {
        inCorso = false
      }
    },
    rilascia(): void {
      attivo = false
      const b = blocco
      blocco = null
      void b?.release().catch(() => {})
    },
  }
}
