import { SunMedium } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Gruppo } from './componenti'

/** "Tieni acceso lo schermo" con la Wake Lock API; si riattiva quando l'app torna visibile. Dove l'API non c'è non compare. */
export function InterruttoreSchermo() {
  const disponibile = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [acceso, setAcceso] = useState(false)
  const sentinella = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!acceso || !disponibile) return
    let vivo = true
    const chiedi = async () => {
      if (sentinella.current && !sentinella.current.released) return
      try {
        const s = await navigator.wakeLock.request('screen')
        if (!vivo) { void s.release(); return }
        sentinella.current = s
      } catch {
        if (vivo && document.visibilityState === 'visible') {
          setAcceso(false)
          toast('Lo schermo non può restare acceso adesso.')
        }
      }
    }
    // Il sistema toglie il blocco quando l'app va in secondo piano: al ritorno lo si chiede di nuovo.
    const visibile = () => { if (document.visibilityState === 'visible') void chiedi() }
    void chiedi()
    document.addEventListener('visibilitychange', visibile)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', visibile)
      void sentinella.current?.release().catch(() => {})
      sentinella.current = null
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
