import { differenzaGiorni, istanteTokyo } from './date'
import { nuovoId } from './id'
import {
  CATEGORIE_SPESA, type CategoriaSpesa, type Id, type Impostazioni, type MetodoPagamento, type Persona, type Spesa,
  type Valuta, type Viaggio,
} from './tipi'

type Valore = Pick<Spesa, 'importo' | 'valuta' | 'cambio'>

/** Il valore di una spesa in yen, col cambio salvato nella spesa stessa. */
export function inYen(s: Valore): number {
  return s.valuta === 'JPY' ? s.importo : s.importo * s.cambio
}

/** Il valore di una spesa in euro, col cambio salvato nella spesa stessa. */
export function inEuro(s: Valore): number {
  return s.valuta === 'EUR' ? s.importo : s.importo / s.cambio
}

/** Le quote in yen interi: il resto della divisione va, uno yen a testa, ai primi dell'elenco. La somma è il totale esatto. */
export function quote(s: Spesa): Map<Id, number> {
  const totale = Math.round(inYen(s))
  const n = s.divisaFra.length
  const base = Math.floor(totale / n)
  let resto = totale - base * n
  const q = new Map<Id, number>()
  for (const id of s.divisaFra) {
    q.set(id, (q.get(id) ?? 0) + base + (resto > 0 ? 1 : 0))
    if (resto > 0) resto--
  }
  return q
}

/** Pagato meno la propria quota, in yen interi, per id di persona. La somma dei saldi è zero. */
export function saldi(persone: Persona[], spese: Spesa[]): Record<Id, number> {
  const s: Record<Id, number> = Object.fromEntries(persone.map(p => [p.id, 0]))
  for (const x of spese) {
    s[x.pagatoDa] = (s[x.pagatoDa] ?? 0) + Math.round(inYen(x))
    for (const [id, q] of quote(x)) s[id] = (s[id] ?? 0) - q
  }
  return s
}

export interface Rimborso { da: Id; a: Id; yen: number }

/** Il numero minimo di rimborsi: il debitore più grande paga il creditore più grande, e così via. */
export function rimborsiMinimi(saldi: Record<Id, number>): Rimborso[] {
  const ordina = (x: [Id, number][]) => x.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  const creditori = ordina(Object.entries(saldi).filter(([, v]) => v > 0))
  const debitori = ordina(Object.entries(saldi).filter(([, v]) => v < 0).map(([k, v]): [Id, number] => [k, -v]))
  const r: Rimborso[] = []
  let i = 0
  let j = 0
  while (i < debitori.length && j < creditori.length) {
    const yen = Math.min(debitori[i][1], creditori[j][1])
    r.push({ da: debitori[i][0], a: creditori[j][0], yen })
    debitori[i][1] -= yen
    creditori[j][1] -= yen
    if (debitori[i][1] === 0) i++
    if (creditori[j][1] === 0) j++
  }
  return r
}

/** "Segna come saldato": chi deve paga, e la spesa è tutta del creditore. */
export function spesaRimborso(r: Rimborso, data: string, cambio: number): Spesa {
  return {
    id: nuovoId('s'), data, importo: r.yen, valuta: 'JPY', cambio, categoria: 'altro', descrizione: 'Rimborso',
    pagatoDa: r.da, divisaFra: [r.a], metodo: 'contanti', rimborso: true,
  }
}

/** Il rimborso di `da` verso `a` così com'è adesso: null se quel debito non c'è (già saldato, o è dall'altra parte). */
export function rimborsoDaSaldare(v: Viaggio, da: Id, a: Id): Rimborso | null {
  return rimborsiMinimi(saldi(v.persone, v.spese)).find(r => r.da === da && r.a === a) ?? null
}

export interface RiepilogoSpese {
  yen: number
  euro: number
  quote: Record<Id, number>
  perMetodo: Record<MetodoPagamento, number>
  perCategoria: { categoria: CategoriaSpesa; yen: number }[]
  perGiorno: { data: string; yen: number; spese: Spesa[] }[]
}

