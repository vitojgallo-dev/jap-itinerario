import { useRef, useState } from 'react'
import { aggiungiPrenotazione, eliminaPrenotazione, nuovaPrenotazione, sostituisciPrenotazione } from '../../model/prenotazioni'
import type { Prenotazione } from '../../model/tipi'
import { eliminaSeOrfani } from '../../servizi/allegati'
import { useViaggio } from '../../store/viaggio'
import { Foglio } from '../../ui/Foglio'
import { pulisciQuandoNonAnnullabile } from '../../ui/pulisciDopoAnnulla'
import { EditorPrenotazione } from './EditorPrenotazione'

interface Props {
  aperto: boolean
  /** null = nuova prenotazione. Chi apre il foglio cambia `key` a ogni apertura, così la bozza riparte dai dati salvati. */
  iniziale: Prenotazione | null
  onChiudi: () => void
  onSalvata?: (id: string) => void
  onEliminata?: () => void
}

export function FoglioPrenotazione({ aperto, iniziale, onChiudi, onSalvata, onEliminata }: Props) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const [bozza] = useState(() => iniziale ?? nuovaPrenotazione())
  const aggiunti = useRef<string[]>([])
  // Dopo la chiusura un allegato ancora in salvataggio arriva a cose fatte: va tolto subito, non c'è più nessuno che lo pulisca.
  const chiuso = useRef(false)
  // Cancella gli allegati che nessuna prenotazione salvata usa (aggiunti e poi abbandonati, o tolti).
  const pulisci = (ids: string[]) => { if (ids.length) void eliminaSeOrfani(ids, useViaggio.getState().viaggio) }

  const annulla = () => {
    chiuso.current = true
    pulisci(aggiunti.current)
    aggiunti.current = []
    onChiudi()
  }
  const salva = (p: Prenotazione) => {
    chiuso.current = true
    const tolti = (iniziale?.allegati ?? []).map(a => a.id).filter(id => !p.allegati.some(a => a.id === id))
    applica(v => (iniziale ? sostituisciPrenotazione(v, p) : aggiungiPrenotazione(v, p)))
    pulisci([...tolti, ...aggiunti.current])
    aggiunti.current = []
    onChiudi()
    onSalvata?.(p.id)
  }
  const elimina = () => {
    if (!iniziale) return
    chiuso.current = true
    const ids = [...iniziale.allegati.map(a => a.id), ...aggiunti.current]
    aggiunti.current = []
    const prima = useViaggio.getState().viaggio
    applicaAnnullabile(v => eliminaPrenotazione(v, iniziale.id), 'Prenotazione eliminata')
    // Gli allegati restano finché si può annullare; poi, se nessuno li usa più, si cancellano.
    pulisciQuandoNonAnnullabile(ids, prima)
    onChiudi()
    onEliminata?.()
  }

  return (
    <Foglio aperto={aperto} onChiudi={annulla} titolo={iniziale ? 'Modifica prenotazione' : 'Nuova prenotazione'} pieno>
      {aperto && (
        <EditorPrenotazione viaggio={viaggio} iniziale={bozza} onSalva={salva} onAllegato={id => { if (chiuso.current) pulisci([id]); else aggiunti.current.push(id) }}
          onElimina={iniziale ? elimina : undefined} />
      )}
    </Foglio>
  )
}
