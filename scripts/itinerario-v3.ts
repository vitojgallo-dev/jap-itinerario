import { aggiungiGiorni, minutiDaOra } from '../src/model/date'
import type { Avviso, Citta, Giorno, InfoEvento, Luogo, OrariTappa, Prenotazione, Spostamento, Suggerimento, Tappa, TipoTappa, Viaggio } from '../src/model/tipi'
import { linkSicuro } from '../src/servizi/mappe'
import coordinate from './luoghi-v3.json'

/**
 * Terza versione dell'itinerario (2/11/2026): la ricerca in docs/ricerca/v2 e le scelte di Vito.
 * Un solo ryokan (Hakone), Nikko in giornata, Takayama, Kamakura e Yokohama, Osaka 3 notti,
 * Tokyo finale 3 notti con la giornata a Fujiyoshida (Fuji-Q e festa del fuoco).
 * Sostituisce città, giorni e prenotazioni del viaggio che riceve; tiene persone, spese e impostazioni.
 */

/** I posti dell'itinerario: nome e ricerca per le mappe. Le coordinate stanno in luoghi-v3.json (OpenStreetMap). */
export const LUOGHI = {
  haneda: ['Aeroporto di Haneda', 'Haneda Airport'],
  mimaruAsakusa: ['MIMARU Tokyo Asakusa Station', 'MIMARU Tokyo Asakusa Station'],
  sensoji: ['Senso-ji e Kaminarimon', 'Senso-ji Asakusa'],
  kuraRox: ['Kura Sushi Asakusa ROX', 'Kura Sushi Asakusa ROX'],
  hoppy: ['Hoppy-dori', 'Hoppy Street Asakusa'],
  donkiAsakusa: ['Don Quijote Asakusa', 'Don Quijote Asakusa'],
  azumabashi: ['Ponte Azuma', 'Azumabashi Bridge Tokyo'],
  nakamise: ['Nakamise-dori', 'Nakamise Shopping Street'],
  kappabashi: ['Kappabashi', 'Kappabashi Dougu Street'],
  akihabara: ['Akihabara Electric Town', 'Akihabara Station'],
  radioKaikan: ['Akihabara Radio Kaikan', 'Akihabara Radio Kaikan'],
  superPotato: ['Super Potato Akihabara', 'Super Potato Akihabara'],
  taitoAkiba: ['Taito Station Akihabara', 'Taito Station Akihabara'],
  yodobashiAkiba: ['Yodobashi Akiba (batting center sul tetto)', 'Yodobashi Akiba'],
  atHome: ['@home cafe', 'at home cafe Akihabara'],
  pasela: ['Karaoke Pasela Akihabara', 'Karaoke Pasela Akihabara'],
  meiji: ['Meiji Jingu', 'Meiji Jingu'],
  takeshita: ['Takeshita-dori', 'Takeshita Street'],
  orientalBazaar: ['Oriental Bazaar', 'Oriental Bazaar Omotesando'],
  parco: ['Shibuya PARCO', 'Shibuya PARCO'],
  motomura: ['Gyukatsu Motomura Shibuya', 'Gyukatsu Motomura Shibuya'],
  crossing: ['Shibuya Crossing', 'Shibuya Scramble Crossing'],
  catStreet: ['Cat Street', 'Cat Street Harajuku'],
  shimokita: ['Shimokitazawa', 'Shimokitazawa Station'],
  shibuyaSky: ['Shibuya Sky', 'Shibuya Scramble Square'],
  omoide: ['Omoide Yokocho', 'Omoide Yokocho'],
  goldenGai: ['Golden Gai', 'Shinjuku Golden Gai'],
  teamlab: ['teamLab Planets', 'teamLab Planets Tokyo'],
  gundamBase: ['The Gundam Base Tokyo (DiverCity)', 'DiverCity Tokyo Plaza'],
  tsukishima: ['Monja Street di Tsukishima', 'Tsukishima Monja Street'],
  fukagawa: ['Fukagawa Edo Museum', 'Fukagawa Edo Museum'],
  kiyosumi: ['Giardino Kiyosumi', 'Kiyosumi Garden'],
  tomioka: ['Tomioka Hachimangū', 'Tomioka Hachimangu'],
  sunamachi: ['Argine dell\'Arakawa a Sunamachi', 'Sunamachi Mizube Park'],
  asakusaTobu: ['Stazione Tobu Asakusa', 'Asakusa Station Tobu'],
  shinkyo: ['Ponte Shinkyo', 'Shinkyo Bridge Nikko'],
  rinnoji: ['Rinno-ji', 'Rinnoji Nikko'],
  toshogu: ['Nikko Tōshōgū', 'Nikko Toshogu'],
  chuzenji: ['Lago Chuzenji', 'Lake Chuzenji'],
  kegon: ['Cascata Kegon', 'Kegon Falls'],
  kanmangafuchi: ['Kanmangafuchi', 'Kanmangafuchi Abyss'],
  ameyoko: ['Ameyoko', 'Ameyoko Shopping Street'],
  ueno: ['Stazione di Ueno', 'Ueno Station'],
  kanazawaSt: ['Stazione di Kanazawa', 'Kanazawa Station'],
  dormyKanazawa: ['Dormy Inn Kanazawa', 'Dormy Inn Kanazawa'],
  omicho: ['Mercato Omicho', 'Omicho Market'],
  kenrokuen: ['Kenrokuen', 'Kenrokuen'],
  nagamachi: ['Nagamachi', 'Nagamachi Samurai District'],
  higashiChaya: ['Higashi Chaya', 'Higashi Chaya District'],
  maimon: ['Maimon Sushi', 'Maimon Sushi Kanazawa'],
  katamachi: ['Katamachi', 'Katamachi Kanazawa'],
  ogimachi: ['Shirakawa-go (Ogimachi)', 'Shirakawa-go Ogimachi'],
  shiroyama: ['Belvedere Shiroyama', 'Shiroyama Viewpoint Shirakawa-go'],
  tokyuTakayama: ['Tokyu Stay Hida Takayama', 'Tokyu Stay Hida Takayama'],
  sanmachi: ['Sanmachi Suji', 'Sanmachi Suji Takayama'],
  jinya: ['Takayama Jinya', 'Takayama Jinya'],
  nakabashi: ['Ponte Nakabashi', 'Nakabashi Bridge Takayama'],
  higashiyamaTakayama: ['Sentiero dei templi di Higashiyama', 'Higashiyama Walking Course Takayama'],
  miyagawa: ['Mercato del mattino di Miyagawa', 'Miyagawa Morning Market'],
  takayamaSt: ['Stazione di Takayama', 'Takayama Station'],
  kintetsuNara: ['Stazione Kintetsu Nara', 'Kintetsu Nara Station'],
  naraPark: ['Parco di Nara', 'Nara Park'],
  todaiji: ['Tōdai-ji', 'Todaiji'],
  naramachi: ['Naramachi', 'Naramachi'],
  kasuga: ['Kasuga Taisha', 'Kasuga Taisha'],
  tobihino: ['Prato di Tobihino', 'Tobihino Nara'],
  mimaruKyoto: ['MIMARU Kyoto Kawaramachi Gojo', 'MIMARU Kyoto Kawaramachi Gojo'],
  bambu: ['Foresta di bambù di Arashiyama', 'Arashiyama Bamboo Grove'],
  tenryuji: ['Tenryu-ji', 'Tenryuji'],
  okochi: ['Villa Okochi Sanso', 'Okochi Sanso'],
  kinkakuji: ['Kinkaku-ji', 'Kinkakuji'],
  ryoanji: ['Ryoan-ji', 'Ryoanji'],
  izuju: ['Izuju', 'Izuju Gion'],
  manga: ['Kyoto International Manga Museum', 'Kyoto International Manga Museum'],
  shimogamo: ['Santuario Shimogamo', 'Shimogamo Shrine'],
  kamoDelta: ['Delta del Kamo', 'Kamogawa Delta Demachiyanagi'],
  inari: ['Fushimi Inari Taisha', 'Fushimi Inari Taisha'],
  gekkeikan: ['Gekkeikan Okura Sake Museum', 'Gekkeikan Okura Sake Museum'],
  kiyomizu: ['Kiyomizu-dera', 'Kiyomizudera'],
  sannenzaka: ['Sannenzaka', 'Sannenzaka'],
  katsugyu: ['Kyoto Katsugyu Gojozaka', 'Kyoto Katsugyu Kiyomizu Gojozaka'],
  nishiki: ['Mercato Nishiki', 'Nishiki Market'],
  teramachi: ['Teramachi e Shinkyōgoku', 'Teramachi Kyoto'],
  yasaka: ['Santuario Yasaka', 'Yasaka Shrine'],
  pontocho: ['Pontocho', 'Pontocho'],
  byodoin: ['Byōdō-in', 'Byodoin'],
  tokichi: ['Nakamura Tokichi Honten', 'Nakamura Tokichi Uji'],
  nijo: ['Castello di Nijō', 'Nijo Castle'],
  eigamura: ['Toei Kyoto Studio Park', 'Toei Kyoto Studio Park'],
  kyotoSt: ['Stazione di Kyoto', 'Kyoto Station'],
  kurama: ['Kurama-dera', 'Kuramadera'],
  hirobun: ['Hirobun (nagashi somen)', 'Hirobun Kibune'],
  kibune: ['Santuario Kibune', 'Kifune Shrine'],
  demachi: ['Demachi Futaba', 'Demachi Futaba'],
  ginkakuji: ['Ginkaku-ji', 'Ginkakuji'],
  filosofia: ['Sentiero della Filosofia', 'Philosopher\'s Path'],
  nanzenji: ['Nanzen-ji', 'Nanzenji'],
  sanjo: ['Argine del Kamo a Sanjō', 'Sanjo Ohashi'],
  kiyamachi: ['Kiyamachi', 'Kiyamachi Kyoto'],
  forza: ['Hotel Forza Osaka Namba Dotonbori', 'Hotel Forza Osaka Namba Dotonbori'],
  koshien: ['Hanshin Kōshien Stadium', 'Koshien Stadium'],
  taiyo: ['Torre del Sole (Expo \'70)', 'Tower of the Sun'],
  kuromon: ['Mercato Kuromon', 'Kuromon Market'],
  doguyasuji: ['Sennichimae Doguyasuji', 'Sennichimae Doguyasuji'],
  hozenji: ['Hozenji Yokocho', 'Hozenji Yokocho'],
  dotonbori: ['Dotonbori', 'Dotonbori Glico Sign'],
  uraNamba: ['Ura-Namba', 'Ura Namba Osaka'],
  shitennoji: ['Shitenno-ji', 'Shitennoji'],
  osakajo: ['Castello di Osaka', 'Osaka Castle'],
  shinsekai: ['Shinsekai e Tsutenkaku', 'Tsutenkaku'],
  yakinikuM: ['Yakiniku M Hozenji', 'Yakiniku M Hozenji'],
  denden: ['Den Den Town', 'Den Den Town Nipponbashi'],
  amemura: ['Amerikamura', 'Amerikamura'],
  umedaHep: ['HEP Five', 'HEP FIVE'],
  umedaSky: ['Umeda Sky Building', 'Umeda Sky Building'],
  himejiSt: ['Stazione di Himeji', 'Himeji Station'],
  himeji: ['Castello di Himeji', 'Himeji Castle'],
  kokoen: ['Giardino Kōko-en', 'Kokoen Garden'],
  steakland: ['Steakland Kobe-kan', 'Steakland Kobe'],
  nankinmachi: ['Nankinmachi', 'Nankinmachi Kobe'],
  kitano: ['Kitano Ijinkan', 'Kitano Ijinkan'],
  meriken: ['Meriken Park e Port Tower', 'Kobe Port Tower'],
  odawara: ['Stazione di Odawara', 'Odawara Station'],
  ichinoyu: ['Tonosawa Ichinoyu Honkan', 'Ichinoyu Honkan Tonosawa'],
  openair: ['Museo all\'aperto di Hakone', 'Hakone Open-Air Museum'],
  owakudani: ['Owakudani', 'Owakudani'],
  togendai: ['Togendai (nave pirata)', 'Togendai Port'],
  hakoneJinja: ['Torii di Hakone', 'Hakone Shrine Peace Torii'],
  yumoto: ['Hakone-Yumoto', 'Hakone-Yumoto Station'],
  enoshima: ['Enoshima', 'Enoshima Shrine'],
  slamdunk: ['Passaggio a livello di Kamakurakōkōmae', 'Kamakurakokomae Station'],
  daibutsu: ['Grande Buddha di Kamakura', 'Kotoku-in'],
  komachi: ['Komachi-dori', 'Komachi Street Kamakura'],
  redBrick: ['Red Brick Warehouse', 'Yokohama Red Brick Warehouse'],
  osanbashi: ['Molo Osanbashi', 'Osanbashi Pier'],
  chinatown: ['Chinatown di Yokohama', 'Yokohama Chinatown'],
  cosmoClock: ['Cosmo Clock 21', 'Cosmo Clock 21'],
  kokyo: ['Giardini Est del Palazzo Imperiale', 'Imperial Palace East Gardens'],
  tokyoSt: ['Stazione di Tokyo', 'Tokyo Station'],
  ginza: ['Ginza', 'Ginza Itoya'],
  nakano: ['Nakano Broadway', 'Nakano Broadway'],
  koenji: ['Koenji', 'Koenji Station'],
  rokkasen: ['Rokkasen Shinjuku', 'Rokkasen Shinjuku'],
  busta: ['Busta Shinjuku', 'Busta Shinjuku'],
  fujiq: ['Fuji-Q Highland', 'Fuji-Q Highland'],
  chureito: ['Pagoda Chureito', 'Chureito Pagoda'],
  himatsuri: ['Via di Kamiyoshida (festa del fuoco)', 'Kitaguchi Hongu Fuji Sengen Jinja'],
  toyosu: ['Mercato di Toyosu', 'Toyosu Market'],
  tsukiji: ['Tsukiji Outer Market', 'Tsukiji Outer Market'],
} as const satisfies Record<string, readonly [string, string]>

