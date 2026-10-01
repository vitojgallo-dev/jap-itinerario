import { toast } from 'sonner'
import { integraDatiDiPartenza } from '../model/operazioni'
import { viaggioBase } from '../store/avvio'
import { useViaggio } from '../store/viaggio'

/** Aggiunge le prenotazioni e gli orari dell'itinerario 2027 che mancano sul telefono; si può annullare. */
export function useAggiungiDatiDiPartenza(): () => void {
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  return () => {
    const esito = integraDatiDiPartenza(useViaggio.getState().viaggio, viaggioBase())
    if (esito.prenotazioni + esito.orari === 0) {
      toast('Ci sono già tutte: niente da aggiungere.')
      return
    }
    applicaAnnullabile(() => esito.viaggio, `Aggiunte ${esito.prenotazioni} prenotazioni e ${esito.orari} orari di apertura`)
  }
}
