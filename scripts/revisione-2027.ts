import { aggiungiGiorni, minutiDaOra } from '../src/model/date'
import type { Avviso, Giorno, InfoEvento, Luogo, OrariTappa, Prenotazione, Suggerimento, Tappa, TipoTappa, Viaggio } from '../src/model/tipi'
import { linkSicuro } from '../src/servizi/mappe'

const L = (nome: string, query: string, lat: number, lng: number): Luogo => ({ nome, query, lat, lng })
/** Un luogo senza coordinate: si usano solo quando non sono verificate (gli hotel ancora da prenotare, i negozi). */
const Q = (nome: string, query: string): Luogo => ({ nome, query })
const FONTI = {
  nara: 'https://www.narashikanko.or.jp/event/detail_10262.html',
  naraDaimonji: 'https://narashikanko.or.jp/asset/daimonji/naradaimonji2025',
  todaiji: 'https://banzokubiology.com/todaiji-mantoue-konzatsu/',
  arashiyama: 'https://www.arashiyamahoshokai.com/event/arashiyama-toronagashi',
  okuribi: 'https://kyototravel.info/gozannookuribi',
}
const attenzione = (testo: string): Avviso => ({ testo, livello: 'attenzione' })
const info = (testo: string): Avviso => ({ testo, livello: 'info' })
const S = (tipo: Suggerimento['tipo'], nome: string, descrizione: string, query: string): Suggerimento => ({ tipo, nome, descrizione, luogo: Q(nome, query) })

const seraDa = (ora: string) => minutiDaOra(ora)! >= 18 * 60

function nuova(id: string, ora: string, titolo: string, tipo: TipoTappa, descrizione: string, luogo?: Luogo, altro: Partial<Tappa> = {}): Tappa {
  return {
    id, ora, titolo, descrizione, consiglio: '', tipo,
    sera: seraDa(ora), stato: 'da-fare', nota: '',
    ...(luogo ? { luogo } : {}), ...altro,
  }
}
const evento = (e: InfoEvento) => ({ evento: e })
/** La tappa senza i campi indicati (un biglietto che non serve più, un luogo che non vale). */
function senza(t: Tappa, ...campi: (keyof Tappa)[]): Tappa {
  const c = { ...t }
  for (const k of campi) delete c[k]
  return c
}

const VERIFICA = 'Verifica sul sito prima di andare.'

