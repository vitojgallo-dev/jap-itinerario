import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval'
import { nuovoId } from '../model/id'
import { mimeAmmesso, mimeFoto } from '../model/mime'
import type { Allegato, Viaggio } from '../model/tipi'
import type { AllegatiBackup } from './backup'

export const LATO_MASSIMO = 1600
export const QUALITA_JPEG = 0.85
export const PDF_MASSIMO = 15 * 1024 * 1024

/** Il tipo da dare a un blob ripescato dall'archivio o da un backup: uno dei cinque ammessi, altrimenti octet-stream (mai SVG o HTML). */
export function mimeSicuro(m: string | null | undefined): string {
  const tipo = (m ?? '').split(';')[0].trim().toLowerCase()
  return mimeAmmesso(tipo) ? tipo : 'application/octet-stream'
}

/** Fra foto originale e foto ridotta: se la ridotta pesa di più e l'originale è una foto ammessa, resta l'originale. */
export function scegliFoto(originale: Blob, ridotta: Blob): Blob {
  return ridotta.size > originale.size && mimeFoto(originale.type) ? originale : ridotta
}

/** Dove stanno i dati degli allegati. Nei test si passa un archivio finto in memoria. */
export interface ArchivioAllegati {
  leggi(id: string): Promise<Blob | undefined>
  scrivi(id: string, dati: Blob): Promise<void>
  elimina(id: string): Promise<void>
  /** Tutti gli id presenti, per la pulizia degli orfani all'avvio. Facoltativo: senza, la pulizia non parte. */
  chiavi?(): Promise<string[]>
}

let negozio: UseStore | null = null
// Aperto al primo uso: senza IndexedDB l'errore arriva come promessa rifiutata, non all'avvio dell'app.
const negozioAllegati = () => (negozio ??= createStore('giappone-allegati', 'file'))

export const archivioIndexedDb: ArchivioAllegati = {
  leggi: async id => get<Blob>(id, negozioAllegati()),
  scrivi: async (id, dati) => set(id, dati, negozioAllegati()),
  elimina: async id => del(id, negozioAllegati()),
  chiavi: async () => (await keys(negozioAllegati())).filter((k): k is string => typeof k === 'string'),
}

/** Le dimensioni con il lato lungo al massimo `lato`, in pixel interi; le foto più piccole restano come sono. */
export function dimensioniRidotte(larghezza: number, altezza: number, lato = LATO_MASSIMO): { larghezza: number; altezza: number } {
  const lungo = Math.max(larghezza, altezza)
  if (lungo <= lato) return { larghezza, altezza }
  const k = lato / lungo
  return { larghezza: Math.round(larghezza * k), altezza: Math.round(altezza * k) }
}

/** Foto ridotta a 1600 px sul lato lungo, JPEG 0.85, con createImageBitmap su un canvas. */
export async function riduciFoto(foto: Blob): Promise<Blob> {
  const immagine = await createImageBitmap(foto, { imageOrientation: 'from-image' })
  const { larghezza, altezza } = dimensioniRidotte(immagine.width, immagine.height)
  const tela = document.createElement('canvas')
  tela.width = larghezza
  tela.height = altezza
  const ctx = tela.getContext('2d')
  if (!ctx) { immagine.close(); throw new Error('canvas non disponibile') }
  // Il JPEG non ha trasparenza: senza lo sfondo, un PNG con i vuoti diventerebbe nero.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, larghezza, altezza)
  ctx.drawImage(immagine, 0, 0, larghezza, altezza)
  immagine.close()
  const ridotta = await new Promise<Blob>((ok, ko) => tela.toBlob(b => (b ? ok(b) : ko(new Error('conversione non riuscita'))), 'image/jpeg', QUALITA_JPEG))
  return scegliFoto(foto, ridotta)
}

