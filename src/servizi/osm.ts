import { normalizzaTesto } from '../model/ricerca'

export const URL_OVERPASS = 'https://overpass-api.de/api/interpreter'

/** Il tempo che Overpass concede alla query (`[timeout:…]`). */
export const TIMEOUT_QUERY_S = 20
/** Quanto aspetta il telefono: più del server, che altrimenti vedrebbe la richiesta tagliata mentre sta ancora lavorando. */
export const TIMEOUT_RICHIESTA_MS = 25_000

export interface OrarioOsm { nome: string; orari: string }

/** Parole che non distinguono un luogo da quelli intorno. */
const PAROLE_VUOTE = new Set([
  'tokyo', 'kyoto', 'osaka', 'nara', 'kanazawa', 'nikko', 'hakone', 'kobe', 'japan', 'giappone',
  'station', 'stazione', 'della', 'delle', 'degli', 'dello',
])

/** Le parole del nome da cercare: minuscole, senza accenti, di almeno 4 lettere, al massimo 6. */
export function terminiRicerca(testi: string[]): string[] {
  const visti = new Set<string>()
  for (const t of testi) {
    for (const p of normalizzaTesto(t).split(/[^a-z0-9]+/)) {
      if (p.length >= 4 && !PAROLE_VUOTE.has(p)) visti.add(p)
    }
  }
  return [...visti].slice(0, 6)
}

/** Overpass QL: luoghi con `opening_hours` entro 300 m il cui nome (anche in inglese o italiano) contiene uno dei termini. */
export function queryOverpass(termini: string[], lat: number, lng: number): string {
  const re = termini.join('|')
  const righe = ['name', 'name:en', 'name:it', 'name:ja-Latn'].map(k => `  nwr(around:300,${lat},${lng})["${k}"~"${re}",i]["opening_hours"];`)
  return `[out:json][timeout:${TIMEOUT_QUERY_S}];\n(\n${righe.join('\n')}\n);\nout tags 20;`
}

type Elemento = { tags?: Record<string, unknown> }

/** Il testo di un tag, o niente: i dati di OSM sono di chiunque e non si fidano. */
const testoDi = (v: unknown): string => (typeof v === 'string' ? v : '')

/** I luoghi trovati, i nomi più simili prima; `opening_hours` resta com'è: la sintassi OSM non si interpreta. */
export function leggiOverpass(j: unknown, termini: string[]): OrarioOsm[] {
  const elementi = (j as { elements?: unknown } | null)?.elements
  if (!Array.isArray(elementi)) return []
  const visti = new Set<string>()
  return (elementi as Elemento[])
    .flatMap(e => {
      const t = e?.tags
      const orari = t?.opening_hours
      if (!t || typeof orari !== 'string') return []
      const nome = testoDi(t['name:it']) || testoDi(t['name:en']) || testoDi(t.name)
      const testo = normalizzaTesto([t.name, t['name:en'], t['name:it'], t['name:ja-Latn']].map(testoDi).filter(Boolean).join(' '))
      return [{ nome, orari, punti: termini.filter(x => testo.includes(x)).length }]
    })
    .sort((a, b) => b.punti - a.punti)
    .filter(x => {
      const k = `${x.nome}|${x.orari}`
      if (visti.has(k)) return false
      visti.add(k)
      return true
    })
    .slice(0, 5)
    .map(({ nome, orari }) => ({ nome, orari }))
}

const inviaQuery = async (url: string, corpo: string): Promise<unknown> => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo,
    // Dove AbortSignal.timeout non esiste (browser vecchi) la richiesta resta senza limite: il pulsante torna libero solo a risposta arrivata.
    signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TIMEOUT_RICHIESTA_MS) : undefined,
  })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

/** Una richiesta sola, al tocco del pulsante. Senza un nome da cercare (o senza una posizione valida) non parte niente. Lancia se la rete non va: chi chiama mostra il messaggio. */
export async function cercaOrariOsm(testi: string[], lat: number, lng: number, prendi: (url: string, corpo: string) => Promise<unknown> = inviaQuery): Promise<OrarioOsm[]> {
  const termini = terminiRicerca(testi)
  if (termini.length === 0 || !Number.isFinite(lat) || !Number.isFinite(lng)) return []
  return leggiOverpass(await prendi(URL_OVERPASS, 'data=' + encodeURIComponent(queryOverpass(termini, lat, lng))), termini)
}