type ChiaveLuogo = keyof typeof LUOGHI
const COORD = coordinate as Record<string, { lat: number; lng: number }>

function L(k: ChiaveLuogo): Luogo {
  const [nome, query] = LUOGHI[k]
  const c = COORD[k]
  return c ? { nome, query, lat: c.lat, lng: c.lng } : { nome, query }
}

const VERIFICA = 'Verifica sul sito prima di andare.'

interface Opzioni {
  luogo?: ChiaveLuogo
  consiglio?: string
  biglietti?: string | null
  evento?: InfoEvento
  orari?: Omit<OrariTappa, 'fonte'>
  spostamento?: Spostamento
  durataMin?: number
}

/** Una tappa: l'id e' g<giorno>-<n>, "sera" si ricava dall'ora. */
function tappa(id: string, ora: string, titolo: string, tipo: TipoTappa, descrizione: string, o: Opzioni = {}): Tappa {
  return {
    id, ora, titolo, descrizione, consiglio: o.consiglio ?? '', tipo,
    sera: minutiDaOra(ora)! >= 18 * 60, stato: 'da-fare', nota: '',
    ...(o.luogo ? { luogo: L(o.luogo) } : {}),
    ...(o.biglietti !== undefined ? { biglietti: { link: o.biglietti } } : {}),
    ...(o.evento ? { evento: o.evento } : {}),
    ...(o.orari ? { orari: { ...o.orari, fonte: 'base' as const } } : {}),
    ...(o.spostamento ? { spostamento: o.spostamento } : {}),
    ...(o.durataMin ? { durataMin: o.durataMin } : {}),
  }
}

const treno = (minuti: number, nota?: string): Spostamento => ({ modo: 'treno', minuti, ...(nota ? { nota } : {}) })
const attenzione = (testo: string): Avviso => ({ testo, livello: 'attenzione' })
const info = (testo: string): Avviso => ({ testo, livello: 'info' })
const cibo = (nome: string, descrizione: string, query: string): Suggerimento => ({ tipo: 'cibo', nome, descrizione, luogo: { nome, query } })
const souvenir = (nome: string, descrizione: string, query: string): Suggerimento => ({ tipo: 'souvenir', nome, descrizione, luogo: { nome, query } })

const evento = (nome: string, nomeJa: string, affidabilita: InfoEvento['affidabilita'], fonte?: string): InfoEvento =>
  ({ nome, nomeJa, affidabilita, ...(fonte ? { fonte } : {}) })

interface DefGiorno {
  citta: string
  titolo: string
  intro: string
  alloggio: ChiaveLuogo | null
  tappe: Tappa[]
  consigli?: string[]
  avvisi?: Avviso[]
  suggerimenti?: Suggerimento[]
}

export const CITTA: Citta[] = [
  { id: 'tokyo', nome: 'Tokyo', kanji: '東京', romaji: 'Tōkyō', colore: '#E4572E', lat: 35.6762, lng: 139.6503, clima: { max: 31, min: 24 },
    intro: 'Templi all\'alba, Akihabara di notte, vintage, fuochi sul fiume e il mercato del pesce.' },
  { id: 'nikko', nome: 'Nikko', kanji: '日光', romaji: 'Nikkō', colore: '#2A9D8F', lat: 36.7198, lng: 139.6982, clima: { max: 27, min: 19 },
    intro: 'Santuari dorati nel bosco di cedri, un lago e una cascata di 97 metri. In giornata da Asakusa.' },
  { id: 'kanazawa', nome: 'Kanazawa', kanji: '金沢', romaji: 'Kanazawa', colore: '#8E7CC3', lat: 36.5613, lng: 136.6562, clima: { max: 31, min: 24 },
    intro: 'Il giardino Kenrokuen, i samurai di Nagamachi, le case da tè e il gelato coperto d\'oro.' },
  { id: 'takayama', nome: 'Takayama', kanji: '高山', romaji: 'Takayama', colore: '#6B8F3A', lat: 36.1461, lng: 137.2522, clima: { max: 30, min: 20 },
    intro: 'Le vie di legno dell\'epoca Edo nelle Alpi giapponesi, le distillerie di sake e il manzo di Hida. Shirakawa-go sta sulla strada.' },
  { id: 'kyoto', nome: 'Kyoto', kanji: '京都', romaji: 'Kyōto', colore: '#C1440E', lat: 35.0116, lng: 135.7681, clima: { max: 34, min: 24 },
    intro: 'Lanterne di Nara, fuochi sulle montagne, diecimila torii, il tè di Uji e le sere sul fiume Kamo.' },
  { id: 'osaka', nome: 'Osaka', kanji: '大阪', romaji: 'Ōsaka', colore: '#F4A259', lat: 34.6937, lng: 135.5023, clima: { max: 33, min: 25 },
    intro: 'Cibo di strada, vicoli rétro, Den Den Town, il torneo dei licei a Kōshien. Himeji e Kobe in giornata.' },
  { id: 'hakone', nome: 'Hakone', kanji: '箱根', romaji: 'Hakone', colore: '#6A8EAE', lat: 35.2323, lng: 139.1069, clima: { max: 27, min: 20 },
    intro: 'Il vulcano, il lago Ashi, il torii sull\'acqua e l\'unica notte in ryokan, con l\'onsen privato.' },
  { id: 'kamakura', nome: 'Kamakura e Yokohama', kanji: '鎌倉', romaji: 'Kamakura', colore: '#3D7EA6', lat: 35.3192, lng: 139.5467, clima: { max: 31, min: 24 },
    intro: 'L\'isola di Enoshima, il Grande Buddha e il porto di Yokohama di notte.' },
  { id: 'fuji', nome: 'Fujiyoshida', kanji: '富士', romaji: 'Fujiyoshida', colore: '#B83B5E', lat: 35.4876, lng: 138.8075, clima: { max: 28, min: 19 },
    intro: 'Le montagne russe del Fuji-Q, il villaggio di Naruto, la pagoda Chureito e la festa del fuoco.' },
]

