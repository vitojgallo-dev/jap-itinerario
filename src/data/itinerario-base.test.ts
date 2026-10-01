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

  describe('prenotazioni e orari di partenza', () => {
    const hotel = v.prenotazioni.filter(p => p.tipo === 'hotel')
    test('ogni notte del viaggio ha esattamente un hotel, lo stesso del giorno', () => {
      for (let i = 0; i < v.giorni.length - 1; i++) {
        const data = dataGiorno(v, i)
        const coprono = hotel.filter(p => p.inizio!.slice(0, 10) <= data && data < p.fine!.slice(0, 10))
        expect(coprono.map(p => p.titolo), `notte del G${i}`).toHaveLength(1)
        const alloggio = v.giorni[i].alloggio
        if (alloggio) expect(coprono[0].titolo, `notte del G${i}`).toBe(alloggio.nome)
      }
    })
    test('check-in e check-out ricavati dai giorni', () => {
      expect(hotel.map(p => [p.titolo, p.inizio, p.fine])).toEqual([
        ['Asakusa View Hotel', '2027-08-08T15:00', '2027-08-12T10:00'],
        ['ryokan Nikko Hoshinoyado', '2027-08-12T15:00', '2027-08-13T10:00'],
        ['Hotel Kanazawa', '2027-08-13T15:00', '2027-08-15T10:00'],
        ['Kyoto Gion Hotel', '2027-08-15T15:00', '2027-08-20T10:00'],
        ['Hotel Forza Osaka Namba Dotonbori', '2027-08-20T15:00', '2027-08-24T10:00'],
        ['ryokan con onsen a Hakone-Yumoto', '2027-08-24T15:00', '2027-08-25T10:00'],
        ['Hotel di Tokyo (da scegliere)', '2027-08-25T15:00', '2027-08-27T10:00'],
      ])
    })
    test('voli di andata e ritorno', () => {
      const andata = v.prenotazioni.find(p => p.id === 'pr-volo-andata')
      expect(andata).toMatchObject({ tipo: 'volo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome', fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo' })
      expect(v.prenotazioni.find(p => p.id === 'pr-volo-ritorno')).toMatchObject({ tipo: 'volo', inizio: '2027-08-27T20:00', fuso: 'Asia/Tokyo' })
    })
    test('tutto da prenotare, senza codici', () => {
      expect(v.prenotazioni).toHaveLength(19)
      expect(v.prenotazioni.filter(p => p.stato !== 'da-prenotare' || p.codice)).toEqual([])
    })
    test('un biglietto per ogni tappa che lo chiede, collegato alla tappa', () => {
      const tappe = new Map(v.giorni.flatMap(g => g.tappe).map(t => [t.id, t]))
      const collegate = v.prenotazioni.filter(p => p.tappaId)
      expect(collegate.map(p => p.titolo)).toEqual([
        'Tokyo Skytree', 'Shibuya Sky', 'teamLab Borderless (digital art)', 'Tokyo Tower', 'Nikko Toshogu',
        'Museo del 21 secolo', 'Castello di Osaka', 'Umeda Sky Building', 'Castello di Himeji', 'Bagno serale cena kaiseki',
      ])
      for (const p of collegate) expect(tappe.get(p.tappaId!)?.biglietti, p.titolo).toBeDefined()
      expect(collegate.find(p => p.titolo === 'Bagno serale cena kaiseki')?.tipo).toBe('ristorante')
      expect(collegate.filter(p => p.tipo !== 'ristorante').every(p => p.tipo === 'biglietto')).toBe(true)
    })
    test('orari pre-compilati solo sulle tappe dello spec, con la nota di verifica', () => {
      const conOrari = v.giorni.flatMap(g => g.tappe).filter(t => t.orari)
      expect(conOrari.map(t => t.titolo).sort()).toEqual([
        'Castello di Himeji', 'Castello di Osaka', 'Giardino Kenrokuen', "Kinkaku-ji (Padiglione d'Oro)", 'Museo del 21 secolo',
        'Nikko Toshogu', 'Shibuya Sky', 'Tempio Tenryu-ji', 'Todai-ji (Grande Buddha)', 'Tokyo Skytree', 'Tsukiji Outer Market',
        'Umeda Sky Building',
      ])
      for (const t of conOrari) {
        expect(t.orari?.fonte, t.titolo).toBe('base')
        expect(t.orari?.nota, t.titolo).toMatch(/Verifica sul sito prima di andare/)
      }
      expect(conOrari.find(t => t.titolo === 'Museo del 21 secolo')?.orari).toMatchObject({ chiusoIl: [1], apre: '10:00', chiude: '18:00' })
      expect(conOrari.find(t => t.titolo === 'Tsukiji Outer Market')?.orari).toMatchObject({ chiusoIl: [0] })
    })
    test('il G3 è mercoledì e festivo: c\'è l\'avviso sul Tsukiji', () => {
      expect(v.giorni[3].tappe.some(t => t.titolo === 'Tsukiji Outer Market')).toBe(true)
      expect(v.giorni[3].avvisi.some(a => a.livello === 'attenzione' && /Tsukiji/.test(a.testo) && /mercoledì/.test(a.testo))).toBe(true)
    })
  })
})