/** Orari pre-compilati, per id di tappa: solo quelli che la guida (docs/ricerca/GUIDA.md) dà con una fonte. 0 = domenica. */
const ORARI_BASE: Record<string, Omit<OrariTappa, 'fonte'>> = {
  't3-1': { chiusoIl: [0, 3], nota: `Chiuso anche nei festivi. Il momento migliore è fra le 9:00 e le 13:00. ${VERIFICA}` }, // Tsukiji Outer Market
  't3-2': { chiusoIl: [1, 5], nota: `Aperti nei festivi, gratis; ultimo ingresso verso le 17:30. ${VERIFICA}` }, // Giardini Est
  't2-7': { chiusoIl: [], apre: '09:30', chiude: '22:00', nota: `Il nord chiude il 2° e 4° lunedì, il sud il 1° e 3° martedì. ${VERIFICA}` }, // Tocho
  't2-3': { chiusoIl: [], apre: '10:00', chiude: '22:30', nota: VERIFICA }, // Shibuya Sky
  't17-1': { chiusoIl: [1], apre: '09:30', chiude: '17:00', nota: VERIFICA }, // Museo Nazionale di Tokyo
  't17-3': { chiusoIl: [], apre: '10:00', chiude: '18:00', nota: `Molti negozi chiudono il lunedì o il mercoledì. ${VERIFICA}` }, // Yanaka Ginza
  't4-3': { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: `Ultimo ingresso 16:30; l'apertura alle 8:00 è da verificare. ${VERIFICA}` }, // Nikko Tōshōgū
  't5-3': { chiusoIl: [], apre: '07:00', chiude: '18:00', nota: VERIFICA }, // Kenrokuen
  't6-5': { chiusoIl: [1], apre: '09:30', chiude: '17:00', nota: `Ultimo ingresso 16:30. ${VERIFICA}` }, // Museo D.T. Suzuki
  't10-2': { chiusoIl: [], apre: '07:30', chiude: '17:30', nota: VERIFICA }, // Tōdai-ji
  't10-4': { chiusoIl: [2], apre: '09:30', chiude: '16:30', nota: `Ultimo ingresso 16:00. ${VERIFICA}` }, // Isuien
  't8-1': { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: VERIFICA }, // Kinkaku-ji
  't8-3': { chiusoIl: [], apre: '08:30', chiude: '17:00', nota: `Orari del giardino. ${VERIFICA}` }, // Tenryu-ji
  't9-0': { chiusoIl: [3], apre: '09:00', chiude: '17:00', nota: `Orari di Aritsugu, ultimo ingresso 16:30. Molti banchi di Nishiki chiudono il mercoledì e verso le 17–18; Obon da verificare. ${VERIFICA}` }, // Nishiki e Aritsugu
  't9-4': { chiusoIl: [], apre: '08:30', chiude: '17:00', nota: VERIFICA }, // Ginkaku-ji
  't9-8': { chiusoIl: [2], apre: '08:45', chiude: '17:00', nota: `Ultimo ingresso 16:00. Il palazzo Ninomaru è chiuso tutti i martedì di agosto. ${VERIFICA}` }, // Castello di Nijō
  't-kurama-5': { chiusoIl: [], apre: '06:00', chiude: '20:00', nota: VERIFICA }, // Kibune-jinja
  't12-1': { chiusoIl: [], apre: '09:00', chiude: '18:00', nota: `Orari del mastio; il parco è sempre aperto. ${VERIFICA}` }, // Castello di Osaka
  't13-1': { chiusoIl: [], apre: '09:30', chiude: '22:30', nota: VERIFICA }, // Umeda Sky Building
  't13-3': { chiusoIl: [], apre: '10:00', chiude: '18:00', nota: VERIFICA }, // Tower Knives
  't14-2': { chiusoIl: [], apre: '06:00', chiude: '17:00', nota: VERIFICA }, // Sumiyoshi Taisha
  't-himeji-2': { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: `Ultimo ingresso 16:00. ${VERIFICA}` }, // Castello di Himeji
  't-himeji-3': { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: VERIFICA }, // Kōko-en
  't16-1': { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: `Aperto tutti i giorni. ${VERIFICA}` }, // Hakone Open-Air Museum
  't16-4': { chiusoIl: [], apre: '09:00', chiude: '23:00', nota: VERIFICA }, // Tenzan Onsen
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

const nuovaPrenotazione = (id: string, tipo: Prenotazione['tipo'], titolo: string, altro: Partial<Prenotazione> = {}): Prenotazione => ({
  id, tipo, titolo, stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [], ...altro,
})

/** Voli, un hotel per ogni serie di notti con lo stesso alloggio, un biglietto per ogni tappa che lo chiede. Tutto da prenotare. */
function prenotazioniDiPartenza(giorni: Giorno[], dataPartenza: string, nomeCitta: (id: string) => string): Prenotazione[] {
  const data = (i: number) => aggiungiGiorni(dataPartenza, i)
  const nuova = nuovaPrenotazione
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
  // Un treno o un bus da prenotare è una tappa di spostamento coi biglietti; un tavolo è una tappa di cibo.
  const biglietti = giorni.flatMap((g, i) => {
    const linkVisti = new Set<string>()
    return g.tappe.flatMap(t => {
      if (!t.biglietti || t.tipo === 'hotel' || t.stato === 'saltata') return []
      const link = linkSicuro(t.biglietti.link)
      if (link && linkVisti.has(link)) return []
      if (link) linkVisti.add(link)
      const tipo = t.tipo === 'cibo' ? 'ristorante' : t.tipo === 'spostamento' ? 'treno' : 'biglietto'
      return [nuova(`pr-${t.id}`, tipo, t.titolo, {
        ...(t.ora ? { inizio: `${data(i)}T${t.ora}` } : {}),
        ...(t.luogo ? { luogo: structuredClone(t.luogo) } : {}),
        ...(link ? { link } : {}),
        tappaId: t.id,
      })]
    })
  })
  return [...voli, ...hotel, ...biglietti]
}

/** Applica la sezione 5 dello spec e le proposte approvate della ricerca del 28/10/2026 (docs/ricerca/PROPOSTE.md). */
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
  /** Una tappa della vecchia app, a un'ora nuova: "di sera" si ricalcola dall'ora. */
  const rif = (giorno: Giorno, titolo: string, ora: string, altro: Partial<Tappa> = {}): Tappa =>
    ({ ...tappa(giorno, titolo), ora, sera: seraDa(ora), ...altro })
  /** Sposta i suggerimenti che soddisfano `quali` da un giorno all'altro. */
  const sposta = (da: Giorno, a: Giorno, quali: (s: Suggerimento) => boolean) => {
    a.suggerimenti = [...a.suggerimenti, ...da.suggerimenti.filter(quali)]
    da.suggerimenti = da.suggerimenti.filter(s => !quali(s))
  }
  const query = (s: Suggerimento) => s.luogo?.query ?? ''

  // Alloggi: il primo consigliato in GUIDA.md "Dove dormire" (≤3★, con tripla). Senza coordinate finché non è prenotato.
  const hotelTokyo = Q('Hotel Mystays Asakusa', 'Hotel MyStays Asakusa Tokyo')
  const hotelKanazawa = Q('Mitsui Garden Hotel Kanazawa', 'Mitsui Garden Hotel Kanazawa')
  const hotelKyoto = Q('Travelodge Kyoto Shijo Kawaramachi', 'Travelodge Kyoto Shijo Kawaramachi')
  // Per scelta di Vito i ryokan con onsen di Nikko e di Hakone restano quelli della vecchia app (proposta 9 respinta).
  const hotelOsaka = structuredClone(g(12).alloggio)
  const ryokanNikko = structuredClone(g(4).alloggio)
  const hotelHakone = structuredClone(g(16).alloggio)
  if (!hotelOsaka || !ryokanNikko || !hotelHakone) throw new Error('alloggi di Osaka, Nikko o Hakone mancanti')
  const alloggio = (l: Luogo) => structuredClone(l)

  // Luoghi usati più volte
  const sensoji = L('Senso-ji', 'Senso-ji Temple Asakusa', 35.7148, 139.7967)
  const stazioneKanazawa = L('Stazione di Kanazawa', 'Kanazawa Station', 36.5781, 136.6478)
  const katamachi = L('Katamachi / Korinbo', 'Katamachi Kanazawa', 36.5612, 136.6553)
  const shirakawago = L('Villaggio di Shirakawa-go', 'Shirakawa-go Gassho village', 36.2578, 136.906)
  const togetsukyo = L('Ponte Togetsukyo', 'Togetsukyo Bridge Arashiyama', 35.0129, 135.6778)
  const kawaramachi = L('Kawaramachi', 'Shijo Kawaramachi Kyoto', 35.0038, 135.769)
  const haneda = L('Aeroporto di Haneda', 'Haneda Airport', 35.5494, 139.7798)

  // G0 — domenica 8/8, arrivo
  const arrivo: Giorno = {
    id: 'g-arrivo', cittaId: 'tokyo', titolo: 'Arrivo e prima sera ad Asakusa',
    intro: "Atterraggio alle 14:00: fra immigrazione, bagagli e IC card si esce verso le 15:30, e in hotel si arriva verso le 17 (le 18 da Narita). La sera solo due passi: il jet lag si batte restando svegli fino alle 21-22.",
    note: '', alloggio: alloggio(hotelTokyo), consigli: [], speciale: null,
    avvisi: [
      info('Aeroporto da verificare: da Haneda in hotel verso le 16:30–17:00, da Narita verso le 17:30–18:00.'),
      info('Domenica: Kappabashi e i negozi artigiani sono chiusi.'),
    ],
    suggerimenti: [
      S('opzionale', 'Tramonto sul Sumida', "Facoltativo, se avete ancora energia: il lungofiume con lo Skytree che si accende.", 'Sumida Park Tokyo'),
      S('opzionale', 'Misuji', 'Bagno pubblico (sento) a Kuramae, dalle 15:00, aperto da martedì a domenica, ¥460.', 'Misuji sento Kuramae'),
      S('souvenir', 'Don Quijote Asakusa', 'Snack, KitKat regionali e cosmetici, aperto fino a tardi.', 'Don Quijote Asakusa'),
    ],
    tappe: [
      nuova('t-arrivo-1', '14:00', 'Arrivo in aeroporto', 'spostamento',
        "Immigrazione e bagagli col QR di Visit Japan Web, poi Welcome Suica o Tourist PASMO in aeroporto (su iPhone, Suica nel Wallet) e SIM/eSIM. Da Haneda: Keikyu e Toei Asakusa diretti, 45–50 minuti. Da Narita: Keisei Access Express diretto, circa 65 minuti.",
        structuredClone(haneda),
        { consiglio: 'Se atterrate a Narita, cambiate il luogo di questa tappa.', spostamento: { modo: 'treno', minuti: 60 } }),
      nuova('t-arrivo-2', '17:00', 'Check-in in hotel', 'hotel', "Doccia e due minuti di riposo, niente sonnellini lunghi. Da Narita si arriva verso le 18:00.",
        alloggio(hotelTokyo), { spostamento: { modo: 'piedi', minuti: 10 } }),
      nuova('t-arrivo-6', '18:00', 'Senso-ji di sera', 'visita',
        'Il tempio di notte è aperto, illuminato e senza folla, e fa più fresco. Le bancarelle di Nakamise chiudono verso le 17–18 (da verificare).',
        structuredClone(sensoji), { spostamento: { modo: 'piedi', minuti: 5 } }),
      nuova('t-arrivo-4', '19:00', 'Cena a Hoppy Street', 'cibo', "Izakaya all'aperto con spiedini e birra, senza prenotazione: perfetta per la prima sera.", L('Hoppy Street', 'Hoppy Street Asakusa', 35.7138, 139.7937)),
      nuova('t-arrivo-5', '21:00', 'Konbini e a letto', 'libero', "Acqua, snack e colazione per domattina se l'hotel non la include."),
    ],
  }

  // G1 — lunedì 9/8: Senso-ji presto, Skytree da fuori, Akihabara al chiuso
  const g1 = g(1)
  g1.titolo = 'Asakusa, Skytree e Akihabara'
  g1.alloggio = alloggio(hotelTokyo)
  g1.avvisi = [info("Caldo: fra le 11 e le 16 si sta al chiuso (Solamachi, Akihabara). Controllate l'allerta WBGT.")]
  g1.tappe = [
    rif(g1, 'Senso-ji', '07:30', {
      titolo: 'Kaminarimon e Senso-ji', spostamento: { modo: 'piedi', minuti: 5 },
      descrizione: 'Presto: foto senza folla e 28 °C invece di 34. Il tempio più antico di Tokyo, la porta con la grande lanterna rossa, l\'omikuji (oracolo) e il retro tranquillo.',
    }),
    rif(g1, 'Via Nakamise + Kaminarimon', '09:30', {
      titolo: 'Via Nakamise', spostamento: { modo: 'piedi', minuti: 15 },
      descrizione: 'La via di negozi storici verso il tempio: le bancarelle aprono verso le 9:30–10, è il momento dei souvenir.',
    }),
    rif(g1, 'Sumida Park', '10:00', { spostamento: { modo: 'piedi', minuti: 15 } }),
    senza(rif(g1, 'Tokyo Skytree', '11:00', {
      titolo: 'Tokyo Skytree (da fuori)', consiglio: '',
      descrizione: 'La torre più alta del Giappone (634 m), vista da sotto. La piattaforma (~¥2.100) si può saltare: la vista dall\'alto la fate al Tocho (gratis) e allo Shibuya Sky.',
    }), 'biglietti'),
    rif(g1, 'Pranzo a Solamachi', '12:00', { descrizione: 'Pranzo e negozi al fresco nel centro commerciale alla base della torre: ramen, tonkatsu, sushi e Pokémon Center.' }),
    rif(g1, 'Akihabara', '14:30', { descrizione: 'Tutto al chiuso nelle ore calde: Radio Kaikan, Super Potato e Mandarake Complex. Elettronica, anime, manga, retro-gaming e gachapon su più piani.' }),
    rif(g1, 'Maidreamin (maid cafe)', '18:00', {
      tipo: 'cibo', biglietti: { link: null },
      consiglio: 'Prenotate online. ~¥2.000–3.000 a testa fra consumazione minima e coperto (da verificare).',
    }),
    rif(g1, 'Don Quijote Akihabara', '19:30'),
    rif(g1, 'Cena ad Akihabara', '20:30'),
  ]
  g1.suggerimenti = [
    ...g1.suggerimenti,
    S('souvenir', 'Chopstick Making Tokyo', "Laboratorio all'8° piano del Relink Kaminarimon: vi fate le bacchette in 1 ora, ¥2.000 + ¥1.500 per l'incisione. Va prenotato.", 'Chopstick Making Tokyo Relink Kaminarimon'),
    S('souvenir', 'Ginza Natsuno (Solamachi)', 'Bacchette laccate, col nome inciso in giornata.', 'Ginza Natsuno Tokyo Solamachi'),
    S('souvenir', 'Tansu-ya (Shin-Nakamise)', 'Kimono e yukata usati, yukata da ~¥2.000–5.000.', 'Tansuya Asakusa Shin-Nakamise'),
    S('souvenir', 'Super Potato', 'Retrogaming su più piani vicino al Radio Kaikan, con un piano di giochi giocabili.', 'Super Potato Akihabara'),
    S('souvenir', 'Retro Game Camp + The Dungeon', 'Retrogaming, negozio luminoso e ordinato.', 'Retro Game Camp Akihabara'),
    S('opzionale', 'Kappabashi', 'Oggi, lunedì, è aperta: date un\'occhiata, ma i coltelli compratili l\'ultimo giorno.', 'Kappabashi Dougu Street Tokyo'),
  ]

  // G2 — martedì 10/8: riordinato per il caldo; il Tocho passa al G17
  const g2 = g(2)
  const tocho = tappa(g2, 'Tramonto al Tocho (gratis)')
  g2.titolo = 'Meiji, Harajuku, Shibuya e Shinjuku'
  g2.alloggio = alloggio(hotelTokyo)
  g2.tappe = [
    rif(g2, "Partenza dall'hotel", '07:20', {
      luogo: alloggio(hotelTokyo), spostamento: { modo: 'mezzi', minuti: 40 },
      descrizione: 'Ginza Line fino a Omotesando, poi a piedi fino al santuario. Colazione al konbini.',
    }),
    rif(g2, 'Meiji Jingu', '08:00', { descrizione: "Santuario immerso in una foresta, gratuito: nel bosco ci sono ~5 °C in meno ed è l'ora più fresca.", spostamento: { modo: 'piedi', minuti: 15 } }),
    rif(g2, 'Omotesando', '09:30', {
      titolo: 'Omotesando: Oriental Bazaar e Kiddy Land', spostamento: { modo: 'piedi', minuti: 10 },
      descrizione: "Regali giapponesi all'Oriental Bazaar (apre alle 10:00, chiuso il giovedì) sul viale elegante dei brand. Kiddy Land, giocattoli e personaggi, apre verso le 11:00: passateci per ultimo, prima di Takeshita.",
    }),
    rif(g2, 'Takeshita Street (Harajuku)', '11:30', { descrizione: 'La via dello street style giovane: moda kawaii e dolci colorati. Prima delle 13 è più calma.', spostamento: { modo: 'mezzi', minuti: 10 } }),
    nuova('t2-11', '12:30', 'Pranzo a Shibuya e Shibuya Parco', 'visita',
      'Pranzo, poi al chiuso nelle ore calde: Nintendo Tokyo, Pokémon Center e Capcom Store al 6° piano del Parco, poi Loft e Hands.',
      L('Shibuya Parco', 'Shibuya PARCO', 35.6618, 139.6987), { spostamento: { modo: 'piedi', minuti: 10 } }),
    rif(g2, 'Statua di Hachiko', '15:00'),
    rif(g2, 'Shibuya Crossing', '15:15', {
      descrizione: "L'incrocio pedonale più famoso del mondo: guardatelo dall'alto con un caffè dallo Starbucks Tsutaya (2° piano, meglio prima delle 15), poi attraversatelo.",
    }),
    rif(g2, 'Shibuya Sky', '17:30', {
      descrizione: 'Terrazza panoramica a cielo aperto, vista a 360 gradi sulla città: il tramonto è verso le 18:20.',
      consiglio: 'Prenotate lo slot delle 17:30 appena aprono le vendite: quelli del tramonto finiscono per primi.',
      spostamento: { modo: 'mezzi', minuti: 20 },
    }),
    rif(g2, 'Omoide Yokocho', '19:30', { descrizione: 'Vicoli di minuscole izakaya di yakitori, lanterne e fumo dei grill. Atmosfera retro; portate contanti.' }),
    rif(g2, 'Kabukicho + testa di Godzilla', '20:30'),
    rif(g2, 'Golden Gai', '21:00'),
  ]
  sposta(g(3), g2, s => s.nome === 'Oriental Bazaar (Omotesando)')
  g2.suggerimenti = [
    ...g2.suggerimenti,
    S('souvenir', 'Sakaeya', 'Kimono usati, 5 minuti dalla stazione JR di Harajuku.', 'Sakaeya kimono Harajuku'),
    S('opzionale', 'Shibuya Hikarie 11F Sky Lobby', "Vista gratis dall'alto, ~7:00–24:00.", 'Shibuya Hikarie Sky Lobby'),
    S('opzionale', 'Passerella Mark City ↔ stazione', 'Vista gratis sul Crossing.', 'Shibuya Mark City walkway'),
    S('opzionale', "Magnet by Shibuya 109, Mag's Park", 'Terrazza sul tetto, ¥300–600 (fonti discordanti); chiude spesso per eventi.', 'MAGNET by SHIBUYA109'),
    S('cibo', 'Golden Gai: Albatross G, Ace\'s, Deathmatch in Hell', 'Menu in inglese da Albatross G, niente coperto da Ace\'s, bar horror a ¥666 il drink. Contanti, e niente foto senza chiedere.', 'Golden Gai Shinjuku'),
  ]

  // G3 — mercoledì 11/8, Mountain Day: Tsukiji è chiuso e passa al G18
  const g3 = g(3)
  const tsukiji = tappa(g3, 'Tsukiji Outer Market')
  g3.titolo = 'Palazzo Imperiale, Ginza e teamLab'
  g3.alloggio = alloggio(hotelTokyo)
  g3.avvisi = [
    attenzione('Oggi è mercoledì e festa nazionale (Mountain Day): Tsukiji e Kappabashi sono chiusi. Tsukiji si fa il 26/8. Treni e posti famosi più affollati: tornate presto.'),
    info('I biglietti di teamLab per i festivi finiscono in pochi giorni: prenotate appena aprono.'),
  ]
  g3.tappe = [
    rif(g3, 'Partenza presto per il mercato', '08:30', {
      titolo: "Partenza dall'hotel", luogo: alloggio(hotelTokyo), spostamento: { modo: 'mezzi', minuti: 25 },
      descrizione: 'Toei Asakusa o Ginza Line verso Otemachi: circa 25 minuti. Colazione al konbini o in hotel.',
    }),
    rif(g3, 'Giardini Est del Palazzo Imperiale', '09:00', {
      descrizione: 'Giardini storici con le mura del castello di Edo, tranquilli nel cuore della città. Oggi, festivo, sono aperti e gratis.',
      consiglio: 'Chiusi lunedì e venerdì. La visita guidata gratuita nei festivi quasi certamente non c\'è.',
      spostamento: { modo: 'piedi', minuti: 15 },
    }),
    nuova('t3-8', '10:30', 'Tokyo Station e terrazza del KITTE', 'visita',
      'Terrazza gratuita del KITTE con la vista sulla stazione e sul palazzo; sotto, Gransta e Character Street per i dolci da regalare.',
      L('KITTE Marunouchi', 'KITTE Marunouchi', 35.6795, 139.7649), { spostamento: { modo: 'mezzi', minuti: 10 } }),
    rif(g3, 'Pranzo a Ginza', '12:30', { descrizione: 'Pranzo nel quartiere elegante di Tokyo. Nei festivi Chuo-dori è pedonale (Hokosha Tengoku, ~12:00–18:00, da verificare).' }),
    rif(g3, 'Ginza + Ginza Six', '14:00', {
      titolo: 'Itoya, Ginza Six, Uniqlo e Muji', spostamento: { modo: 'mezzi', minuti: 20 },
      descrizione: "Al fresco nelle ore calde: la cartoleria Itoya su 12 piani (festivi 10:00–19:00), Ginza Six col giardino sul tetto, le sedi principali di Uniqlo e Muji.",
    }),
    rif(g3, 'teamLab Borderless (digital art)', '16:30', {
      consiglio: 'Prenotate subito: nei festivi i biglietti finiscono. Arrivate ~10 minuti prima; servono 2–3 ore.', spostamento: { modo: 'piedi', minuti: 15 },
    }),
    senza(rif(g3, 'Tokyo Tower', '19:00', {
      titolo: 'Tokyo Tower da fuori', spostamento: { modo: 'mezzi', minuti: 15 },
      descrizione: 'La torre rossa illuminata, simbolo classico di Tokyo, a 10 minuti a piedi da Kamiyacho. Salire è un altro biglietto per una vista dall\'alto: basta guardarla da sotto.',
    }), 'biglietti'),
    rif(g3, 'Cena speciale a scelta', '20:00', {
      titolo: 'Cena sotto i binari a Shimbashi', luogo: L('Shimbashi', 'Shimbashi Station Tokyo', 35.6663, 139.7583),
      descrizione: 'Izakaya economici sotto la ferrovia (gado-shita) a Shimbashi o Yurakucho. In alternativa, la cena speciale qui sotto.',
    }),
    nuova('t3-9', '21:30', 'Valigia per Yamato', 'hotel',
      "Preparate la valigia grande per Kyoto e compilate alla reception il modulo Yamato, indirizzato all'hotel di Kyoto: la consegnate domattina prima del treno per Nikko (o stasera, se l'hotel la tiene). Arriva il 13–14/8, ~¥2.000–3.500 a valigia. Fino a Kyoto solo zaino.",
      alloggio(hotelTokyo), { consiglio: "Prima scrivete all'hotel di Kyoto con nome, date e \"luggage arriving\", e fatevelo confermare per iscritto." }),
  ]
  g3.suggerimenti = [
    ...g3.suggerimenti,
    S('souvenir', 'Ginza Natsuno', 'Bacchette con incisione (~¥1.100), Ginza 6-7-4; domenica e festivi 10:00–19:00 (da verificare).', 'Ginza Natsuno Ginza'),
    S('opzionale', 'Kabukiza, biglietto per un atto', 'Biglietto "Makumi" per un solo atto, ¥1.000–2.000, si compra il giorno stesso (da verificare per agosto 2027).', 'Kabukiza Ginza'),
    S('souvenir', 'Tokyo Station: Gransta e Character Street', 'Dolci e souvenir: Tokyo Banana, Ginza no Chocolat.', 'Tokyo Station Gransta'),
  ]

  // G4 — giovedì 12/8: Nikko con la notte al ryokan (la gita in giornata della proposta 9 è respinta)
  const g4 = g(4)
  g4.titolo = 'Templi di Nikko, lago Chuzenji e cascata Kegon'
  g4.alloggio = alloggio(ryokanNikko)
  g4.consigli = g4.consigli.filter(c => !/Autunno/.test(c))
  g4.avvisi = [
    info('La funivia Akechidaira è chiusa da gennaio 2026, almeno fino ad agosto 2027.'),
    info('Non serve il Nikko Pass All Area (¥8.000): in un giorno conviene fare i biglietti singoli.'),
    info('Solo zaino da oggi a Kyoto: la valigia grande parte stamattina con Yamato.'),
  ]
  g4.tappe = [
    nuova('t-nikko-1', '07:50', 'Treno Asakusa → Nikko', 'spostamento',
      'Tobu Spacia X da Asakusa, arrivo a Tobu-Nikko alle 09:39 (posto prenotato; ci sono treni anche prima, da verificare). ¥3.340: il JR Pass non vale.',
      L('Stazione Tobu di Asakusa', 'Tobu Asakusa Station', 35.7115, 139.7982),
      { consiglio: "Prima di uscire, la valigia grande alla reception per Yamato (vedi ieri sera).", biglietti: { link: null }, spostamento: { modo: 'treno', minuti: 110 } }),
    nuova('t4-11', '10:00', 'Zaini al ryokan', 'hotel',
      "Dalla stazione al ryokan sono ~5 minuti di bus o ~25 a piedi: è sulla strada principale verso il ponte Shinkyo. Lasciate gli zaini, il check-in è nel pomeriggio.",
      alloggio(ryokanNikko), { spostamento: { modo: 'piedi', minuti: 10 } }),
    rif(g4, 'Ponte Shinkyo', '10:15', { descrizione: "L'iconico ponte rosso laccato sul fiume Daiya: ¥300 per attraversarlo, gratis guardandolo dal ponte vicino.", spostamento: { modo: 'piedi', minuti: 15 } }),
    rif(g4, 'Nikko Toshogu', '10:45', { consiglio: 'Biglietto ¥1.600. Servono 1,5–2 ore.', spostamento: { modo: 'piedi', minuti: 10 } }),
    rif(g4, 'Tempio Rinno-ji', '12:00', { titolo: 'Rinno-ji Sanbutsudo', descrizione: 'Tempio buddista con la sala dei tre Buddha dorati, ¥400.', spostamento: { modo: 'piedi', minuti: 10 } }),
    rif(g4, 'Santuario Futarasan', '12:30', { descrizione: 'Il santuario più antico di Nikko, tra i cedri. Gratis, giardino ¥300.', spostamento: { modo: 'piedi', minuti: 15 } }),
    rif(g4, 'Pranzo a Nikko', '12:45', { descrizione: 'Pranzo veloce a base di yuba (~¥1.800): in montagna i locali sono pochi e più cari.' }),
    nuova('t4-8', '13:30', 'Bus per il lago Chuzenji', 'spostamento', 'Bus Tobu, ~50 minuti di tornanti, ¥1.250 a tratta.', undefined, { spostamento: { modo: 'mezzi', minuti: 50 } }),
    rif(g4, 'Lago Chuzenji + Cascata Kegon', '14:30', { descrizione: 'Lago di montagna e cascata di 97 m, con l\'ascensore per la base (¥600). Lassù ci sono ~10 °C in meno che in città.', spostamento: undefined }),
    nuova('t4-9', '16:45', 'Bus di rientro a Nikko', 'spostamento',
      'Bus Tobu dal lago fino in paese, ~50 minuti: il ryokan è sulla strada principale fra la stazione e il ponte Shinkyo.', undefined, { spostamento: { modo: 'mezzi', minuti: 50 } }),
    rif(g4, 'Onsen e cena kaiseki', '18:00', { consiglio: 'Check-in verso le 17:45, onsen alle 18:00 e cena kaiseki alle 19:00. Chi ha tatuaggi chieda prima del bagno privato.' }),
  ]
  g4.suggerimenti = [
    ...g4.suggerimenti,
    S('cibo', 'Negozi di yuba sulla strada principale', 'Fra Tobu-Nikko e lo Shinkyo, pranzo ~¥1.800. Molti chiudono alle 15–16 (da verificare). Gyoshintei, vicino al Rinno-ji: da verificare.', 'yuba restaurant Nikko'),
    S('opzionale', 'Kanmangafuchi Abyss', 'Gola con centinaia di statue di Jizo, gratis, 20–30 minuti a piedi dal Rinno-ji. Solo se avanza tempo.', 'Kanmangafuchi Abyss Nikko'),
    S('souvenir', 'Souvenir di Nikko', 'Yuba, legno intagliato Nikko-bori, ghiaccio Himitsu no Kori.', 'Nikko souvenir shop'),
  ]

  // G5 — venerdì 13/8 (Obon): da Nikko a Kanazawa presto, coi posti riservati; Kanazawa alleggerita
  const g5 = g(5)
  const omicho = tappa(g5, 'Mercato Omicho')
  const nagamachi = tappa(g5, 'Quartiere samurai Nagamachi')
  g5.titolo = 'Verso Kanazawa: Omicho, Kenrokuen e Higashi Chaya'
  g5.alloggio = alloggio(hotelKanazawa)
  g5.avvisi = [
    attenzione('Primo giorno di Obon: treni pienissimi. I posti riservati si prenotano il 13/7 alle 03:00 italiane (10:00 in Giappone).'),
    info('Solo zaino fino a Kyoto: la valigia grande viaggia con Yamato.'),
    info('Le "lanterne a Higashi Chaya" non esistono: nessuna fonte trova un evento ad agosto, e la sera il quartiere è solo silenzioso.'),
  ]
  g5.tappe = [
    nuova('t5-9', '07:30', 'Colazione al ryokan', 'cibo', 'Colazione presto e check-out, poi alla stazione JR con lo zaino.', alloggio(ryokanNikko),
      { spostamento: { modo: 'mezzi', minuti: 15 } }),
    nuova('t-kanazawa-1', '08:15', 'Treno Nikko → Kanazawa', 'spostamento',
      "JR Nikko Line fino a Utsunomiya (~45 minuti), Tohoku Shinkansen fino a Omiya, Kagayaki fino a Kanazawa (~2 ore): ~4 ore e 45–5 ore con 2 cambi, ~¥20.500. Arrivo verso le 13:15. Primo giorno di Obon: tutti i posti riservati. Orario del primo treno da verificare.",
      L('Stazione JR di Nikko', 'JR Nikko Station', 36.7479, 139.6187),
      { consiglio: 'Gli orari si controllano su timetables.jreast.co.jp.', biglietti: { link: 'https://www.eki-net.com/en' }, spostamento: { modo: 'treno', minuti: 300 } }),
    rif(g5, 'Partenza e Porta Tsuzumi', '13:15', {
      titolo: 'Porta Tsuzumi e zaini in hotel', tipo: 'hotel', luogo: alloggio(hotelKanazawa), spostamento: { modo: 'piedi', minuti: 10 },
      descrizione: 'Passate sotto la grande porta di legno Tsuzumi-mon e la cupola Motenashi, davanti alla stazione (gratis), poi lasciate gli zaini in hotel.',
    }),
    { ...omicho, ora: '13:45', sera: false, tipo: 'cibo', spostamento: { modo: 'piedi', minuti: 20 },
      descrizione: `${omicho.descrizione} Pranzo tardo col kaisendon (ciotola di pesce crudo): molti banchi chiudono nel primo pomeriggio, e se è tardi si mangia in stazione.` },
    rif(g5, 'Giardino Kenrokuen', '15:00', {
      spostamento: { modo: 'piedi', minuti: 25 },
      descrizione: "Uno dei tre giardini più belli del Giappone, ¥320, in parte all'ombra. Il castello accanto si guarda solo da fuori: gli edifici costano ¥320 e sono ricostruiti.",
    }),
    rif(g5, 'Quartiere geishe Higashi Chaya', '16:30', {
      descrizione: 'Case da tè in legno e botteghe della foglia d\'oro, gelato alla foglia d\'oro. I negozi chiudono verso le 17–18.', spostamento: { modo: 'mezzi', minuti: 15 },
    }),
    rif(g5, 'Cena', '18:00', {
      titolo: 'Cena a Katamachi/Korinbo', luogo: structuredClone(katamachi), spostamento: undefined,
      descrizione: 'La zona della sera di Kanazawa, a ~15 minuti di bus dalla stazione: sushi, tempura e izakaya.',
    }),
  ]
  g5.suggerimenti = [
    ...g5.suggerimenti,
    S('cibo', 'Kaisendon Hirai / Yutaka / Ushioya', 'Kaisendon a Omicho Ichibakan e dintorni. Yutaka apre alle 7:00 ma è chiuso il mercoledì e nei festivi.', 'Omicho Ichibakan Kanazawa'),
    S('cibo', 'Hakuichi Higashiyama', 'Gelato con la foglia d\'oro a Higashi Chaya, ~¥891.', 'Hakuichi Higashiyama Kanazawa'),
    S('souvenir', 'Gold Leaf Sakuda', 'Negozio e laboratorio della foglia d\'oro a Higashi Chaya (orari da verificare).', 'Sakuda Gold Leaf Kanazawa'),
    S('opzionale', 'Case da tè Shima e Kaikaro', 'Visita e tè a Higashi Chaya. Kaikaro può chiudere il martedì.', 'Shima teahouse Higashi Chaya Kanazawa'),
    S('souvenir', 'Hokusando', 'Ceramiche Kutani a Hirosaka, 9:30–18:00, chiuso il lunedì.', 'Hokusando Kanazawa'),
    S('souvenir', 'Kureha', 'Noleggio kimono Kaga Yuzen a Higashi Chaya, da ¥5.500 l\'ora.', 'Kureha kimono rental Kanazawa'),
    S('souvenir', 'Hyakubangai / Anto', 'In stazione: souvenir alla foglia d\'oro e dolci.', 'Kanazawa Hyakubangai Anto'),
  ]

  // G6 — sabato 14/8 (Obon): Shirakawa-go in dettaglio; il Museo del XXI secolo è chiuso
  const g6 = g(6)
  g6.titolo = 'Shirakawa-go e il pomeriggio a Kanazawa'
  g6.alloggio = alloggio(hotelKanazawa)
  g6.avvisi = [
    attenzione('Il Museo del XXI secolo è chiuso per lavori dal 6/5/2027 a marzo 2028.'),
    info('Bus prenotato andata e ritorno. Con tifone o pioggia forte il servizio può essere sospeso.'),
    info('Solo zaino: la valigia grande è già in viaggio per Kyoto.'),
  ]
  g6.tappe = [
    rif(g6, 'Partenza per Shirakawa-go', '08:00', {
      titolo: 'Bus per Shirakawa-go', luogo: structuredClone(stazioneKanazawa), spostamento: { modo: 'mezzi', minuti: 80 },
      descrizione: 'Bus prenotato dal lato ovest della stazione, fermata 2: 75–85 minuti, ¥2.800 a tratta.',
      biglietti: { link: 'https://japanbusonline.com/en/Detail/11900050001/0/4172014/4172014/' },
    }),
    rif(g6, 'Villaggio di Shirakawa-go', '09:30', {
      titolo: 'Ogimachi, Wada-ke e Kanda-ke', spostamento: { modo: 'piedi', minuti: 20 },
      descrizione: "Le case dai tetti di paglia 'gassho-zukuri': il villaggio è gratis, Wada-ke ¥400, Kanda-ke ¥300. 30–32 °C e poca ombra: cappello e acqua.",
    }),
    nuova('t6-3', '11:30', 'Punto panoramico Shiroyama', 'visita', 'La vista classica sul villaggio, gratis (navetta ~¥300, da verificare).',
      L('Shiroyama', 'Shirakawa-go Shiroyama viewpoint', 36.2627, 136.9071), { spostamento: { modo: 'piedi', minuti: 20 } }),
    nuova('t6-4', '12:30', 'Pranzo a Shirakawa-go', 'cibo', 'Pranzo presto: spiedini di manzo Hida e gohei mochi.', structuredClone(shirakawago), { spostamento: { modo: 'piedi', minuti: 10 } }),
    rif(g6, 'Rientro a Kanazawa', '14:30', {
      titolo: 'Bus di ritorno a Kanazawa', luogo: { ...structuredClone(shirakawago), nome: 'Terminal bus di Shirakawa-go' }, spostamento: { modo: 'mezzi', minuti: 85 },
      descrizione: "Bus prenotato insieme all'andata (l'ultimo bus è da verificare).",
    }),
    nuova('t6-5', '16:15', 'Museo D.T. Suzuki', 'visita', "Il museo dedicato al filosofo zen, con lo specchio d'acqua: ¥310, ultimo ingresso alle 16:30. Si può saltare: se il bus tarda, andate dritti a Nagamachi.",
      L('Museo D.T. Suzuki', 'D.T. Suzuki Museum Kanazawa', 36.5583, 136.6612), { spostamento: { modo: 'mezzi', minuti: 15 } }),
    { ...nagamachi, ora: '17:00', sera: false,
      titolo: 'Nagamachi e Nomura-ke', spostamento: { modo: 'piedi', minuti: 10 },
      descrizione: "Vicoli con muri di terra e residenze samurai dell'epoca Edo: le strade sono gratis. La casa Nomura-ke ha orari e prezzo da verificare.",
    },
    nuova('t6-6', '18:30', 'Cena a Katamachi', 'cibo', 'A due passi da Nagamachi: izakaya e locali della sera.', structuredClone(katamachi)),
  ]
  g6.suggerimenti = [
    ...g6.suggerimenti,
    S('opzionale', 'Gassho-zukuri Minka-en', 'Museo all\'aperto delle case col tetto di paglia, ¥600. Si può saltare.', 'Gassho-zukuri Minka-en Shirakawa-go'),
    S('souvenir', 'Sarubobo', 'Bamboline portafortuna nei negozi davanti al parcheggio, ¥500–2.000.', 'Shirakawa-go souvenir shop'),
    S('opzionale', 'Kenrokuen alle 4:00 del mattino', 'Da aprile ad agosto si entra gratis dalle 4:00 alle ~7:00: vale solo se domattina volete un giro all\'alba.', 'Kenrokuen Garden Kanazawa'),
  ]

  // G7 — domenica 15/8 (Obon): Kanazawa → Tsuruga → Kyoto, sera delle tre feste di Nara
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
    intro: "Il 15 agosto è la sera più bella di Nara: 3.000 lanterne accese al Kasuga Taisha, il 大 del Daimonji acceso sul monte Takamado e i lumini del Tōdai-ji, con la finestra aperta sul volto del Grande Buddha.",
    note: '', alloggio: alloggio(hotelKyoto),
    consigli: g10.consigli, speciale: null,
    suggerimenti: [
      ...suggerimentiNara.filter(diNara),
      S('souvenir', 'Naramachi / Higashimuki', 'Souvenir di Nara: kuzu (kuzukiri), narazuke, pennelli e inchiostro sumi, peluche di cervo, kakinoha-zushi.', 'Higashimuki Shopping Street Nara'),
    ],
    avvisi: [
      attenzione('Obon: posti riservati su Shinkansen e Thunderbird, in vendita il 15/7 alle 03:00 italiane (10:00 in Giappone).'),
      info('Stasera a Nara: Kasuga Chūgen Mantōrō dalle 19:00, Nara Daimonji verso le 20:00 (annullato se piove) e Tōdai-ji Mantō Kuyōe. Orari 2027 da verificare.'),
      info("Solo zaino: le valigie spedite con Yamato vi aspettano all'hotel di Kyoto."),
    ],
    tappe: [
      nuova('t-nara-1', '08:30', 'Shinkansen per Tsuruga e Thunderbird per Kyoto', 'spostamento',
        "Hokuriku Shinkansen fino a Tsuruga (~35 minuti), cambio, poi Limited Express Thunderbird fino a Kyoto (~45–53 minuti): da Kanazawa non c'è più un treno diretto. Arrivo verso le 10:45–11:15, posti riservati su tutti e due i treni.",
        structuredClone(stazioneKanazawa), { biglietti: { link: null }, spostamento: { modo: 'treno', minuti: 120 } }),
      nuova('t-nara-2', '11:15', 'Zaini in hotel', 'hotel', 'Lasciate gli zaini (il check-in di solito è dalle 14–15): le valigie spedite con Yamato sono già lì.',
        alloggio(hotelKyoto), {
          consiglio: "Se il treno da Tsuruga è in ritardo, saltate l'hotel e andate dritti a Nara con gli zaini: il Kintetsu parte dalla stazione di Kyoto.",
          spostamento: { modo: 'mezzi', minuti: 20 },
        }),
      nuova('t-nara-3', '12:15', 'Kintetsu per Nara', 'spostamento',
        'Kintetsu Kyoto Line: Express ¥760, 51 minuti; Limited Express ¥1.130–1.490, ~35 minuti, col posto riservato. Arriva a Kintetsu-Nara, accanto al parco.',
        L('Stazione di Kyoto', 'Kyoto Station', 34.9858, 135.7588), { spostamento: { modo: 'treno', minuti: 45 } }),
      { ...tappa(g10, 'Parco di Nara + cervi'), ora: '13:15', descrizione: "I cervi liberi che si inchinano per i biscotti 'shika senbei'. Pranzo leggero vicino al parco.", spostamento: { modo: 'piedi', minuti: 10 } },
      { ...tappa(g10, 'Todai-ji (Grande Buddha)'), ora: '14:00', descrizione: 'Colossale Buddha di bronzo in una delle più grandi strutture in legno al mondo. Di giorno chiude alle 17:00/17:30.', spostamento: { modo: 'piedi', minuti: 10 } },
      { ...tappa(g10, 'Giardino Isuien'), ora: '15:15', consiglio: '', spostamento: { modo: 'piedi', minuti: 20 },
        descrizione: "Elegante giardino con lo 'scenario preso in prestito': inquadra il monte Wakakusa e la porta del Tōdai-ji. Oggi è aperto (chiuso il martedì), ¥1.200 col museo Neiraku." },
      { ...tappa(g10, 'Naramachi (centro storico)'), ora: '16:30', spostamento: { modo: 'piedi', minuti: 5 } },
      { ...cena, ora: '17:30', titolo: 'Cena presto a Nara', sera: false, descrizione: 'Cena presto a Naramachi o vicino alla stazione Kintetsu: dopo si sta in piedi tutta la sera.', spostamento: { modo: 'piedi', minuti: 25 } },
      {
        ...kasuga, ora: '19:00', sera: true, tipo: 'evento', titolo: 'Kasuga Taisha Chūgen Mantōrō', spostamento: { modo: 'piedi', minuti: 15 },
        descrizione: 'Le ~3.000 lanterne di pietra e bronzo del santuario accese tutte insieme, solo il 14 e il 15 agosto. Ingresso al recinto gratis, accesso speciale ¥700. Nel 2025 era 19:00–21:30.',
        consiglio: "Il corridoio interno costa circa 700 ¥ e c'è coda: arrivate entro le 19.",
        ...evento({ nome: 'Kasuga Chūgen Mantōrō', nomeJa: '中元万燈籠', affidabilita: 'probabile', fonte: FONTI.nara }),
      },
      nuova('t-nara-4', '20:00', 'Nara Daimonji Okuribi', 'evento',
        'Il carattere 大 si accende sul monte Takamado: si vede bene dal prato di Tobihino, dove la cerimonia comincia alle 18:50. Annullato se piove. È diverso dal Gozan Okuribi di Kyoto di domani.',
        L('Prato di Tobihino', 'Tobihino Nara Park', 34.6845, 135.844),
        { ...evento({ nome: 'Nara Daimonji Okuribi', nomeJa: '奈良大文字送り火', affidabilita: 'probabile', fonte: FONTI.naraDaimonji }), spostamento: { modo: 'piedi', minuti: 15 } }),
      nuova('t-nara-6', '20:30', 'Tōdai-ji Mantō Kuyōe', 'evento',
        "~2.500 lanterne e la finestra aperta davanti al volto del Grande Buddha; Daibutsuden ~¥800 (da verificare). La folla più grande è fra le 19:00 e le 20:30, dopo è più calmo.",
        L('Tōdai-ji', 'Todai-ji Nara', 34.6889, 135.8398),
        { ...evento({ nome: 'Tōdai-ji Mantō Kuyōe', nomeJa: '東大寺万灯供養会', affidabilita: 'probabile', fonte: FONTI.todaiji }), spostamento: { modo: 'piedi', minuti: 20 } }),
      nuova('t-nara-5', '21:45', 'Rientro a Kyoto', 'spostamento', 'Treni pieni, ma le corse Kintetsu vanno avanti fino a tardi.',
        L('Stazione Kintetsu Nara', 'Kintetsu Nara Station', 34.6843, 135.8279), { spostamento: { modo: 'treno', minuti: 45 } }),
    ],
  }

  // G8 — lunedì 16/8: Kinkaku-ji e Ryōan-ji, Arashiyama e il falò del torii
  const g8 = g(8)
  const seraKyoto = tappa(g8, 'Kawaramachi / Nishiki di sera')
  g8.titolo = "Padiglione d'Oro, Arashiyama e il falò del torii"
  g8.alloggio = alloggio(hotelKyoto)
  g8.avvisi = [
    info("Gozan no Okuribi: da Arashiyama si vede solo il falò del torii (20:20). Il Daimonji (20:00) si vede dal Kyoto Gyoen o dal delta del Kamo. Orari 2027 da verificare."),
    attenzione('Ritorno: treni pienissimi fra le 20:50 e le 22:00. Aspettate 30 minuti sul posto prima di muovervi.'),
  ]
  // Lo spostamento di una tappa porta alla tappa che la segue.
  g8.tappe = [
    rif(g8, 'Partenza', '08:15', { luogo: alloggio(hotelKyoto), spostamento: { modo: 'mezzi', minuti: 45 } }),
    rif(g8, "Kinkaku-ji (Padiglione d'Oro)", '09:00', {
      descrizione: "Il tempio ricoperto di foglia d'oro riflesso nel laghetto: ogni giorno 9:00–17:00, ¥500. ~45 minuti.", spostamento: { modo: 'piedi', minuti: 20 },
    }),
    nuova('t8-5', '10:00', 'Ryōan-ji', 'visita', 'Il giardino di pietre zen, a piedi dal Kinkaku-ji. Poi il Ninna-ji, se avete energia.',
      L('Ryōan-ji', 'Ryoanji Temple Kyoto', 35.0345, 135.7182), { spostamento: { modo: 'mezzi', minuti: 30 } }),
    nuova('t-okuribi-1', '11:30', 'Pausa nelle ore calde', 'libero',
      'A Kyoto a metà agosto si superano i 35°: pranzo e riposo in hotel, la giornata vera è stasera. Per un ramen al fresco, Ramen Koji al 10° piano della stazione.',
      undefined, { spostamento: { modo: 'treno', minuti: 45 } }),
    rif(g8, 'Tempio Tenryu-ji', '15:30', { consiglio: 'Il giardino chiude alle 17:00.', spostamento: { modo: 'piedi', minuti: 5 } }),
    rif(g8, 'Foresta di bambu di Arashiyama', '16:15', { consiglio: 'Verso sera meno gente e meno caldo.', spostamento: { modo: 'piedi', minuti: 15 } }),
    nuova('t-okuribi-6', '16:45', 'Comprare la lanterna', 'visita',
      'La lanterna da affidare al fiume (~¥1.700) va presa almeno 90 minuti prima: finiscono.', structuredClone(togetsukyo), { spostamento: { modo: 'piedi', minuti: 5 } }),
    nuova('t-okuribi-2', '17:30', 'Cena ad Arashiyama', 'cibo', 'Tofu, yudofu e soba lungo il fiume: mangiate presto, dopo c\'è troppa folla.', { ...togetsukyo, nome: 'Arashiyama', query: 'Arashiyama Kyoto' },
      { spostamento: { modo: 'piedi', minuti: 5 } }),
    nuova('t-okuribi-3', '19:00', 'Lanterne sul fiume', 'evento',
      "Migliaia di lanterne affidate alla corrente del Katsura per accompagnare gli spiriti dell'Obon, fra il Tōgetsukyō e Nakanoshima, 19:00–21:00.",
      structuredClone(togetsukyo), evento({ nome: 'Arashiyama Tōrō Nagashi', nomeJa: '嵐山灯籠流し', affidabilita: 'probabile', fonte: FONTI.arashiyama })),
    nuova('t-okuribi-4', '20:20', 'Falò a forma di torii', 'evento',
      "L'ultimo dei cinque falò dell'Okuribi, sul monte Mandara, proprio sopra il fiume: si vede dal ponte e dal parco. Da qui gli altri falò non si vedono bene.",
      structuredClone(togetsukyo), { ...evento({ nome: 'Gozan no Okuribi', nomeJa: '五山送り火', affidabilita: 'probabile', fonte: FONTI.okuribi }), spostamento: { modo: 'treno', minuti: 50 } }),
    nuova('t-okuribi-5', '21:00', 'Attendere 30 minuti, poi rientro', 'spostamento',
      'Fra le 20:50 e le 22:00 i treni sono pienissimi: aspettate mezz\'ora sul posto, poi Randen o JR Sagano Line.', alloggio(hotelKyoto)),
  ]
  g8.suggerimenti = [
    ...g8.suggerimenti,
    S('opzionale', 'Variante: il Daimonji dal Kyoto Gyoen', "Se volete il 大 delle 20:00 invece di Arashiyama: dal Kyoto Gyoen si vedono Daimonji e Hidari Daimonji; anche Yoshida-jinja o il delta del Kamo a Demachiyanagi (pieno dalle 18:30). Arashiyama passerebbe al G10.", 'Kyoto Gyoen National Garden'),
    S('opzionale', 'Hirosawa-no-ike', 'Alternativa più tranquilla per il falò del torii, al tempio Henjō-ji: lanterne ~¥1.000.', 'Hirosawa Pond Kyoto'),
    S('cibo', 'Ramen Koji', 'Al 10° piano della stazione di Kyoto: ramen da ¥900–1.500, al fresco, per la pausa.', 'Kyoto Ramen Koji'),
    S('opzionale', 'Skyway della stazione di Kyoto', 'Passerella gratuita in alto; una fonte dice che da lì si vede il Daimonji.', 'Kyoto Station Skyway'),
  ]

  // G9 — martedì 17/8: Fushimi Inari all'alba, Nishiki e Aritsugu (domani chiusi), Gion la sera
  const g7 = g(7)
  const g9 = g(9)
  const nishiki = tappa(g9, 'Nishiki Market')
  g7.titolo = "Fushimi Inari all'alba, Higashiyama, Nishiki e Gion"
  g7.alloggio = alloggio(hotelKyoto)
  g7.avvisi = [info('Oggi non fate il castello di Nijō (palazzo chiuso il martedì di agosto) né il Nintendo Museum (chiuso): il Nijō è domani.')]
  g7.tappe = [
    rif(g7, 'Partenza presto per Fushimi Inari', '05:40', {
      titolo: "Partenza all'alba per Fushimi Inari", luogo: alloggio(hotelKyoto), spostamento: { modo: 'treno', minuti: 15 },
      descrizione: 'Keihan da Gion-Shijō, ~10 minuti: alle 6 i torii sono quasi vuoti e fa fresco.',
    }),
    rif(g7, 'Fushimi Inari Taisha', '06:00', {
      descrizione: 'Le infinite porte torii vermiglie, aperte 24 ore e gratis: dalle 8:30 è pieno e fa caldo. Il giro principale dura 1,5–2 ore, fino in cima 2,5–3.',
    }),
    rif(g7, 'Kiyomizu-dera', '09:00', {
      descrizione: 'Tempio con la terrazza di legno sospesa e la vista su Kyoto; cascata Otowa dei tre desideri. Salite dalla Gojōzaka, la strada dei ceramisti. Apre alle 6:00 (¥500, da verificare).',
    }),
    rif(g7, 'Sannenzaka e Ninenzaka', '11:00'),
    nuova('t7-7', '12:30', 'Pausa in hotel', 'libero', 'Le ore più calde al fresco: pranzo e riposo.', undefined, { spostamento: { modo: 'piedi', minuti: 15 } }),
    { ...nishiki, ora: '15:00', sera: false, titolo: 'Nishiki Market e coltelli Aritsugu', spostamento: { modo: 'piedi', minuti: 5 },
      descrizione: "'La cucina di Kyoto': vicolo coperto di street food, assaggi da ¥200–500. Da Aritsugu coltelli col nome inciso (ultimo ingresso 16:30, gyuto ¥8.000–25.000). Oggi sono aperti: domani, mercoledì, chiusi." },
    nuova('t7-9', '16:30', 'Teramachi', 'visita', 'Strade coperte di negozi (Teramachi e Shinkyōgoku), aperte fino alle ~20:00: matcha, incenso, ventagli.',
      L('Teramachi', 'Teramachi Shopping Street Kyoto', 35.0058, 135.7677), { spostamento: { modo: 'piedi', minuti: 15 } }),
    nuova('t7-10', '17:00', 'Yukata a noleggio', 'visita',
      'Ad agosto solo yukata (più fresco del kimono), prenotato online: Yumeyakata da ¥4.180, Kanwa Kimono da ¥3.300, Waraku ¥4.600 (promo 2027 da verificare), Okamoto.',
      undefined, { biglietti: { link: null }, spostamento: { modo: 'piedi', minuti: 10 } }),
    rif(g7, 'Santuario Yasaka + Gion', '17:30', { titolo: 'Santuario Yasaka', descrizione: "Il santuario delle lanterne all'ingresso di Gion, bello quando cala il sole.", spostamento: { modo: 'piedi', minuti: 5 } }),
    rif(g7, 'Gion di sera', '18:00', {
      titolo: 'Gion, Shirakawa e Hanamikoji', spostamento: { modo: 'piedi', minuti: 10 },
      descrizione: 'Le case da tè illuminate, il canale di Shirakawa e Hanamikoji: con fortuna vedete una geiko o una maiko diretta a un appuntamento.',
    }),
    rif(g7, 'Pontocho', '19:30', {
      descrizione: 'Lo stretto vicolo lungo il fiume Kamo, pieno di ristoranti con lanterne: cena sulla terrazza sul fiume (kawayuka). Il martedì si trova posto. Da ¥6.000–8.000, oppure i locali economici qui sotto.',
    }),
  ]
  sposta(g9, g7, s => query(s).includes('Nishiki'))
  g7.suggerimenti = [
    ...g7.suggerimenti,
    S('souvenir', 'Kyoto Ceramic Center, Asahidō', 'Ceramica Kiyomizu-yaki sulla Gojōzaka, 9:00–18:00, una tazza da ~¥1.000 (stima).', 'Asahido Kyoto Gojozaka'),
    S('souvenir', 'Shōyeidō Sanneizaka', 'Incensi, bastoncini da ¥500.', 'Shoyeido Sanneizaka Kyoto'),
    S('souvenir', 'Kanwa Kimono', 'Yukata a noleggio vicino al Kiyomizu, da ¥3.300.', 'Kanwa Kimono Kiyomizu Kyoto'),
    S('cibo', 'Assaggi di Nishiki', 'Konnamonja (ciambelline al latte di soia), Miki Keiran (tamagoyaki), Kari Kari Hakase (takoyaki): da ¥200–500.', 'Nishiki Market Kyoto'),
    S('souvenir', 'Yaya', 'Kimono usati in seta a Gion, da ~¥6.000.', 'Yaya kimono Gion Kyoto'),
    S('cibo', 'Kappa Sushi Pontocho e Ponto', 'Terrazze sul fiume senza prenotazione.', 'Kappa Sushi Pontocho Kyoto'),
    S('cibo', 'Baan Rimnaam', 'Cucina thai sulla terrazza di Pontocho, pranzo da ¥2.000.', 'Baan Rimnaam Pontocho Kyoto'),
  ]

  // G10 — mercoledì 18/8: Higashiyama nord e Nijō (Nishiki e Aritsugu sono chiusi)
  g9.titolo = 'Higashiyama nord e castello di Nijō'
  g9.alloggio = alloggio(hotelKyoto)
  g9.avvisi = [info('Mercoledì: Nishiki e i coltelli Aritsugu sono in gran parte chiusi (li avete fatti ieri). Il castello di Nijō invece oggi è aperto.')]
  g9.tappe = [
    nuova('t9-4', '08:30', 'Ginkaku-ji', 'visita', "Il Padiglione d'Argento e il suo giardino di sabbia, 8:30–17:00, ¥500.",
      L('Ginkaku-ji', 'Ginkakuji Temple Kyoto', 35.027, 135.7982), { spostamento: { modo: 'piedi', minuti: 5 } }),
    nuova('t9-5', '09:30', 'Sentiero della Filosofia', 'visita', 'La passeggiata lungo il canale fra i templi di Higashiyama nord, all\'ombra degli alberi.',
      L('Sentiero della Filosofia', "Philosopher's Path Kyoto", 35.023, 135.7945), { spostamento: { modo: 'piedi', minuti: 30 } }),
    nuova('t9-6', '10:30', 'Nanzen-ji e Heian Jingū', 'visita', "L'acquedotto in mattoni Suirokaku del Nanzen-ji (gratis) e il grande torii dell'Heian Jingū (giardino esterno gratis).",
      L('Nanzen-ji', 'Nanzenji Temple Kyoto', 35.011, 135.7944), { spostamento: { modo: 'piedi', minuti: 15 } }),
    nuova('t9-7', '12:00', 'Pranzo e pausa', 'cibo', 'Pranzo a Okazaki o a Gion, poi riposo nelle ore calde.', undefined, { spostamento: { modo: 'mezzi', minuti: 30 } }),
    nuova('t9-8', '14:30', 'Castello di Nijō', 'visita', 'La residenza degli shogun col palazzo Ninomaru e i suoi giardini. Il mercoledì è aperto: il martedì di agosto il palazzo è chiuso.',
      L('Castello di Nijō', 'Nijo Castle Kyoto', 35.0142, 135.7481), { spostamento: { modo: 'piedi', minuti: 15 } }),
    nuova('t9-9', '16:30', 'Incensi da Shōyeidō', 'visita', 'La sede storica dell\'incenso a Karasuma-Nijō, vicino al castello, 9:00–18:00: bastoncini da ¥500.',
      L('Shōyeidō', 'Shoyeido Incense Kyoto Karasuma Nijo', 35.0137, 135.7594), { spostamento: { modo: 'mezzi', minuti: 15 } }),
    rif(g9, 'Cena tradizionale a Pontocho', '18:30', {
      titolo: 'Cena a Kawaramachi', luogo: structuredClone(kawaramachi),
      descrizione: 'Giro serale fra Shinkyōgoku e Teramachi (aperte fino alle ~20:00), poi cena a Kawaramachi.',
    }),
  ]
  g9.suggerimenti = [
    ...g9.suggerimenti,
    S('opzionale', 'Variante A: Fushimi e Uji', 'Al posto della mattina: 09:30 Gekkeikan Okura Sake Museum (¥600 con 3 assaggi; chiuso 13–16/8, il 18 è aperto), Keihan per Uji, matcha da Nakamura Tokichi Honten e il Byōdō-in (¥600–700, interno +¥300).', 'Gekkeikan Okura Sake Museum Kyoto'),
    S('opzionale', 'Variante Nintendo Museum', 'Solo se vincete la lotteria di maggio: 10:00–20:00, ¥3.300, il mercoledì è aperto. Servono 2–3 ore.', 'Nintendo Museum Uji'),
    S('souvenir', 'Ichihara Heibei Shōten', 'Bacchette fatte a mano dal 1764, ~400 modelli, su Sakaimachi-dori appena a sud di Shijō.', 'Ichihara Heibei Shoten Kyoto'),
    S('souvenir', 'Kamiji Kakimoto, filiale Fuyachō', 'Washi (carta giapponese), 9:30–17:00, chiuso lunedì e festivi.', 'Kamiji Kakimoto Fuyacho Kyoto'),
    S('opzionale', 'Shōyeidō Kunjyukan', "Museo dell'incenso, 10:00–17:00. La visita alla fabbrica si prenota 1 settimana prima.", 'Shoyeido Kunjyukan Kyoto'),
    S('cibo', 'Ponshya Santoku', 'Izakaya aperta fino alle 5 del mattino.', 'Ponshya Santoku Kyoto'),
  ]

  // G11 — giovedì 19/8: Kurama prima, pranzo realistico
  const kurama: Giorno = {
    id: 'g-kurama', cittaId: 'kyoto', titolo: 'Kurama e Kibune, in montagna sopra Kyoto',
    intro: "Mezz'ora di treno e dieci gradi in meno: il tempio di Kurama fra i cedri, il sentiero nel bosco e il pranzo sopra il torrente di Kibune.",
    note: '', alloggio: alloggio(hotelKyoto), consigli: [], speciale: null,
    avvisi: [info("Alternativa: Uji (Byōdō-in e matcha). Se preferite, cambiate il giorno dall'app.")],
    suggerimenti: [
      S('cibo', 'Hirobun', 'Spaghettini somen che scendono in un canale di bambù, maggio–settembre, ~11:00–16:00, senza prenotazione, contanti.', 'Hirobun Kibune'),
      S('opzionale', 'Delta del Kamo', 'Sassi da attraversare sul fiume a Demachiyanagi, gratis.', 'Kamo River Delta Demachiyanagi'),
      S('cibo', 'Honke Daiichi Asahi', 'Ramen shoyu-tonkotsu vicino alla stazione di Kyoto, 6:00–1:00, coda dalle 11.', 'Honke Daiichi Asahi Kyoto'),
    ],
    tappe: [
      nuova('t-kurama-1', '08:15', 'Treno Eizan per Kurama', 'spostamento', 'Da Demachiyanagi a Kurama, ~30 minuti, ¥470, ogni 15–20 minuti. Non è coperto dal JR Pass.',
        L('Stazione di Demachiyanagi', 'Demachiyanagi Station', 35.0305, 135.7727), { spostamento: { modo: 'treno', minuti: 30 } }),
      nuova('t-kurama-2', '09:00', 'Tempio Kurama-dera', 'visita', 'Tempio sulla montagna fra cedri giganti, ¥500: funicolare per il primo tratto (~¥200, da verificare), poi scalinate.',
        L('Kurama-dera', 'Kurama-dera', 35.118, 135.7713), { spostamento: { modo: 'piedi', minuti: 60 } }),
      nuova('t-kurama-3', '09:45', 'Sentiero da Kurama a Kibune', 'visita', "~1 ora nel bosco fra radici e piccoli santuari, ripido: scarpe comode, acqua e cappello.",
        L('Sentiero Kurama–Kibune', 'Kurama Kibune hiking trail', 35.1203, 135.7667), { spostamento: { modo: 'piedi', minuti: 5 } }),
      nuova('t-kurama-4', '11:00', 'Pranzo sul fiume a Kibune', 'cibo',
        'Il nagashi somen da Hirobun (~¥1.500–2.000, contanti): apre alle 11:00, non prende prenotazioni, si ritira il numero e la coda arriva a 2 ore; annullato se piove. Oppure la kawadoko col kaiseki (¥4.000–8.000), da prenotare.',
        L('Kawadoko di Kibune', 'Kibune kawadoko', 35.1195, 135.7637), { consiglio: 'Per il kaiseki serve prenotare; il nagashi-sōmen di Hirobun si fa in coda.', spostamento: { modo: 'piedi', minuti: 10 } }),
      nuova('t-kurama-5', '13:30', 'Santuario Kibune', 'visita', "La scalinata di lanterne rosse e l'omikuji che si legge immergendolo nell'acqua. Gratis.",
        L('Santuario Kibune', 'Kibune Shrine', 35.1219, 135.7629), { spostamento: { modo: 'treno', minuti: 45 } }),
      nuova('t-kurama-6', '15:30', 'Rientro e riposo', 'libero', 'Bus fino alla stazione di Kibuneguchi, poi Eizan fino a Demachiyanagi.'),
      { ...seraKyoto, ora: '18:30', sera: true, titolo: 'Kawaramachi, Teramachi o Pontocho',
        descrizione: 'Cena e giro serale fra Kawaramachi, Teramachi/Shinkyōgoku e Pontocho, lungo il fiume. Nishiki la sera è chiuso: i negozi chiudono alle 17–18.' },
    ],
  }

  // G12 — venerdì 20/8: Kyoto → Osaka, Doguyasuji al posto di Dotonbori sotto il sole
  const g12 = g(12)
  g12.titolo = 'Castello, Kuromon, Doguyasuji e Dotonbori'
  g12.tappe = [
    nuova('t-osaka-1', '08:30', 'Treno Kyoto → Osaka e bagagli in hotel', 'spostamento',
      "Keihan da Gion-Shijō fino a Yodoyabashi e metro Midosuji per Namba; oppure JR Special Rapid fino a Osaka (~30 minuti, ¥580) o Hankyu (~¥410). Valigie all'Hotel Forza: deposito gratis, check-in dalle 14:00.",
      L('Stazione di Gion-Shijō', 'Gion-Shijo Station', 35.0036, 135.7722), { spostamento: { modo: 'treno', minuti: 50 } }),
    rif(g12, 'Partenza per il castello', '09:30'),
    rif(g12, 'Castello di Osaka', '10:00', { descrizione: 'Castello nel parco (gratis), col museo nel mastio (¥1.200) e la vista dall\'alto. In estate il sito ufficiale consiglia di arrivare presto.' }),
    rif(g12, 'Mercato Kuromon', '12:30', {
      titolo: 'Pranzo al mercato Kuromon', tipo: 'cibo',
      descrizione: '150 banchi di pesce, wagyu e frutta: pranzo a morsi. Chiude verso le 17 e molti banchi vogliono contanti.',
      consiglio: 'Mettetevi in coda dove la fanno i giapponesi, e chiedete il prezzo prima dello spiedino di wagyu.',
    }),
    nuova('t12-6', '14:00', 'Check-in e riposo', 'hotel', 'Le ore più calde in camera: il check-in è dalle 14:00.', structuredClone(hotelOsaka), { spostamento: { modo: 'piedi', minuti: 10 } }),
    nuova('t12-7', '16:30', 'Sennichimae Doguyasuji', 'visita',
      "La via coperta degli utensili da cucina: coltelli, ceramiche, cibo finto. Si entra dal Namba Grand Kagetsu. I negozi chiudono alle 18:00–18:30: non andateci dopo cena.",
      L('Sennichimae Doguyasuji', 'Sennichimae Doguyasuji Shopping Street', 34.6643, 135.5048), { spostamento: { modo: 'piedi', minuti: 10 } }),
    nuova('t12-8', '17:45', 'Hozenji Yokocho', 'visita', 'Il vicolo lastricato col Fudō Myōō coperto di muschio.',
      L('Hozenji Yokocho', 'Hozenji Yokocho Osaka', 34.6681, 135.5031), { spostamento: { modo: 'piedi', minuti: 5 } }),
    rif(g12, 'Dotonbori illuminata', '18:30', {
      descrizione: "Di sera Dotonbori esplode di luci riflesse nel canale: l'insegna Glico, il ponte Ebisu. Cena da Mizuno (okonomiyaki, Bib Gourmand): niente prenotazioni, coda fino a 1 ora.",
    }),
    rif(g12, 'Giro per Namba e Shinsaibashi', '20:30'),
  ]
  g12.suggerimenti = [
    ...g12.suggerimenti,
    S('souvenir', 'Sakai Ichimonji Mitsuhide', 'Coltelli di Sakai e affilatura, a Doguyasuji, aperto fino alle 18:30.', 'Sakai Ichimonji Mitsuhide Doguyasuji'),
    S('souvenir', 'Osaka Shikki', 'Lacca a Doguyasuji: ciotole e bacchette, 10:00–18:00.', 'Osaka Shikki Doguyasuji'),
    S('opzionale', 'Design Pocket', 'Laboratorio di cibo finto a Nanbasennichimae, ¥2.980, ~1 ora.', 'Design Pocket Osaka'),
    S('cibo', 'Kuromon: Entoki Maguro e Kuromon Sanpei', 'Tonno al banco da Entoki Maguro (¥500–1.500), posti a sedere da Kuromon Sanpei, ostriche all\'ingresso est.', 'Kuromon Market Osaka'),
    S('cibo', 'Takoyaki Doraku Wanaka e Takoya Dotonbori Kukuru', 'Takoyaki da ~¥650 per 8 da Wanaka; il "bikkuri takoyaki" da Kukuru.', 'Takoyaki Doraku Wanaka Dotonbori'),
    S('cibo', '551 Horai', 'Panini al vapore col maiale, sede principale a Namba: si trovano solo nel Kansai.', '551 Horai Namba'),
  ]

  // G13 — sabato 21/8: mercatino del Shitenno-ji e niente buco nel pomeriggio
  const g13 = g(13)
  const g14 = g(14)
  g13.titolo = 'Mercatino del Shitenno-ji, Shinsekai, Tenjinbashi-suji e tramonto a Umeda'
  g13.avvisi = [info('Il mercatino del Shitenno-ji si tiene il 21 e il 22 del mese: c\'è anche domani, più tranquillo.')]
  g13.consigli = [...g13.consigli, 'Se la giornata è troppo piena, togliete il museo o Nakazakicho.']
  g13.tappe = [
    rif(g14, 'Shitenno-ji', '08:30', {
      titolo: 'Shitenno-ji, giorno del mercatino', spostamento: { modo: 'mezzi', minuti: 15 },
      descrizione: 'Il più antico tempio buddista del Giappone (593 d.C.), con la pagoda a cinque piani. Oggi, 21 del mese, c\'è il mercatino dell\'antiquariato e dell\'usato (~8:30–16:00, area mercato gratis); il tempio costa ~¥300 (da verificare).',
    }),
    rif(g13, 'Shinsekai e Tsutenkaku', '11:00', {
      spostamento: { modo: 'piedi', minuti: 5 },
      descrizione: "Quartiere retro anni '50 con la torre Tsutenkaku. Pranzo da Kushikatsu Daruma, la sede storica (11:00–22:30): la salsa non si intinge due volte.",
    }),
    nuova('t13-3', '12:30', 'Tower Knives', 'visita', 'Coltelli con personale che parla inglese e confezione regalo, 1-4-7 Ebisu-higashi: è a Shinsekai, non a Doguyasuji.',
      L('Tower Knives', 'Tower Knives Osaka Shinsekai', 34.653, 135.5058), { spostamento: { modo: 'mezzi', minuti: 20 } }),
    nuova('t13-4', '13:30', 'Tenjinbashi-suji', 'visita', 'Metro Sakaisuji diretta a Tenjimbashisuji 6-chome: 2,6 km di strada coperta, 600–800 negozi fino all\'Osaka Tenmangu. Gratis e ventilata nelle ore calde.',
      L('Tenjinbashi-suji', 'Tenjinbashisuji Shopping Street', 34.7103, 135.5114), { spostamento: { modo: 'piedi', minuti: 5 } }),
    nuova('t13-5', '16:00', 'Osaka Museum of Housing and Living', 'visita', 'Le case di Osaka di un tempo ricostruite al chiuso (orari e prezzi da verificare).',
      L('Osaka Museum of Housing and Living', 'Osaka Museum of Housing and Living', 34.7103, 135.5114), { spostamento: { modo: 'mezzi', minuti: 15 } }),
    nuova('t13-6', '17:00', 'Nakazakicho', 'visita', 'Case antiche con caffè e negozi vintage, 10 minuti a piedi da Umeda (locali precisi da verificare).',
      L('Nakazakicho', 'Nakazakicho Osaka', 34.707, 135.5046), { spostamento: { modo: 'piedi', minuti: 15 } }),
    rif(g13, 'Umeda Sky Building', '18:15', {
      titolo: 'Umeda Sky Building, Floating Garden al tramonto',
      descrizione: "Grattacielo col 'Floating Garden' panoramico (~¥2.000): il tramonto è verso le 18:30 (da verificare), poi la città che si accende. Cena a Umeda.",
    }),
  ]
  g13.suggerimenti = [
    ...g13.suggerimenti,
    S('opzionale', 'Variante: Tōji Kōbō-san a Kyoto', 'Mercatino del 21 del mese al Tōji (~7:00–16:00: usato, tessuti, kimono). Al mattino al posto del Shitenno-ji, che si fa domani.', 'Toji Temple Kyoto'),
  ]

  // G14 — domenica 22/8: Sumiyoshi presto, Den Den Town, Amerikamura
  g14.titolo = 'Sumiyoshi, Den Den Town e Amerikamura'
  g14.tappe = [
    rif(g14, 'Partenza', '07:30', { descrizione: 'Treno Nankai da Namba verso il sud della città.', spostamento: { modo: 'treno', minuti: 20 } }),
    rif(g14, 'Sumiyoshi Taisha', '08:00', { descrizione: 'Uno dei santuari più antichi del Giappone, col celebre ponte rosso ad arco (Sorihashi). Gratis: alle 8 è più fresco.' }),
    rif(g14, 'Den Den Town (pranzo + otaku)', '10:30', {
      titolo: 'Den Den Town e Super Potato Retro-kan', tipo: 'visita',
      descrizione: "L'Akihabara di Osaka: anime, manga, figure e il retrogaming di Super Potato Retro-kan (domenica 10:00–20:00; indirizzo da verificare). Pranzo in zona.",
    }),
    nuova('t14-5', '13:30', 'Riposo in hotel', 'hotel', 'Nipponbashi è a 5 minuti: le ore calde in camera.', structuredClone(hotelOsaka), { spostamento: { modo: 'piedi', minuti: 15 } }),
    nuova('t14-6', '15:30', 'Amerikamura e Orange Street', 'visita', 'Il polo del vintage di Osaka, con sneaker e vinili; su Orange Street (Tachibana-dori) vintage più curato e mobili d\'epoca.',
      L('Amerikamura', 'Amerikamura Osaka', 34.6718, 135.4983), { spostamento: { modo: 'piedi', minuti: 10 } }),
    rif(g14, 'Ultimi acquisti a Shinsaibashi', '18:00'),
  ]
  g14.suggerimenti = [
    ...g14.suggerimenti.filter(s => s.nome !== 'Umeda Sky Building' && s.nome !== 'Shinsekai e Tsutenkaku'),
    S('souvenir', 'JAM Horie', 'Vintage a Minami-Horie (2-4-17), 11:00–20:00, chiusure irregolari.', 'JAM Horie Osaka'),
    S('cibo', 'Pablo', 'Cheese tart a Shinsaibashi.', 'Pablo Shinsaibashi'),
    S('cibo', 'Rikuro Ojisan', 'Cheesecake a Namba (anche dentro i varchi Shinkansen di Shin-Osaka).', 'Rikuro Ojisan Namba'),
    S('opzionale', 'Mercatino del Shitenno-ji', 'C\'è anche oggi, 22 del mese, più tranquillo di ieri.', 'Shitennoji temple Osaka'),
  ]

  // G15 — lunedì 23/8: Himeji al mattino, manzo di Kobe a pranzo, Kitano più tardi
  const himeji: Giorno = {
    id: 'g-himeji', cittaId: 'osaka', titolo: 'Himeji al mattino, Kobe nel pomeriggio',
    intro: 'Il castello più bello del Giappone, originale del 1600, aperto da poco; a pranzo il manzo di Kobe, che a mezzogiorno costa meno della metà, e la sera il porto. Si dorme ancora a Osaka.',
    note: '', alloggio: structuredClone(hotelOsaka), consigli: [], speciale: null,
    avvisi: [info('Jizō-bon: la sera, feste di quartiere per i bambini nelle vie di Osaka.')],
    suggerimenti: [
      S('cibo', 'Kobe Tanryu (Kissho)', 'Manzo di Kobe, pranzi da ~¥3.800: è il piano B.', 'Kobe Tanryu Sannomiya'),
      S('souvenir', 'Biscotti Fugetsudo', 'Il souvenir classico di Kobe.', 'Kobe Fugetsudo Motomachi'),
      S('opzionale', 'Municipio di Kobe, 24° piano', 'Vista gratis dall\'alto (orari da verificare).', 'Kobe City Hall observation lobby'),
    ],
    tappe: [
      nuova('t-himeji-1', '07:45', 'Treno per Himeji', 'spostamento', 'JR Special Rapid da Osaka, 60–65 minuti (~¥1.490–1.520), poi 15 minuti a piedi.',
        L('Stazione di Osaka', 'Osaka Station', 34.7025, 135.4959), { spostamento: { modo: 'treno', minuti: 65 } }),
      nuova('t-himeji-2', '09:00', 'Castello di Himeji', 'visita', "L'Airone Bianco, patrimonio UNESCO: ¥2.500 (col Kōko-en ¥2.600). Dentro si va in calzini, fa caldo e le scale sono ripide.",
        L('Castello di Himeji', 'Himeji Castle', 34.8394, 134.6939), { consiglio: "Entrate all'apertura: dentro non c'è aria condizionata.", biglietti: { link: 'https://www.himejicastle.jp/en/' }, spostamento: { modo: 'piedi', minuti: 5 } }),
      nuova('t-himeji-3', '10:45', 'Giardino Kōko-en', 'visita', 'Nove giardini del periodo Edo ai piedi del castello, con laghetti di carpe.',
        L('Giardino Kōko-en', 'Koko-en Garden Himeji', 34.8379, 134.6906), { spostamento: { modo: 'piedi', minuti: 15 } }),
      nuova('t-himeji-4', '11:45', 'Ekisoba', 'cibo', 'Lo spuntino di Himeji: la soba servita sul binario (locale da verificare).',
        L('Stazione di Himeji', 'Himeji Station', 34.8267, 134.6904)),
      nuova('t-himeji-9', '12:15', 'Treno per Kobe Sannomiya', 'spostamento', 'JR fino a Sannomiya, 40–50 minuti.', undefined, { spostamento: { modo: 'treno', minuti: 45 } }),
      nuova('t-himeji-7', '13:30', 'Pranzo col manzo di Kobe', 'cibo',
        "Teppanyaki da Steakland Kobe-kan, a 1 minuto dall'uscita ovest di Hankyu Sannomiya: ¥3.500–4.900 per 150 g, mentre a cena si spendono ¥9.000–13.000. Ultimo ordine alle 14:00 nei feriali, senza prenotazione.",
        L('Sannomiya', 'Sannomiya Kobe', 34.6946, 135.1956), { consiglio: 'Piano B: Kobe Tanryu, pranzi da ~¥3.800.', spostamento: { modo: 'piedi', minuti: 15 } }),
      nuova('t-himeji-10', '15:00', 'Nankinmachi e Motomachi', 'visita', 'La Chinatown di Kobe e la strada coperta di Motomachi, gratis e in parte al fresco.',
        L('Nankinmachi', 'Nankinmachi Kobe', 34.6879, 135.188), { spostamento: { modo: 'mezzi', minuti: 20 } }),
      nuova('t-himeji-5', '16:30', 'Kitano Ijinkan', 'visita', "Il quartiere sulla collina con le case dei mercanti stranieri dell'Ottocento: entrate in una sola villa, il Kobe Kitano Museum (¥500) o il Foreigner's Club (¥550).",
        L('Kitano Ijinkan', 'Kitano Ijinkan Kobe', 34.7003, 135.1904), { spostamento: { modo: 'mezzi', minuti: 20 } }),
      nuova('t-himeji-6', '18:30', 'Harborland al tramonto', 'visita', 'Il lungomare di Meriken Park con la Port Tower rossa illuminata: la vista è gratis.',
        L('Harborland', 'Kobe Harborland', 34.6793, 135.183), { spostamento: { modo: 'treno', minuti: 45 } }),
      nuova('t-himeji-8', '20:15', 'Rientro a Osaka', 'spostamento', 'Linea Hanshin da Sannomiya a Namba, ~40–45 minuti (treno diretto da verificare).', structuredClone(hotelOsaka)),
      nuova('t-himeji-11', '21:15', 'Valigie a Yamato', 'hotel',
        "Consegnate le valigie alla reception per Yamato, indirizzate all'hotel di Tokyo del 25/8: a Hakone si va con lo zaino.",
        structuredClone(hotelOsaka), { consiglio: "Prima scrivete all'hotel di Tokyo con nome, date e \"luggage arriving\", e fatevelo confermare per iscritto." }),
    ],
  }

  // G16 — martedì 24/8: Hakone in ordine col Freepass da Odawara
  const g16 = g(16)
  const bagnoSera = tappa(g16, 'Bagno serale cena kaiseki')
  g16.titolo = "Da Osaka a Hakone: museo all'aperto, Owakudani e lago Ashi"
  g16.intro = "Mattina in Hikari fino a Odawara, zaini al ryokan e poi il giro ad anello col Freepass: museo all'aperto, la valle vulcanica di Owakudani, la nave pirata sul lago Ashi e il torii. La sera onsen e kaiseki al ryokan."
  g16.alloggio = alloggio(hotelHakone)
  g16.avvisi = [
    attenzione('Giorno a rischio tifone sul Tokaido: controllate i treni la sera prima. Il 26/8 fa da cuscinetto.'),
    info('Funivia: controllate lo stato la mattina stessa (vento, gas).'),
    info('Solo zaino: le valigie sono in viaggio per l\'hotel di Tokyo.'),
  ]
  g16.tappe = [
    nuova('t-hakone-1', '07:30', 'Treno Osaka → Hakone', 'spostamento',
      'Metro Midosuji fino a Shin-Osaka (~15 minuti), poi Hikari che ferma a Odawara: non tutti fermano lì e il Nozomi non ferma mai. Arrivo verso le 9:50–10:00.',
      L('Stazione di Shin-Osaka', 'Shin-Osaka Station', 34.7334, 135.5001), { biglietti: { link: 'https://smart-ex.jp/en/' }, spostamento: { modo: 'treno', minuti: 150 } }),
    nuova('t16-6', '10:00', 'Hakone Freepass a Odawara', 'spostamento',
      "Comprate l'Hakone Freepass 2 giorni da Odawara (¥6.000; non quello da Shinjuku, ¥7.100) o sull'app EMot, poi Odakyu/Tozan fino a Hakone-Yumoto, 15 minuti.",
      L('Stazione di Odawara', 'Odawara Station', 35.2564, 139.1553), { spostamento: { modo: 'treno', minuti: 15 } }),
    senza(rif(g16, 'Partenza dal ryokan', '10:30', {
      titolo: 'Zaini al ryokan', tipo: 'hotel', luogo: alloggio(hotelHakone), spostamento: { modo: 'mezzi', minuti: 40 },
      descrizione: 'Lasciate gli zaini (il check-in è nel pomeriggio), poi il giro ad anello col Freepass: treno a cremagliera, funicolare, funivia, nave, bus.',
    }), 'biglietti'),
    rif(g16, "Museo all'aperto di Hakone", '11:15', {
      descrizione: 'Sculture all\'aperto (Moore, Picasso) e un bagno caldo per i piedi fra le opere: portate un asciugamano. ¥2.000, online ¥1.800.', spostamento: { modo: 'mezzi', minuti: 45 },
    }),
    rif(g16, 'Owakudani', '13:45', { descrizione: 'Gora, funicolare fino a Sounzan, funivia: la valle vulcanica con le fumarole e le uova nere cotte nell\'acqua sulfurea.', spostamento: { modo: 'mezzi', minuti: 30 } }),
    nuova('t16-7', '14:45', 'Nave pirata sul lago Ashi', 'visita', 'Funivia fino a Togendai, poi la nave pirata fino a Moto-Hakone: tutto incluso nel Freepass.',
      Q('Togendai', 'Togendai Port Lake Ashi'), { spostamento: { modo: 'mezzi', minuti: 40 } }),
    rif(g16, 'Lago Ashi e Torii di Hakone', '15:45', { titolo: 'Torii di Hakone', descrizione: 'Il torii rosso sul lago e il santuario, gratis.', consiglio: 'Per la foto al torii c\'è la coda: mettetela in conto.' }),
    nuova('t16-8', '16:45', 'Bus per Yumoto', 'spostamento', 'Bus Tozan da Moto-Hakone a Hakone-Yumoto, ~40 minuti, incluso nel Freepass.', undefined, { spostamento: { modo: 'mezzi', minuti: 40 } }),
    {
      ...bagnoSera, ora: '18:00', sera: true, titolo: 'Bagno serale e cena kaiseki',
      consiglio: 'Se qualcuno ha tatuaggi, chiedete al ryokan il bagno privato (kashikiri), ¥2.000–5.000 a sessione; Tenzan Onsen li ammette.',
    },
    rif(g16, 'Tenzan Onsen', '20:00', {
      titolo: 'Tenzan Onsen (facoltativo)',
      descrizione: "Se vi resta energia dopo l'onsen del ryokan: terme con vasche all'aperto (rotenburo) fra i monti, 9:00–23:00, ¥1.450 (¥1.350 col Freepass), ammette i tatuaggi. Navetta da Yumoto ¥100. Domattina non c'è tempo: apre alle 9:00, quando parte il Romancecar.",
    }),
  ]
  g16.suggerimenti = [
    ...g16.suggerimenti,
    S('opzionale', 'Fujiya Hotel Yumoto, bagni privati', 'Bagno privato per 45 minuti, ¥2.000 fino a 3 persone o ¥3.000 fino a 5.', 'Fujiya Hotel Yumoto Hakone'),
    S('opzionale', 'Hakone Yuryo', 'Bagni pubblici e 19 vasche private all\'aperto; dall\'aprile 2025 ammette i tatuaggi.', 'Hakone Yuryo'),
  ]

  // G17 — mercoledì 25/8: Romancecar per Shinjuku, Tocho, Ueno; Yanaka passa al G18
  const g17 = g(17)
  const yanaka = tappa(g17, 'Yanaka Ginza (vecchia Tokyo)')
  g17.titolo = 'Ritorno a Tokyo: Tocho, Ueno e Ameyoko'
  g17.intro = "Romancecar fino a Shinjuku, dove c'è il Tocho, poi Ueno. Si dorme di nuovo ad Asakusa/Kuramae (o a Ueno se il volo parte da Narita): le valigie arrivano qui con Yamato."
  g17.alloggio = alloggio(hotelTokyo)
  g17.avvisi = [
    ...g17.avvisi,
    info('Yanaka Ginza si sposta a domani: molti negozi chiudono il lunedì o il mercoledì.'),
  ]
  g17.tappe = [
    nuova('t-tokyo-1', '09:00', 'Treno Hakone → Tokyo', 'spostamento',
      'Romancecar da Hakone-Yumoto a Shinjuku, ~85 minuti, ¥2.470, posto prenotato. Non è coperto dal JR Pass.',
      L('Stazione di Hakone-Yumoto', 'Hakone-Yumoto Station', 35.2327, 139.1057), { biglietti: { link: 'https://www.odakyu.jp/english/?p=3974' }, spostamento: { modo: 'mezzi', minuti: 15 } }),
    { ...tocho, ora: '10:45', sera: false, titolo: 'Tocho, osservatorio gratis', spostamento: { modo: 'piedi', minuti: 15 },
      descrizione: 'Osservatorio gratuito del Palazzo del Governo, vista a 360 gradi e, nelle giornate limpide, il Fuji. Il mercoledì sono aperti tutti e due.' },
    nuova('t17-6', '12:00', 'Pranzo a Shinjuku e zaini in hotel', 'cibo', 'Pranzo, poi in hotel a lasciare gli zaini: le valigie sono già arrivate con Yamato.',
      L('Shinjuku', 'Shinjuku Tokyo', 35.6896, 139.7006), { spostamento: { modo: 'mezzi', minuti: 40 } }),
    rif(g17, 'Ueno: parco e museo', '14:00', {
      titolo: 'Museo Nazionale di Tokyo', luogo: L('Museo Nazionale di Tokyo', 'Tokyo National Museum', 35.7188, 139.7765), spostamento: { modo: 'piedi', minuti: 15 },
      descrizione: "Arte giapponese e armature, al chiuso nelle ore calde: ~¥1.000 (da verificare). Intorno c'è il parco di Ueno.",
    }),
    rif(g17, 'Ameyoko (mercato)', '16:30', { descrizione: 'Vivace mercato di strada sotto i binari, in parte coperto: cibo, dolci, vestiti e affari. Alcuni negozi chiudono il mercoledì.' }),
    rif(g17, 'Quartiere a scelta di sera', '18:30', {
      titolo: 'Cena a Ueno', tipo: 'cibo', luogo: L('Ueno', 'Ueno Station Tokyo', 35.7138, 139.7773),
      descrizione: 'Izakaya e street food fra Ueno e Ameyoko.',
    }),
  ]
  g17.suggerimenti = [
    ...g17.suggerimenti,
    S('souvenir', 'Fujikiya', 'Yukata e kimono, soprattutto da uomo, a Higashi-Ueno.', 'Fujikiya kimono Higashi-Ueno'),
    S('souvenir', 'Ameyoko', 'Cioccolatini, frutta secca e spezie a prezzi bassi.', 'Ameyoko market Ueno'),
    S('souvenir', 'Don Quijote Ueno', 'Souvenir e snack, aperto fino a tardi.', 'Don Quijote Ueno'),
  ]

  // G18 — giovedì 26/8: Tsukiji (oggi aperto), Hamarikyu, Ginza, Yanaka; giorno cuscinetto
  const g18 = g(18)
  const mattina = tappa(g18, 'Mattina libera + valigie')
  const cenaChiusura = tappa(g18, 'Cena di chiusura')
  g18.titolo = 'Tsukiji, Hamarikyu, Ginza e Yanaka'
  g18.intro = "L'ultimo giorno pieno, e anche il giorno cuscinetto: se il 24–25/8 un tifone ha fatto saltare qualcosa, si recupera oggi."
  g18.alloggio = alloggio(hotelTokyo)
  g18.avvisi = [...g18.avvisi, info('Giorno cuscinetto in caso di tifone: le cose saltate il 24–25/8 si recuperano qui.')]
  g18.tappe = [
    { ...tsukiji, ora: '08:00', sera: false, spostamento: { modo: 'piedi', minuti: 15 },
      descrizione: `${tsukiji.descrizione} Il giovedì è aperto: il momento migliore è fra le 9:00 e le 13:00.` },
    nuova('t18-4', '10:00', 'Hamarikyu Gardens', 'visita', 'Giardino sul mare con la casa del tè sull\'acqua (~¥300, da verificare).',
      L('Hamarikyu Gardens', 'Hamarikyu Gardens Tokyo', 35.66, 139.7632), { spostamento: { modo: 'piedi', minuti: 20 } }),
    { ...mattina, ora: '11:30', sera: false, titolo: 'Ginza: bacchette e Itoya', luogo: L('Ginza', 'Ginza Tokyo', 35.6717, 139.765), spostamento: { modo: 'mezzi', minuti: 30 },
      descrizione: 'Bacchette con incisione da Ginza Natsuno, la cartoleria Itoya, i grandi magazzini e il pranzo.' },
    nuova('t18-5', '14:00', 'Riposo', 'libero', 'Le ore più calde in hotel.', undefined, { spostamento: { modo: 'mezzi', minuti: 20 } }),
    { ...yanaka, ora: '16:00', sera: false, titolo: 'Yanaka Ginza e cimitero di Yanaka', spostamento: { modo: 'mezzi', minuti: 20 },
      descrizione: "La vecchia strada dei negozi (contanti, spuntini da ¥100–400) e la passeggiata all'ombra del cimitero, poi la scalinata \"Yuyake Dandan\" al tramonto (da verificare)." },
    { ...cenaChiusura, ora: '18:30', luogo: L('Yurakucho', 'Yurakucho Station Tokyo', 35.675, 139.763), consiglio: '',
      descrizione: 'Izakaya a Ueno/Ameyoko o sotto i binari a Yurakucho/Shimbashi, per salutare il Giappone.' },
  ]
  sposta(g3, g18, s => query(s).includes('Tsukiji'))
  sposta(g17, g18, s => s.nome === 'Botteghe di Yanaka')
  g18.suggerimenti = [
    ...g18.suggerimenti,
    S('cibo', 'Tsukiji Yamachou', 'Tamagoyaki alla griglia su Namiyoke-dori, ~¥150–300 (da verificare).', 'Tsukiji Yamachou'),
    S('cibo', 'Tekkaya Hiei', 'Ciotola di tonno all\'Uogashi Shokudo (3° piano), apre alle 10:00.', 'Uogashi Shokudo Tsukiji'),
    S('souvenir', 'Kumade-ya Yamanoi Shoten', 'Utensili da cucina per professionisti, nel vicolo di Higashi-dori a Tsukiji.', 'Tsukiji Outer Market Higashi-dori'),
    S('opzionale', 'Variante Ghibli', 'Solo se avete i biglietti (di solito chiude il martedì): 10:00 Ghibli Museum, poi Kichijoji (Inokashira Park, Harmonica Yokocho) fino alle 15:00. Tsukiji passa a domani alle 7:30.', 'Ghibli Museum Mitaka'),
  ]
  // I cibi del Fuji (Kawaguchiko, Fujiyoshida) erano di un giorno che non c'è più.
  g18.suggerimenti = g18.suggerimenti.filter(s => s.nome !== 'Hoto' && s.nome !== 'Yoshida udon')
  const perIlG19 = (c: string) => /ultima notte|aeroporto|tax-free/i.test(c)
  // I consigli sul Fuji della vecchia app (Skytree dall'alto, Hakone, lato dello Shinkansen) non valgono più al G18:
  // la Skytree si guarda da fuori, e il Fuji dallo Shinkansen si cerca il G16, in direzione di Tokyo, a sinistra.
  const sulFuji = (c: string) => /Fuji|Skytree/.test(c)
  const consigliPartenza = g18.consigli.filter(perIlG19)
    .map(c => /^Scegli un hotel/.test(c) ? "Ultima notte ad Asakusa/Kuramae, collegata direttamente agli aeroporti: il giorno della partenza niente cambi." : c)
  g18.consigli = g18.consigli.filter(c => !perIlG19(c) && !sulFuji(c))
  g16.consigli = [...g16.consigli, 'Dallo Shinkansen Shin-Osaka → Odawara il Fuji appare per qualche minuto sul lato sinistro, se il cielo è limpido: tenete pronta la fotocamera.']

  // G19 — venerdì 27/8: Kappabashi l'ultima mattina, in aeroporto entro le 16:30
  const partenza: Giorno = {
    id: 'g-partenza', cittaId: 'tokyo', titolo: 'Kappabashi, Kuramae e volo di ritorno',
    intro: "Volo verso le 20:00: in aeroporto entro le 16:30–17:00, perché il rimborso tax-free si fa alla dogana prima del check-in.",
    note: '', alloggio: null, speciale: null,
    consigli: [...consigliPartenza, "Per l'aeroporto: la Toei Asakusa va diretta a Haneda (~45–50 minuti); per Narita, Skyliner da Ueno (41 minuti) o Access Express (~70 minuti)."],
    avvisi: [
      attenzione("Tax-free: il rimborso si fa in aeroporto, al terminale doganale prima del check-in. Arrivate mezz'ora prima."),
      info('Giorno a rischio tifone: controllate il volo la mattina.'),
    ],
    suggerimenti: [
      S('souvenir', 'Kama-asa', 'Coltelli e padelle di ferro con incisione, 2-24-1 Matsugaya: coltelli da ~¥8.000 a oltre ¥30.000.', 'Kama-asa Kappabashi'),
      S('souvenir', 'Kamata / Tsubaya', 'Coltelli artigianali a Kappabashi, da ~¥10.000.', 'Kamata Hakensha Kappabashi'),
      S('souvenir', 'Maizuru e Ganso Shokuhin Sample-ya', 'Cibo finto di plastica: magneti e portachiavi da ~¥1.000, e i corsi per farlo.', 'Ganso Shokuhin Sample-ya Kappabashi'),
      S('souvenir', 'Kakimori', 'Quaderni fatti su misura e inchiostri, 4-20-12 Kuramae.', 'Kakimori Kuramae'),
      S('souvenir', 'Koncent / Matsuki Shoten', 'Oggetti di design e giocattoli, 2-4-5 / 2-4-3 Kuramae.', 'Koncent Kuramae'),
    ],
    tappe: [
      nuova('t-partenza-1', '09:00', 'Colazione e valigie', 'libero', 'Controllate passaporti, caricatori e i souvenir fragili.'),
      nuova('t-partenza-2', '09:30', 'Check-out e valigie al banco', 'hotel', 'Lasciate le valigie al banco dell\'hotel, quasi sempre gratis. Evitate gli armadietti: a mezzogiorno sono pieni.',
        alloggio(hotelTokyo), { spostamento: { modo: 'piedi', minuti: 10 } }),
      nuova('t-partenza-3', '10:00', 'Kappabashi e Kuramae', 'visita',
        'Oggi Kappabashi è aperta: coltelli col nome inciso in giornata e cibo finto. Mettete tutto nel bagaglio da stiva.',
        L('Kappabashi', 'Kappabashi Dougu Street Tokyo', 35.7139, 139.7883), { spostamento: { modo: 'piedi', minuti: 15 } }),
      nuova('t-partenza-6', '12:30', 'Pranzo e ritiro bagagli', 'cibo', 'Pranzo e un giro a Kuramae (i negozi artigiani aprono verso le 11–12), poi le valigie in hotel.',
        L('Kuramae', 'Kuramae Station Tokyo', 35.7036, 139.7907)),
      nuova('t-partenza-4', '15:00', 'Partenza per Haneda', 'spostamento',
        'Toei Asakusa diretta, ~45–50 minuti. Per Narita partite verso le 14:15: Skyliner da Ueno (41 minuti) o Access Express (~70 minuti).',
        structuredClone(haneda), { consiglio: 'Se il volo parte da Narita, anticipate e cambiate il luogo.', spostamento: { modo: 'treno', minuti: 50 } }),
      nuova('t-partenza-5', '16:30', 'In aeroporto', 'spostamento', "Prima la dogana tax-free, poi il check-in. Haneda T3 ha la zona \"Edo\" per gli ultimi acquisti.", structuredClone(haneda)),
    ],
  }

  // Avvisi sui giorni che restano
  g2.avvisi = [info('Fuochi di Jingū Gaien: data 2027 da verificare, di solito fra il 7 e il 21 agosto.')]
  const koenji = info('Kōenji Awa Odori, Azabu-Jūban e Super Yosakoi: date 2027 da annunciare (probabile 28–29 agosto). Se cadono il 21–22, scambiate Osaka e Hakone.')
  g17.avvisi = [koenji, ...g17.avvisi]
  g18.avvisi = [koenji, ...g18.avvisi]

  // Una tappa della vecchia app che cambia titolo porta con sé il luogo che si chiamava come lei: il nome segue il titolo.
  const titoliVecchi = new Map(vecchio.giorni.flatMap(d => d.tappe).map(t => [t.id, t.titolo]))
  // Testi della vecchia app rimasti tronchi a metà frase: completati, o tolti se non servono più.
  const TESTI_COMPLETI: Record<string, Partial<Tappa>> = {
    't1-6': { consiglio: 'Da non perdere: i palazzi multipiano di figure e videogiochi usati.' },
    't1-7': { descrizione: "L'esperienza pop tipica di Akihabara: cameriere in costume, show kawaii, parfait e omurice con disegni di ketchup. Divertente e turistico al punto giusto, spettacolino incluso." },
    't1-9': { consiglio: '' },
    't5-8': { consiglio: 'Kanazawa la sera è raccolta: i quartieri storici e qualche izakaya.' },
    't10-7': { consiglio: '' },
    't14-4': { consiglio: '' },
  }
  const allinea = (d: Giorno) => {
    d.tappe = d.tappe.map(t => {
      const prima = titoliVecchi.get(t.id)
      const c = { ...t, ...TESTI_COMPLETI[t.id] }
      return prima && c.luogo?.nome === prima && c.titolo !== prima ? { ...c, luogo: { ...c.luogo, nome: c.titolo } } : c
    })
  }

  // Tre persone invece di sei
  const tre = (s: string) => s.replace(/In 6 persone/g, 'In 3 persone').replace(/Facile in 6\./g, 'Facile in 3.')
  for (const d of v.giorni) {
    if (!d.speciale) continue
    d.speciale.nota = tre(d.speciale.nota)
    d.speciale.opzioni = d.speciale.opzioni.map(o => ({ ...o, descrizione: tre(o.descrizione) }))
  }

  const INTRO_CITTA: Record<string, string> = {
    tokyo: 'Base: Hotel Mystays Asakusa, a Kuramae. Quattro giornate intense con serate ricche: dai vicoli di izakaya ai maid cafe, dalle terrazze panoramiche al digital art. Alla fine si torna nello stesso hotel per le ultime due notti.',
    kanazawa: 'Il Giappone tradizionale ben conservato. Base: Mitsui Garden Hotel Kanazawa, per due notti con lo zaino.',
    kyoto: "Base: Travelodge Kyoto Shijo Kawaramachi, fra Gion e Kawaramachi. Cinque giorni: l'arrivo con le lanterne di Nara, la notte dei falò ad Arashiyama, i grandi templi e una giornata in montagna fra Kurama e Kibune.",
  }
  const citta = v.citta
    .filter(c => c.id !== 'koyasan' && c.id !== 'hiroshima')
    .map(c => INTRO_CITTA[c.id] ? { ...c, intro: INTRO_CITTA[c.id] }
      : c.id === 'osaka' ? { ...c, intro: `${c.intro} In mezzo, una giornata a Himeji e Kobe.` } : c)

  const ordine = [
    arrivo, g1, g2, g3, g4, g5, g6,
    nara, g8, g7, g9, kurama,
    g12, g13, g14, himeji,
    g16, g17, g18, partenza,
  ]
  ordine.forEach(allinea)
  const giorni = conOrari(ordine)
  const dataPartenza = '2027-08-08'
  const nomeCitta = (id: string) => citta.find(c => c.id === id)?.nome ?? id
  return {
    ...v,
    titolo: 'Giappone — agosto 2027',
    dataPartenza,
    citta,
    giorni,
    prenotazioni: completaPrenotazioni(prenotazioniDiPartenza(giorni, dataPartenza, nomeCitta), { hotelTokyo, hotelOsaka }),
  }
}