const GIORNI: DefGiorno[] = [
  // 0 · dom 8/8
  { citta: 'tokyo', titolo: 'Arrivo e prima sera ad Asakusa', alloggio: 'mimaruAsakusa',
    intro: 'Atterraggio alle 14:00, check-in ad Asakusa e il primo giro di sera.',
    tappe: [
      tappa('g0-1', '14:00', 'Arrivo in aeroporto', 'spostamento', 'Immigrazione e bagagli. Suica sull\'iPhone (Welcome Suica Mobile) o PASMO di plastica per gli Android, contanti al bancomat del 7-Eleven, eSIM attiva.', { luogo: 'haneda' }),
      tappa('g0-2', '15:30', 'Treno per Asakusa', 'spostamento', 'Linea Toei Asakusa diretta: circa 45 minuti da Haneda, 60–70 da Narita.', { spostamento: treno(50) }),
      tappa('g0-3', '17:00', 'Check-in al MIMARU', 'hotel', 'Appartamento da 35 m² con cucina e lavatrice a gettoni.', { luogo: 'mimaruAsakusa' }),
      tappa('g0-4', '18:00', 'Senso-ji illuminato', 'visita', 'Kaminarimon e Senso-ji di sera, senza folla.', { luogo: 'sensoji' }),
      tappa('g0-5', '19:00', 'Primo sushi al Kura Sushi ROX', 'cibo', 'Sushi a nastro, ¥1.000–1.300 a testa, giochino a premi ogni 5 piatti. In alternativa stufato e birra a Hoppy-dori.', { luogo: 'kuraRox' }),
      tappa('g0-6', '20:30', 'Don Quijote e il ponte Azuma', 'libero', 'Primo giro di snack al Don Quijote, poi lo Skytree illuminato dal ponte Azuma.', { luogo: 'azumabashi' }),
    ],
    consigli: ['Il primo giorno serve poco: IC card, contanti, eSIM. Il resto si vede domani all\'alba.'],
    suggerimenti: [cibo('Spiedini di Hoppy-dori', 'nikomi e birra nella via degli izakaya', 'Hoppy Street Asakusa'), souvenir('Don Quijote Asakusa', 'snack, Kit Kat ai gusti strani, cosmetici; aperto fino a tardi', 'Don Quijote Asakusa')],
  },
  // 1 · lun 9/8
  { citta: 'tokyo', titolo: 'Asakusa all\'alba, Kappabashi, Akihabara fino a notte', alloggio: 'mimaruAsakusa',
    intro: 'Il tempio vuoto, la via degli utensili, poi tutto il pomeriggio e la sera ad Akihabara.',
    tappe: [
      tappa('g1-1', '07:00', 'Senso-ji vuoto', 'visita', 'Senso-ji e Kaminarimon all\'alba: le foto si fanno adesso.', { luogo: 'sensoji' }),
      tappa('g1-2', '08:00', 'Colazione di strada e Nakamise', 'cibo', 'Melonpan di Kagetsudō, age-manjū, ningyō-yaki; alle 9:30 aprono le bancarelle di Nakamise.', { luogo: 'nakamise' }),
      tappa('g1-3', '10:00', 'Kappabashi', 'visita', 'La via degli utensili da cucina (il lunedì è aperta): cibo finto, ceramiche, noren. I coltelli si comprano l\'ultimo giorno.', { luogo: 'kappabashi', orari: { chiusoIl: [0], nota: `Molti negozi chiudono la domenica. ${VERIFICA}` } }),
      tappa('g1-4', '12:00', 'Tendon e Tsukuba Express', 'cibo', 'Pranzo di tendon ad Asakusa, poi 4 minuti di Tsukuba Express fino ad Akihabara.'),
      tappa('g1-5', '13:30', 'Akihabara: Radio Kaikan e Mandarake', 'visita', 'Radio Kaikan (10 piani di figure e carte), Mandarake Complex (apre alle 12), Surugaya, Gachapon Kaikan, Kotobukiya.', { luogo: 'radioKaikan' }),
      tappa('g1-6', '14:45', 'Super Potato', 'visita', 'Retrogame su tre piani e sala giochi al 5F a ¥100. Si va per guardare: i prezzi sono alti.', { luogo: 'superPotato' }),
      tappa('g1-7', '16:00', 'UFO catcher e purikura', 'libero', 'Taito Station e GiGO per gli UFO catcher (tetto di ¥1.000–2.000 a testa), HEY per sparatutto e retro.', { luogo: 'taitoAkiba', consiglio: 'Guardate prima chi gioca, preferite le scatole su due sbarre e chiedete al personale di spostare il premio.' }),
      tappa('g1-8', '17:00', 'Batting center sul tetto', 'libero', 'Yodobashi Akiba, 9F, 10:30–22:00: 7 gabbie, lanci da 80 a 170 km/h, tessera da 3 turni ¥1.100, solo contanti. Il baseball del viaggio si fa qui.', { luogo: 'yodobashiAkiba', orari: { chiusoIl: [], apre: '10:30', chiude: '22:00', nota: VERIFICA } }),
      tappa('g1-9', '18:30', 'Maid café', 'cibo', '@home cafe Main Building o Maidreamin, pacchetto da 1 ora (¥2.500–4.000 a testa con foto). Niente foto alle cameriere.', { luogo: 'atHome', biglietti: null, consiglio: 'Maidreamin trattiene il 50% se si disdice due giorni prima.' }),
      tappa('g1-10', '21:00', 'Karaoke Pasela', 'libero', 'Stanze in collaborazione con gli anime. Al banco: "3 nin, free time, nomihōdai" (fino a chiusura, bevande illimitate).', { luogo: 'pasela' }),
    ],
    suggerimenti: [cibo('Melonpan di Kagetsudō', 'appena sfornato, ad Asakusa', 'Asakusa Kagetsudo'), cibo('Age-manjū di Asakusa Kokonoe', 'dolcetti fritti ripieni', 'Asakusa Kokonoe'), souvenir('Tansu-ya', 'yukata usati da ¥2.000–5.000', 'Tansuya Asakusa'), souvenir('Gachapon Kaikan', 'centinaia di macchinette a capsule, ¥200–500', 'Akihabara Gachapon Kaikan')],
  },
  // 2 · mar 10/8
  { citta: 'tokyo', titolo: 'Harajuku, Shibuya, vintage a Shimokitazawa, notte a Shinjuku', alloggio: 'mimaruAsakusa',
    intro: 'Il bosco di Meiji, i negozi nerd di PARCO, il vintage e la sera nei vicoli di Shinjuku.',
    tappe: [
      tappa('g2-1', '07:30', 'Meiji Jingu', 'visita', 'Il santuario nel bosco: all\'alba fa fresco.', { luogo: 'meiji' }),
      tappa('g2-2', '08:45', 'Takeshita-dori e Omotesando', 'visita', 'Takeshita ancora vuota, poi Omotesando e l\'Oriental Bazaar (souvenir tradizionali, il martedì è aperto).', { luogo: 'takeshita' }),
      tappa('g2-3', '10:00', 'Shibuya PARCO', 'visita', 'Nintendo TOKYO (biglietto numerato gratis al 1F prima delle 10), Capcom Store e Jump Shop al 6F, Gundam Base Shibuya al 5F.', { luogo: 'parco', orari: { chiusoIl: [], apre: '10:00', chiude: '21:00', nota: VERIFICA } }),
      tappa('g2-4', '11:15', 'Gyukatsu Motomura', 'cibo', 'Cotoletta di wagyu da finire sulla pietra calda, set da ¥2.110. Non prenota: alle 11 la coda è minima.', { luogo: 'motomura' }),
      tappa('g2-5', '12:15', 'Shibuya Crossing e negozi', 'visita', 'L\'incrocio dall\'alto (Starbucks Tsutaya), Hachiko, Shibuya 109, MEGA Don Quijote, Loft, Hands, Miyashita Park.', { luogo: 'crossing' }),
      tappa('g2-6', '14:00', 'Cat Street', 'visita', 'Fra Shibuya e Harajuku: marche giapponesi e vintage. Kiddy Land su Omotesando.', { luogo: 'catStreet' }),
      tappa('g2-7', '15:30', 'Vintage a Shimokitazawa', 'visita', 'Flamingo, New York Joe Exchange, 2nd Street, RAGTAG, Haight & Ashbury. Camicie vintage da ¥2.000.', { luogo: 'shimokita' }),
      tappa('g2-8', '17:45', 'Shibuya Sky al tramonto', 'visita', 'La terrazza scoperta sopra l\'incrocio; il tramonto è verso le 18:30.', { luogo: 'shibuyaSky', biglietti: 'https://www.shibuya-scramble-square.com/sky/', orari: { chiusoIl: [], apre: '10:00', chiude: '22:30', nota: VERIFICA } }),
      tappa('g2-9', '19:30', 'Omoide Yokocho', 'cibo', 'Yakitori sotto i binari di Shinjuku, poi la testa di Godzilla a Kabukicho.', { luogo: 'omoide' }),
      tappa('g2-10', '21:00', 'Golden Gai', 'libero', '200 bar da sei posti; coperto ¥500–1.000, contanti. Alcuni bar non vogliono foto.', { luogo: 'goldenGai' }),
    ],
    suggerimenti: [cibo('Crêpe di Harajuku', 'Marion Crêpes su Takeshita', 'Marion Crepes Harajuku'), cibo('Nigiri di wagyu da Sagoemon', '¥300 la coppia', 'Sagoemon Shibuya'), souvenir('Shibuya 109 e Laforet', 'moda giovane giapponese', 'Shibuya 109'), souvenir('Oriental Bazaar', 'yukata, ceramiche, stampe', 'Oriental Bazaar Omotesando')],
  },
  // 3 · mer 11/8, festa
  { citta: 'tokyo', titolo: 'Tokyo est: arte digitale, Gundam Base, la vecchia Edo e i fuochi sul fiume', alloggio: 'mimaruAsakusa',
    intro: 'Mountain Day, festa nazionale: teamLab, Odaiba, Tsukishima, Fukagawa e il Kōtō Hanabi.',
    tappe: [
      tappa('g3-1', '09:00', 'teamLab Planets', 'visita', 'Arte digitale in cui si cammina scalzi nell\'acqua.', { luogo: 'teamlab', biglietti: 'https://www.teamlab.art/e/planets/', consiglio: 'Controllate che sia ancora aperto nel 2027.' }),
      tappa('g3-2', '11:00', 'The Gundam Base Tokyo', 'visita', 'A Odaiba, dentro DiverCity, ingresso gratis: Gunpla, esposizioni, angolo per montarli. L\'Unicorn gigante non c\'è più dal 2026. Facoltativo: Tokyo Joypolis.', { luogo: 'gundamBase' }),
      tappa('g3-3', '13:00', 'Monjayaki a Tsukishima', 'cibo', 'La frittella cremosa che si cuoce da soli sulla piastra (Kondo, Moheji).', { luogo: 'tsukishima' }),
      tappa('g3-4', '14:30', 'Fukagawa Edo Museum', 'visita', 'Un quartiere di Edo dell\'Ottocento ricostruito al chiuso, con le case in cui si entra (¥400). Poi il giardino Kiyosumi.', { luogo: 'fukagawa', orari: { chiusoIl: [], apre: '09:30', chiude: '17:00', nota: `Chiuso il 2° e 4° lunedì del mese. ${VERIFICA}` } }),
      tappa('g3-5', '16:15', 'Tomioka Hachimangū', 'visita', 'Il santuario di Fukagawa, che nel 2027 compie 400 anni.', { luogo: 'tomioka' }),
      tappa('g3-6', '17:30', 'Posto sull\'argine a Sunamachi', 'libero', 'Spesa al konbini e posto sull\'argine dell\'Arakawa (Tōzai Line fino a Minami-Sunamachi).', { luogo: 'sunamachi' }),
      tappa('g3-7', '19:00', 'Kōtō Hanabi', 'evento', 'Un\'ora di fuochi d\'artificio sul fiume, circa 6.000 colpi, gratis.', { luogo: 'sunamachi', evento: evento('Kōtō Hanabi', '江東花火大会', 'probabile', 'https://www.city.koto.lg.jp/101000/kotohanabi.html'), consiglio: 'Nel 2025 e nel 2026 è stato annullato per il meteo: si decide in giornata. Piano B: Tokyo Tower illuminata e yakitori a Yurakucho.' }),
    ],
    avvisi: [info('Festa nazionale: Tsukiji e Toyosu sono chiusi, e anche il mercoledì.')],
    suggerimenti: [cibo('Fukagawa-meshi', 'il riso con le vongole del quartiere', 'Fukagawa meshi'), cibo('Kakigori', 'granita giapponese, per il caldo', 'Kiyosumi Shirakawa kakigori'), souvenir('Gunpla', 'kit alla Gundam Base', 'DiverCity Tokyo Plaza')],
  },
  // 4 · gio 12/8, Nikko in giornata
  { citta: 'nikko', titolo: 'Nikko in giornata: templi nel bosco, lago e cascata', alloggio: 'mimaruAsakusa',
    intro: 'Spacia X da Asakusa, il Tōshōgū, il lago Chuzenji e la cascata Kegon. Stasera partono le valigie per Kyoto.',
    tappe: [
      tappa('g4-1', '07:00', 'Spacia X Asakusa → Nikko', 'spostamento', 'Tobu, circa 1 h 50. Prenotate andata e ritorno insieme.', { luogo: 'asakusaTobu', biglietti: null, spostamento: treno(110) }),
      tappa('g4-2', '09:00', 'Ponte Shinkyo e Rinno-ji', 'visita', 'Il ponte rosso sul fiume Daiya, poi il tempio Rinno-ji.', { luogo: 'shinkyo' }),
      tappa('g4-3', '10:00', 'Nikko Tōshōgū', 'visita', 'Le tre scimmie, il gatto che dorme, la porta Yomeimon.', { luogo: 'toshogu', orari: { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: `Ultimo ingresso 16:30. ${VERIFICA}` } }),
      tappa('g4-4', '12:00', 'Pranzo di yuba', 'cibo', 'La specialità di Nikko: la pellicola del latte di soia, in mille forme.'),
      tappa('g4-5', '13:00', 'Lago Chuzenji', 'visita', 'Bus in salita lungo i tornanti di Irohazaka. La funivia di Akechidaira è chiusa.', { luogo: 'chuzenji' }),
      tappa('g4-6', '14:30', 'Cascata Kegon', 'visita', '97 metri; l\'ascensore porta alla piattaforma in basso.', { luogo: 'kegon' }),
      tappa('g4-7', '17:15', 'Spacia X Nikko → Asakusa', 'spostamento', 'Se avanza tempo prima del treno: la fila di statue Jizo di Kanmangafuchi, gratis.', { spostamento: treno(110) }),
      tappa('g4-8', '19:30', 'Izakaya ad Ameyoko', 'cibo', 'Spiedini sotto i binari di Ueno. Poi le valigie alla reception per Yamato: arrivano a Kyoto.', { luogo: 'ameyoko' }),
    ],
    consigli: ['Da domani si gira con uno zaino per tre giorni: le valigie viaggiano con Yamato fino all\'hotel di Kyoto (~¥3.100 l\'una).'],
    suggerimenti: [cibo('Age-yuba manjū', 'panino di yuba fritto', 'Nikko yuba manju'), cibo('Kakigori di ghiaccio naturale', 'il ghiaccio delle cave di Nikko', 'Nikko kakigori'), souvenir('Nikko-bori', 'legno intagliato', 'Nikko bori')],
  },
  // 5 · ven 13/8, Kanazawa
  { citta: 'kanazawa', titolo: 'Kanazawa: mercato, giardino, samurai e geishe', alloggio: 'dormyKanazawa',
    intro: 'Kagayaki da Ueno nel primo giorno dell\'Obon, poi Omicho, Kenrokuen, Nagamachi e Higashi Chaya.',
    tappe: [
      tappa('g5-1', '07:30', 'Kagayaki Ueno → Kanazawa', 'spostamento', 'Circa 2 h 40, solo posti riservati. Primo giorno dell\'Obon: treni pieni.', { luogo: 'ueno', biglietti: null, spostamento: treno(160) }),
      tappa('g5-2', '10:30', 'Zaini in hotel', 'hotel', 'Dormy Inn, 2 minuti dall\'uscita est. Foto alla Porta Tsuzumi.', { luogo: 'dormyKanazawa' }),
      tappa('g5-3', '11:00', 'Mercato Omicho', 'cibo', 'Kaisendon, ostriche, spiedini di nodoguro.', { luogo: 'omicho' }),
      tappa('g5-4', '12:45', 'Kenrokuen', 'visita', 'Uno dei tre giardini più belli del Giappone. Il castello si vede dal parco.', { luogo: 'kenrokuen', orari: { chiusoIl: [], apre: '07:00', chiude: '18:00', nota: VERIFICA } }),
      tappa('g5-5', '14:30', 'Nagamachi', 'visita', 'Il quartiere samurai: muri di fango, canali, casa Nomura col giardino.', { luogo: 'nagamachi' }),
      tappa('g5-6', '16:15', 'Higashi Chaya', 'visita', 'Le case da tè, il gelato con la foglia d\'oro da Hakuichi, la ceramica Kutani.', { luogo: 'higashiChaya' }),
      tappa('g5-7', '18:30', 'Maimon Sushi', 'cibo', 'Sushi a nastro di livello col pesce del mar del Giappone.', { luogo: 'maimon' }),
      tappa('g5-8', '20:00', 'Katamachi', 'libero', 'Bar e izakaya dove escono i ragazzi di Kanazawa.', { luogo: 'katamachi' }),
    ],
    avvisi: [attenzione('Il treno di oggi è nel primo giorno dell\'Obon: posti da prenotare un mese prima, il 13/7 alle 3:00 ora italiana.'), info('Il Museo del XXI secolo è chiuso per lavori fino a marzo 2028.')],
    suggerimenti: [cibo('Gelato all\'oro', 'coperto di foglia d\'oro, da Hakuichi', 'Hakuichi Higashiyama'), cibo('Curry di Kanazawa', 'denso, con la cotoletta', 'Go Go Curry Kanazawa'), souvenir('Foglia d\'oro', 'Hakuichi e Sakuda: cosmetici, bacchette, piattini', 'Sakuda Gold Leaf'), souvenir('Ceramica Kutani', 'colori vivaci, nei negozi di Higashi Chaya', 'Kutani ware Kanazawa')],
  },
  // 6 · sab 14/8, Shirakawa-go e Takayama
  { citta: 'takayama', titolo: 'Shirakawa-go sulla strada, sera a Takayama', alloggio: 'tokyuTakayama',
    intro: 'Il villaggio coi tetti di paglia, poi le vie di legno di Takayama.',
    tappe: [
      tappa('g6-1', '08:00', 'Bus Kanazawa → Shirakawa-go', 'spostamento', 'Circa 1 h 15 dall\'uscita ovest della stazione. Prenotate anche Shirakawa-go → Takayama: i posti finiscono.', { luogo: 'kanazawaSt', biglietti: null, spostamento: { modo: 'mezzi', minuti: 75 } }),
      tappa('g6-2', '09:30', 'Shirakawa-go', 'visita', 'Ogimachi: le case gassho Wada-ke e Kanda-ke.', { luogo: 'ogimachi' }),
      tappa('g6-3', '11:00', 'Belvedere Shiroyama', 'visita', 'La foto del villaggio dall\'alto (navetta o 20 minuti a piedi).', { luogo: 'shiroyama' }),
      tappa('g6-4', '12:00', 'Manzo di Hida da passeggio', 'cibo', 'Korokke (¥250), spiedino (¥600), nigiri su cialda di riso da Okesa.', { luogo: 'ogimachi' }),
      tappa('g6-5', '13:30', 'Bus Shirakawa-go → Takayama', 'spostamento', 'Circa 50 minuti. Zaini in hotel, accanto alla stazione.', { biglietti: null, spostamento: { modo: 'mezzi', minuti: 50 } }),
      tappa('g6-6', '15:00', 'Sanmachi Suji', 'visita', 'Le vie di case mercantili in legno. Le distillerie con la palla di cedro sulla porta offrono assaggi di sake.', { luogo: 'sanmachi' }),
      tappa('g6-7', '16:15', 'Takayama Jinya e ponte Nakabashi', 'visita', 'L\'unico palazzo del governo shogunale rimasto (ultimo ingresso 16:30), poi il ponte rosso.', { luogo: 'jinya', consiglio: 'Orari da verificare.' }),
      tappa('g6-8', '17:00', 'Templi di Higashiyama', 'visita', 'Il sentiero sulla collina dietro la città vecchia.', { luogo: 'higashiyamaTakayama' }),
      tappa('g6-9', '18:30', 'Manzo di Hida sul hoba-miso', 'cibo', 'Il manzo cotto sul miso su una grande foglia di magnolia; oppure ramen di Takayama.'),
    ],
    avvisi: [info('Variante Comiket (14–15/8, Tokyo Big Sight): un vero fan può restare a Tokyo il 14 e raggiungere gli altri a Kyoto il 15.')],
    suggerimenti: [cibo('Nigiri di Hida su senbei', 'manzo scottato su cialda di riso', 'Kotteushi Takayama'), cibo('Mitarashi dango', 'spiedini di riso alla soia', 'Takayama mitarashi dango'), souvenir('Sarubobo', 'le bamboline portafortuna senza volto', 'Takayama sarubobo'), souvenir('Sake di Takayama', 'dalle distillerie di Sanmachi', 'Funasaka Sake Brewery')],
  },
  // 7 · dom 15/8, Nara
  { citta: 'kyoto', titolo: 'Mercato del mattino a Takayama, poi la notte delle lanterne a Nara', alloggio: 'mimaruKyoto',
    intro: 'Treno Hida e Shinkansen fino a Kyoto, poi Nara: Tōdai-ji di giorno, tre feste dell\'Obon di sera.',
    tappe: [
      tappa('g7-1', '07:00', 'Mercato del mattino di Miyagawa', 'cibo', 'Sottaceti, mele, mitarashi dango lungo il fiume.', { luogo: 'miyagawa' }),
      tappa('g7-2', '09:45', 'Hida Takayama → Nagoya → Kyoto', 'spostamento', 'Treno Hida fino a Nagoya (circa 2 h 20), poi Shinkansen fino a Kyoto (35 min). Obon: tutto riservato.', { luogo: 'takayamaSt', biglietti: null, spostamento: treno(175) }),
      tappa('g7-3', '13:15', 'Kintetsu per Nara', 'spostamento', 'Zaini negli armadietti della stazione Kintetsu Nara.', { luogo: 'kintetsuNara', spostamento: treno(45) }),
      tappa('g7-4', '14:30', 'Cervi e mochi di Nakatanidō', 'cibo', 'I cervi del parco e i mochi pestati a mano velocissimi.', { luogo: 'naraPark' }),
      tappa('g7-5', '15:15', 'Tōdai-ji', 'visita', 'Il Grande Buddha (~¥800), poi Naramachi, le vecchie case dei mercanti.', { luogo: 'todaiji', orari: { chiusoIl: [], apre: '07:30', chiude: '17:30', nota: VERIFICA } }),
      tappa('g7-6', '17:30', 'Cena presto a Naramachi', 'cibo', 'Stasera si sta in piedi fino alle 21:30.', { luogo: 'naramachi' }),
      tappa('g7-7', '18:30', 'Kasuga Chūgen Mantōrō', 'evento', 'Circa 3.000 lanterne di pietra e bronzo accese; recinto esterno gratis.', { luogo: 'kasuga', evento: evento('Kasuga Chūgen Mantōrō', '春日大社 中元万燈籠', 'probabile', 'https://www.jalan.net/kankou/spt_guide000000212177/event/') }),
      tappa('g7-8', '20:00', 'Nara Daimonji Okuribi', 'evento', 'Dal prato di Tobihino: si accende l\'ideogramma 大 sul monte Takamado.', { luogo: 'tobihino', evento: evento('Nara Daimonji Okuribi', '奈良大文字送り火', 'probabile', 'https://narashikanko.or.jp/asset/daimonji/naradaimonji2025') }),
      tappa('g7-9', '20:30', 'Tōdai-ji Mantō Kuyōe', 'evento', 'Si apre la finestra sul volto del Grande Buddha: succede solo a Capodanno e in questa sera.', { luogo: 'todaiji', evento: evento('Tōdai-ji Mantō Kuyōe', '東大寺 万灯供養会', 'probabile') }),
      tappa('g7-10', '21:45', 'Rientro a Kyoto', 'spostamento', 'Kintetsu per Kyoto; in hotel vi aspettano le valigie spedite da Tokyo.', { luogo: 'mimaruKyoto', spostamento: treno(50) }),
    ],
    avvisi: [attenzione('Treno Hida e Shinkansen del 15/8 in pieno Obon: prenotazione il 15/7 alle 3:00 ora italiana.')],
    suggerimenti: [cibo('Kakinoha-zushi', 'sushi avvolto in foglie di cachi', 'Kakinoha zushi Nara'), cibo('Mochi di Nakatanidō', 'all\'artemisia, pestati al momento', 'Nakatanidou Nara'), souvenir('Shika senbei', 'i biscotti per i cervi, ¥200', 'Nara Park')],
  },
  // 8 · lun 16/8, Kyoto Okuribi
  { citta: 'kyoto', titolo: 'Bambù all\'alba, Padiglione d\'Oro, museo del manga, i fuochi sulle montagne', alloggio: 'mimaruKyoto',
    intro: 'Arashiyama prima della folla, Kinkaku-ji e Ryoan-ji, poi la sera del Gozan no Okuribi.',
    tappe: [
      tappa('g8-1', '07:30', 'Foresta di bambù di Arashiyama', 'visita', 'Ancora vuota a quest\'ora.', { luogo: 'bambu' }),
      tappa('g8-2', '08:30', 'Tenryu-ji e villa Okochi', 'visita', 'Il giardino del Tenryu-ji, poi la villa Okochi Sanso (¥1.000 con matcha) e il ponte Togetsukyo.', { luogo: 'tenryuji', orari: { chiusoIl: [], apre: '08:30', chiude: '17:00', nota: `Orari del giardino. ${VERIFICA}` } }),
      tappa('g8-3', '11:00', 'Kinkaku-ji', 'visita', 'Il Padiglione d\'Oro (taxi per 3 da Arashiyama, ~¥3.000).', { luogo: 'kinkakuji', orari: { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: VERIFICA } }),
      tappa('g8-4', '12:00', 'Ryoan-ji', 'visita', 'Il giardino di pietre.', { luogo: 'ryoanji' }),
      tappa('g8-5', '13:00', 'Saba-zushi da Izuju', 'cibo', 'Da portare via, a Gion. Izuju chiude mercoledì e giovedì; in pieno Obon potrebbe essere chiuso: c\'è il 17 come riserva.', { luogo: 'izuju' }),
      tappa('g8-6', '14:30', 'Kyoto International Manga Museum', 'visita', 'In una vecchia scuola: un muro di 50.000 manga da leggere seduti in terra.', { luogo: 'manga', orari: { chiusoIl: [3], apre: '10:00', chiude: '17:30', nota: `Chiuso il mercoledì. ${VERIFICA}` } }),
      tappa('g8-7', '17:00', 'Santuario Shimogamo', 'visita', 'La foresta Tadasu no Mori, con la fiera del libro usato fino al 16.', { luogo: 'shimogamo' }),
      tappa('g8-8', '18:30', 'Posto sul delta del Kamo', 'libero', 'A Demachiyanagi, la vista più famosa sul Daimonji. Pieno dalle 18:30.', { luogo: 'kamoDelta' }),
      tappa('g8-9', '20:00', 'Gozan no Okuribi', 'evento', 'Il 大 sul monte Daimonji alle 20:00, poi Myō-Hō alle 20:05; gli altri fino alle 20:20. Dopo, treni pieni fino alle 22: si torna a piedi.', { luogo: 'kamoDelta', evento: evento('Gozan no Okuribi', '京都五山送り火', 'certa', 'https://kyototravel.info/gozannookuribi'), consiglio: 'Alternativa: le lanterne galleggianti di Arashiyama (19:00–21:00), ma da lì si vede solo il fuoco a forma di torii.' }),
    ],
    suggerimenti: [cibo('Crocchette di yuba ad Arashiyama', 'sulla via principale', 'Arashiyama Nakamuraya'), cibo('Gelato al matcha', 'ad Arashiyama', 'Arashiyama matcha soft serve'), souvenir('Bambù e chirimen', 'oggetti di bambù e crespo di seta', 'Arashiyama Chirimen Saiku')],
  },
  // 9 · mar 17/8
  { citta: 'kyoto', titolo: 'Fushimi Inari, sake, Kiyomizu, Nishiki e Gion in yukata', alloggio: 'mimaruKyoto',
    intro: 'I torii all\'alba, il quartiere del sake, Higashiyama, il mercato e la sera sulle terrazze di Pontocho.',
    tappe: [
      tappa('g9-1', '06:00', 'Fushimi Inari', 'visita', 'Keihan diretta dall\'hotel, tre fermate. Salita fino al belvedere Yotsutsuji, circa un\'ora fra i torii.', { luogo: 'inari' }),
      tappa('g9-2', '09:30', 'Sake a Fushimi', 'visita', 'Museo Gekkeikan Okura con degustazione, case di legno sul canale. Chiuso per l\'Obon fino al 16: oggi apre.', { luogo: 'gekkeikan' }),
      tappa('g9-3', '11:30', 'Kiyomizu-dera e Sannenzaka', 'visita', 'Dalla Gojōzaka con le botteghe di ceramica; poi Sannenzaka, Ninenzaka e la pagoda Yasaka.', { luogo: 'kiyomizu' }),
      tappa('g9-4', '13:00', 'Kyoto Katsugyu', 'cibo', 'Cotoletta di manzo a Gojozaka, ~¥2.000.', { luogo: 'katsugyu' }),
      tappa('g9-5', '14:00', 'Mercato Nishiki e Aritsugu', 'visita', '400 m di banchi coperti; coltelli Aritsugu con incisione (ultimo ingresso 16:30).', { luogo: 'nishiki', orari: { chiusoIl: [3], apre: '09:00', chiude: '17:00', nota: `Orari di Aritsugu; molti banchi chiudono il mercoledì. ${VERIFICA}` } }),
      tappa('g9-6', '15:30', 'Teramachi e Shinkyōgoku', 'visita', 'Bacchette Ichihara Heibei, incensi Shōyeidō, tè Ippodō, yukata e kimono usati.', { luogo: 'teramachi' }),
      tappa('g9-7', '17:30', 'Gion in yukata', 'visita', 'Yukata a noleggio, santuario Yasaka, Hanamikoji, canale Shirakawa. Nelle vie private di Gion le foto sono vietate.', { luogo: 'yasaka', biglietti: null }),
      tappa('g9-8', '19:30', 'Cena sulle terrazze di Pontocho', 'cibo', 'Le terrazze di legno sopra il Kamo (yuka), solo d\'estate.', { luogo: 'pontocho', biglietti: null }),
      tappa('g9-9', '21:30', 'Kawaramachi', 'libero', 'Sala giochi o karaoke.'),
    ],
    suggerimenti: [cibo('Inari-zushi', 'a Fushimi', 'Fushimi Inari inari sushi'), cibo('Nama-yatsuhashi', 'assaggi gratis sulle salite del Kiyomizu', 'Ninenzaka Kyoto'), cibo('Dashimaki di Miki Keiran', 'frittata al brodo, a Nishiki', 'Miki Keiran Nishiki'), souvenir('Ceramica Kiyomizu-yaki', 'tazzine ¥1.500–5.000 sulla Gojōzaka', 'Gojozaka Kyoto'), souvenir('Ichihara Heibei', 'bacchette dal 1764', 'Ichihara Heibei Kyoto')],
  },
  // 10 · mer 18/8
  { citta: 'kyoto', titolo: 'Uji e il matcha, castello di Nijō, il villaggio dei samurai', alloggio: 'mimaruKyoto',
    intro: 'Il Byōdō-in della moneta da 10 yen, il tè di Uji, il castello e gli studi dei film di samurai.',
    tappe: [
      tappa('g10-1', '08:00', 'Keihan per Uji', 'spostamento', 'Circa 30 minuti dall\'hotel.', { spostamento: treno(30) }),
      tappa('g10-2', '08:45', 'Byōdō-in', 'visita', 'Il Padiglione della Fenice della moneta da 10 yen (¥700).', { luogo: 'byodoin' }),
      tappa('g10-3', '10:00', 'Matcha di Uji', 'cibo', 'La via del tè davanti al Byōdō-in, poi parfait da Nakamura Tokichi Honten.', { luogo: 'tokichi' }),
      tappa('g10-4', '13:00', 'Castello di Nijō', 'visita', 'Il palazzo Ninomaru coi pavimenti "a usignolo" che cantano quando li calpesti.', { luogo: 'nijo', orari: { chiusoIl: [2], apre: '08:45', chiude: '17:00', nota: `Ultimo ingresso 16:00; il palazzo è chiuso il martedì di agosto. ${VERIFICA}` } }),
      tappa('g10-5', '14:45', 'Toei Kyoto Studio Park', 'visita', 'Uzumasa Eigamura: set dei film di samurai, attori in costume, ninja. Rinnovato a marzo 2026, con apertura serale.', { luogo: 'eigamura', consiglio: 'Orari e prezzo da verificare (~¥2.400 nel 2024).' }),
      tappa('g10-6', '19:00', 'Kyoto Ramen Koji', 'cibo', 'La via dei ramen al 10° piano della stazione, poi la terrazza Skyway gratis.', { luogo: 'kyotoSt' }),
    ],
    suggerimenti: [cibo('Soba e dango al matcha', 'sulla via del Byōdō-in', 'Byodoin Omotesando'), souvenir('Tè di Uji in latta', 'il souvenir migliore per peso e prezzo', 'Nakamura Tokichi Uji'), souvenir('Omiyage della stazione', 'Porta e Isetan: yatsuhashi, Kit Kat al matcha', 'Kyoto Station Porta')],
  },
  // 11 · gio 19/8
  { citta: 'kyoto', titolo: 'Kurama e Kibune, sentiero della Filosofia, una sera da kyototi', alloggio: 'mimaruKyoto',
    intro: 'Montagna e spaghetti nel bambù, i templi di Higashiyama e la sera sull\'argine del Kamo.',
    tappe: [
      tappa('g11-1', '08:00', 'Eizan per Kurama', 'spostamento', 'Keihan fino a Demachiyanagi, poi il trenino Eizan.', { spostamento: treno(45) }),
      tappa('g11-2', '08:45', 'Kurama-dera', 'visita', 'Il tempio sulla montagna, poi il sentiero nel bosco fino a Kibune (circa 1 h).', { luogo: 'kurama' }),
      tappa('g11-3', '10:30', 'Nagashi somen da Hirobun', 'cibo', 'Gli spaghettini scendono nel bambù sopra il torrente (¥2.000, cassa dalle 10:30, niente prenotazioni, annullato se il fiume sale).', { luogo: 'hirobun' }),
      tappa('g11-4', '12:00', 'Santuario Kibune', 'visita', 'Il foglietto della fortuna si legge bagnandolo nell\'acqua.', { luogo: 'kibune', orari: { chiusoIl: [], apre: '06:00', chiude: '20:00', nota: VERIFICA } }),
      tappa('g11-5', '13:30', 'Mame-mochi di Demachi Futaba', 'cibo', 'Si fa la coda; poi la galleria di quartiere Masugata.', { luogo: 'demachi' }),
      tappa('g11-6', '14:45', 'Ginkaku-ji', 'visita', 'Il Padiglione d\'Argento.', { luogo: 'ginkakuji', orari: { chiusoIl: [], apre: '08:30', chiude: '17:00', nota: VERIFICA } }),
      tappa('g11-7', '15:30', 'Sentiero della Filosofia', 'visita', 'Lungo il canale fino al Nanzen-ji e al suo acquedotto di mattoni.', { luogo: 'filosofia' }),
      tappa('g11-8', '18:00', 'Birra sull\'argine del Kamo', 'libero', 'Birra del konbini seduti a Sanjō, dove i ragazzi si mettono tutti alla stessa distanza.', { luogo: 'sanjo' }),
      tappa('g11-9', '19:00', 'Cena di obanzai', 'cibo', 'La cucina di casa di Kyoto: piattini al bancone, ~¥1.500–3.000.'),
      tappa('g11-10', '20:30', 'Tachinomi di Kiyamachi', 'libero', 'Bar in piedi lungo il canale.', { luogo: 'kiyamachi' }),
    ],
    suggerimenti: [cibo('Mame-mochi', 'mochi coi fagioli di Demachi Futaba', 'Demachi Futaba'), souvenir('Sansho di Kurama', 'il pepe di montagna', 'Kurama Kyoto'), souvenir('Tsukemono', 'sottaceti di Kyoto', 'Nishiki Market')],
  },
  // 12 · ven 20/8, Osaka
  { citta: 'osaka', titolo: 'Osaka: torneo dei licei, poi Dotonbori di notte', alloggio: 'forza',
    intro: 'Kōshien (o la Torre del Sole), mercato Kuromon, la via degli utensili e la sera a Dotonbori.',
    tappe: [
      tappa('g12-1', '07:30', 'Keihan Kyoto → Osaka', 'spostamento', 'Da Kiyomizu-Gojo; valigie al Forza (deposito gratis).', { luogo: 'forza', spostamento: treno(50) }),
      tappa('g12-2', '09:30', 'Kōshien, il baseball dei licei', 'evento', 'Torneo nazionale (semifinali previste verso il 20/8): bande, cori, uno stadio intero che tifa per tutti. Hanshin diretta da Namba. Esterni ¥300–1.000.', { luogo: 'koshien', biglietti: null, evento: evento('Kōshien, torneo estivo dei licei', '全国高等学校野球選手権大会', 'probabile'), consiglio: 'Alternativa: la Torre del Sole nel parco dell\'Expo \'70 (~¥720 più ¥260, chiusa il mercoledì) e la ruota Osaka Wheel. Cappello, acqua e sale se andate a Kōshien.' }),
      tappa('g12-3', '15:00', 'Mercato Kuromon', 'cibo', 'Capesante alla piastra, ricci di mare, spiedini di wagyu.', { luogo: 'kuromon' }),
      tappa('g12-4', '16:15', 'Sennichimae Doguyasuji', 'visita', 'La galleria degli utensili: coltelli Sakai Ichimonji Mitsuhide, cibo finto, piastre per takoyaki. Chiude verso le 18.', { luogo: 'doguyasuji' }),
      tappa('g12-5', '17:45', 'Hozenji Yokocho', 'visita', 'Il Buddha coperto di muschio; la testa di leone del santuario Namba Yasaka.', { luogo: 'hozenji' }),
      tappa('g12-6', '18:45', 'Dotonbori', 'visita', 'L\'insegna Glico illuminata; okonomiyaki da Mizuno (si fa la coda), takoyaki per strada.', { luogo: 'dotonbori' }),
      tappa('g12-7', '20:30', 'Ura-Namba e Jankara', 'libero', 'Izakaya da ¥300–500 a piatto, poi karaoke da Jankara (bevande illimitate incluse).', { luogo: 'uraNamba' }),
    ],
    suggerimenti: [cibo('Takoyaki', 'Wanaka, Kukuru', 'Takoyaki Wanaka Sennichimae'), cibo('551 Hōrai', 'panini al vapore di maiale', '551 Horai Namba'), cibo('Cheesecake di Rikuro Ojisan', 'tremolante, appena sfornata', 'Rikuro Ojisan Namba'), souvenir('Doguyasuji', 'coltelli, piastre, cibo finto', 'Sennichimae Doguyasuji')],
  },
  // 13 · sab 21/8
  { citta: 'osaka', titolo: 'Mercatino, castello, Matsusaka, Den Den Town, Amerikamura, Umeda di notte', alloggio: 'forza',
    intro: 'Il 21 c\'è il mercatino del Shitenno-ji; poi castello, wagyu, retrogame, vintage e il tramonto dall\'Umeda Sky.',
    tappe: [
      tappa('g13-1', '08:00', 'Mercatino del Shitenno-ji', 'evento', 'Il 21 di ogni mese: oggetti vecchi, kimono usati.', { luogo: 'shitennoji', evento: evento('Daishi-e, mercatino del Shitenno-ji', '四天王寺 大師会', 'certa') }),
      tappa('g13-2', '09:45', 'Castello di Osaka', 'visita', 'Il mastio e il parco.', { luogo: 'osakajo', orari: { chiusoIl: [], apre: '09:00', chiude: '18:00', nota: `Orari del mastio. ${VERIFICA}` } }),
      tappa('g13-3', '11:45', 'Shinsekai e Tower Knives', 'visita', 'Il quartiere rétro sotto la torre Tsutenkaku; coltelli da Tower Knives (10–18, parlano inglese).', { luogo: 'shinsekai' }),
      tappa('g13-4', '12:45', 'Wagyu di Matsusaka da Yakiniku M', 'cibo', 'A pranzo solo nel weekend, ~¥8.000, su TableCheck.', { luogo: 'yakinikuM', biglietti: null }),
      tappa('g13-5', '14:00', 'Den Den Town', 'visita', 'Super Potato, figure, carte, gachapon, retrogame. Più economica di Akihabara.', { luogo: 'denden' }),
      tappa('g13-6', '15:30', 'Amerikamura e Orange Street', 'visita', 'Vintage e streetwear, poi i negozi di marche giapponesi di Horie.', { luogo: 'amemura' }),
      tappa('g13-7', '17:15', 'Umeda: Gundam Base e Nintendo', 'visita', 'Gundam Base Osaka (LUCUA, 11F), Nintendo OSAKA al Daimaru, la ruota rossa di HEP Five.', { luogo: 'umedaHep' }),
      tappa('g13-8', '18:30', 'Umeda Sky al tramonto', 'visita', 'Il Floating Garden.', { luogo: 'umedaSky', orari: { chiusoIl: [], apre: '09:30', chiude: '22:30', nota: VERIFICA } }),
      tappa('g13-9', '19:30', 'Okonomiyaki da Kiji', 'cibo', 'Nella via rétro sotto l\'Umeda Sky; chiude la domenica.', { luogo: 'umedaSky' }),
      tappa('g13-10', '22:30', 'Club ad Amerikamura', 'libero', 'Ghost, Giraffe (da verificare), passaporto originale. In alternativa un altro giro a Ura-Namba.', { luogo: 'amemura' }),
    ],
    suggerimenti: [cibo('Kushikatsu e doteyaki', 'a Shinsekai: la salsa si intinge una volta sola', 'Kushikatsu Daruma Shinsekai'), cibo('Ikayaki', 'frittella di calamaro al depachika Hanshin', 'Hanshin Umeda ikayaki'), souvenir('Vintage di Amerikamura', '2nd Street, Kinji', 'Amerikamura'), souvenir('Gunpla', 'alla Gundam Base Osaka', 'LUCUA Osaka')],
  },
  // 14 · dom 22/8
  { citta: 'osaka', titolo: 'Castello di Himeji, manzo di Kobe a pranzo, il porto al tramonto', alloggio: 'forza',
    intro: 'L\'airone bianco, la bistecca di Kobe a prezzo da pranzo, Chinatown, le case straniere e il porto. Stasera partono le valigie per Tokyo.',
    tappe: [
      tappa('g14-1', '07:45', 'JR Special Rapid per Himeji', 'spostamento', 'Circa 1 ora, ~¥1.520.', { spostamento: treno(60) }),
      tappa('g14-2', '09:00', 'Castello di Himeji', 'visita', 'L\'airone bianco (¥2.500, in calzini, scale ripide).', { luogo: 'himeji', orari: { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: `Ultimo ingresso 16:00. ${VERIFICA}` } }),
      tappa('g14-3', '10:45', 'Giardino Kōko-en', 'visita', 'Nove giardini accanto al castello.', { luogo: 'kokoen', orari: { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: VERIFICA } }),
      tappa('g14-4', '11:45', 'Ekisoba', 'cibo', 'I soba gialli serviti sul binario di Himeji.', { luogo: 'himejiSt' }),
      tappa('g14-5', '13:00', 'Manzo di Kobe da Steakland', 'cibo', 'Kobe certificato alla piastra, ¥3.500–3.880 a pranzo. Non prenota: di domenica arrivate entro le 13:00.', { luogo: 'steakland' }),
      tappa('g14-6', '14:45', 'Nankinmachi e Motomachi', 'visita', 'La Chinatown di Kobe, Tor Road.', { luogo: 'nankinmachi' }),
      tappa('g14-7', '16:30', 'Kitano Ijinkan', 'visita', 'Le case dei mercanti stranieri sulla collina.', { luogo: 'kitano' }),
      tappa('g14-8', '18:30', 'Porto al tramonto', 'visita', 'Harborland, Meriken Park, Kobe Port Tower.', { luogo: 'meriken' }),
      tappa('g14-9', '21:00', 'Rientro e valigie a Yamato', 'spostamento', 'Valigie alla reception: arrivano al MIMARU di Asakusa il 23–24.', { luogo: 'forza', spostamento: treno(40) }),
    ],
    avvisi: [info('Variante Universal Studios Japan al posto di Himeji e Kobe: da ¥8.400–10.900 più Express Pass da ¥10.800, biglietti a giugno.')],
    suggerimenti: [cibo('Korokke di Moriya', 'crocchette di manzo di Kobe, ¥100–150', 'Moriya Shoten Kobe'), cibo('Butaman di Rōshōki', 'a Nankinmachi', 'Roshoki Kobe'), souvenir('Fugetsudo', 'i biscotti di Kobe', 'Kobe Fugetsudo Motomachi')],
  },
  // 15 · lun 23/8, Hakone
  { citta: 'hakone', titolo: 'Hakone: il giro dell\'anello e la notte in ryokan', alloggio: 'ichinoyu',
    intro: 'Museo all\'aperto, Owakudani, nave pirata, il torii sull\'acqua. Poi l\'onsen del viaggio.',
    tappe: [
      tappa('g15-1', '07:30', 'Hikari Shin-Osaka → Odawara', 'spostamento', 'Circa 2 ore; deve fermare a Odawara. Hakone Freepass in stazione (¥6.000).', { luogo: 'odawara', biglietti: null, spostamento: treno(120) }),
      tappa('g15-2', '10:00', 'Zaini al ryokan', 'hotel', 'Tonosawa, una fermata sopra Yumoto.', { luogo: 'ichinoyu' }),
      tappa('g15-3', '11:15', 'Museo all\'aperto di Hakone', 'visita', 'Sculture nel verde, padiglione Picasso.', { luogo: 'openair', orari: { chiusoIl: [], apre: '09:00', chiude: '17:00', nota: `Aperto tutti i giorni. ${VERIFICA}` } }),
      tappa('g15-4', '13:45', 'Owakudani', 'visita', 'La valle delle fumarole: uova nere cotte nel vulcano.', { luogo: 'owakudani' }),
      tappa('g15-5', '14:45', 'Nave pirata sul lago Ashi', 'visita', 'Da Togendai; col cielo pulito si vede il Fuji.', { luogo: 'togendai' }),
      tappa('g15-6', '15:45', 'Torii di Hakone', 'visita', 'Il torii sull\'acqua: per la foto si fa la coda.', { luogo: 'hakoneJinja' }),
      tappa('g15-7', '16:45', 'Bus per Yumoto', 'spostamento', 'La via dei negozi di Hakone-Yumoto, poi una fermata di Tozan.', { luogo: 'yumoto', spostamento: { modo: 'mezzi', minuti: 40 } }),
      tappa('g15-8', '18:00', 'Onsen privato e cena', 'hotel', 'Bagno all\'aperto sul fiume in camera, in yukata. Cena a portate con bevande a volontà per 70 minuti.', { luogo: 'ichinoyu' }),
    ],
    suggerimenti: [cibo('Uova nere', 'si dice che allunghino la vita di 7 anni', 'Owakudani'), cibo('Onsen manjū', 'a Hakone-Yumoto', 'Hakone Yumoto'), souvenir('Yosegi', 'le scatole segrete di legno a mosaico', 'Hakone Yosegi')],
  },
  // 16 · mar 24/8, Kamakura e Yokohama
  { citta: 'kamakura', titolo: 'Enoshima, Kamakura e il porto di Yokohama di notte', alloggio: 'mimaruAsakusa',
    intro: 'Un\'isola, il passaggio a livello di Slam Dunk, il Grande Buddha, Chinatown e la ruota sul porto.',
    tappe: [
      tappa('g16-1', '09:15', 'Hakone → Enoshima', 'spostamento', 'Tozan fino a Yumoto, Odawara, JR fino a Fujisawa, Odakyu per Enoshima: circa 1 h 15.', { spostamento: treno(75) }),
      tappa('g16-2', '10:30', 'Enoshima', 'visita', 'L\'isola: santuario di Benzaiten, torre faro, grotte. Tako-senbei, il cracker col polpo intero pressato.', { luogo: 'enoshima' }),
      tappa('g16-3', '12:30', 'Passaggio a livello di Slam Dunk', 'visita', 'Enoden lungo il mare fino a Kamakurakōkōmae.', { luogo: 'slamdunk' }),
      tappa('g16-4', '13:15', 'Shirasu-don', 'cibo', 'Bianchetti sul riso, la specialità della costa.'),
      tappa('g16-5', '14:00', 'Grande Buddha di Kamakura', 'visita', '11 m di bronzo all\'aperto (¥300), poi Hase-dera.', { luogo: 'daibutsu' }),
      tappa('g16-6', '15:30', 'Komachi-dori', 'visita', 'La via dei dolcetti fino al Tsurugaoka Hachimangū.', { luogo: 'komachi' }),
      tappa('g16-7', '17:00', 'Red Brick Warehouse', 'visita', 'JR fino a Sakuragichō. Il Cup Noodles Museum il martedì è chiuso.', { luogo: 'redBrick' }),
      tappa('g16-8', '18:15', 'Molo Osanbashi', 'visita', 'Il tramonto sul porto dalla terrazza di legno.', { luogo: 'osanbashi' }),
      tappa('g16-9', '19:00', 'Chinatown', 'cibo', 'La più grande del Giappone: nikuman, xiaolongbao, castagne arrostite.', { luogo: 'chinatown' }),
      tappa('g16-10', '20:30', 'Cosmo Clock 21', 'libero', 'La ruota o la funivia Air Cabin di notte (¥1.000).', { luogo: 'cosmoClock' }),
      tappa('g16-11', '21:15', 'Keikyu per Asakusa', 'spostamento', 'Diretta da Yokohama, circa 50 minuti. Le valigie sono già in hotel.', { luogo: 'mimaruAsakusa', spostamento: treno(50) }),
    ],
    suggerimenti: [cibo('Tako-senbei', 'il cracker col polpo, a Enoshima', 'Asahi Honten Enoshima'), cibo('Nikuman di Chinatown', 'panini al vapore', 'Yokohama Chinatown'), souvenir('Hato sablé', 'biscotti a forma di colomba di Kamakura', 'Toshimaya Kamakura')],
  },
  // 17 · mer 25/8, Tokyo
  { citta: 'tokyo', titolo: 'Palazzo Imperiale, Ginza, Nakano, Koenji, cena di wagyu', alloggio: 'mimaruAsakusa',
    intro: 'Il centro, lo shopping di Ginza, il collezionismo di Nakano, il vintage di Koenji e la cena di chiusura.',
    tappe: [
      tappa('g17-1', '09:00', 'Giardini Est del Palazzo Imperiale', 'visita', 'Gratis; il mercoledì sono aperti.', { luogo: 'kokyo', orari: { chiusoIl: [1, 5], nota: `Ultimo ingresso verso le 17:30. ${VERIFICA}` } }),
      tappa('g17-2', '10:30', 'Stazione di Tokyo', 'visita', 'Tokyo Character Street (Ghibli, Jump, Shin-chan), omiyage al Gransta, Kit Kat Chocolatory, terrazza del KITTE.', { luogo: 'tokyoSt' }),
      tappa('g17-3', '12:00', 'Ginza', 'visita', 'Itoya (12 piani di cancelleria), Uniqlo flagship, MUJI, bacchette Natsuno, Onitsuka Tiger, terrazza di Ginza Six. Pranzo col tendon di Kaneko Hannosuke.', { luogo: 'ginza' }),
      tappa('g17-4', '14:30', 'Nakano Broadway', 'visita', 'Galleria anni \'60 con oltre 25 negozi Mandarake, giocattoli vintage, figure rare.', { luogo: 'nakano', orari: { chiusoIl: [], apre: '12:00', chiude: '20:00', nota: `Alcuni negozi chiudono il mercoledì. ${VERIFICA}` } }),
      tappa('g17-5', '16:30', 'Vintage a Koenji', 'visita', 'Il vintage più economico e punk di Tokyo, nelle gallerie Pal e Look.', { luogo: 'koenji' }),
      tappa('g17-6', '19:00', 'Cena di wagyu a volontà', 'cibo', 'Rokkasen a Shinjuku (¥12.500) o Yakiniku A FIVE Toku a Ginza (A5, ¥8.580 per 90 minuti).', { luogo: 'rokkasen', biglietti: null }),
      tappa('g17-7', '21:30', 'Ultimo Golden Gai', 'libero', 'O l\'ultima purikura, o l\'ultimo karaoke.', { luogo: 'goldenGai' }),
    ],
    suggerimenti: [cibo('Dolci del Gransta', 'Tokyo Banana e dolci regionali', 'Gransta Tokyo'), souvenir('Itoya e Natsuno', 'cancelleria e bacchette a Ginza', 'Ginza Itoya'), souvenir('Uniqlo e Onitsuka Tiger', 'costano meno che in Italia', 'Uniqlo Ginza')],
  },
  // 18 · gio 26/8, Fujiyoshida
  { citta: 'fuji', titolo: 'Fujiyoshida: montagne russe, il villaggio di Naruto, la pagoda col Fuji e la festa del fuoco', alloggio: 'mimaruAsakusa',
    intro: 'Fuji-Q Highland di giorno, la pagoda Chureito nel pomeriggio, le torce della Yoshida no Himatsuri di sera.',
    tappe: [
      tappa('g18-1', '07:00', 'Bus Shinjuku → Fuji-Q', 'spostamento', 'Da Busta Shinjuku, circa 1 h 50, da ¥2.100.', { luogo: 'busta', biglietti: null, spostamento: { modo: 'mezzi', minuti: 110 } }),
      tappa('g18-2', '09:00', 'Fuji-Q Highland', 'visita', 'Takabisha (la discesa più ripida del mondo, 121°), Eejanaika (i sedili girano), Fujiyama (79 m col Fuji davanti). Ingresso gratis, pass di un giorno ¥6.000–7.900 secondo la data. La Do-Dodonpa ha chiuso per sempre nel 2024.', { luogo: 'fujiq', biglietti: null, consiglio: 'A giugno 2026 Fujiyama era ferma: controllate le attrazioni in funzione prima di comprare il pass.' }),
      tappa('g18-3', '12:30', 'Il villaggio di Naruto', 'visita', 'NARUTO×BORUTO Fuji Konoha, il villaggio della Foglia dentro il parco: strade di Konoha, attrazioni a tema ninja, cibo e negozio. È un\'area da girare, non una montagna russa.', { luogo: 'fujiq' }),
      tappa('g18-4', '15:30', 'Pagoda Chureito', 'visita', 'Fujikyu fino a Shimoyoshida, circa 400 scalini: la foto classica del Fuji. Ad agosto spesso è fra le nuvole.', { luogo: 'chureito' }),
      tappa('g18-5', '17:30', 'Yoshida udon', 'cibo', 'Gli udon duri e spessi di Fujiyoshida, coi cavoli e la salsa piccante.'),
      tappa('g18-6', '18:30', 'Yoshida no Himatsuri', 'evento', 'Lungo la via di Kamiyoshida si accendono circa 120 torce alte 3 metri: chiude la stagione delle scalate al Fuji. Gratis.', { luogo: 'himatsuri', evento: evento('Yoshida no Himatsuri', '吉田の火祭り', 'probabile', 'https://summer.walkerplus.com/odekake/detail_e/ar0419e596240/') }),
      tappa('g18-7', '20:15', 'Rientro a Tokyo', 'spostamento', 'Bus o treno (Fujikyu fino a Ōtsuki, poi JR fino a Shinjuku). Controllate l\'ultima corsa.', { spostamento: treno(150) }),
    ],
    consigli: ['È anche il giorno cuscinetto: se un tifone blocca Hakone o i treni dei giorni prima, si recupera qui.'],
    avvisi: [attenzione('Ultima corsa per Tokyo dopo la festa del fuoco da verificare.')],
    suggerimenti: [cibo('Yoshida udon', 'la specialità di Fujiyoshida', 'Yoshida udon Fujiyoshida'), souvenir('Gadget di Naruto', 'al negozio del villaggio', 'Fuji-Q Highland'), souvenir('Dolci a forma di Fuji', 'alla stazione Fujisan', 'Fujisan Station')],
  },
  // 19 · ven 27/8, partenza
  { citta: 'tokyo', titolo: 'Sushi al mercato, coltelli a Kappabashi e volo', alloggio: null,
    intro: 'Toyosu o Tsukiji all\'alba, i coltelli col nome inciso, l\'ultimo drugstore e l\'aeroporto.',
    tappe: [
      tappa('g19-1', '05:45', 'Sushi Dai a Toyosu (per chi vuole)', 'cibo', 'Coda da Sushi Dai o Daiwa, omakase ¥4.000–4.800. Per gli altri, appuntamento alle 7:30 a Tsukiji.', { luogo: 'toyosu', consiglio: 'Controllate il calendario 2027 del mercato.' }),
      tappa('g19-2', '07:30', 'Tsukiji Outer Market', 'cibo', 'Frittata dolce, spiedini di wagyu col cannello, ricci di mare (il venerdì è aperto).', { luogo: 'tsukiji', orari: { chiusoIl: [0, 3], nota: `Chiuso anche nei festivi. ${VERIFICA}` } }),
      tappa('g19-3', '09:00', 'Check-out', 'hotel', 'Valigie alla reception.', { luogo: 'mimaruAsakusa' }),
      tappa('g19-4', '09:30', 'Kappabashi', 'visita', 'Coltelli da Kama-asa, Kamata o Tsubaya (incisione del nome in giornata), cibo finto da Ganso Shokuhin Sample-ya. Vanno subito in stiva.', { luogo: 'kappabashi' }),
      tappa('g19-5', '11:30', 'Ameyoko', 'visita', 'Ultimi drugstore, cosmetici, dolci e tè a peso.', { luogo: 'ameyoko' }),
      tappa('g19-6', '12:45', 'Pranzo veloce', 'cibo', 'Ramen o tendon.'),
      tappa('g19-7', '14:15', 'Treno per l\'aeroporto', 'spostamento', 'Alle 14:15 per Narita (circa 65 minuti), alle 15:00 per Haneda (circa 45).', { spostamento: treno(60) }),
      tappa('g19-8', '16:30', 'In aeroporto', 'spostamento', 'Chiosco del tax-free prima del check-in, col passaporto e gli acquisti. Volo verso le 20:00.', { luogo: 'haneda' }),
    ],
    consigli: ['Dal 1/11/2026 il tax-free si chiede in aeroporto, prima del check-in: tenete scontrini e acquisti a portata di mano.', 'Coltelli solo in stiva; carne e latticini non entrano in Italia.'],
    suggerimenti: [cibo('Tamagoyaki su stecco', 'a Tsukiji', 'Tsukiji Outer Market'), souvenir('Kappabashi', 'coltelli e cibo finto', 'Kappabashi Dougu Street')],
  },
]

