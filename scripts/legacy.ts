import type { V1Data, V1Extra } from '../src/model/migrazioneV1'

/** Valuta il letterale JS assegnato a `const NOME = ...;` nel vecchio html. */
function estrai<T>(html: string, nome: string): T {
  const inizio = html.indexOf(`const ${nome} = `)
  if (inizio < 0) throw new Error(`${nome} non trovato nel vecchio index.html`)
  let i = html.indexOf('{', inizio)
  let profondita = 0, inStringa: string | null = null
  for (let j = i; j < html.length; j++) {
    const c = html[j]
    if (inStringa) {
      if (c === '\\') { j++; continue }
      if (c === inStringa) inStringa = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') inStringa = c
    else if (c === '{') profondita++
    else if (c === '}' && --profondita === 0) {
      return new Function(`return (${html.slice(i, j + 1)})`)() as T
    }
  }
  throw new Error(`${nome}: letterale non chiuso`)
}

export function leggiLegacy(html: string): { dati: V1Data; extra: V1Extra } {
  return {
    dati: estrai<V1Data>(html, 'DEFAULT_DATA'),
    extra: {
      coordinate: estrai(html, 'PLACE_COORDS'),
      linkBiglietti: estrai(html, 'BOOKING_LINKS'),
      ceneSpeciali: estrai(html, 'SPECIAL_DINING'),
      metaCitta: estrai(html, 'CITY_META'),
    },
  }
}