/** Totali (i rimborsi non sono spese), quote di ciascuno, per metodo, per categoria e per giorno dal più recente. */
export function riepilogoSpese(spese: Spesa[]): RiepilogoSpese {
  const quoteTotali: Record<Id, number> = {}
  const perMetodo: Record<MetodoPagamento, number> = { contanti: 0, carta: 0 }
  const categorie = new Map<CategoriaSpesa, number>()
  let yen = 0
  let euro = 0
  for (const s of spese) {
    if (s.rimborso) continue
    const y = Math.round(inYen(s))
    yen += y
    euro += inEuro(s)
    perMetodo[s.metodo] += y
    categorie.set(s.categoria, (categorie.get(s.categoria) ?? 0) + y)
    for (const [id, q] of quote(s)) quoteTotali[id] = (quoteTotali[id] ?? 0) + q
  }
  const giorni = new Map<string, Spesa[]>()
  for (const s of [...spese].reverse()) giorni.set(s.data, [...(giorni.get(s.data) ?? []), s])
  const perGiorno = [...giorni.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([data, elenco]) => ({ data, spese: elenco, yen: elenco.filter(s => !s.rimborso).reduce((t, s) => t + Math.round(inYen(s)), 0) }))
  const perCategoria = CATEGORIE_SPESA
    .flatMap(categoria => { const y = categorie.get(categoria); return y ? [{ categoria, yen: y }] : [] })
    .sort((a, b) => b.yen - a.yen)
  return { yen, euro, quote: quoteTotali, perMetodo, perCategoria, perGiorno }
}

/** Il cambio manuale vince; poi l'ultimo scaricato; altrimenti va chiesto. */
export function cambioDaUsare(imp: Impostazioni): number | null {
  return imp.cambioManuale ?? imp.ultimoCambio?.valore ?? null
}

/** Oggi in ora di Tokyo; prima della partenza, il G0. */
export function dataPredefinita(v: Viaggio, adesso: Date): string {
  const oggi = istanteTokyo(adesso).data
  return differenzaGiorni(v.dataPartenza, oggi) < 0 ? v.dataPartenza : oggi
}

/** Chi ha pagato, categoria, valuta e metodo dell'ultima spesa vera (i rimborsi non contano). */
export function ultimeScelte(v: Viaggio): Pick<Spesa, 'pagatoDa' | 'categoria' | 'valuta' | 'metodo'> {
  const prima = v.persone[0]?.id ?? ''
  const ultima = [...v.spese].reverse().find(s => !s.rimborso)
  if (!ultima) return { pagatoDa: prima, categoria: 'cibo', valuta: 'JPY', metodo: 'contanti' }
  const pagatoDa = v.persone.some(p => p.id === ultima.pagatoDa) ? ultima.pagatoDa : prima
  return { pagatoDa, categoria: ultima.categoria, valuta: ultima.valuta, metodo: ultima.metodo }
}

/** La bozza del foglio "Nuova spesa": divisa fra tutti, con le ultime scelte e il cambio di adesso (0 = da chiedere). */
export function nuovaSpesa(v: Viaggio, adesso: Date): Spesa {
  return {
    id: nuovoId('s'), data: dataPredefinita(v, adesso), importo: 0, cambio: cambioDaUsare(v.impostazioni) ?? 0,
    descrizione: '', divisaFra: v.persone.map(p => p.id), ...ultimeScelte(v),
  }
}

function conSpesa(v: Viaggio, id: string, fn: (s: Spesa) => Spesa): Viaggio {
  if (!v.spese.some(s => s.id === id)) throw new Error(`spesa ${id} inesistente`)
  return { ...v, spese: v.spese.map(s => (s.id === id ? fn(s) : s)) }
}

export function aggiungiSpesa(v: Viaggio, s: Spesa): Viaggio {
  return { ...v, spese: [...v.spese, s] }
}