/** Scadenze e note delle prenotazioni, per id. Le date sono quelle in cui aprono o entro cui conviene prenotare. */
const DETTAGLI: Record<string, Partial<Prenotazione>> = {
  'pr-volo-andata': { daPrenotareEntro: '2027-03-31' },
  'pr-volo-ritorno': { note: 'Haneda o Narita: cambia l\'orario di partenza dell\'ultimo giorno.' },
  'pr-hotel-0': { daPrenotareEntro: '2026-11-30', note: '5 notti, 8–13/8. Family Apartment 35 m² (2 singoli + castello), ~¥36.000–48.000 a notte (stima). Alternative: MIMARU Ueno North (4 singoli), Mitsui Garden Ueno. Il 12/8 sera le valigie partono con Yamato per Kyoto.' },
  'pr-hotel-5': { daPrenotareEntro: '2026-11-30', note: 'Camera giapponese-occidentale 25 m² (2 letti + futon), ~¥30.000–42.000 (stima). Onsen al 14° piano.' },
  'pr-hotel-6': { daPrenotareEntro: '2026-11-30', note: 'Chiedere per iscritto una camera per 3 adulti. Alternative: Country Hotel Takayama, Spa Hotel Alpina (letto da 130 + singolo). Stima ¥25.000–35.000.' },
  'pr-hotel-7': { daPrenotareEntro: '2026-11-30', note: '5 notti, 15–20/8. Appartamento 45 m² con 5 letti singoli, ~¥32.000–45.000 a notte (stima). Chiedere che tengano le valigie spedite da Tokyo, arrivate il 13–14/8.' },
  'pr-hotel-12': { daPrenotareEntro: '2026-11-30', note: '3 notti, 20–23/8. Tripla con 3 letti veri, ~¥26.000–36.000 a notte (stima). Deposito bagagli gratis, lavanderia.' },
  'pr-hotel-15': { daPrenotareEntro: '2026-11-30', note: 'Notte di lunedì 23/8. Camera giapponese con bagno termale all\'aperto privato, cena e colazione: ~¥75.000–95.000 per 3 (stima). Email: 3 adulti, cena inclusa, tatuaggi.' },
  'pr-hotel-16': { daPrenotareEntro: '2026-11-30', note: '3 notti, 24–27/8. Stesso hotel dell\'inizio. Chiedere che tengano le valigie spedite da Osaka il 22/8.' },
  'pr-g4-1': { daPrenotareEntro: '2027-07-12', note: 'Spacia X andata e ritorno, un mese prima.' },
  'pr-g5-1': { daPrenotareEntro: '2027-07-13', note: 'JR East apre un mese prima alle 10:00 giapponesi (3:00 in Italia). Primo giorno dell\'Obon.' },
  'pr-g6-1': { daPrenotareEntro: '2027-07-14', note: 'Bus Kanazawa → Shirakawa-go e Shirakawa-go → Takayama, entrambi su prenotazione.' },
  'pr-g6-5': { daPrenotareEntro: '2027-07-14' },
  'pr-g7-2': { daPrenotareEntro: '2027-07-15', note: 'Hida fino a Nagoya e Shinkansen fino a Kyoto, in pieno Obon: tutto riservato.' },
  'pr-g9-7': { daPrenotareEntro: '2027-07-31', note: 'Yukata a noleggio (es. Kanwa Kimono, da ¥3.300).' },
  'pr-g9-8': { daPrenotareEntro: '2027-07-31', note: 'Terrazza sul fiume (yuka) a Pontocho.' },
  'pr-g1-9': { daPrenotareEntro: '2027-08-05', note: 'Pacchetto da 1 ora online.' },
  'pr-g2-8': { daPrenotareEntro: '2027-07-13', note: 'Fascia del tramonto, circa 4 settimane prima.' },
  'pr-g3-1': { daPrenotareEntro: '2027-07-14' },
  'pr-g12-2': { daPrenotareEntro: '2027-07-15', note: 'Biglietti online da metà luglio; dai quarti si vende dal giorno prima alle 10:00. In alternativa Torre del Sole su prenotazione.' },
  'pr-g13-4': { daPrenotareEntro: '2027-07-31', note: 'TableCheck. Pranzo solo nel weekend.' },
  'pr-g15-1': { daPrenotareEntro: '2027-07-23', note: 'Hikari che ferma a Odawara; con smartEX si può prenotare anche prima.' },
  'pr-g17-6': { daPrenotareEntro: '2027-07-31', note: 'Rokkasen su TableCheck; disdetta entro 12 ore = 50%.' },
  'pr-g18-1': { daPrenotareEntro: '2027-07-31', note: 'Bus Busta Shinjuku → Fuji-Q Highland.' },
  'pr-g18-2': { daPrenotareEntro: '2027-08-20', note: 'Pass del Fuji-Q: il prezzo cambia con la data, online spesso costa meno.' },
}

