import type { Viaggio } from './tipi'

const GIORNO_MS = 86_400_000
const SETTIMANA = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function utc(data: string): number {
  const [a, m, g] = data.split('-').map(Number)
  return Date.UTC(a, m - 1, g)
}

/** Somma n giorni a una data "YYYY-MM-DD". */
export function aggiungiGiorni(data: string, n: number): string {
  return new Date(utc(data) + n * GIORNO_MS).toISOString().slice(0, 10)
}

/** Giorni da `da` ad `a` (positivo se `a` è dopo). */
export function differenzaGiorni(da: string, a: string): number {
  return Math.round((utc(a) - utc(da)) / GIORNO_MS)
}

/** La data del giorno in posizione `indice`. */
export function dataGiorno(v: Viaggio, indice: number): string {
  return aggiungiGiorni(v.dataPartenza, indice)
}

const formatoTokyo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/** Data e minuti dalla mezzanotte, nel fuso di Tokyo. */
export function istanteTokyo(d: Date): { data: string; minuti: number } {
  const parti = formatoTokyo.formatToParts(d)
  const p = (tipo: string) => parti.find(x => x.type === tipo)!.value
  return { data: `${p('year')}-${p('month')}-${p('day')}`, minuti: Number(p('hour')) * 60 + Number(p('minute')) }
}

/** "8:00" → "08:00"; restituisce null se non c'è un'ora valida all'inizio. */
export function normalizzaOra(s: string): string | null {
  const m = /^\s*(\d{1,2})[:.](\d{2})/.exec(s)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

export function minutiDaOra(ora: string | null): number | null {
  if (!ora) return null
  const [h, m] = ora.split(':').map(Number)
  return h * 60 + m
}

function giornoSettimana(data: string): number {
  return new Date(utc(data)).getUTCDay()
}

export function formatoData(data: string, stile: 'breve' | 'lungo'): string {
  const [, m, g] = data.split('-').map(Number)
  const s = SETTIMANA[giornoSettimana(data)]
  const mese = MESI[m - 1]
  return stile === 'breve' ? `${s.slice(0, 3)} ${g} ${mese.slice(0, 3)}` : `${s} ${g} ${mese}`
}

export function partiData(data: string): { settimana: string; numero: number } {
  return { settimana: SETTIMANA[giornoSettimana(data)].slice(0, 3), numero: Number(data.slice(8, 10)) }
}

export function formatoDurata(minuti: number): string {
  if (minuti < 60) return `${minuti} min`
  const h = Math.floor(minuti / 60), m = minuti % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
