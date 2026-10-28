import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { leggiLegacy } from '../../scripts/legacy'
import { revisione2027 } from '../../scripts/revisione-2027'
import { dataGiorno } from '../model/date'
import { migraV1 } from '../model/migrazioneV1'
import { statoApertura } from '../model/orari'
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
  test('ogni tappa con un luogo ha le coordinate, tranne gli hotel ancora da prenotare', () => {
    const alloggi = new Set(v.giorni.flatMap(g => g.alloggio ? [g.alloggio.nome] : []))
    const senza = v.giorni.flatMap(g => g.tappe)
      .filter(t => t.luogo && !alloggi.has(t.luogo.nome) && (t.luogo.lat == null || t.luogo.lng == null))
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
  test('niente Museo del XXI secolo (chiuso per lavori): il G6 finisce con D.T. Suzuki e Nagamachi', () => {
    expect(JSON.stringify(v.giorni.flatMap(g => g.tappe))).not.toMatch(/21 secolo|21st Century|kanazawa21/i)
    expect(v.prenotazioni.map(p => p.titolo)).not.toContain('Museo del 21 secolo')
    expect(v.giorni[6].tappe.map(t => t.titolo).slice(-3)).toEqual(['Museo D.T. Suzuki', 'Nagamachi e Nomura-ke', 'Cena a Katamachi'])
    expect(v.giorni[6].avvisi.some(a => /XXI secolo/.test(a.testo))).toBe(true)
  })
  test('G7: le tre feste di Nara del 15/8 in ordine, poi il rientro', () => {
    const sera = v.giorni[7].tappe.filter(t => t.tipo === 'evento').map(t => [t.ora, t.evento?.nome])
    expect(sera).toEqual([
      ['19:00', 'Kasuga Chūgen Mantōrō'],
      ['20:00', 'Nara Daimonji Okuribi'],
      ['20:30', 'Tōdai-ji Mantō Kuyōe'],
    ])
    expect(v.giorni[7].tappe.at(-1)).toMatchObject({ ora: '21:45', titolo: 'Rientro a Kyoto' })
  })
  test('G4: si dorme al ryokan di Nikko, con onsen e cena kaiseki; a Hakone restano ryokan e onsen', () => {
    expect(v.giorni[4].alloggio?.nome).toBe('ryokan Nikko Hoshinoyado')
    expect(v.giorni[4].tappe.map(t => t.titolo)).toContain('Onsen e cena kaiseki')
    expect(v.giorni[16].alloggio?.nome).toBe('ryokan con onsen a Hakone-Yumoto')
    expect(v.giorni[16].tappe.map(t => t.titolo)).toEqual(expect.arrayContaining(['Bagno serale e cena kaiseki', 'Tenzan Onsen']))
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
        ['Hotel Mystays Asakusa', '2027-08-08T15:00', '2027-08-12T10:00'],
        ['ryokan Nikko Hoshinoyado', '2027-08-12T15:00', '2027-08-13T10:00'],
        ['Mitsui Garden Hotel Kanazawa', '2027-08-13T15:00', '2027-08-15T10:00'],
        ['Travelodge Kyoto Shijo Kawaramachi', '2027-08-15T15:00', '2027-08-20T10:00'],
        ['Hotel Forza Osaka Namba Dotonbori', '2027-08-20T15:00', '2027-08-24T10:00'],
        ['ryokan con onsen a Hakone-Yumoto', '2027-08-24T15:00', '2027-08-25T10:00'],
        ['Hotel Mystays Asakusa', '2027-08-25T15:00', '2027-08-27T10:00'],
      ])
      expect(hotel.every(p => p.daPrenotareEntro === '2026-11-30' && p.note)).toBe(true)
    })
    test('voli di andata e ritorno', () => {
      const andata = v.prenotazioni.find(p => p.id === 'pr-volo-andata')
      expect(andata).toMatchObject({ tipo: 'volo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome', fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo' })
      expect(v.prenotazioni.find(p => p.id === 'pr-volo-ritorno')).toMatchObject({ tipo: 'volo', inizio: '2027-08-27T20:00', fuso: 'Asia/Tokyo' })
    })
    test('tutto da prenotare, senza codici', () => {
      expect(v.prenotazioni).toHaveLength(27)
      expect(v.prenotazioni.filter(p => p.stato !== 'da-prenotare' || p.codice)).toEqual([])
    })
    test('un biglietto per ogni tappa che lo chiede, collegato alla tappa', () => {
      const tappe = new Map(v.giorni.flatMap(g => g.tappe).map(t => [t.id, t]))
      const collegate = v.prenotazioni.filter(p => p.tappaId)
      expect(collegate.map(p => [p.tipo, p.titolo])).toEqual([
        ['ristorante', 'Maidreamin (maid cafe)'],
        ['biglietto', 'Shibuya Sky'],
        ['biglietto', 'teamLab Borderless (digital art)'],
        ['treno', 'Spacia X Asakusa → Nikko'],
        ['biglietto', 'Nikko Toshogu'],
        ['treno', 'Treno Nikko → Kanazawa'],
        ['treno', 'Bus Kanazawa ⇄ Shirakawa-go'],
        ['treno', 'Kanazawa → Tsuruga → Kyoto'],
        ['altro', 'Noleggio yukata a Kyoto'],
        ['biglietto', 'Castello di Osaka'],
        ['biglietto', 'Umeda Sky Building, Floating Garden al tramonto'],
        ['biglietto', 'Castello di Himeji'],
        ['treno', 'Hikari Shin-Osaka → Odawara'],
        ['ristorante', 'Bagno serale e cena kaiseki'],
        ['treno', 'Romancecar Hakone-Yumoto → Shinjuku'],
      ])
      for (const p of collegate) expect(tappe.get(p.tappaId!)?.biglietti, p.titolo).toBeDefined()
      expect(collegate.filter(p => p.tipo === 'treno').every(p => tappe.get(p.tappaId!)?.tipo === 'spostamento')).toBe(true)
    })
    test('treni e biglietti a orario hanno la data in cui aprono le vendite', () => {
      const entro = (id: string) => v.prenotazioni.find(p => p.id === id)?.daPrenotareEntro
      expect([
        entro('pr-t3-5'), entro('pr-t-nikko-1'), entro('pr-t-kanazawa-1'), entro('pr-t2-3'), entro('pr-t6-0'),
        entro('pr-t-nara-1'), entro('pr-t-hakone-1'), entro('pr-t-tokyo-1'), entro('pr-ghibli'),
      ]).toEqual(['2027-06-11', '2027-07-12', '2027-07-13', '2027-07-13', '2027-07-14', '2027-07-15', '2027-07-24', '2027-07-25', '2027-07-10'])
      expect(v.prenotazioni.find(p => p.id === 'pr-ghibli')?.note).toMatch(/^Solo se vi interessa/)
      expect(v.prenotazioni.filter(p => p.tipo === 'altro' && /Yamato/.test(p.titolo)).map(p => p.inizio)).toEqual(['2027-08-12T07:15', '2027-08-23T21:00'])
    })
    test('orari pre-compilati solo sulle tappe dello spec, con la nota di verifica', () => {
      const conOrari = v.giorni.flatMap(g => g.tappe).filter(t => t.orari)
      expect(conOrari.map(t => t.titolo).sort()).toEqual([
        'Castello di Himeji', 'Castello di Nijō', 'Castello di Osaka', 'Giardini Est del Palazzo Imperiale', 'Giardino Isuien',
        'Giardino Kenrokuen', 'Giardino Kōko-en', 'Ginkaku-ji', "Kinkaku-ji (Padiglione d'Oro)", 'Museo D.T. Suzuki',
        'Museo Nazionale di Tokyo', "Museo all'aperto di Hakone", 'Nikko Toshogu', 'Nishiki Market e coltelli Aritsugu', 'Santuario Kibune',
        'Shibuya Sky', 'Sumiyoshi Taisha', 'Tempio Tenryu-ji', 'Tenzan Onsen', 'Tocho, osservatorio gratis',
        'Todai-ji (Grande Buddha)', 'Tower Knives', 'Tsukiji Outer Market', 'Umeda Sky Building, Floating Garden al tramonto',
        'Yanaka Ginza e cimitero di Yanaka',
      ])
      for (const t of conOrari) {
        expect(t.orari?.fonte, t.titolo).toBe('base')
        expect(t.orari?.nota, t.titolo).toMatch(/Verifica sul sito prima di andare/)
      }
      // 0 = domenica: Tsukiji chiude domenica e mercoledì, Aritsugu il mercoledì, Isuien e il palazzo del Nijō il martedì.
      const orari = (titolo: string) => conOrari.find(t => t.titolo === titolo)?.orari
      expect(orari('Tsukiji Outer Market')).toMatchObject({ chiusoIl: [0, 3] })
      expect(orari('Nishiki Market e coltelli Aritsugu')).toMatchObject({ chiusoIl: [3], apre: '09:00', chiude: '17:00' })
      expect(orari('Giardino Isuien')).toMatchObject({ chiusoIl: [2], apre: '09:30', chiude: '16:30' })
      expect(orari('Castello di Nijō')).toMatchObject({ chiusoIl: [2], apre: '08:45', chiude: '17:00' })
      expect(orari('Castello di Himeji')).toMatchObject({ chiusoIl: [], apre: '09:00', chiude: '17:00' })
    })
    test('niente Tsukiji l\'11/8 (mercoledì e festivo): si fa giovedì 26/8', () => {
      expect(v.giorni[3].tappe.some(t => /Tsukiji/.test(t.titolo))).toBe(false)
      expect(v.giorni[3].avvisi.some(a => a.livello === 'attenzione' && /Tsukiji/.test(a.testo) && /mercoledì/.test(a.testo))).toBe(true)
      expect(dataGiorno(v, 18)).toBe('2027-08-26')
      expect(v.giorni[18].tappe[0].titolo).toBe('Tsukiji Outer Market')
    })
    test('nessuna tappa con gli orari è chiusa o fuori orario nel giorno e all\'ora in cui è in programma', () => {
      for (const [i, g] of v.giorni.entries()) {
        for (const t of g.tappe.filter(x => x.orari)) expect(['aperto', 'sconosciuto'], `G${i} ${t.titolo}`).toContain(statoApertura(t, dataGiorno(v, i)))
      }
    })
    test('il primo hotel di Tokyo è di 4 notti, poi la notte al ryokan di Nikko', () => {
      expect(v.prenotazioni.find(p => p.id === 'pr-hotel-0')).toMatchObject({ inizio: '2027-08-08T15:00', fine: '2027-08-12T10:00' })
      const ryokan = v.prenotazioni.find(p => p.id === 'pr-hotel-4')
      expect(ryokan).toMatchObject({ titolo: 'ryokan Nikko Hoshinoyado', inizio: '2027-08-12T15:00', fine: '2027-08-13T10:00' })
      expect(ryokan?.note).toMatch(/25\.000–31\.000 a persona/)
    })
  })
})