export const ERRORI_ALLEGATO = {
  tipo: 'Si possono allegare solo foto e PDF.',
  grande: 'Il PDF supera i 15 MB: non lo posso allegare.',
  spazio: "Spazio del telefono esaurito: l'allegato non è stato aggiunto.",
  archivio: 'Su questo telefono non riesco a salvare allegati.',
  foto: 'Non riesco a leggere questa foto.',
} as const

export type EsitoAllegato = { ok: true; allegato: Allegato } | { ok: false; errore: string }
export interface DipendenzeAllegati { archivio: ArchivioAllegati; riduci: (foto: Blob) => Promise<Blob> }

const spazioFinito = (e: unknown) => (e as { name?: unknown } | null)?.name === 'QuotaExceededError'

/** Foto (ridotta) o PDF (fino a 15 MB) in IndexedDB. Se qualcosa non va non resta niente a metà e torna un messaggio chiaro. */
export async function salvaAllegato(file: File, dip: DipendenzeAllegati = { archivio: archivioIndexedDb, riduci: riduciFoto }): Promise<EsitoAllegato> {
  const foto = file.type.startsWith('image/')
  if (!foto && file.type !== 'application/pdf') return { ok: false, errore: ERRORI_ALLEGATO.tipo }
  if (!foto && file.size > PDF_MASSIMO) return { ok: false, errore: ERRORI_ALLEGATO.grande }
  let dati: Blob = file
  if (foto) {
    try {
      dati = await dip.riduci(file)
    } catch {
      // Un formato che il canvas non legge: si tiene l'originale solo se è una foto ammessa e non enorme.
      if (!mimeFoto(file.type) || file.size > PDF_MASSIMO) return { ok: false, errore: ERRORI_ALLEGATO.foto }
    }
  }
  const id = nuovoId('a')
  try {
    await dip.archivio.scrivi(id, dati)
  } catch (e) {
    return { ok: false, errore: spazioFinito(e) ? ERRORI_ALLEGATO.spazio : ERRORI_ALLEGATO.archivio }
  }
  const ridotta = dati !== file
  const nome = ridotta ? `${file.name.replace(/\.[^.]*$/, '') || 'foto'}.jpg` : file.name || 'allegato'
  const mime = ridotta ? (mimeAmmesso(dati.type) ? dati.type : 'image/jpeg') : file.type
  return { ok: true, allegato: { id, nome, mime, byte: dati.size } }
}

export function idAllegati(v: Viaggio): string[] {
  return v.prenotazioni.flatMap(p => p.allegati.map(a => a.id))
}

export function byteAllegati(v: Viaggio): number {
  return v.prenotazioni.reduce((t, p) => t + p.allegati.reduce((s, a) => s + a.byte, 0), 0)
}

export function base64DaByte(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

export function byteDaBase64(s: string): Uint8Array<ArrayBuffer> {
  const t = atob(s)
  const b = new Uint8Array(t.length)
  for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i)
  return b
}

/**
 * Gli allegati del viaggio in base64 per il file di backup. `mancanti` conta quelli che non si sono potuti includere;
 * `illeggibili` (solo se > 0) quanti fra questi non si sono potuti leggere dall'archivio (non risultano semplicemente spariti).
 */
export async function allegatiPerBackup(v: Viaggio, archivio: ArchivioAllegati = archivioIndexedDb): Promise<{ allegati: AllegatiBackup; mancanti: number; illeggibili?: number }> {
  const mime = new Map(v.prenotazioni.flatMap(p => p.allegati.map(a => [a.id, a.mime] as const)))
  const allegati: AllegatiBackup = {}
  let mancanti = 0
  let illeggibili = 0
  for (const [id, tipo] of mime) {
    try {
      const b = await archivio.leggi(id)
      if (!b) { mancanti++; continue }
      allegati[id] = { mime: mimeSicuro(b.type || tipo), dati: base64DaByte(new Uint8Array(await b.arrayBuffer())) }
    } catch {
      mancanti++
      illeggibili++
    }
  }
  return illeggibili > 0 ? { allegati, mancanti, illeggibili } : { allegati, mancanti }
}