export function sostituisciSpesa(v: Viaggio, s: Spesa): Viaggio {
  return conSpesa(v, s.id, () => s)
}

export function eliminaSpesa(v: Viaggio, id: string): Viaggio {
  return { ...v, spese: v.spese.filter(s => s.id !== id) }
}

/** Quanti yen vale 1 euro: fuori da questo intervallo è quasi certamente un errore di battitura (161,274 letto come 161274). */
export const CAMBIO_PLAUSIBILE = { min: 50, max: 500 } as const

export function cambioPlausibile(n: number): boolean {
  return n >= CAMBIO_PLAUSIBILE.min && n <= CAMBIO_PLAUSIBILE.max
}

export const ERRORE_CAMBIO_FUORI_INTERVALLO = `Il cambio sembra sbagliato: di solito è fra ${CAMBIO_PLAUSIBILE.min} e ${CAMBIO_PLAUSIBILE.max} yen per 1 euro.`

/** I messaggi in linea del foglio: importo > 0, almeno una persona, un cambio plausibile. */
export function controllaSpesa(s: Spesa): string[] {
  const e: string[] = []
  if (!(s.importo > 0)) e.push('Scrivi un importo maggiore di zero.')
  if (s.divisaFra.length === 0) e.push('Scegli almeno una persona con cui dividere.')
  if (!(s.cambio > 0)) e.push('Serve il cambio: scrivi quanti yen vale 1 euro.')
  else if (!cambioPlausibile(s.cambio)) e.push(ERRORE_CAMBIO_FUORI_INTERVALLO)
  return e
}

/**
 * "12,50" → 12.5; "1.234,5" → 1234.5; "1,234.5" → 1234.5; "1.500" → 1500 (il punto a gruppi di tre cifre è delle migliaia).
 * Vuoto, negativo o con altro dentro (esponenti, esadecimali, doppi separatori) → null.
 */
export function leggiImporto(testo: string): number | null {
  const t = testo.replace(/[\s\u00A0]/g, '')
  let normale: string
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) normale = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) normale = t.replace(/,/g, '')
  else if (/^\d+([.,]\d+)?$/.test(t)) normale = t.replace(',', '.')
  else return null
  const n = Number(normale)
  return Number.isFinite(n) ? n : null
}

/** Un cambio scritto a mano: virgola o punto sono sempre decimali (un cambio non ha migliaia). "161,274" → 161.274. */
export function leggiTasso(testo: string): number | null {
  const t = testo.replace(/[\s ]/g, '')
  if (!/^\d+([.,]\d+)?$/.test(t)) return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function raggruppa(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatoYen(yen: number): string {
  const r = Math.round(yen)
  return `${r < 0 ? '-' : ''}${raggruppa(Math.abs(r))}\u00A0¥`
}

export function formatoEuro(euro: number): string {
  const c = Math.round(euro * 100)
  const a = Math.abs(c)
  return `${c < 0 ? '-' : ''}${raggruppa(Math.floor(a / 100))},${String(a % 100).padStart(2, '0')}\u00A0€`
}

export function formatoImporto(importo: number, valuta: Valuta): string {
  return valuta === 'JPY' ? formatoYen(importo) : formatoEuro(importo)
}

/** Un numero da rimettere in un campo di testo: al massimo due decimali, con la virgola. */
export function formatoNumero(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',')
}

/**
 * Come `formatoNumero`, ma senza arrotondare: per rimettere in un campo il valore salvato, così salvare senza toccare non lo cambia.
 * Con esattamente tre decimali ("161,274") `leggiImporto` leggerebbe le migliaia: si aggiunge uno zero ("161,2740").
 */
export function formatoNumeroPieno(n: number): string {
  const t = String(n)
  const decimali = t.split('.')[1]
  return (decimali?.length === 3 ? t + '0' : t).replace('.', ',')
}
