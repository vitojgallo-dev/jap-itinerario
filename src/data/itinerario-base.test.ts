import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { leggiLegacy } from '../../scripts/legacy'
import { revisione2027 } from '../../scripts/revisione-2027'
import { dataGiorno } from '../model/date'
import { migraV1 } from '../model/migrazioneV1'
import type { Viaggio } from '../model/tipi'
import { validaViaggio } from '../model/validazione'
import base from './itinerario-base.json'

const v = base as unknown as Viaggio

describe('itinerario di partenza 2027', () => {
  test('è valido', () => {
    const r = validaViaggio(v)
    expect(r.ok ? [] : r.errori).toEqual([])
  })
  test('è aggiornato rispetto allo script', () => {
    const html = readFileSync(new URL('../../legacy/index-v1.html', import.meta.url), 'utf8')
    const { dati, extra } = leggiLegacy(html)
    const rigenerato = revisione2027(migraV1(dati, extra, { dataPartenza: '2027-08-09' }))
    expect(JSON.parse(JSON.stringify(rigenerato))).toEqual(v)
  })
  test('20 giorni dall\'8 al 27 agosto', () => {
    expect(v.dataPartenza).toBe('2027-08-08')
    expect(v.giorni).toHaveLength(20)
    expect(dataGiorno(v, 19)).toBe('2027-08-27')
  })
  test('ordine delle città, senza Koyasan e Hiroshima', () => {
    expect(v.giorni.map(g => g.cittaId)).toEqual([
      'tokyo', 'tokyo', 'tokyo', 'tokyo', 'nikko', 'kanazawa', 'kanazawa',
      'kyoto', 'kyoto', 'kyoto', 'kyoto', 'kyoto', 'osaka', 'osaka', 'osaka', 'osaka',
      'hakone', 'tokyo', 'tokyo', 'tokyo',
    ])
    expect(v.citta.map(c => c.id)).not.toContain('koyasan')
    expect(v.citta.map(c => c.id)).not.toContain('hiroshima')
  })
  test('gli eventi sono nei giorni giusti', () => {
    const eventi = (i: number) => v.giorni[i].tappe.filter(t => t.tipo === 'evento').map(t => t.evento?.nome)
    expect(eventi(7)).toEqual(expect.arrayContaining(['Kasuga Chūgen Mantōrō', 'Nara Daimonji Okuribi']))
    expect(eventi(8)).toEqual(expect.arrayContaining(['Arashiyama Tōrō Nagashi', 'Gozan no Okuribi']))
  })
  test('giorni nuovi', () => {
    expect(v.giorni[0].tappe[0].titolo).toMatch(/Arrivo/)
    expect(v.giorni[11].titolo).toMatch(/Kurama/)
    expect(v.giorni[15].titolo).toMatch(/Himeji/)
    expect(v.giorni[19].tappe.at(-1)?.titolo).toMatch(/aeroporto/i)
  })
  test('gruppo di 3 persone', () => {
    const testo = JSON.stringify(v)
    expect(testo).not.toMatch(/6 persone/)
    expect(testo).not.toMatch(/Facile in 6/)
    expect(v.persone).toHaveLength(3)
  })
  test('ogni tappa con un luogo ha le coordinate', () => {
    const senza = v.giorni.flatMap(g => g.tappe).filter(t => t.luogo && (t.luogo.lat == null || t.luogo.lng == null))
    expect(senza.map(t => t.titolo)).toEqual([])
  })
})