const nuovaPrenotazione = (id: string, tipo: Prenotazione['tipo'], titolo: string, altro: Partial<Prenotazione> = {}): Prenotazione => ({
  id, tipo, titolo, stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [], ...altro,
})

function prenotazioni(giorni: Giorno[], dataPartenza: string): Prenotazione[] {
  const data = (i: number) => aggiungiGiorni(dataPartenza, i)
  const ultimo = giorni.length - 1
  const tutte: Prenotazione[] = [
    nuovaPrenotazione('pr-volo-andata', 'volo', 'Volo Roma → Tokyo', {
      inizio: `${data(-1)}T12:30`, fuso: 'Europe/Rome', fine: `${data(0)}T14:00`, fusoFine: 'Asia/Tokyo',
      luogo: { nome: 'Aeroporto di Roma Fiumicino', query: 'Rome Fiumicino Airport', lat: 41.8003, lng: 12.2389 },
    }),
    nuovaPrenotazione('pr-volo-ritorno', 'volo', 'Volo Tokyo → Roma', { inizio: `${data(ultimo)}T20:00`, luogo: L('haneda') }),
  ]
  // Un hotel per ogni serie di notti consecutive nello stesso alloggio.
  let corrente: Prenotazione | null = null
  for (let i = 0; i < ultimo; i++) {
    const a = giorni[i].alloggio
    if (!a) continue
    if (corrente && corrente.titolo === a.nome && corrente.fine === `${data(i)}T10:00`) {
      corrente.fine = `${data(i + 1)}T10:00`
      continue
    }
    corrente = nuovaPrenotazione(`pr-hotel-${i}`, 'hotel', a.nome, { inizio: `${data(i)}T15:00`, fine: `${data(i + 1)}T10:00`, luogo: structuredClone(a) })
    tutte.push(corrente)
  }
  // Un biglietto per ogni tappa che lo chiede.
  for (const [i, g] of giorni.entries()) {
    for (const t of g.tappe) {
      if (!t.biglietti) continue
      const link = linkSicuro(t.biglietti.link)
      const tipo = t.tipo === 'cibo' ? 'ristorante' : t.tipo === 'spostamento' ? 'treno' : 'biglietto'
      tutte.push(nuovaPrenotazione(`pr-${t.id}`, tipo, t.titolo, {
        inizio: `${data(i)}T${t.ora}`,
        ...(t.luogo ? { luogo: structuredClone(t.luogo) } : {}),
        ...(link ? { link } : {}),
        tappaId: t.id,
      }))
    }
  }
  const usati = new Set<string>()
  const conDettagli = tutte.map(p => {
    const d = DETTAGLI[p.id]
    if (!d) return p
    usati.add(p.id)
    return { ...p, ...d, note: [p.note, d.note].filter(Boolean).join(' ') }
  })
  const orfani = Object.keys(DETTAGLI).filter(id => !usati.has(id))
  if (orfani.length) throw new Error(`dettagli senza prenotazione: ${orfani.join(', ')}`)
  return conDettagli
}

