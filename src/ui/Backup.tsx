import { Save } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { aggiornaImpostazioni } from '../model/operazioni'
import { allegatiPerBackup } from '../servizi/allegati'
import { condividiOScarica, creaBackup } from '../servizi/backup'
import { useViaggio } from '../store/viaggio'
import './inviti.css'

export const ERRORE_BACKUP = 'Non riesco a creare il backup: troppo grande o memoria piena.'

export function useEsportaBackup() {
  const applica = useViaggio(s => s.applica)
  const inCorso = useRef(false)
  return async () => {
    if (inCorso.current) return
    inCorso.current = true
    try {
      const adesso = new Date()
      const viaggio = useViaggio.getState().viaggio
      const { allegati, mancanti, illeggibili = 0 } = await allegatiPerBackup(viaggio)
      const esito = await condividiOScarica(creaBackup(viaggio, adesso, allegati), adesso)
      if (esito === 'annullato') return
      applica(v => aggiornaImpostazioni(v, { ultimoBackup: adesso.toISOString() }))
      toast(esito === 'condiviso' ? 'Backup condiviso' : 'Backup scaricato')
      const spariti = mancanti - illeggibili
      if (spariti > 0) toast(`${spariti === 1 ? 'Un allegato non è' : `${spariti} allegati non sono`} più sul telefono: nel backup manca.`)
      if (illeggibili > 0) toast(`${illeggibili === 1 ? 'Un allegato non è leggibile' : `${illeggibili} allegati non sono leggibili`}: nel backup manca.`)
    } catch {
      toast(ERRORE_BACKUP)
    } finally {
      inCorso.current = false
    }
  }
}

export function PromemoriaBackup() {
  const esporta = useEsportaBackup()
  return (
    <div className="card invito">
      <Save size={24} aria-hidden />
      <div>
        <strong>Fai un backup</strong>
        <p className="testo-2">Salva l'itinerario in un file: se il telefono perde i dati, lo reimporti in un attimo.</p>
      </div>
      <button type="button" className="pulsante piccolo" onClick={() => void esporta()}>Salva</button>
    </div>
  )
}
