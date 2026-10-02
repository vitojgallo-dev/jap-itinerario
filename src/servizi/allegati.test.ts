import { describe, expect, test } from 'vitest'
import { prenotazioneDiProva as p, viaggioDiProva } from '../model/fixture'
import {
  allegatiPerBackup, avvisoImportazione, base64DaByte, byteAllegati, byteDaBase64, dimensioniRidotte, eliminaSeOrfani, ERRORI_ALLEGATO,
  formatoByte, idAllegati, mimeSicuro, PDF_MASSIMO, ripristinaAllegati, salvaAllegato, scegliFoto, type ArchivioAllegati,
} from './allegati'
import { creaBackup, leggiBackup } from './backup'

/** Un IndexedDB finto in memoria; `pieno` e `rotto` simulano lo spazio finito e IndexedDB assente, `fallisci` una scrittura che non va. */
function archivioFinto(opzioni: { pieno?: boolean; rotto?: boolean; fallisci?: string[] } = {}) {
  const m = new Map<string, Blob>()
  const archivio: ArchivioAllegati = {
    leggi: async id => m.get(id),
    scrivi: async (id, dati) => {
      if (opzioni.rotto) throw new Error('indexedDB is not defined')
      if (opzioni.fallisci?.includes(id)) throw new Error('scrittura fallita')
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
  test('se la riduzione non riesce su un formato non ammesso, errore chiaro', async () => {
    const { archivio, m } = archivioFinto()
    const riduci = async (): Promise<Blob> => { throw new Error('formato sconosciuto') }
    expect(await salvaAllegato(new File(['x'], 'a.heic', { type: 'image/heic' }), { archivio, riduci })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.foto })
    expect(m.size).toBe(0)
  })
  test('se la riduzione non riesce si tiene la foto originale', async () => {
    const { archivio } = archivioFinto()
    const riduci = async (): Promise<Blob> => { throw new Error('formato sconosciuto') }
    const r = await salvaAllegato(new File(['png'], 'qr.png', { type: 'image/png' }), { archivio, riduci })
    expect(r.ok && r.allegato).toMatchObject({ nome: 'qr.png', mime: 'image/png', byte: 3 })
  })
  test('se la riduzione dà un blob senza tipo, il tipo registrato è comunque JPEG', async () => {
    const { archivio } = archivioFinto()
    const r = await salvaAllegato(new File(['grande'], 'a.heic', { type: 'image/heic' }), { archivio, riduci: async () => new Blob(['p']) })
    expect(r.ok && r.allegato.mime).toBe('image/jpeg')
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
    expect(letto.scartati).toBe(0)
    expect(letto.mancanti).toBe(0)
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
  test('un allegato con id "__proto__" finisce nel backup come chiave vera', async () => {
    const { archivio } = archivioFinto()
    await archivio.scrivi('__proto__', new Blob(['%PD'], { type: 'application/pdf' }))
    const v = viaggioDiProva({ prenotazioni: [p({ id: 'pr', allegati: [{ id: '__proto__', nome: 'x.pdf', mime: 'application/pdf', byte: 3 }] })] })
    const { allegati, mancanti } = await allegatiPerBackup(v, archivio)
    expect(mancanti).toBe(0)
    expect(Object.keys(allegati)).toEqual(['__proto__'])
    expect(Object.getOwnPropertyDescriptor(JSON.parse(JSON.stringify(allegati)), '__proto__')?.value).toMatchObject({ mime: 'application/pdf' })
  })
  test('un archivio che non si riesce a leggere si distingue da un allegato sparito', async () => {
    const archivio: ArchivioAllegati = { leggi: async () => { throw new Error('IndexedDB assente') }, scrivi: async () => {}, elimina: async () => {} }
    expect(await allegatiPerBackup(conAllegati(), archivio)).toEqual({ allegati: {}, mancanti: 2, illeggibili: 2 })
  })
  test('ripristinare senza spazio non lancia: lo dice nel risultato e non lascia niente', async () => {
    const { archivio, m } = archivioFinto({ pieno: true })
    const r = await ripristinaAllegati({ 'a-1': { mime: 'image/jpeg', dati: base64DaByte(new Uint8Array([1])) } }, archivio)
    expect(r).toEqual({ scritti: [], falliti: 1, spazio: true })
    expect(m.size).toBe(0)
  })
  test('una scrittura che fallisce non ferma le altre, ma alla fine non resta niente a metà', async () => {
    const { archivio, m } = archivioFinto({ fallisci: ['a-2'] })
    const dati = { mime: 'image/jpeg', dati: base64DaByte(new Uint8Array([1])) }
    const r = await ripristinaAllegati({ 'a-1': dati, 'a-2': dati, 'a-3': dati }, archivio)
    expect(r).toEqual({ scritti: [], falliti: 1, spazio: false })
    expect(m.size).toBe(0)
  })
  test('tutto bene: scrive tutto e lo elenca', async () => {
    const { archivio, m } = archivioFinto()
    const dati = { mime: 'application/pdf', dati: base64DaByte(new Uint8Array([1])) }
    expect(await ripristinaAllegati({ 'a-1': dati, 'a-2': dati }, archivio)).toEqual({ scritti: ['a-1', 'a-2'], falliti: 0, spazio: false })
    expect(m.size).toBe(2)
  })
  test('un id già presente e usato dal viaggio attuale non viene sovrascritto', async () => {
    const { archivio, m } = archivioFinto()
    await archivio.scrivi('a-1', new Blob(['originale'], { type: 'application/pdf' }))
    const dati = { mime: 'application/pdf', dati: base64DaByte(new Uint8Array([1])) }
    const r = await ripristinaAllegati({ 'a-1': dati, 'a-2': dati }, archivio, ['a-1'])
    expect(r.scritti).toEqual(['a-1', 'a-2'])
    expect(await m.get('a-1')!.text()).toBe('originale')
    expect(m.has('a-2')).toBe(true)
  })
  test('se l\'import fallisce, un blob protetto già presente resta dov\'è', async () => {
    const { archivio, m } = archivioFinto({ fallisci: ['a-2'] })
    await archivio.scrivi('a-1', new Blob(['originale'], { type: 'application/pdf' }))
    const dati = { mime: 'application/pdf', dati: base64DaByte(new Uint8Array([1])) }
    const r = await ripristinaAllegati({ 'a-1': dati, 'a-2': dati }, archivio, ['a-1'])
    expect(r.falliti).toBe(1)
    expect(await m.get('a-1')!.text()).toBe('originale')
  })
  test('un id protetto ma assente dall\'archivio si scrive', async () => {
    const { archivio, m } = archivioFinto()
    const dati = { mime: 'application/pdf', dati: base64DaByte(new Uint8Array([1])) }
    await ripristinaAllegati({ 'a-1': dati }, archivio, ['a-1'])
    expect(m.has('a-1')).toBe(true)
  })
  test('il tipo salvato è sempre uno ammesso', async () => {
    const { archivio, m } = archivioFinto()
    await ripristinaAllegati({ 'a-1': { mime: 'text/html', dati: base64DaByte(new Uint8Array([1])) } }, archivio)
    expect(m.get('a-1')!.type).toBe('application/octet-stream')
  })
  test('un backup della fase 1, senza allegati, resta importabile', () => {
    const v = viaggioDiProva()
    const vecchio = { tipo: 'viaggio-giappone', creato: '2026-09-30T10:00:00.000Z', viaggio: v }
    expect(leggiBackup(JSON.stringify(vecchio))).toEqual({ ok: true, viaggio: v, allegati: {}, scartati: 0, mancanti: 0 })
  })
  test('allegati scritti male nel backup: errore chiaro', () => {
    const r = leggiBackup(JSON.stringify({ ...creaBackup(viaggioDiProva(), new Date()), allegati: { 'a-1': { mime: 5 } } }))
    expect(r).toEqual({ ok: false, errore: 'Il backup contiene allegati non validi.' })
  })
})

describe('leggiBackup: allegati non fidati', () => {
  const viaggio = () => viaggioDiProva({
    prenotazioni: [p({ id: 'pr', allegati: [
      { id: 'a-1', nome: 'x', mime: 'image/jpeg', byte: 3 }, { id: 'a-2', nome: 'y', mime: 'application/pdf', byte: 3 },
      { id: 'a-3', nome: 'z', mime: 'image/png', byte: 3 }, { id: 'a-4', nome: 'w', mime: 'image/png', byte: 3 },
    ] })],
  })
  const buono = base64DaByte(new Uint8Array([1, 2, 3]))
  const leggi = (allegati: unknown) => leggiBackup(JSON.stringify({ ...creaBackup(viaggio(), new Date()), allegati }))

  test('quelli validi passano e i riferimenti senza dati sono contati come mancanti', () => {
    const r = leggi({ 'a-1': { mime: 'image/jpeg', dati: buono } })
    expect(r).toMatchObject({ ok: true, allegati: { 'a-1': { mime: 'image/jpeg', dati: buono } }, scartati: 0, mancanti: 3 })
  })
  test('base64 rovinato, tipo HTML o SVG, id non usato: scartati e contati', () => {
    const r = leggi({
      'a-1': { mime: 'image/jpeg', dati: 'questo non è base64!' },
      'a-2': { mime: 'text/html', dati: buono },
      'a-3': { mime: 'image/svg+xml', dati: buono },
      'zzz': { mime: 'image/png', dati: buono },
      'a-4': { mime: 'image/png', dati: buono },
    })
    expect(r).toEqual({ ok: true, viaggio: viaggio(), allegati: { 'a-4': { mime: 'image/png', dati: buono } }, scartati: 4, mancanti: 3 })
  })
  test('una voce oltre 15 MB viene scartata', () => {
    const grande = 'A'.repeat(Math.ceil((PDF_MASSIMO + 3) / 3) * 4)
    const r = leggi({ 'a-1': { mime: 'application/pdf', dati: grande }, 'a-2': { mime: 'application/pdf', dati: buono } })
    expect(r.ok && Object.keys(r.allegati)).toEqual(['a-2'])
    expect(r.ok && r.scartati).toBe(1)
  })
  test('oltre 200 MB in tutto, le voci in più vengono scartate', () => {
    const quasiMassimo = 'A'.repeat(Math.floor(PDF_MASSIMO / 3) * 4)
    const ids = Array.from({ length: 14 }, (_, i) => `b-${i}`)
    const v = viaggioDiProva({ prenotazioni: [p({ id: 'pr', allegati: ids.map(id => ({ id, nome: id, mime: 'application/pdf', byte: 1 })) })] })
    const voci = Object.fromEntries(ids.map(id => [id, { mime: 'application/pdf', dati: quasiMassimo }]))
    const r = leggiBackup(JSON.stringify({ ...creaBackup(v, new Date()), allegati: voci }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Object.keys(r.allegati).length).toBe(13)
    expect(r.scartati).toBe(1)
    expect(r.mancanti).toBe(1)
  })
})

describe('mimeSicuro e scegliFoto', () => {
  test('mimeSicuro', () => {
    expect(mimeSicuro('image/jpeg')).toBe('image/jpeg')
    expect(mimeSicuro('IMAGE/PNG')).toBe('image/png')
    expect(mimeSicuro('application/pdf; x=y')).toBe('application/pdf')
    for (const m of ['text/html', 'image/svg+xml', '', undefined, null]) expect(mimeSicuro(m)).toBe('application/octet-stream')
  })
  test('scegliFoto tiene l\'originale se la ridotta pesa di più, ma solo per le foto ammesse', () => {
    const piccola = new Blob(['ab'], { type: 'image/png' })
    const grande = new Blob(['abcdef'], { type: 'image/jpeg' })
    expect(scegliFoto(piccola, grande)).toBe(piccola)
    expect(scegliFoto(grande, piccola)).toBe(piccola)
    const heic = new Blob(['ab'], { type: 'image/heic' })
    expect(scegliFoto(heic, grande)).toBe(grande)
  })
})

describe('avvisoImportazione', () => {
  const v = viaggioDiProva({
    prenotazioni: [p({ id: 'pr', allegati: ['a-1', 'a-2', 'a-3', 'a-4', 'a-5'].map(id => ({ id, nome: `${id}.pdf`, mime: 'application/pdf', byte: 1 })) })],
  })
  test('nessun avviso se è andato tutto bene', () => {
    expect(avvisoImportazione(v, { scritti: ['a-1', 'a-2', 'a-3', 'a-4', 'a-5'], falliti: 0, spazio: false }, 0)).toBeNull()
  })
  test('spazio finito: lo dice e nomina quelli che mancano', () => {
    expect(avvisoImportazione(v, { scritti: [], falliti: 2, spazio: true }, 0))
      .toBe("Gli allegati del backup non entrano nello spazio del telefono: importo solo l'itinerario. Mancano: a-1.pdf, a-2.pdf, a-3.pdf e altri 2.")
  })
  test('allegati danneggiati e voci scartate', () => {
    expect(avvisoImportazione(v, { scritti: ['a-1', 'a-2', 'a-3', 'a-4'], falliti: 1, spazio: false }, 2))
      .toBe("Gli allegati del backup non sono stati importati (1 non si è potuto scrivere): importo solo l'itinerario. 2 allegati del file non erano validi e sono stati scartati. Mancano: a-5.pdf.")
    expect(avvisoImportazione(v, { scritti: [], falliti: 3, spazio: false }, 0)).toBe("Gli allegati del backup non sono stati importati (3 non si sono potuti scrivere): importo solo l'itinerario. Mancano: a-1.pdf, a-2.pdf, a-3.pdf e altri 2.")
  })
  test('dati assenti dal file, senza errori di scrittura: solo i nomi', () => {
    expect(avvisoImportazione(v, { scritti: ['a-1', 'a-2', 'a-3', 'a-4'], falliti: 0, spazio: false }, 0)).toBe('Mancano: a-5.pdf.')
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
