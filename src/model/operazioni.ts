import { minutiDaOra } from './date'
import { nuovoId } from './id'
import type { Citta, Giorno, Impostazioni, Luogo, Tappa, Viaggio } from './tipi'

export function nuovaTappa(p: Partial<Tappa> & { titolo: string }): Tappa {
  return { id: nuovoId('t'), ora: null, descrizione: '', consiglio: '', tipo: 'visita', sera: false, stato: 'da-fare', nota: '', ...p }
}

export function nuovoGiorno(cittaId: string): Giorno {
  return { id: nuovoId('g'), cittaId, titolo: 'Nuovo giorno', intro: '', note: '', alloggio: null, consigli: [], avvisi: [], suggerimenti: [], speciale: null, tappe: [] }
}

/** Ordina per ora; le tappe senza ora restano dopo quella che le precede. */
export function ordinaPerOra(tappe: Tappa[]): Tappa[] {
  let ultima = -1
  const chiavi = tappe.map((t, i) => {
    const m = minutiDaOra(t.ora)
    if (m !== null) ultima = m
    return { t, m: m ?? ultima, i }
  })
  return chiavi.sort((a, b) => a.m - b.m || a.i - b.i).map(x => x.t)
}

function sposta<T>(elenco: T[], da: number, a: number): T[] {
  if (da < 0 || da >= elenco.length) throw new Error(`posizione ${da} fuori dall'elenco`)
  const n = [...elenco]
  const [x] = n.splice(da, 1)
  const destinazione = Math.max(0, Math.min(a, n.length))
  n.splice(destinazione, 0, x)
  return n
}

function conGiorno(v: Viaggio, giornoId: string, fn: (g: Giorno) => Giorno): Viaggio {
  if (!v.giorni.some(g => g.id === giornoId)) throw new Error(`giorno ${giornoId} inesistente`)
  return { ...v, giorni: v.giorni.map(g => (g.id === giornoId ? fn(g) : g)) }
}

export function aggiornaTappa(v: Viaggio, giornoId: string, tappaId: string, modifiche: Partial<Omit<Tappa, 'id'>>): Viaggio {
  return conGiorno(v, giornoId, g => {
    if (!g.tappe.some(t => t.id === tappaId)) throw new Error(`tappa ${tappaId} inesistente in ${giornoId}`)
    const tappe = g.tappe.map(t => (t.id === tappaId ? { ...t, ...modifiche } : t))
    return { ...g, tappe: 'ora' in modifiche ? ordinaPerOra(tappe) : tappe }
  })
}

/** Sostituisce l'intera tappa (i campi assenti vengono tolti); riordina per ora solo se l'ora è cambiata. */
export function sostituisciTappa(v: Viaggio, giornoId: string, tappa: Tappa): Viaggio {
  return conGiorno(v, giornoId, g => {
    const vecchia = g.tappe.find(t => t.id === tappa.id)
    if (!vecchia) throw new Error(`tappa ${tappa.id} inesistente in ${giornoId}`)
    const tappe = g.tappe.map(t => (t.id === tappa.id ? tappa : t))
    return { ...g, tappe: (vecchia.ora ?? null) !== (tappa.ora ?? null) ? ordinaPerOra(tappe) : tappe }
  })
}

export function aggiungiTappa(v: Viaggio, giornoId: string, tappa: Tappa): Viaggio {
  return conGiorno(v, giornoId, g => {
    const m = minutiDaOra(tappa.ora)
    if (m === null) return { ...g, tappe: [...g.tappe, tappa] }
    const dopo = g.tappe.findIndex(t => { const x = minutiDaOra(t.ora); return x !== null && x > m })
    const tappe = [...g.tappe]
    tappe.splice(dopo < 0 ? tappe.length : dopo, 0, tappa)
    return { ...g, tappe }
  })
}

export function eliminaTappa(v: Viaggio, giornoId: string, tappaId: string): Viaggio {
  return conGiorno(v, giornoId, g => ({ ...g, tappe: g.tappe.filter(t => t.id !== tappaId) }))
}

export function spostaTappa(v: Viaggio, giornoId: string, da: number, a: number): Viaggio {
  return conGiorno(v, giornoId, g => ({ ...g, tappe: sposta(g.tappe, da, a) }))
}

export function aggiornaGiorno(v: Viaggio, giornoId: string, modifiche: Partial<Omit<Giorno, 'id' | 'tappe'>>): Viaggio {
  return conGiorno(v, giornoId, g => ({ ...g, ...modifiche }))
}

