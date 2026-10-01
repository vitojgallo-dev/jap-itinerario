import { describe, expect, test } from 'vitest'
import { prenotazioneDiProva as p, viaggioDiProva } from '../model/fixture'
import {
  allegatiPerBackup, base64DaByte, byteAllegati, byteDaBase64, dimensioniRidotte, eliminaSeOrfani, ERRORI_ALLEGATO,
  formatoByte, idAllegati, PDF_MASSIMO, ripristinaAllegati, salvaAllegato, type ArchivioAllegati,
} from './allegati'
import { creaBackup, leggiBackup } from './backup'

/** Un IndexedDB finto in memoria; `pieno` e `rotto` simulano lo spazio finito e IndexedDB assente. */
function archivioFinto(opzioni: { pieno?: boolean; rotto?: boolean } = {}) {
  const m = new Map<string, Blob>()
  const archivio: ArchivioAllegati = {
    leggi: async id => m.get(id),
    scrivi: async (id, dati) => {
      if (opzioni.rotto) throw new Error('indexedDB is not defined')
      if (opzioni.pieno) throw new DOMException('pieno', 'QuotaExceededError')
      m.set(id, dati)
    },
    elimina: async id => { m.delete(id) },
  }
  return { archivio, m }
}
const nonRidurre = async (b: Blob) => b

describe('dimensioniRidotte', () => {
  test('il lato lungo scende a 1600', () => {
    expect(dimensioniRidotte(4032, 3024)).toEqual({ larghezza: 1600, altezza: 1200 })
    expect(dimensioniRidotte(3024, 4032)).toEqual({ larghezza: 1200, altezza: 1600 })
  })
  test('le foto piccole restano come sono', () => {
    expect(dimensioniRidotte(800, 600)).toEqual({ larghezza: 800, altezza: 600 })
    expect(dimensioniRidotte(1600, 900)).toEqual({ larghezza: 1600, altezza: 900 })
  })
  test('arrotonda ai pixel', () => {
    expect(dimensioniRidotte(4000, 2250)).toEqual({ larghezza: 1600, altezza: 900 })
    expect(dimensioniRidotte(3000, 2001)).toEqual({ larghezza: 1600, altezza: 1067 })
  })
})

describe('salvaAllegato', () => {
  test('una foto passa dalla riduzione e diventa JPEG', async () => {
    const { archivio, m } = archivioFinto()
    const riduci = async () => new Blob(['piccola'], { type: 'image/jpeg' })
    const r = await salvaAllegato(new File(['grandissima'], 'IMG_0001.HEIC', { type: 'image/heic' }), { archivio, riduci })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.allegato).toMatchObject({ nome: 'IMG_0001.jpg', mime: 'image/jpeg', byte: 7 })
    expect(r.allegato.id).toMatch(/^a-/)
    expect(await m.get(r.allegato.id)?.text()).toBe('piccola')
  })
  test('un PDF resta com\'è', async () => {
    const { archivio, m } = archivioFinto()
    const r = await salvaAllegato(new File(['%PDF-1.7'], 'volo.pdf', { type: 'application/pdf' }), { archivio, riduci: nonRidurre })
    expect(r.ok && r.allegato).toMatchObject({ nome: 'volo.pdf', mime: 'application/pdf', byte: 8 })
    expect(m.size).toBe(1)
  })
  test('un PDF oltre 15 MB viene rifiutato senza scrivere niente', async () => {
    const { archivio, m } = archivioFinto()
    const grande = new File([new Uint8Array(PDF_MASSIMO + 1)], 'x.pdf', { type: 'application/pdf' })
    expect(await salvaAllegato(grande, { archivio, riduci: nonRidurre })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.grande })
    expect(m.size).toBe(0)
  })
  test('solo foto e PDF', async () => {
    const { archivio, m } = archivioFinto()
    expect(await salvaAllegato(new File(['x'], 'nota.txt', { type: 'text/plain' }), { archivio, riduci: nonRidurre })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.tipo })
    expect(m.size).toBe(0)
  })
  test('spazio finito: messaggio chiaro e niente a metà', async () => {
    const { archivio, m } = archivioFinto({ pieno: true })
    expect(await salvaAllegato(new File(['x'], 'x.pdf', { type: 'application/pdf' }), { archivio, riduci: nonRidurre })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.spazio })
    expect(m.size).toBe(0)
  })
  test('IndexedDB non disponibile', async () => {
    const { archivio } = archivioFinto({ rotto: true })
    expect(await salvaAllegato(new File(['x'], 'x.pdf', { type: 'application/pdf' }), { archivio, riduci: nonRidurre })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.archivio })
  })
  test('se la riduzione non riesce si tiene la foto originale', async () => {
    const { archivio } = archivioFinto()
    const riduci = async (): Promise<Blob> => { throw new Error('formato sconosciuto') }
    const r = await salvaAllegato(new File(['png'], 'qr.png', { type: 'image/png' }), { archivio, riduci })
    expect(r.ok && r.allegato).toMatchObject({ nome: 'qr.png', mime: 'image/png', byte: 3 })
  })
})

