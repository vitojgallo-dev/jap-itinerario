import { differenzaGiorni } from '../model/date'

export interface MeteoGiorno { data: string; codice: number; max: number; min: number; pioggia: number | null }
export type IconaMeteo = 'sereno' | 'poco-nuvoloso' | 'nuvoloso' | 'nebbia' | 'pioggia' | 'neve' | 'temporale'
export const GIORNI_PREVISIONE = 15

export function urlMeteo(lat: number, lng: number, data: string): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&start_date=${data}&end_date=${data}`
}

type Risposta = { daily?: { time?: string[]; weather_code?: unknown[]; temperature_2m_max?: unknown[]; temperature_2m_min?: unknown[]; precipitation_probability_max?: unknown[] } }

export function leggiMeteo(j: unknown): MeteoGiorno | null {
  const d = (j as Risposta | null)?.daily
  if (!d?.time?.length) return null
  const n = (x: unknown) => (typeof x === 'number' ? x : null)
  const max = n(d.temperature_2m_max?.[0]), min = n(d.temperature_2m_min?.[0]), codice = n(d.weather_code?.[0])
  if (max === null || min === null || codice === null) return null
  return { data: d.time[0], codice, max: Math.round(max), min: Math.round(min), pioggia: n(d.precipitation_probability_max?.[0]) }
}

export function descriviCodice(c: number): { etichetta: string; icona: IconaMeteo } {
  if (c === 0) return { etichetta: 'Sereno', icona: 'sereno' }
  if (c <= 2) return { etichetta: 'Poco nuvoloso', icona: 'poco-nuvoloso' }
  if (c === 3) return { etichetta: 'Nuvoloso', icona: 'nuvoloso' }
  if (c === 45 || c === 48) return { etichetta: 'Nebbia', icona: 'nebbia' }
  if (c >= 80 && c <= 82) return { etichetta: 'Rovesci', icona: 'pioggia' }
  if (c >= 51 && c <= 67) return { etichetta: 'Pioggia', icona: 'pioggia' }
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { etichetta: 'Neve', icona: 'neve' }
  if (c >= 95) return { etichetta: 'Temporale', icona: 'temporale' }
  return { etichetta: 'Variabile', icona: 'nuvoloso' }
}

export function previsioneDisponibile(data: string, oggi: string): boolean {
  const d = differenzaGiorni(oggi, data)
  return d >= 0 && d <= GIORNI_PREVISIONE
}

export interface DipendenzeMeteo {
  prendi: (url: string) => Promise<unknown>
  storage: Pick<Storage, 'getItem' | 'setItem'>
  ora: number
}

const predefinite = (): DipendenzeMeteo => ({
  prendi: async url => { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return r.json() },
  storage: localStorage,
  ora: Date.now(),
})

const VALIDITA_MS = 3 * 3_600_000

/** Previsione del giorno, dalla cache se ha meno di 3 ore; se la rete manca, l'ultima salvata. */
export async function meteoDelGiorno(lat: number, lng: number, data: string, oggi: string, dip: DipendenzeMeteo = predefinite()): Promise<{ meteo: MeteoGiorno; salvato: number } | null> {
  if (!previsioneDisponibile(data, oggi)) return null
  const chiave = `giappone-meteo:${lat.toFixed(2)},${lng.toFixed(2)}:${data}`
  let inCache: { meteo: MeteoGiorno; salvato: number } | null = null
  try { inCache = JSON.parse(dip.storage.getItem(chiave) || 'null') } catch { inCache = null }
  if (inCache && dip.ora - inCache.salvato < VALIDITA_MS) return inCache
  try {
    const meteo = leggiMeteo(await dip.prendi(urlMeteo(lat, lng, data)))
    if (meteo) {
      const nuovo = { meteo, salvato: dip.ora }
      try { dip.storage.setItem(chiave, JSON.stringify(nuovo)) } catch { /* memoria piena */ }
      return nuovo
    }
  } catch { /* offline o servizio giù */ }
  return inCache
}
