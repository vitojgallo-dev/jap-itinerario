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

// `beforeinstallprompt` parte una volta sola, all'avvio: lo si cattura appena il modulo è importato,
// altrimenti una schermata montata dopo lo perderebbe.
let eventoInstallazione: EventoInstallazione | null = null
const ascoltatoriInstallazione = new Set<() => void>()

function impostaEvento(e: EventoInstallazione | null) {
  eventoInstallazione = e
  ascoltatoriInstallazione.forEach(cb => cb())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); impostaEvento(e as EventoInstallazione) })
  window.addEventListener('appinstalled', () => impostaEvento(null))
}

function iscriviInstallazione(cb: () => void) {
  ascoltatoriInstallazione.add(cb)
  return () => { ascoltatoriInstallazione.delete(cb) }
}

export function useInstallazione() {
  const evento = useSyncExternalStore(iscriviInstallazione, () => eventoInstallazione)
  const installata = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return {
    installata,
    ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
    puoInstallare: evento !== null,
    installa: async () => { if (evento) { await evento.prompt(); impostaEvento(null) } },
  }
}
