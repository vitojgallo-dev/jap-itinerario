import { aggiungiGiorni, minutiDaOra } from '../src/model/date'
import type { Avviso, Giorno, InfoEvento, Luogo, OrariTappa, Prenotazione, Suggerimento, Tappa, TipoTappa, Viaggio } from '../src/model/tipi'
import { linkSicuro } from '../src/servizi/mappe'

const L = (nome: string, query: string, lat: number, lng: number): Luogo => ({ nome, query, lat, lng })
const FONTI = {
  nara: 'https://www.narashikanko.or.jp/event/detail_10262.html',
  arashiyama: 'https://www.arashiyamahoshokai.com/event/arashiyama-toronagashi',
  okuribi: 'https://kyototravel.info/gozannookuribi',
}
const attenzione = (testo: string): Avviso => ({ testo, livello: 'attenzione' })
const info = (testo: string): Avviso => ({ testo, livello: 'info' })

function nuova(id: string, ora: string, titolo: string, tipo: TipoTappa, descrizione: string, luogo?: Luogo, altro: Partial<Tappa> = {}): Tappa {
  return {
    id, ora, titolo, descrizione, consiglio: '', tipo,
    sera: minutiDaOra(ora)! >= 18 * 60, stato: 'da-fare', nota: '',
    ...(luogo ? { luogo } : {}), ...altro,
  }
}
const evento = (e: InfoEvento) => ({ evento: e })

const VERIFICA = 'Verifica sul sito prima di andare.'

/** Gli orari pre-compilati dallo spec della fase 2, per id di tappa. Solo questi: il resto lo aggiunge Vito o lo legge da OSM. */
const ORARI_BASE: Record<string, Omit<OrariTappa, 'fonte'>> = {
  't3-1': { chiusoIl: [0], nota: `Molti banchi chiusi il mercoledì e i festivi. ${VERIFICA}` }, // Tsukiji Outer Market
  't5-4': { chiusoIl: [1], apre: '10:00', chiude: '18:00', nota: VERIFICA }, // Museo del 21° secolo
  't8-1': { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: VERIFICA }, // Kinkaku-ji
  't8-3': { chiusoIl: [], apre: '08:30', chiude: '17:00', nota: `Orari del giardino. ${VERIFICA}` }, // Tenryu-ji
  't10-2': { chiusoIl: [], apre: '07:30', chiude: '17:30', nota: VERIFICA }, // Tōdai-ji
  't-himeji-2': { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: VERIFICA }, // Castello di Himeji
  't12-1': { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: VERIFICA }, // Castello di Osaka
  't4-3': { chiusoIl: [], apre: '08:00', chiude: '17:00', nota: VERIFICA }, // Nikko Tōshōgū
  't1-4': { chiusoIl: [], apre: '10:00', chiude: '21:00', nota: VERIFICA }, // Tokyo Skytree
  't2-3': { chiusoIl: [], apre: '10:00', chiude: '22:30', nota: VERIFICA }, // Shibuya Sky
  't13-1': { chiusoIl: [], apre: '09:30', chiude: '22:30', nota: VERIFICA }, // Umeda Sky Building
  't5-3': { chiusoIl: [], apre: '07:00', chiude: '18:00', nota: VERIFICA }, // Kenrokuen
}

function conOrari(giorni: Giorno[]): Giorno[] {
  const trovate = new Set<string>()
  const nuovi = giorni.map(g => ({
    ...g,
    tappe: g.tappe.map(t => {
      const o = ORARI_BASE[t.id]
      if (!o) return t
      trovate.add(t.id)
      return { ...t, orari: { ...o, fonte: 'base' as const } }
    }),
  }))
  const mancanti = Object.keys(ORARI_BASE).filter(id => !trovate.has(id))
  if (mancanti.length) throw new Error(`tappe per gli orari non trovate: ${mancanti.join(', ')}`)
  return nuovi
}

