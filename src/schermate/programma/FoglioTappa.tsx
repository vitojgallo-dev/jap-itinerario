import { useState } from 'react'
import { dataGiorno } from '../../model/date'
import { aggiungiTappa, eliminaTappa, nuovaTappa, sostituisciTappa } from '../../model/operazioni'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Foglio } from '../../ui/Foglio'
import { EditorTappa } from './EditorTappa'
import { VistaTappa } from './VistaTappa'

/** La tappa aperta: in sola lettura, oppure con l'editor se `modificabile` e la modalità modifica è accesa. */
export function FoglioTappa({ giornoId, tappaId, onChiudi, modificabile = false }: { giornoId: string | null; tappaId: string | null; onChiudi: () => void; modificabile?: boolean }) {
  const viaggio = useViaggio(s => s.viaggio)
  const modifica = useViaggio(s => s.modifica) && modificabile
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const indice = viaggio.giorni.findIndex(g => g.id === giornoId)
  const giorno = viaggio.giorni[indice]
  const tappa = giorno?.tappe.find(t => t.id === tappaId)
  return (
    <Foglio aperto={!!tappa} onChiudi={onChiudi} titolo={modifica ? 'Modifica tappa' : tappa?.titolo || 'Tappa'} pieno={modifica}>
      {tappa && giorno && (modifica
        ? <EditorTappa key={tappa.id} iniziale={tappa} citta={cittaDi(viaggio, giorno)}
            onSalva={t => { applica(v => sostituisciTappa(v, giorno.id, t)); onChiudi() }}
            onElimina={() => { applicaAnnullabile(v => eliminaTappa(v, giorno.id, tappa.id), 'Tappa eliminata'); onChiudi() }} />
        : <VistaTappa giorno={giorno} tappa={tappa} data={dataGiorno(viaggio, indice)} />)}
    </Foglio>
  )
}

export function FoglioNuovaTappa({ giornoId, aperto, onChiudi }: { giornoId: string; aperto: boolean; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const giorno = viaggio.giorni.find(g => g.id === giornoId)
  const [bozza] = useState(() => nuovaTappa({ titolo: '' }))
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Nuova tappa" pieno>
      {giorno && aperto && (
        <EditorTappa iniziale={bozza} citta={cittaDi(viaggio, giorno)} onSalva={t => { applica(v => aggiungiTappa(v, giorno.id, t)); onChiudi() }} />
      )}
    </Foglio>
  )
}
