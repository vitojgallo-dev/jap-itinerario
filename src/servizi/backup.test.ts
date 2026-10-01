import { expect, test } from 'vitest'
import { viaggioDiProva } from '../model/fixture'
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
