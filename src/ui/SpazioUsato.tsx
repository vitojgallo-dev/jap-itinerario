import { HardDrive } from 'lucide-react'
import { useEffect, useState } from 'react'
import { byteAllegati, formatoByte } from '../servizi/allegati'
import { useViaggio } from '../store/viaggio'
import { Riga } from './componenti'

/** Quanto pesano gli allegati e quanto occupa l'app in tutto (dati, allegati, mappe e foto in cache). */
export function SpazioUsato() {
  const allegati = useViaggio(s => byteAllegati(s.viaggio))
  const [stima, setStima] = useState<{ usato: number; quota?: number } | null>(null)
  useEffect(() => {
    let vivo = true
    navigator.storage?.estimate?.().then(s => { if (vivo && typeof s.usage === 'number') setStima({ usato: s.usage, quota: s.quota }) }, () => {})
    return () => { vivo = false }
  }, [])
  const tutto = stima ? `in tutto ${formatoByte(stima.usato)}${stima.quota ? ` su ${formatoByte(stima.quota)} disponibili` : ''}, con mappe e foto` : null
  return <Riga icona={<HardDrive size={20} />} titolo="Spazio usato" sottotitolo={[`Allegati ${formatoByte(allegati)}`, tutto].filter(Boolean).join(' · ')} />
}
