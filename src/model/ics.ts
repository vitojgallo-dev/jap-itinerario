import { linkSicuro } from '../servizi/mappe'
import { aggiungiGiorni, dataGiorno } from './date'
import { utcDaLocale } from './fusi'
import type { Luogo, Prenotazione, Viaggio } from './tipi'

const DOMINIO = 'jap-itinerario'
const ORA_MS = 3_600_000
export const NOME_FILE_ICS = 'giappone-2027.ics'

export type Quando = { tipo: 'ore'; inizio: Date; fine: Date } | { tipo: 'giorno'; data: string }

export interface EventoCalendario {
  /** Stabile: reimportando il file il calendario aggiorna l'evento invece di duplicarlo. */
  uid: string
  quando: Quando
  titolo: string
  luogo?: string
  descrizione?: string
  /** Valore di TRIGGER del VALARM ("-PT3H", "PT9H"); senza, nessun avviso. */
  avviso?: string
}

/** Escaping dei testi RFC 5545: barra rovesciata, punto e virgola, virgola, a capo. */
export function testoIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

const codificatore = new TextEncoder()

/** Spezza una riga a 75 ottetti (RFC 5545 §3.1) senza tagliare un carattere; la continuazione comincia con uno spazio. */
export function piegaRiga(riga: string): string {
  const parti: string[] = []
  let corrente = ''
  let byte = 0
  for (const c of riga) {
    const n = codificatore.encode(c).length
    if (byte + n > 75) {
      parti.push(corrente)
      corrente = ' '
      byte = 1
    }
    corrente += c
    byte += n
  }
  parti.push(corrente)
  return parti.join('\r\n')
}

/** 2027-08-07T10:30:00.000Z → "20270807T103000Z". */
export function istanteIcs(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function luogoTesto(l: Luogo | undefined): string | undefined {
  return l ? [l.nome, l.indirizzoJa].filter(Boolean).join(' · ') : undefined
}

/** L'ultimo volo che parte dal primo giorno del viaggio in poi (quello di andata parte prima). */
export function voloDiRitorno(v: Viaggio): Prenotazione | null {
  const voli = v.prenotazioni.filter(p => p.tipo === 'volo' && p.inizio && p.inizio.slice(0, 10) >= v.dataPartenza)
  voli.sort((a, b) => utcDaLocale(b.inizio!, b.fuso).getTime() - utcDaLocale(a.inizio!, a.fuso).getTime())
  return voli[0] ?? null
}

function eventoPrenotazione(p: Prenotazione, inizioLocale: string): EventoCalendario {
  const inizio = utcDaLocale(inizioLocale, p.fuso)
  const fine = p.fine ? utcDaLocale(p.fine, p.fusoFine ?? p.fuso) : null
  const descrizione = [p.codice && `Codice: ${p.codice}`, p.riferimento, p.note].filter(Boolean).join('\n')
  return {
    uid: `prenotazione-${p.id}@${DOMINIO}`,
    quando: { tipo: 'ore', inizio, fine: fine && fine.getTime() > inizio.getTime() ? fine : new Date(inizio.getTime() + ORA_MS) },
    titolo: p.titolo,
    luogo: luogoTesto(p.luogo),
    descrizione: descrizione || undefined,
    avviso: p.tipo === 'volo' || p.tipo === 'treno' ? '-PT3H' : '-PT1H',
  }
}

/** Gli eventi del file: prenotazioni, scadenze per prenotare, tax-free del ritorno e, a richiesta, le tappe. */
export function eventiCalendario(v: Viaggio, opzioni: { tappe: boolean }): EventoCalendario[] {
  const eventi: EventoCalendario[] = []
  for (const p of v.prenotazioni) {
    if (p.inizio) eventi.push(eventoPrenotazione(p, p.inizio))
    if (p.stato === 'da-prenotare' && p.daPrenotareEntro) {
      eventi.push({
        uid: `prenotare-${p.id}@${DOMINIO}`,
        quando: { tipo: 'giorno', data: p.daPrenotareEntro },
        titolo: `Prenotare: ${p.titolo}`,
        descrizione: linkSicuro(p.link),
        avviso: 'PT9H',
      })
    }
  }
  const ritorno = voloDiRitorno(v)
  if (ritorno?.inizio) {
    const partenza = utcDaLocale(ritorno.inizio, ritorno.fuso).getTime()
    eventi.push({
      uid: `taxfree@${DOMINIO}`,
      quando: { tipo: 'ore', inizio: new Date(partenza - 4 * ORA_MS), fine: new Date(partenza - 3.5 * ORA_MS) },
      titolo: 'Tax-free: rimborso in aeroporto prima del check-in',
      luogo: luogoTesto(ritorno.luogo),
      avviso: 'PT0S',
    })
  }
  if (opzioni.tappe) {
    v.giorni.forEach((g, i) => {
      const data = dataGiorno(v, i)
      for (const t of g.tappe) {
        if (!t.ora) continue
        const inizio = utcDaLocale(`${data}T${t.ora}`, 'Asia/Tokyo')
        eventi.push({
          uid: `tappa-${t.id}@${DOMINIO}`,
          quando: { tipo: 'ore', inizio, fine: new Date(inizio.getTime() + (t.durataMin || 60) * 60_000) },
          titolo: t.titolo,
          luogo: luogoTesto(t.luogo),
        })
      }
    })
  }
  return eventi
}

function righeEvento(e: EventoCalendario, timbro: string): string[] {
  const r = ['BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${timbro}`]
  if (e.quando.tipo === 'giorno') {
    const d = e.quando.data
    r.push(`DTSTART;VALUE=DATE:${d.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${aggiungiGiorni(d, 1).replace(/-/g, '')}`)
  } else {
    r.push(`DTSTART:${istanteIcs(e.quando.inizio)}`, `DTEND:${istanteIcs(e.quando.fine)}`)
  }
  r.push(`SUMMARY:${testoIcs(e.titolo)}`)
  if (e.luogo) r.push(`LOCATION:${testoIcs(e.luogo)}`)
  if (e.descrizione) r.push(`DESCRIPTION:${testoIcs(e.descrizione)}`)
  if (e.avviso) r.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${testoIcs(e.titolo)}`, `TRIGGER:${e.avviso}`, 'END:VALARM')
  r.push('END:VEVENT')
  return r
}

/** Il file giappone-2027.ics: orari in UTC, niente VTIMEZONE, righe piegate, CRLF. */
export function generaIcs(v: Viaggio, opzioni: { tappe: boolean; adesso: Date }): string {
  const timbro = istanteIcs(opzioni.adesso)
  const righe = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jap-itinerario//Giappone 2027//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${testoIcs(v.titolo)}`,
  ]
  for (const e of eventiCalendario(v, opzioni)) righe.push(...righeEvento(e, timbro))
  righe.push('END:VCALENDAR')
  return righe.map(piegaRiga).join('\r\n') + '\r\n'
}
