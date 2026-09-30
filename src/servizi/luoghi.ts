export interface RisultatoLuogo { nome: string; indirizzo: string; lat: number; lng: number }

export function urlNominatim(q: string): string {
  return 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=jp&accept-language=it,en&q=' + encodeURIComponent(q)
}

export function leggiNominatim(j: unknown): RisultatoLuogo[] {
  if (!Array.isArray(j)) return []
  return j.flatMap((r: { name?: string; display_name?: string; lat?: string; lon?: string }) => {
    const lat = Number(r.lat), lng = Number(r.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
    const indirizzo = String(r.display_name ?? '')
    return [{ nome: r.name || indirizzo.split(',')[0].trim(), indirizzo, lat, lng }]
  })
}

/** Una sola richiesta per ricerca, solo quando si preme "Cerca" (policy di Nominatim). */
export async function cercaLuoghi(q: string): Promise<RisultatoLuogo[]> {
  const r = await fetch(urlNominatim(q), { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('ricerca non disponibile')
  return leggiNominatim(await r.json())
}
