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
  test('i giorni di trasferimento cominciano col viaggio da dove si è dormito', () => {
    for (const i of [4, 5, 12, 16, 17]) {
      expect(v.giorni[i].tappe[0].tipo, `G${i}`).toBe('spostamento')
    }
    expect(v.giorni[4].tappe[0].titolo).toBe('Treno Asakusa → Nikko')
    expect(v.giorni[5].tappe[0].titolo).toBe('Treno Nikko → Kanazawa')
    expect(v.giorni[12].tappe[0].titolo).toBe('Treno Kyoto → Osaka e bagagli in hotel')
    expect(v.giorni[16].tappe[0].titolo).toBe('Treno Osaka → Hakone')
    expect(v.giorni[17].tappe[0].titolo).toBe('Treno Hakone → Tokyo')
  })
  test('museo e Nagamachi passano al pomeriggio del G6', () => {
    const titoli = (i: number) => v.giorni[i].tappe.map(t => t.titolo)
    expect(titoli(5)).not.toContain('Museo del 21 secolo')
    expect(titoli(5)).not.toContain('Quartiere samurai Nagamachi')
    expect(titoli(6).slice(-2)).toEqual(['Museo del 21 secolo', 'Quartiere samurai Nagamachi'])
  })
  test('gli orari di ogni giorno sono in ordine', () => {
    for (const [i, g] of v.giorni.entries()) {
      const ore = g.tappe.map(t => t.ora).filter((o): o is string => o !== null)
      expect(ore, `G${i}`).toEqual([...ore].sort())
    }
  })
  test('nessun testo del G18 parla di aeroporto', () => {
    expect(JSON.stringify(v.giorni[18]).toLowerCase()).not.toContain('aeroporto')
  })
  test('i consigli su ultima notte, aeroporto e tax-free sono al G19', () => {
    expect(v.giorni[19].consigli.some(c => /aeroporto/i.test(c))).toBe(true)
    expect(v.giorni[19].consigli.some(c => /tax-free/i.test(c))).toBe(true)
    expect(v.giorni[18].consigli.some(c => /tax-free|ultima notte/i.test(c))).toBe(false)
  })
  test('al G7 restano solo i suggerimenti di Nara, quelli di Kyoto sono al G10', () => {
    const g7 = v.giorni[7].suggerimenti
    expect(g7.length).toBeGreaterThan(0)
    expect(g7.filter(s => !JSON.stringify(s).includes('Nara')).map(s => s.nome)).toEqual([])
    expect(g7.map(s => s.nome)).not.toContain('Kasuga Taisha di sera (Nara)')
    expect(v.giorni[10].suggerimenti.map(s => s.nome)).toEqual(expect.arrayContaining(["Philosopher's Path", 'Botteghe di Ninenzaka']))
  })
  test('i consigli generici di Kyoto sono al G7, il G11 non ne ha', () => {
    expect(v.giorni[7].consigli.length).toBeGreaterThan(0)
    expect(v.giorni[11].consigli).toEqual([])
  })
  test('nessun titolo di giorno è un segnaposto della vecchia app', () => {
    const titoli = v.giorni.map(g => g.titolo)
    expect(titoli.filter(t => /1 giorno|d'esempio/.test(t))).toEqual([])
  })
})
