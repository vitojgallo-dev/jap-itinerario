const CHIAVE = 'giappone-foto-v1'
let cache: Record<string, string | null> | null = null
const inCorso = new Map<string, Promise<string | null>>()

type Pagine = { query?: { pages?: Record<string, { thumbnail?: { source?: string }; imageinfo?: { thumburl?: string }[] }> } }

export function urlWikipedia(q: string): string {
  return 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=800&generator=search&gsrlimit=1&gsrsearch=' + encodeURIComponent(q)
}

export function urlCommons(q: string): string {
  return 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&gsrsearch=' + encodeURIComponent(q)
}

export function leggiWikipedia(j: unknown): string | null {
  const pagine = (j as Pagine | null)?.query?.pages
  for (const k in pagine ?? {}) { const u = pagine![k].thumbnail?.source; if (u) return u }
  return null
}

export function leggiCommons(j: unknown): string | null {
  const pagine = (j as Pagine | null)?.query?.pages
  for (const k in pagine ?? {}) { const u = pagine![k].imageinfo?.[0]?.thumburl; if (u) return u }
  return null
}

function leggiCache(): Record<string, string | null> {
  if (!cache) {
    try {
      const stored = localStorage.getItem(CHIAVE)
      const parsed = JSON.parse(stored || '{}')
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        cache = parsed as Record<string, string | null>
      } else {
        cache = {}
      }
    } catch {
      cache = {}
    }
  }
  return cache!
}

async function prendiConErrore(url: string, leggi: (j: unknown) => string | null): Promise<{ ok: true; url: string | null } | { ok: false }> {
  try {
    const r = await fetch(url)
    if (!r.ok) return { ok: false }
    const url_result = leggi(await r.json())
    return { ok: true, url: url_result }
  } catch {
    return { ok: false }
  }
}

/** Foto del luogo da Wikipedia, poi da Commons. Ricorda solo se trovato o se entrambe le API hanno risposto OK. */
export function cercaFoto(query: string): Promise<string | null> {
  const c = leggiCache()
  if (Object.hasOwn(c, query)) return Promise.resolve(c[query])
  const gia = inCorso.get(query)
  if (gia) return gia
  const p = (async () => {
    const wiki = await prendiConErrore(urlWikipedia(query), leggiWikipedia)
    if (wiki.ok && wiki.url) {
      c[query] = wiki.url
      try { localStorage.setItem(CHIAVE, JSON.stringify(c)) } catch { /* memoria piena */ }
      inCorso.delete(query)
      return wiki.url
    }
    const commons = await prendiConErrore(urlCommons(query), leggiCommons)
    if (commons.ok && commons.url) {
      c[query] = commons.url
      try { localStorage.setItem(CHIAVE, JSON.stringify(c)) } catch { /* memoria piena */ }
      inCorso.delete(query)
      return commons.url
    }
    if (wiki.ok && commons.ok) {
      c[query] = null
      try { localStorage.setItem(CHIAVE, JSON.stringify(c)) } catch { /* memoria piena */ }
    }
    inCorso.delete(query)
    return null
  })()
  inCorso.set(query, p)
  return p
}

const HOST_CORS = ['upload.wikimedia.org', 'thumb.wikimedia.org']

/**
 * Se l'immagine va chiesta con CORS: solo quelle di Wikimedia, che lo permette e che il service worker
 * mette in cache. Una foto scelta a mano da un altro sito, chiesta con CORS, non si caricherebbe.
 */
export function serveCors(url: string): boolean {
  try {
    return HOST_CORS.includes(new URL(url).hostname)
  } catch {
    return false
  }
}
