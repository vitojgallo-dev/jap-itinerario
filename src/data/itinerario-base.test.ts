import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { itinerarioV3 } from '../../scripts/itinerario-v3'
import { leggiLegacy } from '../../scripts/legacy'
import { revisione2027 } from '../../scripts/revisione-2027'
import { dataGiorno } from '../model/date'
import { migraV1 } from '../model/migrazioneV1'
import { statoApertura } from '../model/orari'
import type { Viaggio } from '../model/tipi'
import { validaViaggio } from '../model/validazione'
import base from './itinerario-base.json'

const v = base as unknown as Viaggio
const tappe = v.giorni.flatMap(g => g.tappe)
const testo = (i: number) => JSON.stringify(v.giorni[i])

describe('itinerario di partenza 2027, terza versione', () => {
  test('è valido', () => {
    const r = validaViaggio(v)
    expect(r.ok ? [] : r.errori).toEqual([])
  })
  test('è aggiornato rispetto allo script', () => {
    const html = readFileSync(new URL('../../legacy/index-v1.html', import.meta.url), 'utf8')
    const { dati, extra } = leggiLegacy(html)
    const rigenerato = itinerarioV3(revisione2027(migraV1(dati, extra, { dataPartenza: '2027-08-09' })))
    expect(JSON.parse(JSON.stringify(rigenerato))).toEqual(v)
  })
  test('20 giorni dall\'8 al 27 agosto', () => {
    expect(v.dataPartenza).toBe('2027-08-08')
    expect(v.giorni).toHaveLength(20)
    expect(dataGiorno(v, 19)).toBe('2027-08-27')
  })
  test('ordine delle città: Nikko in giornata, Takayama, Osaka 3 giorni, Tokyo finale con Kamakura e Fujiyoshida', () => {
    expect(v.giorni.map(g => g.cittaId)).toEqual([
      'tokyo', 'tokyo', 'tokyo', 'tokyo', 'nikko', 'kanazawa', 'takayama',
      'kyoto', 'kyoto', 'kyoto', 'kyoto', 'kyoto', 'osaka', 'osaka', 'osaka',
      'hakone', 'kamakura', 'tokyo', 'fuji', 'tokyo',
    ])
    expect(v.citta.map(c => c.id)).not.toContain('hiroshima')
  })
  test('gruppo di 3 persone', () => {
    expect(v.persone).toHaveLength(3)
  })
  test('ogni tappa con un luogo ha le coordinate', () => {
    expect(tappe.filter(t => t.luogo && (t.luogo.lat == null || t.luogo.lng == null)).map(t => t.titolo)).toEqual([])
  })
  test('le coordinate stanno vicino alla città del giorno (niente omonimi in un\'altra prefettura)', () => {
    const lontane: string[] = []
    for (const g of v.giorni) {
      const c = v.citta.find(x => x.id === g.cittaId)!
      for (const t of g.tappe) {
        // Le partenze e il mercato del mattino stanno nella città della notte prima.
        if (t.luogo?.lat == null || t.luogo.lng == null || t.tipo === 'spostamento' || t.id === 'g7-1') continue
        const km = Math.hypot((t.luogo.lat - c.lat) * 111, (t.luogo.lng - c.lng) * 91)
        if (km > 140) lontane.push(`${g.id} ${t.titolo} ${Math.round(km)} km`)
      }
    }
    expect(lontane).toEqual([])
  })
  test('gli orari di ogni giorno sono in ordine', () => {
    for (const [i, g] of v.giorni.entries()) {
      const ore = g.tappe.map(t => t.ora).filter((o): o is string => o !== null)
      expect(ore, `G${i}`).toEqual([...ore].sort())
    }
  })
  test('i giorni di viaggio cominciano col treno o il bus', () => {
    for (const i of [4, 5, 6, 12, 14, 15, 16, 18]) expect(v.giorni[i].tappe[0].tipo, `G${i}`).toBe('spostamento')
  })

  describe('le scelte di Vito', () => {
    test('un solo ryokan, a Hakone, e niente onsen o spa negli altri giorni', () => {
      const ryokan = v.giorni.filter(g => g.alloggio?.nome === 'Tonosawa Ichinoyu Honkan')
      expect(ryokan.map(g => g.id)).toEqual(['g15'])
      const altri = v.giorni.filter(g => g.id !== 'g15').flatMap(g => g.tappe.map(t => t.titolo + ' ' + t.descrizione))
      expect(altri.filter(x => /onsen|spa world|laqua|ryokan/i.test(x))).toEqual([])
    })
    test('Nikko in giornata: si dorme ad Asakusa', () => {
      expect(v.giorni[4].alloggio?.nome).toBe('MIMARU Tokyo Asakusa Station')
      expect(v.giorni[4].tappe.at(-2)?.titolo).toBe('Spacia X Nikko → Asakusa')
    })
    test('niente musei e posti scartati', () => {
      const tutto = JSON.stringify(tappe)
      for (const via of [/Nintendo Museum/, /D\.T\. Suzuki/, /Pokémon Center/, /Pokémon Café/, /Kirby/, /Tokyo Dome/, /Kyocera/, /BayStars/]) {
        expect(tutto, String(via)).not.toMatch(via)
      }
    })
    test('il baseball è una volta sola, al batting center', () => {
      expect(tappe.filter(t => /batting/i.test(t.titolo + t.descrizione)).map(t => t.id)).toEqual(['g1-8'])
    })
    test('Kōshien ha un\'alternativa', () => {
      expect(tappe.find(t => t.id === 'g12-2')?.consiglio).toMatch(/Alternativa: la Torre del Sole/)
    })
    test('la sera del 19 è da kyototi, senza carne', () => {
      expect(testo(11)).not.toMatch(/wagyu|manzo|Kobe|\bOmi\b/i)
      expect(v.giorni[11].tappe.map(t => t.titolo)).toEqual(expect.arrayContaining(['Birra sull\'argine del Kamo', 'Cena di obanzai']))
    })
    test('il 22 agosto non ha buchi fra le 12:30 e le 16', () => {
      const ore = v.giorni[14].tappe.map(t => t.ora!)
      expect(ore.filter(o => o >= '12:30' && o <= '16:00').length).toBeGreaterThanOrEqual(2)
    })
    test('ogni giorno ha cibo di strada e souvenir', () => {
      for (const [i, g] of v.giorni.entries()) {
        expect(g.suggerimenti.some(s => s.tipo === 'cibo'), `G${i} cibo`).toBe(true)
        expect(g.suggerimenti.some(s => s.tipo === 'souvenir'), `G${i} souvenir`).toBe(true)
      }
    })
  })

  describe('feste e giorni speciali', () => {
    const eventi = (i: number) => v.giorni[i].tappe.filter(t => t.tipo === 'evento').map(t => [t.ora, t.evento?.nome])
    test('le feste dell\'Obon nei giorni giusti', () => {
      expect(eventi(3)).toEqual([['19:00', 'Kōtō Hanabi']])
      expect(eventi(7)).toEqual([
        ['18:30', 'Kasuga Chūgen Mantōrō'],
        ['20:00', 'Nara Daimonji Okuribi'],
        ['20:30', 'Tōdai-ji Mantō Kuyōe'],
      ])
      expect(eventi(8)).toEqual([['20:00', 'Gozan no Okuribi']])
      expect(eventi(18)).toEqual([['18:30', 'Yoshida no Himatsuri']])
    })
    test('il 26 agosto è la giornata del Fuji-Q', () => {
      expect(dataGiorno(v, 18)).toBe('2027-08-26')
      expect(v.giorni[18].tappe.map(t => t.titolo)).toEqual(expect.arrayContaining(['Fuji-Q Highland', 'Il villaggio di Naruto', 'Pagoda Chureito']))
      expect(testo(18)).toMatch(/Do-Dodonpa ha chiuso per sempre/)
    })
    test('l\'ultimo giorno finisce in aeroporto', () => {
      expect(v.giorni[19].tappe.at(-1)?.titolo).toMatch(/aeroporto/i)
      expect(v.giorni[19].consigli.some(c => /tax-free/.test(c))).toBe(true)
    })
  })

  describe('prenotazioni', () => {
    const hotel = v.prenotazioni.filter(p => p.tipo === 'hotel')
    test('ogni notte ha esattamente un hotel, lo stesso del giorno', () => {
      for (let i = 0; i < v.giorni.length - 1; i++) {
        const data = dataGiorno(v, i)
        const coprono = hotel.filter(p => p.inizio!.slice(0, 10) <= data && data < p.fine!.slice(0, 10))
        expect(coprono.map(p => p.titolo), `notte del G${i}`).toEqual([v.giorni[i].alloggio?.nome])
      }
    })
    test('gli hotel della terza versione, con le notti giuste', () => {
      expect(hotel.map(p => [p.titolo, p.inizio, p.fine])).toEqual([
        ['MIMARU Tokyo Asakusa Station', '2027-08-08T15:00', '2027-08-13T10:00'],
        ['Dormy Inn Kanazawa', '2027-08-13T15:00', '2027-08-14T10:00'],
        ['Tokyu Stay Hida Takayama', '2027-08-14T15:00', '2027-08-15T10:00'],
        ['MIMARU Kyoto Kawaramachi Gojo', '2027-08-15T15:00', '2027-08-20T10:00'],
        ['Hotel Forza Osaka Namba Dotonbori', '2027-08-20T15:00', '2027-08-23T10:00'],
        ['Tonosawa Ichinoyu Honkan', '2027-08-23T15:00', '2027-08-24T10:00'],
        ['MIMARU Tokyo Asakusa Station', '2027-08-24T15:00', '2027-08-27T10:00'],
      ])
      expect(hotel.every(p => p.daPrenotareEntro === '2026-11-30' && p.note)).toBe(true)
    })
    test('voli di andata e ritorno', () => {
      expect(v.prenotazioni.find(p => p.id === 'pr-volo-andata')).toMatchObject({ inizio: '2027-08-07T12:30', fuso: 'Europe/Rome', fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo' })
      expect(v.prenotazioni.find(p => p.id === 'pr-volo-ritorno')).toMatchObject({ inizio: '2027-08-27T20:00', fuso: 'Asia/Tokyo' })
    })
    test('tutto da prenotare, e ogni biglietto è collegato alla sua tappa', () => {
      expect(v.prenotazioni.filter(p => p.stato !== 'da-prenotare' || p.codice)).toEqual([])
      const perId = new Map(tappe.map(t => [t.id, t]))
      for (const p of v.prenotazioni.filter(x => x.tappaId)) expect(perId.get(p.tappaId!)?.biglietti, p.titolo).toBeDefined()
    })
    test('i treni dell\'Obon con la data in cui aprono le vendite', () => {
      const entro = (id: string) => v.prenotazioni.find(p => p.id === id)?.daPrenotareEntro
      expect([entro('pr-g5-1'), entro('pr-g7-2'), entro('pr-g15-1')]).toEqual(['2027-07-13', '2027-07-15', '2027-07-23'])
    })
  })

  describe('orari di apertura', () => {
    const conOrari = tappe.filter(t => t.orari)
    test('tutti con la nota di verifica', () => {
      expect(conOrari.length).toBeGreaterThan(15)
      for (const t of conOrari) {
        expect(t.orari?.fonte, t.titolo).toBe('base')
        expect(t.orari?.nota, t.titolo).toMatch(/Verifica sul sito prima di andare/)
      }
    })
    test('nessuna tappa è chiusa o fuori orario nel giorno e all\'ora in cui è in programma', () => {
      for (const [i, g] of v.giorni.entries()) {
        for (const t of g.tappe.filter(x => x.orari)) expect(['aperto', 'sconosciuto'], `G${i} ${t.titolo}`).toContain(statoApertura(t, dataGiorno(v, i)))
      }
    })
  })
  describe('foto e spostamenti', () => {
    test('le tappe da vedere hanno quasi tutte la foto scelta a mano, da Wikimedia', () => {
      const daVedere = tappe.filter(x => x.luogo && x.tipo !== 'spostamento' && x.tipo !== 'hotel')
      const conFoto = daVedere.filter(x => x.foto)
      expect(conFoto.length / daVedere.length).toBeGreaterThan(0.8)
      expect(conFoto.every(x => /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(x.foto!))).toBe(true)
    })
    test('fra due tappe con un luogo c\'è sempre il modo e il tempo per arrivarci', () => {
      const mancanti = v.giorni.flatMap(g => g.tappe.slice(0, -1).filter((x, i) => x.luogo?.lat != null && g.tappe[i + 1].luogo?.lat != null && !x.spostamento
        && (Math.abs(x.luogo.lat - g.tappe[i + 1].luogo!.lat!) > 0.002 || Math.abs(x.luogo.lng! - g.tappe[i + 1].luogo!.lng!) > 0.002)).map(x => x.id))
      expect(mancanti).toEqual([])
      expect(tappe.filter(x => x.spostamento).length).toBeGreaterThan(100)
    })
  })
})
