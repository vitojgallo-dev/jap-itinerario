import { dataGiorno } from '../../model/date'
import { useViaggio } from '../../store/viaggio'
import { Foglio } from '../../ui/Foglio'
import { VistaTappa } from './VistaTappa'

export function FoglioTappa({ giornoId, tappaId, onChiudi }: { giornoId: string | null; tappaId: string | null; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const indice = viaggio.giorni.findIndex(g => g.id === giornoId)
  const giorno = viaggio.giorni[indice]
  const tappa = giorno?.tappe.find(t => t.id === tappaId)
  return (
    <Foglio aperto={!!tappa} onChiudi={onChiudi} titolo={tappa?.titolo || 'Tappa'}>
      {tappa && giorno && <VistaTappa giorno={giorno} tappa={tappa} data={dataGiorno(viaggio, indice)} />}
    </Foglio>
  )
}
