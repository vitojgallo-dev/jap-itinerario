import { useRef, useState } from 'react'
import { aggiungiPrenotazione, eliminaPrenotazione, nuovaPrenotazione, sostituisciPrenotazione } from '../../model/prenotazioni'
import type { Prenotazione } from '../../model/tipi'
import { eliminaSeOrfani } from '../../servizi/allegati'
import { useViaggio } from '../../store/viaggio'
import { Foglio } from '../../ui/Foglio'
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
  // Cancella gli allegati che nessuna prenotazione salvata usa (aggiunti e poi abbandonati, o tolti).
  const pulisci = (ids: string[]) => { if (ids.length) void eliminaSeOrfani(ids, useViaggio.getState().viaggio) }

  const annulla = () => {
    pulisci(aggiunti.current)
    aggiunti.current = []
    onChiudi()
  }
  const salva = (p: Prenotazione) => {
    const tolti = (iniziale?.allegati ?? []).map(a => a.id).filter(id => !p.allegati.some(a => a.id === id))
    applica(v => (iniziale ? sostituisciPrenotazione(v, p) : aggiungiPrenotazione(v, p)))
    pulisci([...tolti, ...aggiunti.current])
    aggiunti.current = []
    onChiudi()
    onSalvata?.(p.id)
  }
  const elimina = () => {
    if (!iniziale) return
    const ids = [...iniziale.allegati.map(a => a.id), ...aggiunti.current]
    aggiunti.current = []
    applicaAnnullabile(v => eliminaPrenotazione(v, iniziale.id), 'Prenotazione eliminata')
    // Gli allegati restano finché si può annullare; poi, se nessuno li usa più, si cancellano.
    setTimeout(() => pulisci(ids), 7000)
    onChiudi()
    onEliminata?.()
  }

  return (
    <Foglio aperto={aperto} onChiudi={annulla} titolo={iniziale ? 'Modifica prenotazione' : 'Nuova prenotazione'} pieno>
      {aperto && (
        <EditorPrenotazione viaggio={viaggio} iniziale={bozza} onSalva={salva} onAllegato={id => aggiunti.current.push(id)}
          onElimina={iniziale ? elimina : undefined} />
      )}
    </Foglio>
  )
}
