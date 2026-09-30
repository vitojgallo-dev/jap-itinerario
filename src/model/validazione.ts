import { aggiungiGiorni } from './date'
import { MODI_SPOSTAMENTO, STATI_TAPPA, TIPI_TAPPA, VERSIONE_DATI, type Viaggio } from './tipi'

type Esito = { ok: true; viaggio: Viaggio } | { ok: false; errori: string[] }
type Obj = Record<string, unknown>

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/
const DATA = /^\d{4}-\d{2}-\d{2}$/
const TEMI = ['auto', 'chiaro', 'scuro']
const LIVELLI_AVVISO = ['info', 'attenzione']
const TIPI_SUGGERIMENTO = ['cibo', 'opzionale', 'souvenir']
const AFFIDABILITA = ['certa', 'probabile', 'da-verificare']

const oggetto = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)
const stringa = (x: unknown): x is string => typeof x === 'string'
const numero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const tra = (x: unknown, ammessi: readonly string[]) => typeof x === 'string' && ammessi.includes(x)
/** I campi di `o` elencati in `chiavi` che non sono stringhe. */
const nonStringhe = (o: Obj, chiavi: string[]) => chiavi.filter(k => !stringa(o[k]))

/** Una data "YYYY-MM-DD" che esiste davvero nel calendario. */
function dataVera(d: unknown): boolean {
  if (!stringa(d) || !DATA.test(d)) return false
  try {
    return aggiungiGiorni(d, 0) === d
  } catch {
    return false
  }
}

/** Gli errori di un Luogo, con `dove` davanti; vuoto se è valido. */
function erroriLuogo(l: unknown, dove: string): string[] {
  if (!oggetto(l)) return [`${dove}: luogo non valido`]
  const e: string[] = []
  for (const k of nonStringhe(l, ['nome', 'query'])) e.push(`${dove}: ${k} del luogo deve essere un testo`)
  for (const k of ['lat', 'lng']) if (l[k] !== undefined && !numero(l[k])) e.push(`${dove}: ${k} del luogo deve essere un numero`)
  if (l.indirizzoJa !== undefined && !stringa(l.indirizzoJa)) e.push(`${dove}: indirizzoJa del luogo deve essere un testo`)
  return e
}

function erroriCitta(c: Obj): string[] {
  const e: string[] = []
  const dove = `città ${c.id}`
  for (const k of nonStringhe(c, ['nome', 'kanji', 'romaji', 'colore', 'intro'])) e.push(`${dove}: ${k} deve essere un testo`)
  if (!numero(c.lat) || !numero(c.lng)) e.push(`${dove}: coordinate mancanti`)
  if (!oggetto(c.clima) || !numero(c.clima.max) || !numero(c.clima.min)) e.push(`${dove}: clima mancante`)
  return e
}

function erroriGiorno(g: Obj): string[] {
  const e: string[] = []
  const dove = `giorno ${g.id}`
  for (const k of nonStringhe(g, ['titolo', 'intro', 'note'])) e.push(`${dove}: ${k} deve essere un testo`)
  if (g.alloggio !== null) e.push(...erroriLuogo(g.alloggio, `${dove}, alloggio`))
  if (Array.isArray(g.consigli) && !g.consigli.every(stringa)) e.push(`${dove}: i consigli devono essere testi`)
  if (Array.isArray(g.avvisi)) {
    for (const a of g.avvisi) {
      if (!oggetto(a) || !stringa(a.testo) || !tra(a.livello, LIVELLI_AVVISO)) e.push(`${dove}: avviso non valido`)
    }
  }
  if (Array.isArray(g.suggerimenti)) {
    for (const s of g.suggerimenti) {
      if (!oggetto(s) || !tra(s.tipo, TIPI_SUGGERIMENTO) || !stringa(s.nome) || !stringa(s.descrizione)) {
        e.push(`${dove}: suggerimento non valido`)
        continue
      }
      if (s.luogo !== undefined) e.push(...erroriLuogo(s.luogo, `${dove}, suggerimento "${s.nome}"`))
    }
  }
  if (g.speciale !== null) {
    const s = g.speciale
    const valido = oggetto(s) && stringa(s.titolo) && stringa(s.nota) && Array.isArray(s.opzioni)
      && s.opzioni.every(o => oggetto(o) && nonStringhe(o, ['livello', 'nome', 'descrizione', 'link']).length === 0)
    if (!valido) e.push(`${dove}: speciale non valido`)
  }
  return e
}