describe('backup con allegati', () => {
  const conAllegati = () => viaggioDiProva({
    prenotazioni: [p({ id: 'pr', allegati: [{ id: 'a-1', nome: 'qr.jpg', mime: 'image/jpeg', byte: 3 }, { id: 'a-2', nome: 'x.pdf', mime: 'application/pdf', byte: 3 }] })],
  })
  test('andata e ritorno con un IndexedDB finto', async () => {
    const prima = archivioFinto()
    await prima.archivio.scrivi('a-1', new Blob([new Uint8Array([0, 255, 128])], { type: 'image/jpeg' }))
    await prima.archivio.scrivi('a-2', new Blob(['%PD'], { type: 'application/pdf' }))
    const v = conAllegati()
    const { allegati, mancanti } = await allegatiPerBackup(v, prima.archivio)
    expect(mancanti).toBe(0)
    const letto = leggiBackup(JSON.stringify(creaBackup(v, new Date('2027-08-10T12:00:00+09:00'), allegati)))
    expect(letto.ok).toBe(true)
    if (!letto.ok) return
    expect(letto.viaggio).toEqual(v)
    const dopo = archivioFinto()
    await ripristinaAllegati(letto.allegati, dopo.archivio)
    expect([...new Uint8Array(await dopo.m.get('a-1')!.arrayBuffer())]).toEqual([0, 255, 128])
    expect(dopo.m.get('a-1')!.type).toBe('image/jpeg')
    expect(await dopo.m.get('a-2')!.text()).toBe('%PD')
  })
  test('un allegato sparito dal telefono viene contato e non blocca', async () => {
    const { archivio } = archivioFinto()
    expect(await allegatiPerBackup(conAllegati(), archivio)).toEqual({ allegati: {}, mancanti: 2 })
  })
  test('ripristinare senza spazio lancia: chi chiama avvisa', async () => {
    const { archivio } = archivioFinto({ pieno: true })
    await expect(ripristinaAllegati({ 'a-1': { mime: 'image/jpeg', dati: base64DaByte(new Uint8Array([1])) } }, archivio)).rejects.toThrow()
  })
  test('un backup della fase 1, senza allegati, resta importabile', () => {
    const v = viaggioDiProva()
    const vecchio = { tipo: 'viaggio-giappone', creato: '2026-09-30T10:00:00.000Z', viaggio: v }
    expect(leggiBackup(JSON.stringify(vecchio))).toEqual({ ok: true, viaggio: v, allegati: {} })
  })
  test('allegati scritti male nel backup: errore chiaro', () => {
    const r = leggiBackup(JSON.stringify({ ...creaBackup(viaggioDiProva(), new Date()), allegati: { 'a-1': { mime: 5 } } }))
    expect(r).toEqual({ ok: false, errore: 'Il backup contiene allegati non validi.' })
  })
})

describe('pulizia e conti', () => {
  test('eliminaSeOrfani toglie solo quelli che nessuna prenotazione usa più', async () => {
    const { archivio, m } = archivioFinto()
    for (const id of ['a-1', 'a-2', 'a-3']) await archivio.scrivi(id, new Blob(['x']))
    const v = viaggioDiProva({ prenotazioni: [p({ id: 'pr', allegati: [{ id: 'a-1', nome: 'x', mime: 'image/jpeg', byte: 1 }] })] })
    await eliminaSeOrfani(['a-1', 'a-3'], v, archivio)
    expect([...m.keys()]).toEqual(['a-1', 'a-2'])
  })
  test('idAllegati e byteAllegati', () => {
    const v = viaggioDiProva({
      prenotazioni: [
        p({ id: 'x', allegati: [{ id: 'a-1', nome: 'x', mime: 'image/jpeg', byte: 1000 }] }),
        p({ id: 'y', allegati: [{ id: 'a-2', nome: 'y', mime: 'application/pdf', byte: 2500 }] }),
      ],
    })
    expect(idAllegati(v)).toEqual(['a-1', 'a-2'])
    expect(byteAllegati(v)).toBe(3500)
  })
  test('base64 andata e ritorno, anche oltre i 32 KB', () => {
    const b = new Uint8Array(70_000).map((_, i) => i % 256)
    expect(byteDaBase64(base64DaByte(b))).toEqual(b)
  })
  test('formatoByte', () => {
    expect(formatoByte(900)).toBe('900 B')
    expect(formatoByte(2048)).toBe('2 KB')
    expect(formatoByte(1_572_864)).toBe('1,5 MB')
    expect(formatoByte(3 * 1024 ** 3)).toBe('3,0 GB')
  })
})
