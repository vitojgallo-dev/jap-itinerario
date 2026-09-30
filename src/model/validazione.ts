import { MODI_SPOSTAMENTO, STATI_TAPPA, TIPI_TAPPA, VERSIONE_DATI, type Viaggio } from './tipi'

type Esito = { ok: true; viaggio: Viaggio } | { ok: false; errori: string[] }

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/
const DATA = /^\d{4}-\d{2}-\d{2}$/
const oggetto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Controlla un Viaggio arrivato da fuori (file importato, dati base). */
export function validaViaggio(x: unknown): Esito {
  if (!oggetto(x)) return { ok: false, errori: ['non è un oggetto'] }
  if (x.versione !== VERSIONE_DATI) return { ok: false, errori: [`versione dei dati non supportata: ${String(x.versione)}`] }
  const strutturali: string[] = []
  for (const k of ['persone', 'citta', 'giorni', 'prenotazioni', 'spese', 'checklist'] as const) {
    if (!Array.isArray(x[k])) strutturali.push(`${k} deve essere un elenco`)
  }
  if (!oggetto(x.impostazioni)) strutturali.push('impostazioni mancanti')
  if (strutturali.length) return { ok: false, errori: strutturali }

  const errori: string[] = []
  if (typeof x.titolo !== 'string') errori.push('titolo mancante')
  if (typeof x.dataPartenza !== 'string' || !DATA.test(x.dataPartenza)) errori.push(`dataPartenza non valida: ${String(x.dataPartenza)}`)

  const citta = new Set<string>()
  for (const c of x.citta as Record<string, unknown>[]) {
    if (!oggetto(c) || typeof c.id !== 'string') { errori.push('città senza id'); continue }
    if (citta.has(c.id)) errori.push(`id città duplicato: ${c.id}`)
    citta.add(c.id)
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') errori.push(`città ${c.id}: coordinate mancanti`)
  }
  const idGiorni = new Set<string>()
  const idTappe = new Set<string>()
  for (const g of x.giorni as Record<string, unknown>[]) {
    if (!oggetto(g) || typeof g.id !== 'string') { errori.push('giorno senza id'); continue }
    if (idGiorni.has(g.id)) errori.push(`id giorno duplicato: ${g.id}`)
    idGiorni.add(g.id)
    if (!citta.has(g.cittaId as string)) errori.push(`giorno ${g.id}: città "${String(g.cittaId)}" inesistente`)
    for (const k of ['consigli', 'avvisi', 'suggerimenti', 'tappe'] as const) {
      if (!Array.isArray(g[k])) errori.push(`giorno ${g.id}: ${k} deve essere un elenco`)
    }
    for (const t of (Array.isArray(g.tappe) ? g.tappe : []) as Record<string, unknown>[]) {
      if (!oggetto(t) || typeof t.id !== 'string') { errori.push(`giorno ${g.id}: tappa senza id`); continue }
      if (idTappe.has(t.id)) errori.push(`id tappa duplicato: ${t.id}`)
      idTappe.add(t.id)
      if (t.ora !== null && (typeof t.ora !== 'string' || !ORA.test(t.ora))) errori.push(`tappa ${t.id}: ora non valida "${String(t.ora)}"`)
      if (!STATI_TAPPA.includes(t.stato as never)) errori.push(`tappa ${t.id}: stato non valido "${String(t.stato)}"`)
      if (!TIPI_TAPPA.includes(t.tipo as never)) errori.push(`tappa ${t.id}: tipo non valido "${String(t.tipo)}"`)
      if (typeof t.titolo !== 'string') errori.push(`tappa ${t.id}: titolo mancante`)
      if (oggetto(t.spostamento) && !MODI_SPOSTAMENTO.includes(t.spostamento.modo as never)) errori.push(`tappa ${t.id}: spostamento non valido`)
    }
  }
  return errori.length ? { ok: false, errori } : { ok: true, viaggio: x as unknown as Viaggio }
}
