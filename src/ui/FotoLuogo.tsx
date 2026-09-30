import { MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cercaFoto, serveCors } from '../servizi/foto'
import { linkSicuro } from '../servizi/mappe'

/** Foto del luogo, cercata solo quando la card sta per entrare nello schermo. */
export function FotoLuogo({ query, override: scelta, className = '', alt = '' }: { query?: string; override?: string; className?: string; alt?: string }) {
  // La foto scelta a mano vale solo se è un indirizzo web: altrimenti si cerca come se non ci fosse.
  const override = linkSicuro(scelta)
  const rif = useRef<HTMLDivElement>(null)
  const [visibile, setVisibile] = useState(false)
  const [url, setUrl] = useState<string | null | undefined>(override || undefined)

  useEffect(() => {
    const el = rif.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisibile(true); io.disconnect() } }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (override) { setUrl(override); return }
    if (!visibile) return
    if (!query) { setUrl(null); return }
    let vivo = true
    cercaFoto(query).then(u => { if (vivo) setUrl(u) })
    return () => { vivo = false }
  }, [visibile, query, override])

  return (
    <div ref={rif} className={`foto ${className}${url === undefined ? ' foto-attesa' : ''}`}>
      {url ? <img src={url} alt={alt} crossOrigin={serveCors(url) ? 'anonymous' : undefined} loading="lazy" decoding="async" onError={() => setUrl(null)} /> : url === null ? <MapPin size={28} aria-hidden /> : null}
    </div>
  )
}