const SUBITO = '2026-11-30'
/** Note, scadenze e titoli dal "Calendario prenotazioni" di GUIDA.md, per id di prenotazione. */
const DETTAGLI: Record<string, Partial<Prenotazione>> = {
  'pr-hotel-0': {
    inizio: '2027-08-08T17:00', daPrenotareEntro: SUBITO,
    note: "4 notti, 8–12/8. \"Deluxe Triple Skytree View\", solo non fumatori, ~¥25.000–35.000 a notte (stima). Alternative ≤3★ con tripla: Hotel Sunroute Asakusa, Minn Asakusa Kuramae North, Asakusa Central Hotel. Prenotate con cancellazione gratuita e chiedete per iscritto la configurazione dei letti. La mattina del 12/8 da qui parte la valigia grande con Yamato.",
  },
  'pr-hotel-4': {
    daPrenotareEntro: SUBITO,
    note: "Ryokan con onsen e cena kaiseki (specialità: kaiseki di yuba), sulla strada principale fra la stazione e il ponte Shinkyo. Costa ~¥25.000–31.000 a persona con i pasti; su Expedia è un 3,5 stelle. Più economico, con onsen: Turtle Inn Nikko, guesthouse con \"Japanese Style Triple\", voto 8,8, da ~€72 per 2 persone (istantanea di settembre 2026), colazione ¥1.000. Se qualcuno ha tatuaggi, chiedete prima del bagno privato.",
  },
  'pr-hotel-5': {
    daPrenotareEntro: SUBITO,
    note: "Tripla non fumatori (istantanea ~€51, da verificare), al limite delle 3 stelle. È in centro: il bus delle 8:00 per Shirakawa-go e lo Shinkansen del 15/8 partono dalla stazione. Alternative vicino alla stazione: Minn Kanazawa (tripla), so, KANAZAWA (family room), Dormy Inn Kanazawa (onsen, tripla da verificare). Stessa camera per 2 notti.",
  },
  'pr-hotel-7': {
    daPrenotareEntro: SUBITO,
    note: "Family triple, camere compatte, colazione ¥1.300, 3 minuti da Kyoto-Kawaramachi. Deve accettare le valigie spedite con Yamato il 13–14/8. Il Kyoto Gion Hotel va bene solo se conferma per iscritto tripla, aria condizionata e stelle. Altre: Hotel MyStays Kyoto Shijo (Comfort Triple: chiedete i letti), APA Hotel Kyoto Gion Excellent, Shiki Shiki Higashiyama (la più economica, bagno in parte condiviso). In Obon ~¥25.000–45.000 a camera; la tassa di soggiorno è a parte.",
  },
  'pr-hotel-12': {
    inizio: '2027-08-20T14:00', daPrenotareEntro: SUBITO,
    note: '3 stelle, triple con 3 letti singoli (26–28 m²), deposito bagagli gratis, check-out alle 11. Stima ¥25.000–40.000 a notte. La sera del 23/8 da qui partono le valigie con Yamato.',
  },
  'pr-hotel-16': {
    daPrenotareEntro: SUBITO,
    note: "Ryokan con onsen e cena kaiseki in zona Hakone-Yumoto, da dove parte il Romancecar. Al massimo 3 stelle, con bagno privato (kashikiri): risolve il problema dei tatuaggi. Dalla ricerca: Yaeikan (ryokan con onsen, tripla da verificare, £90–140 per 2 persone), Hakone Suimeisou (ryokan vicino alla stazione, bagno privato aperto ai tatuaggi da verificare, ~US$221). È la parte meno solida della ricerca: rifate i prezzi con le date.",
  },
  'pr-hotel-17': {
    daPrenotareEntro: SUBITO,
    note: "2 notti, 25–27/8, nello stesso hotel del primo soggiorno. Se il volo parte da Narita: Hop Inn Tokyo Ueno (Superior Triple) o APA Hotel Ueno Ekikita. Va prenotato prima del 23/8: è l'indirizzo dove spedire le valigie da Osaka.",
  },
  'pr-t-nikko-1': {
    titolo: 'Spacia X Asakusa → Nikko', daPrenotareEntro: '2027-07-12', link: 'https://ekitan.com/en/article/spacia-x',
    note: "Solo andata, alle 7:50 (arrivo 9:39). ¥3.340. Vendita dal 12/7 sul sito Tobu (ora da verificare); il JR Pass non vale.",
  },
  'pr-t-kanazawa-1': {
    daPrenotareEntro: '2027-07-13',
    note: "Partenza da Nikko verso le 8:15 (primo treno da verificare), arrivo a Kanazawa verso le 13:15. JR Nikko Line fino a Utsunomiya, Tohoku Shinkansen fino a Omiya e Kagayaki fino a Kanazawa: ~4 ore e 45–5 ore con 2 cambi, ~¥20.500. Posti riservati sui due Shinkansen. Vendita il 13/7 alle 10:00 giapponesi, cioè alle 03:00 in Italia, su JR-EAST Train Reservation. Primo giorno di Obon: prenotate appena apre.",
  },
  'pr-t6-0': {
    titolo: 'Bus Kanazawa ⇄ Shirakawa-go', daPrenotareEntro: '2027-07-14',
    note: "Andata alle 8:00 dal lato ovest della stazione (fermata 2) e ritorno verso le 14:30, prenotati insieme. ¥2.800 a tratta, ~45 posti a corsa. Controllate dal 14/6 e prenotate appena apre, al più tardi il 14/7. Si cancella fino a 24 ore prima con penale. Anche su Hokutetsu (tel. +81 76 234 0123).",
  },
  'pr-t-nara-1': {
    titolo: 'Kanazawa → Tsuruga → Kyoto', daPrenotareEntro: '2027-07-15', link: 'https://www.kanazawastation.com/traveling-between-kyoto-and-kanazawa/',
    note: "Hokuriku Shinkansen fino a Tsuruga e Thunderbird fino a Kyoto, posti riservati su tutti e due. Vendita il 15/7 alle 03:00 italiane, su JR West. ~¥7.400–7.900; l'\"Hokuriku One-way Ticket\" per stranieri costa ¥6.500 (da verificare). Quale canale accetti le carte estere è da verificare: altrimenti la biglietteria di Kanazawa.",
  },
  'pr-t-hakone-1': {
    titolo: 'Hikari Shin-Osaka → Odawara', daPrenotareEntro: '2027-07-24',
    note: 'Controllate che il treno fermi a Odawara: il Nozomi non ferma. Vendita il 24/7 alle 03:00 italiane su smartEX. ¥12.320 libero, ~¥12.730–12.850 riservato. Il 24/8 è un giorno a rischio tifone.',
  },
  'pr-t-tokyo-1': {
    titolo: 'Romancecar Hakone-Yumoto → Shinjuku', daPrenotareEntro: '2027-07-25',
    note: '~85 minuti, ¥2.470. Vendita verso il 25/7 su e-Romancecar (da verificare).',
  },
  'pr-t2-3': {
    daPrenotareEntro: '2027-07-13',
    note: 'Slot delle 17:30, per il tramonto (~18:20). Le vendite aprono 2–4 settimane prima (da verificare): prenotate appena possibile. ~¥2.200–2.500 online.',
  },
  'pr-t3-5': {
    daPrenotareEntro: '2027-06-11',
    note: "Ingresso alle 16:30 dell'11/8, festivo. Le vendite aprono da 2 settimane a 2 mesi prima (da verificare); i festivi si esauriscono in ~72 ore.",
  },
  'pr-t1-7': {
    daPrenotareEntro: '2027-07-31',
    note: 'Prenotazione online (regole da verificare). ~¥2.000–3.000 a testa fra consumazione minima e coperto.',
  },
  'pr-t7-10': {
    tipo: 'altro', titolo: 'Noleggio yukata a Kyoto', daPrenotareEntro: '2027-07-31', link: 'https://waraku-kimono.jp/en/?p=35664',
    note: 'Per il 17/8 alle 17:00. Ad agosto solo yukata: Yumeyakata (da ¥4.180), Kanwa Kimono (da ¥3.300), Waraku (¥4.600; nel 2026 promo a ¥3.000 col sito per il 10–20/8, 2027 da verificare), Okamoto. Molti accettano anche senza prenotazione.',
  },
  'pr-t4-3': { note: "Si compra all'ingresso, ¥1.600." },
  'pr-t12-1': { note: "Si compra all'ingresso, ¥1.200." },
  'pr-t13-1': { note: 'Floating Garden, ~¥2.000.' },
  'pr-t-himeji-2': { note: "Non serve prenotare: l'e-ticket è facoltativo e ha la data fissa. ¥2.500, col Kōko-en ¥2.600." },
}