/** Aggiorna l'hotel in tutti i giorni che lo condividono. */
export function aggiornaAlloggio(v: Viaggio, nome: string, modifiche: Partial<Luogo>): Viaggio {
  return { ...v, giorni: v.giorni.map(g => (g.alloggio?.nome === nome ? { ...g, alloggio: { ...g.alloggio, ...modifiche } } : g)) }
}

export function aggiungiGiorno(v: Viaggio, dopoIndice: number, cittaId: string): Viaggio {
  const giorni = [...v.giorni]
  giorni.splice(dopoIndice + 1, 0, nuovoGiorno(cittaId))
  return { ...v, giorni }
}

export function duplicaGiorno(v: Viaggio, giornoId: string): Viaggio {
  const i = v.giorni.findIndex(g => g.id === giornoId)
  if (i < 0) throw new Error(`giorno ${giornoId} inesistente`)
  const g = structuredClone(v.giorni[i])
  const copia: Giorno = { ...g, id: nuovoId('g'), note: '', tappe: g.tappe.map(t => ({ ...t, id: nuovoId('t'), stato: 'da-fare', nota: '' })) }
  const giorni = [...v.giorni]
  giorni.splice(i + 1, 0, copia)
  return { ...v, giorni }
}

export function eliminaGiorno(v: Viaggio, giornoId: string): Viaggio {
  return { ...v, giorni: v.giorni.filter(g => g.id !== giornoId) }
}

export function spostaGiorno(v: Viaggio, da: number, a: number): Viaggio {
  return { ...v, giorni: sposta(v.giorni, da, a) }
}

export function aggiungiCitta(v: Viaggio, c: Omit<Citta, 'id'>): { viaggio: Viaggio; id: string } {
  const id = nuovoId('c')
  return { viaggio: { ...v, citta: [...v.citta, { ...c, id }] }, id }
}

export function aggiornaCitta(v: Viaggio, cittaId: string, modifiche: Partial<Omit<Citta, 'id'>>): Viaggio {
  return { ...v, citta: v.citta.map(c => (c.id === cittaId ? { ...c, ...modifiche } : c)) }
}

export function eliminaCitta(v: Viaggio, cittaId: string): Viaggio {
  if (v.giorni.some(g => g.cittaId === cittaId)) throw new Error('città usata da almeno un giorno')
  return { ...v, citta: v.citta.filter(c => c.id !== cittaId) }
}

export function aggiornaViaggio(v: Viaggio, modifiche: Partial<Pick<Viaggio, 'titolo' | 'dataPartenza'>>): Viaggio {
  return { ...v, ...modifiche }
}

export function aggiornaPersona(v: Viaggio, id: string, nome: string): Viaggio {
  return { ...v, persone: v.persone.map(p => (p.id === id ? { ...p, nome } : p)) }
}

export function aggiornaImpostazioni(v: Viaggio, modifiche: Partial<Impostazioni>): Viaggio {
  return { ...v, impostazioni: { ...v.impostazioni, ...modifiche } }
}

/**
 * Per chi ha già dati salvati: aggiunge le prenotazioni di partenza che non ha (per id) e gli orari
 * sulle tappe con lo stesso id che non ne hanno. Niente di quello che c'è viene toccato.
 */
export function integraDatiDiPartenza(v: Viaggio, base: Viaggio): { viaggio: Viaggio; prenotazioni: number; orari: number } {
  const tappe = new Set(v.giorni.flatMap(g => g.tappe.map(t => t.id)))
  const presenti = new Set(v.prenotazioni.map(p => p.id))
  const nuove = base.prenotazioni.filter(p => !presenti.has(p.id)).map(p => {
    const copia = structuredClone(p)
    if (copia.tappaId !== undefined && !tappe.has(copia.tappaId)) delete copia.tappaId
    return copia
  })
  const orariBase = new Map(base.giorni.flatMap(g => g.tappe.flatMap(t => (t.orari ? [[t.id, t.orari] as const] : []))))
  let orari = 0
  const giorni = v.giorni.map(g => ({
    ...g,
    tappe: g.tappe.map(t => {
      const o = orariBase.get(t.id)
      if (!o || t.orari) return t
      orari++
      return { ...t, orari: structuredClone(o) }
    }),
  }))
  return { viaggio: { ...v, giorni, prenotazioni: [...v.prenotazioni, ...nuove] }, prenotazioni: nuove.length, orari }
}