function erroriTappa(t: Obj): string[] {
  const e: string[] = []
  const dove = `tappa ${t.id}`
  if (t.ora !== null && (!stringa(t.ora) || !ORA.test(t.ora))) e.push(`${dove}: ora non valida "${String(t.ora)}"`)
  if (!tra(t.stato, STATI_TAPPA)) e.push(`${dove}: stato non valido "${String(t.stato)}"`)
  if (!tra(t.tipo, TIPI_TAPPA)) e.push(`${dove}: tipo non valido "${String(t.tipo)}"`)
  if (!stringa(t.titolo)) e.push(`${dove}: titolo mancante`)
  for (const k of nonStringhe(t, ['descrizione', 'consiglio', 'nota'])) e.push(`${dove}: ${k} deve essere un testo`)
  if (typeof t.sera !== 'boolean') e.push(`${dove}: sera deve essere sì o no`)
  if (t.durataMin !== undefined && (!numero(t.durataMin) || t.durataMin < 0)) e.push(`${dove}: durata non valida`)
  if (t.luogo !== undefined) e.push(...erroriLuogo(t.luogo, dove))
  if (t.biglietti !== undefined && !(oggetto(t.biglietti) && (t.biglietti.link === null || stringa(t.biglietti.link)))) {
    e.push(`${dove}: biglietti non validi`)
  }
  if (t.spostamento !== undefined) {
    const s = t.spostamento
    const valido = oggetto(s) && tra(s.modo, MODI_SPOSTAMENTO)
      && (s.minuti === undefined || numero(s.minuti)) && (s.nota === undefined || stringa(s.nota))
    if (!valido) e.push(`${dove}: spostamento non valido`)
  }
  if (t.evento !== undefined) {
    const v = t.evento
    const valido = oggetto(v) && stringa(v.nome) && tra(v.affidabilita, AFFIDABILITA)
      && (v.nomeJa === undefined || stringa(v.nomeJa)) && (v.fonte === undefined || stringa(v.fonte))
    if (!valido) e.push(`${dove}: evento non valido`)
  }
  if (t.foto !== undefined && !stringa(t.foto)) e.push(`${dove}: foto non valida`)
  return e
}

/** Controlla un Viaggio arrivato da fuori (file importato, stato salvato, dati base), tipi dei campi compresi. */
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
  if (!stringa(x.titolo)) errori.push('titolo mancante')
  if (!dataVera(x.dataPartenza)) errori.push(`dataPartenza non valida: ${String(x.dataPartenza)}`)

  for (const p of x.persone as unknown[]) {
    if (!oggetto(p) || !stringa(p.id) || !stringa(p.nome)) errori.push('persona non valida')
  }
  const imp = x.impostazioni as Obj
  if (!tra(imp.tema, TEMI)) errori.push(`tema non valido: ${String(imp.tema)}`)
  if (imp.ultimoBackup !== undefined && !stringa(imp.ultimoBackup)) errori.push('data dell\'ultimo backup non valida')

  const citta = new Set<string>()
  for (const c of x.citta as unknown[]) {
    if (!oggetto(c) || !stringa(c.id)) { errori.push('città senza id'); continue }
    if (citta.has(c.id)) errori.push(`id città duplicato: ${c.id}`)
    citta.add(c.id)
    errori.push(...erroriCitta(c))
  }
  const idGiorni = new Set<string>()
  const idTappe = new Set<string>()
  for (const g of x.giorni as unknown[]) {
    if (!oggetto(g) || !stringa(g.id)) { errori.push('giorno senza id'); continue }
    if (idGiorni.has(g.id)) errori.push(`id giorno duplicato: ${g.id}`)
    idGiorni.add(g.id)
    if (!stringa(g.cittaId) || !citta.has(g.cittaId)) errori.push(`giorno ${g.id}: città "${String(g.cittaId)}" inesistente`)
    for (const k of ['consigli', 'avvisi', 'suggerimenti', 'tappe'] as const) {
      if (!Array.isArray(g[k])) errori.push(`giorno ${g.id}: ${k} deve essere un elenco`)
    }
    errori.push(...erroriGiorno(g))
    for (const t of (Array.isArray(g.tappe) ? g.tappe : []) as unknown[]) {
      if (!oggetto(t) || !stringa(t.id)) { errori.push(`giorno ${g.id}: tappa senza id`); continue }
      if (idTappe.has(t.id)) errori.push(`id tappa duplicato: ${t.id}`)
      idTappe.add(t.id)
      errori.push(...erroriTappa(t))
    }
  }
  return errori.length ? { ok: false, errori } : { ok: true, viaggio: x as unknown as Viaggio }
}
