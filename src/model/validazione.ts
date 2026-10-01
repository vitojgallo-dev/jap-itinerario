import { aggiungiGiorni } from './date'
import { fusoValido } from './fusi'
import {
  CATEGORIE_SPESA, FONTI_ORARI, METODI_PAGAMENTO, MODI_SPOSTAMENTO, STATI_PRENOTAZIONE, STATI_TAPPA,
  TIPI_PRENOTAZIONE, TIPI_TAPPA, VALUTE, VERSIONE_DATI, type Viaggio,
} from './tipi'

type Esito = { ok: true; viaggio: Viaggio } | { ok: false; errori: string[] }
type Obj = Record<string, unknown>

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/
const DATA = /^\d{4}-\d{2}-\d{2}$/
const LOCALE = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d$/
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

/** "YYYY-MM-DDTHH:MM" con una data che esiste. */
function localeVera(x: unknown): boolean {
  if (!stringa(x)) return false
  const m = LOCALE.exec(x)
  return m !== null && dataVera(m[1])
}

/** Un importo con una valuta ammessa; `positivo` esclude anche lo zero. */
function importoValido(x: unknown, positivo: boolean): boolean {
  return oggetto(x) && numero(x.importo) && (positivo ? x.importo > 0 : x.importo >= 0) && tra(x.valuta, VALUTE)
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

function erroriOrari(o: unknown, dove: string): string[] {
  if (!oggetto(o)) return [`${dove}: orari non validi`]
  const e: string[] = []
  const giorni = o.chiusoIl
  if (!Array.isArray(giorni) || !giorni.every(g => Number.isInteger(g) && g >= 0 && g <= 6)) e.push(`${dove}: giorni di chiusura non validi`)
  for (const [k, nome] of [['apre', 'apertura'], ['chiude', 'chiusura']] as const) {
    const ora = o[k]
    if (ora !== undefined && !(stringa(ora) && ORA.test(ora))) e.push(`${dove}: ora di ${nome} non valida`)
  }
  if (o.nota !== undefined && !stringa(o.nota)) e.push(`${dove}: nota degli orari non valida`)
  if (o.fonte !== undefined && !tra(o.fonte, FONTI_ORARI)) e.push(`${dove}: fonte degli orari non valida`)
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
  if (t.orari !== undefined) e.push(...erroriOrari(t.orari, dove))
  return e
}

function erroriPrenotazione(p: Obj): string[] {
  const e: string[] = []
  const dove = `prenotazione ${p.id}`
  if (!tra(p.tipo, TIPI_PRENOTAZIONE)) e.push(`${dove}: tipo non valido "${String(p.tipo)}"`)
  if (!tra(p.stato, STATI_PRENOTAZIONE)) e.push(`${dove}: stato non valido "${String(p.stato)}"`)
  if (!stringa(p.titolo)) e.push(`${dove}: titolo mancante`)
  if (!stringa(p.note)) e.push(`${dove}: note deve essere un testo`)
  for (const k of ['inizio', 'fine'] as const) {
    const x = p[k]
    if (x !== undefined && !localeVera(x)) e.push(`${dove}: ${k} non valido "${String(x)}"`)
  }
  if (!fusoValido(p.fuso)) e.push(`${dove}: fuso non valido "${String(p.fuso)}"`)
  if (p.fusoFine !== undefined && !fusoValido(p.fusoFine)) e.push(`${dove}: fuso della fine non valido "${String(p.fusoFine)}"`)
  if (p.luogo !== undefined) e.push(...erroriLuogo(p.luogo, dove))
  for (const k of ['codice', 'riferimento', 'link', 'tappaId'] as const) {
    if (p[k] !== undefined && !stringa(p[k])) e.push(`${dove}: ${k} deve essere un testo`)
  }
  if (p.daPrenotareEntro !== undefined && !dataVera(p.daPrenotareEntro)) e.push(`${dove}: data entro cui prenotare non valida`)
  if (p.costo !== undefined && !importoValido(p.costo, false)) e.push(`${dove}: costo non valido`)
  if (!Array.isArray(p.allegati)) {
    e.push(`${dove}: allegati deve essere un elenco`)
  } else {
    for (const a of p.allegati) {
      if (!oggetto(a) || !stringa(a.id) || !stringa(a.nome) || !stringa(a.mime) || !numero(a.byte) || a.byte < 0) e.push(`${dove}: allegato non valido`)
    }
  }
  return e
}

function erroriSpesa(s: Obj, persone: Set<string>): string[] {
  const e: string[] = []
  const dove = `spesa ${s.id}`
  if (!dataVera(s.data)) e.push(`${dove}: data non valida`)
  if (!numero(s.importo) || s.importo <= 0) e.push(`${dove}: importo non valido`)
  if (!tra(s.valuta, VALUTE)) e.push(`${dove}: valuta non valida "${String(s.valuta)}"`)
  if (!numero(s.cambio) || s.cambio <= 0) e.push(`${dove}: cambio non valido`)
  if (!tra(s.categoria, CATEGORIE_SPESA)) e.push(`${dove}: categoria non valida "${String(s.categoria)}"`)
  if (!stringa(s.descrizione)) e.push(`${dove}: descrizione deve essere un testo`)
  if (!stringa(s.pagatoDa) || !persone.has(s.pagatoDa)) e.push(`${dove}: chi ha pagato non è fra le persone`)
  const fra = s.divisaFra
  const divisaBene = Array.isArray(fra) && fra.length > 0 && fra.every(id => stringa(id) && persone.has(id)) && new Set(fra).size === fra.length
  if (!divisaBene) e.push(`${dove}: divisione non valida`)
  if (!tra(s.metodo, METODI_PAGAMENTO)) e.push(`${dove}: metodo non valido "${String(s.metodo)}"`)
  if (s.rimborso !== undefined && typeof s.rimborso !== 'boolean') e.push(`${dove}: rimborso deve essere sì o no`)
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

  const persone = new Set<string>()
  for (const p of x.persone as unknown[]) {
    if (!oggetto(p) || !stringa(p.id) || !stringa(p.nome)) { errori.push('persona non valida'); continue }
    persone.add(p.id)
  }
  const imp = x.impostazioni as Obj
  if (!tra(imp.tema, TEMI)) errori.push(`tema non valido: ${String(imp.tema)}`)
  if (imp.ultimoBackup !== undefined && !stringa(imp.ultimoBackup)) errori.push('data dell\'ultimo backup non valida')
  if (imp.budgetGiornaliero !== undefined && !importoValido(imp.budgetGiornaliero, true)) errori.push('budget giornaliero non valido')
  if (imp.cambioManuale !== undefined && (!numero(imp.cambioManuale) || imp.cambioManuale <= 0)) errori.push('cambio manuale non valido')
  if (imp.ultimoCambio !== undefined) {
    const c = imp.ultimoCambio
    if (!(oggetto(c) && numero(c.valore) && c.valore > 0 && dataVera(c.data))) errori.push('ultimo cambio non valido')
  }

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
  const idPrenotazioni = new Set<string>()
  for (const p of x.prenotazioni as unknown[]) {
    if (!oggetto(p) || !stringa(p.id)) { errori.push('prenotazione senza id'); continue }
    if (idPrenotazioni.has(p.id)) errori.push(`id prenotazione duplicato: ${p.id}`)
    idPrenotazioni.add(p.id)
    errori.push(...erroriPrenotazione(p))
  }
  const idSpese = new Set<string>()
  for (const s of x.spese as unknown[]) {
    if (!oggetto(s) || !stringa(s.id)) { errori.push('spesa senza id'); continue }
    if (idSpese.has(s.id)) errori.push(`id spesa duplicato: ${s.id}`)
    idSpese.add(s.id)
    errori.push(...erroriSpesa(s, persone))
  }
  return errori.length ? { ok: false, errori } : { ok: true, viaggio: x as unknown as Viaggio }
}
