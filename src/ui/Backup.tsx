import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { aggiornaImpostazioni } from '../model/operazioni'
import { condividiOScarica, creaBackup } from '../servizi/backup'
import { useViaggio } from '../store/viaggio'
import './inviti.css'

export function useEsportaBackup() {
  const applica = useViaggio(s => s.applica)
  return async () => {
    const adesso = new Date()
    const esito = await condividiOScarica(creaBackup(useViaggio.getState().viaggio, adesso), adesso)
    if (esito === 'annullato') return
    applica(v => aggiornaImpostazioni(v, { ultimoBackup: adesso.toISOString() }))
    toast(esito === 'condiviso' ? 'Backup condiviso' : 'Backup scaricato')
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