export interface EsitoRipristino {
  /** Gli id del backup che ora sono nell'archivio (scritti adesso o già presenti e protetti). Se qualcosa è fallito restano solo i protetti. */
  scritti: string[]
  falliti: number
  /** Almeno un errore era di spazio esaurito. */
  spazio: boolean
}

/**
 * Riscrive in IndexedDB gli allegati di un backup importato; non lancia mai e una voce rovinata non ferma le altre.
 * `protetti` sono gli id del viaggio attuale: se sono già nell'archivio non si sovrascrivono.
 * Se anche una sola scrittura fallisce, quelle fatte da questa importazione vengono tolte: niente a metà.
 */
export async function ripristinaAllegati(allegati: AllegatiBackup, archivio: ArchivioAllegati = archivioIndexedDb, protetti: Iterable<string> = []): Promise<EsitoRipristino> {
  const intoccabili = new Set(protetti)
  const nuovi: string[] = []
  const presenti: string[] = []
  let falliti = 0
  let spazio = false
  for (const [id, a] of Object.entries(allegati)) {
    try {
      if (intoccabili.has(id) && (await archivio.leggi(id).catch(() => undefined))) { presenti.push(id); continue }
      await archivio.scrivi(id, new Blob([byteDaBase64(a.dati)], { type: mimeSicuro(a.mime) }))
      nuovi.push(id)
    } catch (e) {
      falliti++
      if (spazioFinito(e)) spazio = true
    }
  }
  if (falliti > 0) {
    for (const id of nuovi) await archivio.elimina(id).catch(() => undefined)
    return { scritti: presenti, falliti, spazio }
  }
  return { scritti: Object.keys(allegati).filter(id => nuovi.includes(id) || presenti.includes(id)), falliti, spazio }
}

const nAllegati = (n: number) => (n === 1 ? '1 allegato' : `${n} allegati`)

/** Il messaggio per chi ha importato un backup: cosa è andato storto e quali allegati del nuovo viaggio mancano. Null se è andato tutto bene. */
export function avvisoImportazione(nuovo: Viaggio, esito: EsitoRipristino, scartati: number): string | null {
  const parti: string[] = []
  if (esito.spazio) parti.push("Gli allegati del backup non entrano nello spazio del telefono: importo solo l'itinerario.")
  else if (esito.falliti > 0) parti.push(`${nAllegati(esito.falliti)} ${esito.falliti === 1 ? 'era danneggiato e è stato saltato' : 'erano danneggiati e sono stati saltati'}.`)
  if (scartati > 0) parti.push(`${nAllegati(scartati)} del file ${scartati === 1 ? 'non era valido ed è stato scartato' : 'non erano validi e sono stati scartati'}.`)
  const disponibili = new Set(esito.scritti)
  const assenti = nuovo.prenotazioni.flatMap(p => p.allegati).filter(a => !disponibili.has(a.id)).map(a => a.nome)
  if (assenti.length > 0) parti.push(`Mancano: ${assenti.slice(0, 3).join(', ')}${assenti.length > 3 ? ` e altri ${assenti.length - 3}` : ''}.`)
  return parti.length ? parti.join(' ') : null
}

/** Cancella dagli allegati `ids` quelli che nessuna prenotazione di `v` usa più. Non lancia mai. */
export async function eliminaSeOrfani(ids: string[], v: Viaggio, archivio: ArchivioAllegati = archivioIndexedDb): Promise<void> {
  const usati = new Set(idAllegati(v))
  for (const id of ids) {
    if (usati.has(id)) continue
    try {
      await archivio.elimina(id)
    } catch { /* archivio non disponibile: resta un file orfano, nessun danno */ }
  }
}

export function formatoByte(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB`
  return `${(n / 1024 ** 3).toFixed(1).replace('.', ',')} GB`
}
