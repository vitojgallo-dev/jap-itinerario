export type Id = string

export interface Luogo {
  nome: string
  query: string
  lat?: number
  lng?: number
  indirizzoJa?: string
}

export const TIPI_TAPPA = ['visita', 'cibo', 'evento', 'spostamento', 'hotel', 'libero'] as const
export type TipoTappa = (typeof TIPI_TAPPA)[number]

export const STATI_TAPPA = ['da-fare', 'fatta', 'saltata'] as const
export type StatoTappa = (typeof STATI_TAPPA)[number]

export const MODI_SPOSTAMENTO = ['piedi', 'mezzi', 'treno', 'taxi'] as const
export type ModoSpostamento = (typeof MODI_SPOSTAMENTO)[number]

export interface Spostamento {
  modo: ModoSpostamento
  minuti?: number
  nota?: string
}

export interface InfoEvento {
  nome: string
  nomeJa?: string
  affidabilita: 'certa' | 'probabile' | 'da-verificare'
  fonte?: string
}

export interface Tappa {
  id: Id
  ora: string | null
  durataMin?: number
  titolo: string
  descrizione: string
  consiglio: string
  tipo: TipoTappa
  luogo?: Luogo
  sera: boolean
  biglietti?: { link: string | null }
  spostamento?: Spostamento
  evento?: InfoEvento
  stato: StatoTappa
  nota: string
  foto?: string
}

export interface Avviso {
  testo: string
  livello: 'info' | 'attenzione'
}

export interface Suggerimento {
  tipo: 'cibo' | 'opzionale' | 'souvenir'
  nome: string
  descrizione: string
  luogo?: Luogo
}

export interface OpzioneSpeciale {
  livello: string
  nome: string
  descrizione: string
  link: string
}

export interface Speciale {
  titolo: string
  nota: string
  opzioni: OpzioneSpeciale[]
}

export interface Giorno {
  id: Id
  cittaId: Id
  titolo: string
  intro: string
  note: string
  alloggio: Luogo | null
  consigli: string[]
  avvisi: Avviso[]
  suggerimenti: Suggerimento[]
  speciale: Speciale | null
  tappe: Tappa[]
}

export interface Clima {
  max: number
  min: number
}

export interface Citta {
  id: Id
  nome: string
  kanji: string
  romaji: string
  colore: string
  lat: number
  lng: number
  intro: string
  clima: Clima
}

export interface Persona {
  id: Id
  nome: string
}

export type Tema = 'auto' | 'chiaro' | 'scuro'

export interface Impostazioni {
  tema: Tema
  ultimoBackup?: string
}

export const VERSIONE_DATI = 2

export interface Viaggio {
  versione: typeof VERSIONE_DATI
  titolo: string
  dataPartenza: string
  persone: Persona[]
  citta: Citta[]
  giorni: Giorno[]
  prenotazioni: unknown[]
  spese: unknown[]
  checklist: unknown[]
  impostazioni: Impostazioni
}