/** Le note e le scadenze di GUIDA.md, più le prenotazioni senza una tappa: il Museo Ghibli (facoltativo) e le spedizioni Yamato. */
function completaPrenotazioni(ps: Prenotazione[], hotel: { hotelTokyo: Luogo; hotelOsaka: Luogo }): Prenotazione[] {
  const mancanti = Object.keys(DETTAGLI).filter(id => !ps.some(p => p.id === id))
  if (mancanti.length) throw new Error(`prenotazioni per i dettagli non trovate: ${mancanti.join(', ')}`)
  const conDettagli = ps.map(p => {
    const d = DETTAGLI[p.id]
    if (!d) return p
    const link = linkSicuro(d.link)
    return { ...p, ...d, ...(link ? { link } : {}) }
  })
  const ghibli = linkSicuro('https://www.ghibli-museum.jp/en/tickets/')
  return [
    ...conDettagli,
    nuovaPrenotazione('pr-ghibli', 'biglietto', 'Museo Ghibli (facoltativo)', {
      inizio: '2027-08-26T10:00', daPrenotareEntro: '2027-07-10', luogo: Q('Museo Ghibli', 'Ghibli Museum Mitaka'), ...(ghibli ? { link: ghibli } : {}),
      note: "Solo se vi interessa. Vendita il 10/7 alle 03:00 italiane su Lawson Ticket, per tutto agosto: finisce in pochi minuti. Preparate 3–4 date alternative; giovedì 26/8 è la migliore (di solito chiude il martedì). Con il Ghibli, Tsukiji passa al 27/8 alle 7:30.",
    }),
    nuovaPrenotazione('pr-yamato-kyoto', 'altro', 'Valigie con Yamato: Asakusa → Kyoto', {
      daPrenotareEntro: '2027-07-31', luogo: structuredClone(hotel.hotelTokyo),
      note: "Entro luglio scrivete all'hotel di Kyoto: nome, date e \"luggage arriving\", e fatevelo confermare per iscritto. La mattina del 12/8, prima del treno per Nikko, valigie alla reception (o la sera prima, se l'hotel le tiene): arrivano il 13–14/8. ~¥2.000–3.500 a valigia, secondo misure e distanza.",
    }),
    nuovaPrenotazione('pr-yamato-tokyo', 'altro', 'Valigie con Yamato: Osaka → Tokyo', {
      inizio: '2027-08-23T21:15', daPrenotareEntro: '2027-07-31', luogo: structuredClone(hotel.hotelOsaka),
      note: "Entro luglio scrivete all'hotel di Tokyo del 25/8 (valigie in arrivo il 24–25/8). La sera del 23/8 valigie alla reception del Forza: a Hakone si va con lo zaino.",
    }),
  ]
}
