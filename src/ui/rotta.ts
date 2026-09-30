import { useSyncExternalStore } from 'react'

export type Schermata = 'oggi' | 'programma' | 'mappa' | 'viaggio'
export interface Rotta { schermata: Schermata; indice: number | null }
const SCHERMATE: Schermata[] = ['oggi', 'programma', 'mappa', 'viaggio']

export function leggiRotta(hash: string): Rotta {
  const [, s, i] = hash.replace(/^#/, '').split('/')
  const schermata = SCHERMATE.find(x => x === s) ?? 'oggi'
  return { schermata, indice: schermata !== 'oggi' && i !== undefined && /^\d+$/.test(i) ? Number(i) : null }
}

export function hrefRotta(s: Schermata, indice?: number | null): string {
  return `#/${s}${indice != null ? `/${indice}` : ''}`
}

export function vai(s: Schermata, indice?: number | null): void {
  location.hash = hrefRotta(s, indice)
}

function iscrivi(cb: () => void) {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}

export function useRotta(): Rotta {
  return leggiRotta(useSyncExternalStore(iscrivi, () => location.hash))
}

/** `?oggi=2027-08-16T10:15` finge di essere in quel momento (ora di Tokyo). Serve per le prove. */
export function leggiOverride(search: string): Date | null {
  const p = new URLSearchParams(search).get('oggi')
  if (!p) return null
  const d = new Date(p.length === 10 ? `${p}T09:00:00+09:00` : `${p}:00+09:00`)
  return Number.isNaN(d.getTime()) ? null : d
}