/** Voli, un hotel per ogni serie di notti con lo stesso alloggio, un biglietto per ogni tappa che lo chiede. Tutto da prenotare. */
function prenotazioniDiPartenza(giorni: Giorno[], dataPartenza: string, nomeCitta: (id: string) => string): Prenotazione[] {
  const data = (i: number) => aggiungiGiorni(dataPartenza, i)
  const nuova = (id: string, tipo: Prenotazione['tipo'], titolo: string, altro: Partial<Prenotazione> = {}): Prenotazione => ({
    id, tipo, titolo, stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [], ...altro,
  })
  const ultimo = giorni.length - 1
  const voli = [
    nuova('pr-volo-andata', 'volo', 'Volo Roma → Tokyo', {
      inizio: `${data(-1)}T12:30`, fuso: 'Europe/Rome', fine: `${data(0)}T14:00`, fusoFine: 'Asia/Tokyo',
      luogo: L('Aeroporto di Roma Fiumicino', 'Rome Fiumicino Airport', 41.8003, 12.2389),
    }),
    nuova('pr-volo-ritorno', 'volo', 'Volo Tokyo → Roma', { inizio: `${data(ultimo)}T20:00`, luogo: L('Aeroporto di Haneda', 'Haneda Airport', 35.5494, 139.7798) }),
  ]
  // L'ultimo giorno si parte: le notti sono dal G0 al penultimo. Le notti senza alloggio diventano un hotel "da scegliere".
  const hotel: Prenotazione[] = []
  for (let i = 0; i < ultimo; i++) {
    const g = giorni[i]
    const titolo = g.alloggio?.nome ?? `Hotel di ${nomeCitta(g.cittaId)} (da scegliere)`
    const precedente = hotel[hotel.length - 1]
    if (precedente && precedente.titolo === titolo && precedente.fine === `${data(i)}T10:00`) {
      precedente.fine = `${data(i + 1)}T10:00`
      continue
    }
    hotel.push(nuova(`pr-hotel-${i}`, 'hotel', titolo, {
      inizio: `${data(i)}T15:00`, fine: `${data(i + 1)}T10:00`, ...(g.alloggio ? { luogo: structuredClone(g.alloggio) } : {}),
    }))
  }
  // Le tappe di tipo hotel sono già coperte dall'hotel; due tappe dello stesso giorno con lo stesso link sono un biglietto solo.
  const biglietti = giorni.flatMap((g, i) => {
    const linkVisti = new Set<string>()
    return g.tappe.flatMap(t => {
      if (!t.biglietti || t.tipo === 'hotel' || t.stato === 'saltata') return []
      const link = linkSicuro(t.biglietti.link)
      if (link && linkVisti.has(link)) return []
      if (link) linkVisti.add(link)
      return [nuova(`pr-${t.id}`, t.tipo === 'cibo' ? 'ristorante' : 'biglietto', t.titolo, {
        ...(t.ora ? { inizio: `${data(i)}T${t.ora}` } : {}),
        ...(t.luogo ? { luogo: structuredClone(t.luogo) } : {}),
        ...(link ? { link } : {}),
        tappaId: t.id,
      })]
    })
  })
  return [...voli, ...hotel, ...biglietti]
}

