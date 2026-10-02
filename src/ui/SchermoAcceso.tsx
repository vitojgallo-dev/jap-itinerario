import { SunMedium } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { creaGestoreBlocco } from '../servizi/schermoAcceso'
import { Gruppo } from './componenti'

/** "Tieni acceso lo schermo" con la Wake Lock API; si riattiva quando l'app torna visibile. Dove l'API non c'è non compare. */
export function InterruttoreSchermo() {
  const disponibile = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [acceso, setAcceso] = useState(false)
  useEffect(() => {
    if (!acceso || !disponibile) return
    // Un solo blocco alla volta, anche se accensione e ritorno in primo piano chiedono insieme (vedi creaGestoreBlocco).
    const blocco = creaGestoreBlocco(() => navigator.wakeLock.request('screen'), () => {
      if (document.visibilityState === 'visible') {
        setAcceso(false)
        toast('Lo schermo non può restare acceso adesso.')
      }
    })
    // Il sistema toglie il blocco quando l'app va in secondo piano: al ritorno lo si chiede di nuovo.
    const visibile = () => { if (document.visibilityState === 'visible') void blocco.chiedi() }
    void blocco.chiedi()
    document.addEventListener('visibilitychange', visibile)
    return () => {
      document.removeEventListener('visibilitychange', visibile)
      blocco.rilascia()
    }
  }, [acceso, disponibile])
  if (!disponibile) return null
  return (
    <Gruppo piede="Finché Oggi resta aperta: comodo con il QR o la scheda del taxi in mano.">
      <label className="riga interruttore-riga">
        <span className="riga-icona" aria-hidden><SunMedium size={20} /></span>
        <span className="riga-testo">Tieni acceso lo schermo</span>
        <input type="checkbox" role="switch" checked={acceso} onChange={e => setAcceso(e.target.checked)} />
      </label>
    </Gruppo>
  )
}