/** Il viaggio con città, giorni e prenotazioni della terza versione. */
export function itinerarioV3(vecchio: Viaggio): Viaggio {
  const v = structuredClone(vecchio)
  const ids = new Set(CITTA.map(c => c.id))
  const giorni: Giorno[] = GIORNI.map((d, i) => {
    if (!ids.has(d.citta)) throw new Error(`città sconosciuta al giorno ${i}: ${d.citta}`)
    return {
      id: `g${i}`, cittaId: d.citta, titolo: d.titolo, intro: d.intro, note: '',
      alloggio: d.alloggio ? L(d.alloggio) : null,
      consigli: d.consigli ?? [], avvisi: d.avvisi ?? [], suggerimenti: d.suggerimenti ?? [],
      speciale: null, tappe: d.tappe,
    }
  })
  const idTappe = giorni.flatMap(g => g.tappe.map(t => t.id))
  const doppi = idTappe.filter((id, i) => idTappe.indexOf(id) !== i)
  if (doppi.length) throw new Error(`id di tappa ripetuti: ${doppi.join(', ')}`)
  for (const [i, g] of giorni.entries()) {
    if (!g.tappe.every(t => t.id.startsWith(`g${i}-`))) throw new Error(`il giorno ${i} ha tappe con l'id di un altro giorno`)
  }
  v.titolo = 'Giappone — agosto 2027'
  v.dataPartenza = '2027-08-08'
  v.citta = structuredClone(CITTA)
  v.giorni = giorni
  v.prenotazioni = prenotazioni(giorni, v.dataPartenza)
  return v
}
