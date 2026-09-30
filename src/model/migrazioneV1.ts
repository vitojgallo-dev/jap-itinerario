import { normalizzaOra } from './date'
import type { Citta, Clima, Giorno, Luogo, Suggerimento, Tappa, TipoTappa, Viaggio } from './tipi'
import { VERSIONE_DATI } from './tipi'

export interface V1Voce { name: string; desc: string; maps: string }
export interface V1Stop {
  time: string; title: string; evening: boolean; desc: string; maps: string; tip: string
  move: { walk?: { origin: string; destination: string }; transit?: { origin: string; destination: string } } | null
  foods?: unknown[]; photo?: string; booking?: string
}
export interface V1Day {
  number: number; title: string; stops: V1Stop[]; intro?: string; notes?: string[]
  foods?: V1Voce[]; optional?: V1Voce[]; souvenir?: V1Voce[]
}
export interface V1City { city: string; label?: string; dayrange?: string; base: string; intro: string; phase?: number; days: V1Day[] }
export interface V1Data { title: string; cities: V1City[]; tripStart?: string }
export interface V1Extra {
  coordinate: Record<string, [number, number]>
  linkBiglietti: Record<string, string | null>
  ceneSpeciali: Record<string, { kind: string; city: string; note: string; options: { tier: string; name: string; desc: string; url: string }[] }>
  metaCitta: Record<string, { color: string; kanji: string; romaji: string; lat: number; lng: number }>
}

/** Medie di agosto (°C), mostrate finché la previsione non è disponibile. */
export const CLIMA_AGOSTO: Record<string, Clima> = {
  tokyo: { max: 31, min: 24 }, nikko: { max: 27, min: 19 }, kanazawa: { max: 31, min: 24 },
  kyoto: { max: 34, min: 24 }, koyasan: { max: 26, min: 18 }, osaka: { max: 33, min: 25 },
  hiroshima: { max: 32, min: 24 }, hakone: { max: 27, min: 20 },
}

/** Query con coordinate note per l'hotel di ogni città. */
const QUERY_ALLOGGIO: Record<string, string> = {
  TOKYO: 'Asakusa View Hotel Tokyo', NIKKO: 'Nikko Hoshinoyado ryokan', KANAZAWA: 'Hotel Kanazawa station',
  KYOTO: 'Kyoto Gion Hotel', OSAKA: 'Hotel Forza Osaka Namba Dotonbori', HAKONE: 'Hakone-Yumoto Station',
}

export function tipoDaTitolo(titolo: string): TipoTappa {
  if (/\b(colazione|pranzo|cena)\b/i.test(titolo)) return 'cibo'
  if (/\b(partenza|rientro|arrivo|treno)\b/i.test(titolo)) return 'spostamento'
  if (/check-in/i.test(titolo)) return 'hotel'
  return 'visita'
}

export function pulisciIntro(s: string): string {
  return s.replace(/\s*📍\s*\[\[[^\]]*\]\{\.underline\}\]\([^)]*\)/g, '').trim()
}

function nomeCitta(chiave: string): string {
  return chiave.charAt(0) + chiave.slice(1).toLowerCase()
}

export function migraV1(v1: V1Data, extra: V1Extra, opzioni: { dataPartenza: string }): Viaggio {
  const luogo = (nome: string, query: string): Luogo => {
    const c = extra.coordinate[query]
    return c ? { nome, query, lat: c[0], lng: c[1] } : { nome, query }
  }
  const suggerimenti = (d: V1Day): Suggerimento[] =>
    (['foods', 'optional', 'souvenir'] as const).flatMap(k =>
      (d[k] ?? []).map(x => ({
        tipo: k === 'foods' ? 'cibo' as const : k === 'optional' ? 'opzionale' as const : 'souvenir' as const,
        nome: x.name, descrizione: x.desc, luogo: x.maps ? luogo(x.name, x.maps) : undefined,
      })),
    )

  const citta: Citta[] = []
  const giorni: Giorno[] = []
  for (const c of v1.cities) {
    const id = c.city.toLowerCase()
    const primoBlocco = !citta.some(x => x.id === id)
    if (primoBlocco) {
      const m = extra.metaCitta[c.city]
      citta.push({
        id, nome: nomeCitta(c.city), kanji: m?.kanji ?? '', romaji: m?.romaji ?? nomeCitta(c.city),
        colore: m?.color ?? '#8E8E93', lat: m?.lat ?? 36.2, lng: m?.lng ?? 138.2,
        intro: pulisciIntro(c.intro ?? ''), clima: CLIMA_AGOSTO[id] ?? { max: 31, min: 24 },
      })
    }
    const nomeBase = (c.base ?? '').split(',')[0].trim()
    const alloggio = nomeBase ? luogo(nomeBase, QUERY_ALLOGGIO[c.city] ?? `${nomeBase} ${nomeCitta(c.city)}`) : null
    const giorniCitta = c.days ?? []
    giorniCitta.forEach((d, i) => {
      const tappe: Tappa[] = (d.stops ?? []).map((s, si) => {
        const bigliettoNoto = s.maps in extra.linkBiglietti
        const t: Tappa = {
          id: `t${d.number}-${si}`,
          ora: normalizzaOra(s.time ?? ''),
          titolo: s.title ?? '',
          descrizione: s.desc ?? '',
          consiglio: s.tip ?? '',
          tipo: tipoDaTitolo(s.title ?? ''),
          sera: !!s.evening,
          stato: 'da-fare',
          nota: '',
        }
        if (s.maps) t.luogo = luogo(s.title ?? '', s.maps)
        if (s.booking) t.biglietti = { link: s.booking }
        else if (bigliettoNoto) t.biglietti = { link: extra.linkBiglietti[s.maps] }
        if (s.move?.walk) t.spostamento = { modo: 'piedi' }
        else if (s.move?.transit) t.spostamento = { modo: 'mezzi' }
        if (s.photo) t.foto = s.photo
        return t
      })
      const speciale = extra.ceneSpeciali[String(d.number)]
      giorni.push({
        id: `g${d.number}`,
        cittaId: id,
        titolo: d.title ?? '',
        intro: d.intro || (!primoBlocco && i === 0 ? pulisciIntro(c.intro ?? '') : ''),
        note: '',
        alloggio: alloggio ? { ...alloggio } : null,
        consigli: d.notes ?? [],
        avvisi: [],
        suggerimenti: suggerimenti(d),
        speciale: speciale
          ? { titolo: speciale.kind, nota: speciale.note, opzioni: speciale.options.map(o => ({ livello: o.tier, nome: o.name, descrizione: o.desc, link: o.url })) }
          : null,
        tappe,
      })
    })
  }

  return {
    versione: VERSIONE_DATI,
    titolo: v1.title,
    dataPartenza: opzioni.dataPartenza,
    persone: [{ id: 'p1', nome: 'Vito' }, { id: 'p2', nome: 'Persona 2' }, { id: 'p3', nome: 'Persona 3' }],
    citta,
    giorni,
    prenotazioni: [],
    spese: [],
    checklist: [],
    impostazioni: { tema: 'auto' },
  }
}
