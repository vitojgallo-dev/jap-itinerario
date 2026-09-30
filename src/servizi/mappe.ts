import type { Luogo, ModoSpostamento } from '../model/tipi'

const BASE = 'https://www.google.com/maps'
export type ModoGoogle = 'transit' | 'walking' | 'driving'

function destinazione(l: Luogo): string {
  if (l.query) return l.query
  if (l.lat != null && l.lng != null) return `${l.lat},${l.lng}`
  return l.nome
}

export function urlIndicazioni(a: Luogo, modo: ModoGoogle = 'transit'): string {
  return `${BASE}/dir/?api=1&destination=${encodeURIComponent(destinazione(a))}&travelmode=${modo}`
}

export function urlPercorso(da: Luogo, a: Luogo, modo: ModoGoogle): string {
  return `${BASE}/dir/?api=1&origin=${encodeURIComponent(destinazione(da))}&destination=${encodeURIComponent(destinazione(a))}&travelmode=${modo}`
}

export function urlCerca(l: Luogo): string {
  return `${BASE}/search/?api=1&query=${encodeURIComponent(destinazione(l))}`
}

export function urlCercaBiglietti(titolo: string): string {
  return 'https://www.google.com/search?q=' + encodeURIComponent(`${titolo} biglietti prenotazione tickets`)
}

export function modoGoogle(m: ModoSpostamento): ModoGoogle {
  return m === 'piedi' ? 'walking' : m === 'taxi' ? 'driving' : 'transit'
}
