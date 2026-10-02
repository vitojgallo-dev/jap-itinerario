import { expect, test } from 'vitest'
import { prenotazioneDiProva, viaggioDiProva } from '../model/fixture'
import { creaBackup, leggiBackup, nomeFileBackup } from './backup'

const adesso = new Date('2027-08-10T12:00:00+09:00')

test('andata e ritorno', () => {
  const v = viaggioDiProva()
  expect(leggiBackup(JSON.stringify(creaBackup(v, adesso)))).toEqual({ ok: true, viaggio: v, allegati: {}, scartati: 0, mancanti: 0 })
})

test('errori chiari', () => {
  expect(leggiBackup('{')).toEqual({ ok: false, errore: 'Il file non è un JSON leggibile.' })
  expect(leggiBackup('{"tipo":"altro"}')).toEqual({ ok: false, errore: "Il file non è un backup di quest'app." })
  const r = leggiBackup(JSON.stringify({ tipo: 'viaggio-giappone', creato: 'x', viaggio: { versione: 2 } }))
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.errore).toMatch(/^Il backup contiene errori: /)
})

test('nomeFileBackup usa la data di Tokyo', () => {
  expect(nomeFileBackup(adesso)).toBe('giappone-backup-2027-08-10.json')
})

test('un allegato con id "__proto__" non sparisce in silenzio: arriva fra gli allegati importati', () => {
  const v = viaggioDiProva({
    prenotazioni: [prenotazioneDiProva({ id: 'pr', allegati: [{ id: '__proto__', nome: 'strano.jpg', mime: 'image/jpeg', byte: 3 }] })],
  })
  // JSON.parse crea "__proto__" come chiave propria; un letterale {__proto__: …} invece imposterebbe il prototipo.
  const testo = `{"tipo":"viaggio-giappone","creato":"x","viaggio":${JSON.stringify(v)},"allegati":{"__proto__":{"mime":"image/jpeg","dati":"AAAA"}}}`
  const r = leggiBackup(testo)
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(Object.keys(r.allegati)).toEqual(['__proto__'])
  expect(Object.getOwnPropertyDescriptor(r.allegati, '__proto__')?.value).toEqual({ mime: 'image/jpeg', dati: 'AAAA' })
  expect(r.scartati + r.mancanti).toBe(0)
})
