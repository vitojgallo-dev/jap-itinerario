import { useSyncExternalStore } from 'react'

export type Schermata = 'oggi' | 'programma' | 'mappa' | 'documenti' | 'spese' | 'impostazioni'
/** `indice`: il giorno (Programma, Mappa). `id`: la prenotazione aperta (Documenti) o "nuova" (Spese). */
export interface Rotta { schermata: Schermata; indice: number | null; id: string | null }
const SCHERMATE: Schermata[] = ['oggi', 'programma', 'mappa', 'documenti', 'spese', 'impostazioni']
/** Rotte vecchie che portano altrove. */
const ALIAS = new Map<string, Schermata>([['viaggio', 'impostazioni']])
export const HREF_NUOVA_SPESA = '#/spese/nuova'

function decodifica(x: string): string | null {
  try {
    return decodeURIComponent(x)
  } catch {
    return null
  }
}

export function leggiRotta(hash: string): Rotta {
  const [, s = '', x] = hash.replace(/^#/, '').split('/')
  const schermata = SCHERMATE.find(k => k === s) ?? ALIAS.get(s) ?? 'oggi'
  const perGiorno = schermata === 'programma' || schermata === 'mappa'
  const indice = perGiorno && x !== undefined && /^\d+$/.test(x) ? Number(x) : null
  const id = !perGiorno && schermata !== 'oggi' && x ? decodifica(x) : null
  return { schermata, indice, id }
}

/** Dove va rimandata una rotta vecchia (#/viaggio → #/impostazioni); null se va bene così. */
export function reindirizzamento(hash: string): string | null {
  return /^#\/viaggio(\/|$)/.test(hash) ? hrefRotta('impostazioni') : null
}

export function hrefRotta(s: Schermata, indice?: number | null): string {
  return `#/${s}${indice != null ? `/${indice}` : ''}`
}

export function hrefDocumento(id: string): string {
  return `#/documenti/${encodeURIComponent(id)}`
}

export function vai(s: Schermata, indice?: number | null): void {
  location.hash = hrefRotta(s, indice)
}

/** Cambia rotta senza lasciare un passo indietro nella cronologia; `hashchange` parte comunque. */
export function sostituisciRotta(href: string): void {
  location.replace(href)
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
