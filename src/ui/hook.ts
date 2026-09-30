import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { Tema } from '../model/tipi'
import { leggiOverride } from './rotta'

/** L'ora attuale, aggiornata ogni `intervalloMs`; con `?oggi=` resta fissa su quel momento. */
export function useAdesso(intervalloMs = 30_000): Date {
  const override = useMemo(() => leggiOverride(location.search), [])
  const [adesso, setAdesso] = useState(() => new Date())
  useEffect(() => {
    if (override) return
    const id = setInterval(() => setAdesso(new Date()), intervalloMs)
    return () => clearInterval(id)
  }, [override, intervalloMs])
  return override ?? adesso
}

const QUERY_SCURO = '(prefers-color-scheme: dark)'
function iscriviScuro(cb: () => void) {
  const m = matchMedia(QUERY_SCURO)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

export function useTemaRisolto(scelta: Tema): 'chiaro' | 'scuro' {
  const scuro = useSyncExternalStore(iscriviScuro, () => matchMedia(QUERY_SCURO).matches)
  return scelta === 'auto' ? (scuro ? 'scuro' : 'chiaro') : scelta
}

interface EventoInstallazione extends Event { prompt(): Promise<void> }

export function useInstallazione() {
  const [evento, setEvento] = useState<EventoInstallazione | null>(null)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstallazione) }
    addEventListener('beforeinstallprompt', h)
    return () => removeEventListener('beforeinstallprompt', h)
  }, [])
  const installata = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return {
    installata,
    ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
    puoInstallare: evento !== null,
    installa: async () => { if (evento) { await evento.prompt(); setEvento(null) } },
  }
}
