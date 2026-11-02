import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { LUOGHI } from './itinerario-v3'

/**
 * Cerca su OpenStreetMap (Nominatim) le coordinate dei luoghi di itinerario-v3.ts che non le hanno ancora
 * e le scrive in luoghi-v3.json. Una richiesta al secondo, come chiede Nominatim.
 * Uso: npx tsx scripts/coordinate-v3.ts
 */
const file = new URL('./luoghi-v3.json', import.meta.url)
const coord: Record<string, { lat: number; lng: number }> = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
const pausa = (ms: number) => new Promise(r => setTimeout(r, ms))

for (const [k, [, query]] of Object.entries(LUOGHI)) {
  if (coord[k]) continue
  await pausa(1100)
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: `${query}, Japan`, format: 'json', limit: '1' })}`
  const r = await fetch(url, { headers: { 'User-Agent': 'jap-itinerario/1.0 (viaggio personale)' } })
  const [primo] = (await r.json()) as { lat: string; lon: string; display_name: string }[]
  if (!primo) { console.log(`NON TROVATO ${k}: ${query}`); continue }
  coord[k] = { lat: Math.round(+primo.lat * 1e4) / 1e4, lng: Math.round(+primo.lon * 1e4) / 1e4 }
  console.log(`${k}\t${coord[k].lat},${coord[k].lng}\t${primo.display_name.slice(0, 90)}`)
}
writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(coord).sort()), null, 1) + '\n')
