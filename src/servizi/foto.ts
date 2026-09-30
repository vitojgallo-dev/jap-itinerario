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
    try { cache = JSON.parse(localStorage.getItem(CHIAVE) || '{}') } catch { cache = {} }
  }
  return cache!
}

async function prendi(url: string, leggi: (j: unknown) => string | null): Promise<string | null> {
  try {
    const r = await fetch(url)
    return r.ok ? leggi(await r.json()) : null
  } catch {
    return null
  }
}

/** Foto del luogo da Wikipedia, poi da Commons. Ricorda anche i "non trovato", ma solo se si era online. */
export function cercaFoto(query: string): Promise<string | null> {
  const c = leggiCache()
  if (query in c) return Promise.resolve(c[query])
  const gia = inCorso.get(query)
  if (gia) return gia
  const p = (async () => {
    const u = (await prendi(urlWikipedia(query), leggiWikipedia)) ?? (await prendi(urlCommons(query), leggiCommons))
    if (u || navigator.onLine) {
      c[query] = u
      try { localStorage.setItem(CHIAVE, JSON.stringify(c)) } catch { /* memoria piena: pazienza */ }
    }
    inCorso.delete(query)
    return u
  })()
  inCorso.set(query, p)
  return p
}