/** Applica la sezione 5 dello spec all'itinerario convertito dalla vecchia app. */
export function revisione2027(vecchio: Viaggio): Viaggio {
  const v = structuredClone(vecchio)
  const g = (n: number): Giorno => {
    const x = v.giorni.find(d => d.id === `g${n}`)
    if (!x) throw new Error(`giorno g${n} mancante`)
    return x
  }
  const tappa = (giorno: Giorno, titolo: string): Tappa => {
    const t = giorno.tappe.find(x => x.titolo === titolo)
    if (!t) throw new Error(`tappa "${titolo}" non trovata in ${giorno.id}`)
    return t
  }
  const hotelTokyo = structuredClone(g(1).alloggio)
  const hotelKyoto = structuredClone(g(8).alloggio)
  const hotelOsaka = structuredClone(g(12).alloggio)
  if (!hotelTokyo || !hotelKyoto || !hotelOsaka) throw new Error('alloggi di Tokyo, Kyoto o Osaka mancanti')

  // G0 — arrivo
  const arrivo: Giorno = {
    id: 'g-arrivo', cittaId: 'tokyo', titolo: 'Arrivo e prima sera ad Asakusa',
    intro: 'Atterraggio alle 14:00. Il pomeriggio se ne va fra immigrazione, bagagli e trasferimento; la sera solo due passi: il jet lag si batte restando svegli fino alle 21-22.',
    note: '', alloggio: structuredClone(hotelTokyo), consigli: [], avvisi: [], suggerimenti: [], speciale: null,
    tappe: [
      nuova('t-arrivo-1', '14:00', 'Arrivo in aeroporto', 'spostamento',
        'Immigrazione e bagagli, poi Suica sul telefono (o alla macchinetta) e SIM/eSIM. Da Haneda: linea Keikyu diretta per Asakusa, circa 45 minuti. Da Narita: Keisei Access Express per Asakusa, circa 60 minuti.',
        L('Aeroporto di Haneda', 'Haneda Airport', 35.5494, 139.7798),
        { consiglio: 'Se atterrate a Narita, cambiate il luogo di questa tappa.', spostamento: { modo: 'treno', minuti: 60 } }),
      nuova('t-arrivo-2', '16:00', 'Check-in in hotel', 'hotel', 'Doccia e due minuti di riposo, niente sonnellini lunghi.', structuredClone(hotelTokyo), { spostamento: { modo: 'piedi', minuti: 10 } }),
      nuova('t-arrivo-3', '17:30', 'Tramonto sul Sumida', 'visita', 'Lungofiume con lo Skytree che si accende: il modo migliore per restare svegli.', L('Sumida Park', 'Sumida Park Tokyo', 35.7112, 139.8006), { spostamento: { modo: 'piedi', minuti: 10 } }),
      nuova('t-arrivo-4', '19:00', 'Cena leggera a Hoppy Street', 'cibo', "Izakaya all'aperto con spiedini e birra, senza prenotazione: perfetta per la prima sera.", L('Hoppy Street', 'Hoppy Street Asakusa', 35.7138, 139.7937)),
      nuova('t-arrivo-5', '21:00', 'Konbini e a letto', 'libero', "Acqua, snack e colazione per domattina se l'hotel non la include."),
    ],
  }

  // G7 — Kanazawa → Kyoto, sera a Nara
  const g10 = g(10)
  const cena = tappa(g10, 'Cena a Nara o rientro a Kyoto')
  const kasuga = tappa(g10, 'Santuario Kasuga Taisha')
  // Al G7 restano i suggerimenti di Nara; quelli di Kyoto vanno al G10 (centro e Nishiki).
  // Il Kasuga Taisha di sera non serve più: ora è una tappa.
  const diNara = (s: Suggerimento) => [s.nome, s.descrizione, s.luogo?.nome, s.luogo?.query].some(x => x?.includes('Nara'))
  const suggerimentiNara = g10.suggerimenti.filter(s => s.nome !== 'Kasuga Taisha di sera (Nara)')
  g(9).suggerimenti = [...g(9).suggerimenti, ...suggerimentiNara.filter(s => !diNara(s))]
  const nara: Giorno = {
    id: 'g-nara', cittaId: 'kyoto', titolo: 'Verso Kyoto, sera di lanterne a Nara',
    intro: 'Il 15 agosto è la sera più bella di Nara: 3.000 lanterne accese al Kasuga Taisha, lumini al Tōdai-ji e il falò Daimonji sul monte alle 20:00.',
    note: '', alloggio: structuredClone(hotelKyoto),
    consigli: g10.consigli, suggerimenti: suggerimentiNara.filter(diNara), speciale: null,
    avvisi: [
      attenzione('Obon, giorno di controesodo: prenotate i posti Kanazawa → Kyoto appena aprono (un mese prima, alle 10:00).'),
      info('Stasera a Nara: Kasuga Chūgen Mantōrō (19–21:30) e falò Daimonji alle 20:00.'),
    ],
    tappe: [
      nuova('t-nara-1', '08:30', 'Treno Kanazawa → Kyoto', 'spostamento',
        'Hokuriku Shinkansen fino a Tsuruga, poi Limited Express Thunderbird fino a Kyoto: circa 2 ore e 15.',
        L('Stazione di Kanazawa', 'Kanazawa Station', 36.5781, 136.6478), { spostamento: { modo: 'treno', minuti: 135 } }),
      nuova('t-nara-2', '11:00', 'Bagagli in hotel', 'hotel', 'Lasciate le valigie (il check-in è nel pomeriggio) e ripartite leggeri.', structuredClone(hotelKyoto), { spostamento: { modo: 'mezzi', minuti: 20 } }),
      nuova('t-nara-3', '11:45', 'Treno per Nara', 'spostamento',
        'Kintetsu Kyoto Line, espresso limitato circa 35 minuti; oppure JR Nara Line circa 45 minuti (coperta dal JR Pass).',
        L('Stazione di Kyoto', 'Kyoto Station', 34.9858, 135.7588), { spostamento: { modo: 'treno', minuti: 45 } }),
      { ...tappa(g10, 'Parco di Nara + cervi'), ora: '13:00', spostamento: { modo: 'piedi', minuti: 10 } },
      { ...tappa(g10, 'Todai-ji (Grande Buddha)'), ora: '13:45', spostamento: { modo: 'piedi', minuti: 10 } },
      { ...tappa(g10, 'Giardino Isuien'), ora: '15:15', spostamento: { modo: 'piedi', minuti: 20 } },
      { ...tappa(g10, 'Naramachi (centro storico)'), ora: '16:15', spostamento: { modo: 'piedi', minuti: 5 } },
      { ...cena, ora: '18:00', titolo: 'Cena a Nara', sera: true, descrizione: 'Cena presto a Naramachi o vicino alla stazione Kintetsu, poi di nuovo nel parco per le lanterne.', spostamento: { modo: 'piedi', minuti: 25 } },
      {
        ...kasuga, ora: '19:00', sera: true, tipo: 'evento', titolo: 'Kasuga Chūgen Mantōrō', spostamento: { modo: 'piedi', minuti: 10 },
        descrizione: 'Le 3.000 lanterne di pietra e bronzo del santuario accese tutte insieme, solo il 14 e il 15 agosto.',
        consiglio: "Il corridoio interno costa circa 700 ¥ e c'è coda: arrivate entro le 19.",
        ...evento({ nome: 'Kasuga Chūgen Mantōrō', nomeJa: '中元万燈籠', affidabilita: 'certa', fonte: FONTI.nara }),
      },
      nuova('t-nara-4', '20:00', 'Falò Daimonji e lanterne del Tōdai-ji', 'evento',
        'Il falò a forma di 大 si accende sul monte Takamado: si vede bene dal prato di Tobihino. Intanto il Tōdai-ji è illuminato dai lumini del Mantō Kuyōe.',
        L('Prato di Tobihino', 'Tobihino Nara Park', 34.6845, 135.8440),
        { ...evento({ nome: 'Nara Daimonji Okuribi', nomeJa: '奈良大文字送り火', affidabilita: 'certa', fonte: FONTI.nara }), spostamento: { modo: 'piedi', minuti: 20 } }),
      nuova('t-nara-5', '21:00', 'Rientro a Kyoto', 'spostamento', 'Espressi Kintetsu fino a tarda sera; dopo il falò i treni sono pieni.',
        L('Stazione Kintetsu Nara', 'Kintetsu Nara Station', 34.6843, 135.8279), { spostamento: { modo: 'treno', minuti: 45 } }),
    ],
  }

  // G8 — Kinkaku-ji, Arashiyama e la notte dell'Okuribi
  const g8 = g(8)
  const kawaramachi = tappa(g8, 'Kawaramachi / Nishiki di sera')
  const togetsukyo = L('Ponte Togetsukyo', 'Togetsukyo Bridge Arashiyama', 35.0129, 135.6778)
  g8.titolo = "Padiglione d'Oro, Arashiyama e i falò dell'Okuribi"
  g8.avvisi = [
    info('Gozan no Okuribi: i cinque falò si accendono fra le 20:00 e le 20:20. Da Arashiyama si vede il torii; per il 大 bisogna stare sul fiume Kamo.'),
    attenzione("Dopo le 21 treni e bus pienissimi: mettete in conto un'ora per rientrare."),
  ]
  // Lo spostamento di una tappa porta alla tappa che la segue.
  g8.tappe = [
    { ...tappa(g8, 'Partenza'), spostamento: { modo: 'mezzi', minuti: 45 } },
    { ...tappa(g8, "Kinkaku-ji (Padiglione d'Oro)"), spostamento: { modo: 'mezzi', minuti: 45 } },
    nuova('t-okuribi-1', '11:30', 'Pausa nelle ore calde', 'libero', 'A Kyoto a metà agosto si superano i 35°: pranzo e riposo in hotel, la giornata vera è stasera.',
      undefined, { spostamento: { modo: 'treno', minuti: 45 } }),
    { ...tappa(g8, 'Tempio Tenryu-ji'), ora: '15:30', consiglio: 'Il giardino chiude alle 17:00.', spostamento: { modo: 'piedi', minuti: 5 } },
    { ...tappa(g8, 'Foresta di bambu di Arashiyama'), ora: '16:30', consiglio: 'Verso sera meno gente e meno caldo.', spostamento: { modo: 'piedi', minuti: 15 } },
    nuova('t-okuribi-2', '17:30', 'Cena ad Arashiyama', 'cibo', 'Tofu, yudofu e soba lungo il fiume; mangiate presto per prendere posto sulla riva.', { ...togetsukyo, nome: 'Arashiyama', query: 'Arashiyama Kyoto' },
      { spostamento: { modo: 'piedi', minuti: 5 } }),
    nuova('t-okuribi-3', '19:00', 'Lanterne sul fiume', 'evento',
      "Migliaia di lanterne affidate alla corrente del Katsura per accompagnare gli spiriti dell'Obon. La lanterna si può comprare dalle 12.",
      togetsukyo, evento({ nome: 'Arashiyama Tōrō Nagashi', nomeJa: '嵐山灯籠流し', affidabilita: 'certa', fonte: FONTI.arashiyama })),
    nuova('t-okuribi-4', '20:20', 'Falò a forma di torii', 'evento',
      "L'ultimo dei cinque falò dell'Okuribi, sul monte Mandara, proprio sopra il fiume: il momento più bello della serata.",
      structuredClone(togetsukyo), { ...evento({ nome: 'Gozan no Okuribi', nomeJa: '五山送り火', affidabilita: 'certa', fonte: FONTI.okuribi }), spostamento: { modo: 'treno', minuti: 50 } }),
    nuova('t-okuribi-5', '21:00', 'Rientro in hotel', 'spostamento', 'Randen o JR Sagano Line; aspettatevi code alle stazioni.', structuredClone(hotelKyoto)),
  ]

  // G11 — Kurama e Kibune
  const kurama: Giorno = {
    id: 'g-kurama', cittaId: 'kyoto', titolo: 'Kurama e Kibune, in montagna sopra Kyoto',
    intro: "Un'ora di treno e dieci gradi in meno: il tempio di Kurama fra i cedri, il sentiero nel bosco e il pranzo sulle piattaforme sopra il torrente.",
    note: '', alloggio: structuredClone(hotelKyoto), consigli: [], suggerimenti: [], speciale: null,
    avvisi: [info("Alternativa: Uji (Byōdō-in e matcha). Se preferite, cambiate il giorno dall'app.")],
    tappe: [
      nuova('t-kurama-1', '09:00', 'Treno Eizan per Kurama', 'spostamento', 'Da Demachiyanagi circa 30 minuti; non è coperto dal JR Pass.',
        L('Stazione di Demachiyanagi', 'Demachiyanagi Station', 35.0305, 135.7727), { spostamento: { modo: 'treno', minuti: 30 } }),
      nuova('t-kurama-2', '09:45', 'Tempio Kurama-dera', 'visita', 'Tempio sulla montagna fra cedri giganti: funicolare per il primo tratto, poi scalinate.',
        L('Kurama-dera', 'Kurama-dera', 35.1180, 135.7713), { spostamento: { modo: 'piedi', minuti: 60 } }),
      nuova('t-kurama-3', '11:00', 'Sentiero da Kurama a Kibune', 'visita', "Un'ora nel bosco fra radici e piccoli santuari: scarpe comode e acqua.",
        L('Sentiero Kurama–Kibune', 'Kurama Kibune hiking trail', 35.1203, 135.7667), { spostamento: { modo: 'piedi', minuti: 5 } }),
      nuova('t-kurama-4', '12:30', 'Pranzo sulle kawadoko', 'cibo', 'Piattaforme sopra il torrente, molto più fresche della città: nagashi-sōmen o kaiseki.',
        L('Kawadoko di Kibune', 'Kibune kawadoko', 35.1195, 135.7637), { consiglio: 'Per il kaiseki serve prenotare; il nagashi-sōmen di Hirobun si fa in coda.', spostamento: { modo: 'piedi', minuti: 10 } }),
      nuova('t-kurama-5', '14:00', 'Santuario Kibune', 'visita', "La scalinata di lanterne rosse e l'omikuji che si legge immergendolo nell'acqua.",
        L('Santuario Kibune', 'Kibune Shrine', 35.1219, 135.7629), { spostamento: { modo: 'treno', minuti: 45 } }),
      nuova('t-kurama-6', '16:00', 'Rientro e riposo', 'libero', 'Bus fino alla stazione di Kibuneguchi, poi Eizan fino a Demachiyanagi.'),
      { ...kawaramachi, ora: '18:30' },
    ],
  }

  // G15 — Himeji e Kobe
  const himeji: Giorno = {
    id: 'g-himeji', cittaId: 'osaka', titolo: 'Castello di Himeji e sera a Kobe',
    intro: 'Il castello più bello del Giappone, originale del 1600, e la sera il porto di Kobe col suo manzo. Si dorme ancora a Osaka.',
    note: '', alloggio: structuredClone(hotelOsaka), consigli: [], suggerimenti: [], speciale: null,
    avvisi: [info('Jizō-bon: la sera, feste di quartiere per i bambini nelle vie di Osaka.')],
    tappe: [
      nuova('t-himeji-1', '08:00', 'Treno per Himeji', 'spostamento', 'Shinkansen da Shin-Osaka circa 30 minuti (JR Pass), oppure JR Special Rapid da Osaka circa 1 ora.',
        L('Stazione di Shin-Osaka', 'Shin-Osaka Station', 34.7334, 135.5001), { spostamento: { modo: 'treno', minuti: 35 } }),
      nuova('t-himeji-2', '09:00', 'Castello di Himeji', 'visita', "L'Airone Bianco, patrimonio UNESCO: dentro si sale scalzi per sei piani di scale ripide.",
        L('Castello di Himeji', 'Himeji Castle', 34.8394, 134.6939), { consiglio: "Entrate all'apertura: dentro non c'è aria condizionata.", biglietti: { link: 'https://www.himejicastle.jp/en/' }, spostamento: { modo: 'piedi', minuti: 5 } }),
      nuova('t-himeji-3', '11:00', 'Giardino Kōko-en', 'visita', 'Nove giardini del periodo Edo ai piedi del castello, con laghetti di carpe.',
        L('Giardino Kōko-en', 'Koko-en Garden Himeji', 34.8379, 134.6906), { spostamento: { modo: 'piedi', minuti: 15 } }),
      nuova('t-himeji-4', '12:30', 'Pranzo a Himeji', 'cibo', 'Anago (anguilla di mare) e oden con salsa allo zenzero, le specialità della città.',
        L('Stazione di Himeji', 'Himeji Station', 34.8267, 134.6904), { spostamento: { modo: 'treno', minuti: 40 } }),
      nuova('t-himeji-5', '15:00', 'Kitano Ijinkan', 'visita', "Il quartiere sulla collina con le case dei mercanti stranieri dell'Ottocento.",
        L('Kitano Ijinkan', 'Kitano Ijinkan Kobe', 34.7003, 135.1904), { spostamento: { modo: 'mezzi', minuti: 20 } }),
      nuova('t-himeji-6', '17:00', 'Harborland e il porto', 'visita', 'Lungomare con la Port Tower rossa; al tramonto si accende tutto.',
        L('Harborland', 'Kobe Harborland', 34.6793, 135.1830), { spostamento: { modo: 'mezzi', minuti: 15 } }),
      nuova('t-himeji-7', '19:00', 'Cena col manzo di Kobe', 'cibo', 'Teppanyaki di manzo di Kobe certificato: a cena dai 10.000 ¥ in su, a pranzo costa meno.',
        L('Sannomiya', 'Sannomiya Kobe', 34.6946, 135.1956), { consiglio: 'La cena wagyu speciale è già al G12: tenetene una sola, oppure fate il Kobe a pranzo.', spostamento: { modo: 'treno', minuti: 25 } }),
      nuova('t-himeji-8', '21:00', 'Rientro a Osaka', 'spostamento', 'JR da Sannomiya a Osaka, circa 25 minuti.', structuredClone(hotelOsaka)),
    ],
  }

  // G19 — partenza
  const haneda = L('Aeroporto di Haneda', 'Haneda Airport', 35.5494, 139.7798)
  const partenza: Giorno = {
    id: 'g-partenza', cittaId: 'tokyo', titolo: 'Ultima mattina e volo di ritorno',
    intro: 'Volo verso le 20:00: in aeroporto intorno alle 17.', note: '', alloggio: null,
    consigli: [], suggerimenti: [], speciale: null,
    avvisi: [info('Tax-free: con le regole in vigore dal 1° novembre 2026 il rimborso si chiede in aeroporto, ai chioschi prima dei controlli.')],
    tappe: [
      nuova('t-partenza-1', '09:00', 'Colazione e valigie', 'libero', 'Controllate passaporti, caricatori e i souvenir fragili.'),
      nuova('t-partenza-2', '10:30', 'Check-out e deposito bagagli', 'hotel', 'Lasciate le valigie in hotel o negli armadietti della stazione.'),
      nuova('t-partenza-3', '11:00', 'Ultimo giro in città', 'libero', 'Le cose rimaste in lista, senza allontanarsi troppo dalle valigie.'),
      nuova('t-partenza-4', '16:00', 'Trasferimento in aeroporto', 'spostamento', "Se il volo parte da Narita, contate un'ora in più e cambiate il luogo.", haneda, { spostamento: { modo: 'treno', minuti: 60 } }),
      nuova('t-partenza-5', '17:00', 'In aeroporto', 'spostamento', 'Check-in, rimborso tax-free, ultimi yen al konbini.', structuredClone(haneda)),
    ],
  }

  // Trasferimenti: ogni giorno comincia da dove si è dormito la notte prima.
  // Cambia l'ora; una tappa che slitta dopo le 18 diventa di sera, una già di sera resta tale.
  const conOra = (t: Tappa, ora: string): Tappa => ({ ...t, ora, sera: t.sera || minutiDaOra(ora)! >= 18 * 60 })

  // G4 — da Asakusa a Nikko
  const g4 = g(4)
  g4.titolo = 'Templi di Nikko, lago Chuzenji e cascata Kegon'
  g4.tappe = [
    nuova('t-nikko-1', '07:00', 'Treno Asakusa → Nikko', 'spostamento',
      'Tobu Limited Express (Spacia X o Revaty) da Asakusa a Tobu-Nikko, circa 1 ora e 50. Si prenota; non è coperto dal JR Pass.',
      L('Stazione Tobu di Asakusa', 'Tobu Asakusa Station', 35.7115, 139.7982), { spostamento: { modo: 'treno', minuti: 110 } }),
    conOra(tappa(g4, 'Ponte Shinkyo'), '09:15'),
    conOra(tappa(g4, 'Tempio Rinno-ji'), '09:40'),
    conOra(tappa(g4, 'Nikko Toshogu'), '10:30'),
    conOra(tappa(g4, 'Santuario Futarasan'), '12:15'),
    conOra(tappa(g4, 'Pranzo a Nikko'), '13:00'),
    conOra(tappa(g4, 'Lago Chuzenji + Cascata Kegon'), '14:30'),
    conOra(tappa(g4, 'Onsen e cena kaiseki'), '17:30'),
  ]

  // G5 — da Nikko a Kanazawa, visite compattate nel pomeriggio; museo e Nagamachi passano al G6
  const g5 = g(5)
  const hotelKanazawa = structuredClone(g5.alloggio)
  if (!hotelKanazawa) throw new Error('alloggio di Kanazawa mancante')
  const museo = tappa(g5, 'Museo del 21 secolo')
  const nagamachi = tappa(g5, 'Quartiere samurai Nagamachi')
  const omicho = tappa(g5, 'Mercato Omicho')
  g5.titolo = 'Verso Kanazawa: mercato, Kenrokuen e il quartiere delle geishe'
  g5.tappe = [
    nuova('t-kanazawa-1', '07:30', 'Treno Nikko → Kanazawa', 'spostamento',
      "JR Nikko Line fino a Utsunomiya, Tohoku Shinkansen fino a Omiya, Hokuriku Shinkansen fino a Kanazawa: circa 4 ore e 30, coperto dal JR Pass. Con l'inizio dell'Obon i posti riservati sono indispensabili.",
      L('Stazione JR di Nikko', 'JR Nikko Station', 36.7479, 139.6187), { spostamento: { modo: 'treno', minuti: 270 } }),
    {
      ...conOra(tappa(g5, 'Partenza e Porta Tsuzumi'), '12:15'), titolo: 'Bagagli in hotel e Porta Tsuzumi', tipo: 'hotel',
      descrizione: "Lasciate le valigie in hotel, davanti alla stazione, e passate sotto la grande porta di legno Tsuzumi-mon.",
      luogo: structuredClone(hotelKanazawa), spostamento: { modo: 'piedi', minuti: 15 },
    },
    { ...conOra(omicho, '12:45'), tipo: 'cibo', descrizione: `${omicho.descrizione} Il pranzo si fa qui, ai banchi o nei piccoli locali di kaisendon.`, spostamento: { modo: 'piedi', minuti: 20 } },
    { ...conOra(tappa(g5, 'Giardino Kenrokuen'), '14:00'), spostamento: { modo: 'piedi', minuti: 10 } },
    { ...conOra(tappa(g5, 'Castello di Kanazawa'), '15:15'), spostamento: { modo: 'piedi', minuti: 25 } },
    conOra(tappa(g5, 'Quartiere geishe Higashi Chaya'), '16:30'),
    { ...conOra(tappa(g5, 'Lanterne a Higashi Chaya'), '18:00'), spostamento: { modo: 'mezzi', minuti: 15 } },
    conOra(tappa(g5, 'Cena'), '19:00'),
  ]
  const g6 = g(6)
  const rientroG6 = tappa(g6, 'Rientro a Kanazawa')
  rientroG6.descrizione = 'Autobus di ritorno alla stazione di Kanazawa. Il pomeriggio resta per il museo e il quartiere samurai.'
  rientroG6.spostamento = { modo: 'mezzi', minuti: 15 }
  g6.tappe = [
    ...g6.tappe,
    { ...conOra(museo, '15:30'), spostamento: { modo: 'piedi', minuti: 15 } },
    conOra(nagamachi, '17:00'),
  ]

  // G12 — da Kyoto a Osaka
  const g12 = g(12)
  g12.tappe = [
    nuova('t-osaka-1', '08:30', 'Treno Kyoto → Osaka e bagagli in hotel', 'spostamento',
      "JR Special Rapid, circa 30 minuti fino a Osaka, poi metro per Namba. Bagagli all'Hotel Forza, a due passi da Dotonbori.",
      L('Stazione di Kyoto', 'Kyoto Station', 34.9858, 135.7588), { spostamento: { modo: 'treno', minuti: 50 } }),
    conOra(tappa(g12, 'Partenza per il castello'), '09:30'),
    conOra(tappa(g12, 'Castello di Osaka'), '10:00'),
    ...g12.tappe.filter(t => t.titolo !== 'Partenza per il castello' && t.titolo !== 'Castello di Osaka'),
  ]

  // G14 — solo il titolo
  g(14).titolo = 'Templi del sud e ultimi acquisti'

  // G16 — da Osaka a Hakone
  const g16 = g(16)
  const ryokan = tappa(g16, 'Partenza dal ryokan')
  const alloggioHakone = structuredClone(g16.alloggio)
  if (!alloggioHakone) throw new Error('alloggio di Hakone mancante')
  g16.titolo = "Da Osaka a Hakone: museo all'aperto, Owakudani e lago Ashi"
  g16.intro = "Mattina in Shinkansen fino a Odawara, bagagli al ryokan e poi il giro ad anello col Free Pass: museo all'aperto, la valle vulcanica di Owakudani e il lago Ashi. La sera onsen e kaiseki."
  g16.tappe = [
    nuova('t-hakone-1', '07:30', 'Treno Osaka → Hakone', 'spostamento',
      "Shinkansen Hikari da Shin-Osaka a Odawara, circa 2 ore e 10 (JR Pass), poi Hakone Tozan fino a Hakone-Yumoto, 15 minuti. Conviene comprare l'Hakone Free Pass a Odawara.",
      L('Stazione di Shin-Osaka', 'Shin-Osaka Station', 34.7334, 135.5001), { spostamento: { modo: 'treno', minuti: 150 } }),
    {
      ...conOra(ryokan, '10:30'), titolo: 'Bagagli al ryokan', tipo: 'hotel', luogo: alloggioHakone,
      descrizione: "Lasciate le valigie al ryokan (il check-in è nel pomeriggio), poi si parte per il giro ad anello col Free Pass: treno a cremagliera, funivia, battello, bus.",
    },
    conOra(tappa(g16, "Museo all'aperto di Hakone"), '11:15'),
    conOra(tappa(g16, 'Owakudani'), '13:30'),
    conOra(tappa(g16, 'Lago Ashi e Torii di Hakone'), '15:00'),
    conOra(tappa(g16, 'Tenzan Onsen'), '17:00'),
    conOra(tappa(g16, 'Bagno serale cena kaiseki'), '19:00'),
  ]

  // G17 — da Hakone a Tokyo
  const g17 = g(17)
  g17.titolo = 'Ritorno a Tokyo: Ueno, Ameyoko e la vecchia Yanaka'
  g17.tappe = [
    nuova('t-tokyo-1', '09:00', 'Treno Hakone → Tokyo', 'spostamento',
      "Odakyu Romancecar da Hakone-Yumoto a Shinjuku, circa 1 ora e 30 (non coperto dal JR Pass), oppure Hakone Tozan fino a Odawara e Shinkansen per Tokyo. Lasciate i bagagli nel nuovo hotel prima di ripartire.",
      L('Stazione di Hakone-Yumoto', 'Hakone-Yumoto Station', 35.2327, 139.1057), { spostamento: { modo: 'treno', minuti: 90 } }),
    conOra(tappa(g17, 'Ueno: parco e museo'), '11:30'),
    conOra(tappa(g17, 'Ameyoko (mercato)'), '13:00'),
    conOra(tappa(g17, 'Yanaka Ginza (vecchia Tokyo)'), '14:30'),
    conOra(tappa(g17, 'Ginza o Marunouchi'), '16:30'),
    conOra(tappa(g17, 'Quartiere a scelta di sera'), '18:30'),
  ]

  // G18 — ultimo giorno pieno: aeroporto, ultima notte e tax-free passano al G19
  const g18 = g(18)
  const mattina = tappa(g18, 'Mattina libera + valigie')
  const souvenir = tappa(g18, 'Ultimi souvenir')
  const cenaChiusura = tappa(g18, 'Cena di chiusura')
  g18.titolo = 'Ultimo giorno pieno a Tokyo'
  mattina.titolo = 'Mattina libera'
  if (mattina.luogo) mattina.luogo.nome = 'Mattina libera'
  souvenir.descrizione = souvenir.descrizione.replace(" prima dell'aeroporto", '')
  cenaChiusura.descrizione = cenaChiusura.descrizione.replace(" Poi trasferimento verso l'aeroporto.", '')
  cenaChiusura.consiglio = ''
  const perIlG19 = (c: string) => /ultima notte|aeroporto|tax-free/i.test(c)
  const consigliPartenza = g18.consigli.filter(perIlG19)
  g18.consigli = g18.consigli.filter(c => !perIlG19(c))
  // Il consiglio sulla cena parlava del treno per l'aeroporto (e nel vecchio testo era troncato).
  partenza.consigli = [...consigliPartenza, "Per l'aeroporto: da Tokyo Station il Narita Express arriva a Narita in circa 1 ora."]

  // Avvisi sui giorni che restano
  g(2).avvisi = [info('Fuochi di Jingū Gaien: data 2027 da verificare, di solito fra il 7 e il 21 agosto.')]
  g(3).avvisi = [
    info('Festa nazionale (Yama no Hi): più gente nei luoghi famosi.'),
    attenzione('Tsukiji Outer Market: oggi è mercoledì e festivo, molti banchi restano chiusi. Verificate sul sito prima di andare.'),
  ]
  g(5).avvisi = [attenzione("Inizio dell'Obon: treni verso le province pienissimi. Prenotate lo Shinkansen appena si apre la vendita, un mese prima alle 10:00.")]
  for (const n of [17, 18]) {
    g(n).avvisi = [info('Kōenji Awa Odori, Azabu-Jūban e Super Yosakoi: date 2027 da annunciare (probabile 28–29 agosto). Se cadono il 21–22, scambiate Osaka e Hakone.')]
  }

  // Tre persone invece di sei
  const tre = (s: string) => s.replace(/In 6 persone/g, 'In 3 persone').replace(/Facile in 6\./g, 'Facile in 3.')
  for (const d of v.giorni) {
    if (!d.speciale) continue
    d.speciale.nota = tre(d.speciale.nota)
    d.speciale.opzioni = d.speciale.opzioni.map(o => ({ ...o, descrizione: tre(o.descrizione) }))
  }

  const citta = v.citta
    .filter(c => c.id !== 'koyasan' && c.id !== 'hiroshima')
    .map(c => c.id === 'kyoto'
      ? { ...c, intro: "Base: Kyoto Gion Hotel, nel cuore di Gion. Cinque giorni: l'arrivo con le lanterne di Nara, la notte dei falò ad Arashiyama, i grandi templi e una giornata in montagna fra Kurama e Kibune." }
      : c.id === 'osaka' ? { ...c, intro: `${c.intro} In mezzo, una giornata a Himeji e Kobe.` } : c)

  const giorni = conOrari([
    arrivo, g(1), g(2), g(3), g(4), g(5), g(6),
    nara, g8, g(7), g(9), kurama,
    g(12), g(13), g(14), himeji,
    g(16), g(17), g(18), partenza,
  ])
  const dataPartenza = '2027-08-08'
  const nomeCitta = (id: string) => citta.find(c => c.id === id)?.nome ?? id
  return {
    ...v,
    titolo: 'Giappone — agosto 2027',
    dataPartenza,
    citta,
    giorni,
    prenotazioni: prenotazioniDiPartenza(giorni, dataPartenza, nomeCitta),
  }
}
