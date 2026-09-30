import { distanzaKm } from '../servizi/distanza'
import { cittaDi } from './riepilogo'
import type { StatoTappa, Viaggio } from './tipi'

export interface PuntoMappa {
  id: string; giornoId: string; indice: number; numero: number
  lat: number; lng: number; titolo: string; colore: string; stato: StatoTappa
}

/** Il colore finisce in HTML e in stili: passa solo un esadecimale a sei cifre (i dati possono venire da un backup importato). */
export function coloreSicuro(colore: string | undefined): string {
  return colore && /^#[0-9a-fA-F]{6}$/.test(colore) ? colore : '#8E8E93'
}

function punti(v: Viaggio, indice: number): PuntoMappa[] {
  const g = v.giorni[indice]
  const colore = coloreSicuro(cittaDi(v, g).colore)
  return g.tappe.flatMap((t, i) => {
    const l = t.luogo
    if (l?.lat == null || l.lng == null) return []
    return [{ id: t.id, giornoId: g.id, indice, numero: i + 1, lat: l.lat, lng: l.lng, titolo: t.titolo, colore, stato: t.stato }]
  })
}

export function puntiGiorno(v: Viaggio, indice: number): PuntoMappa[] {
  return indice >= 0 && indice < v.giorni.length ? punti(v, indice) : []
}

export function puntiViaggio(v: Viaggio): PuntoMappa[] {
  return v.giorni.flatMap((_, i) => punti(v, i))
}

/** Le tappe più vicine a `pos`; lo stesso posto visto in più giorni conta una volta. */
export function vicini(v: Viaggio, pos: { lat: number; lng: number }, max = 8): (PuntoMappa & { km: number })[] {
  const visti = new Set<string>()
  return puntiViaggio(v)
    .map(p => ({ ...p, km: distanzaKm(pos, p) }))
    .sort((a, b) => a.km - b.km)
    .filter(p => {
      const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
      if (visti.has(k)) return false
      visti.add(k)
      return true
    })
    .slice(0, max)
}
