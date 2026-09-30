# App di viaggio Giappone — progetto

Data: 2026-09-30 · Repo: `vitojgallo-dev/jap-itinerario` · Pubblicata su
`https://vitojgallo-dev.github.io/jap-itinerario/`

## 1. Obiettivo

Trasformare l'itinerario attuale (un unico `index.html` React compilato, grafica
datata, dati scritti nel codice) in un'app da telefono moderna per chi **è in
viaggio**: sapere cosa c'è adesso e dopo, arrivarci, tenere documenti e spese, e
poter cambiare **tutto** l'itinerario dall'app stessa.

Utenti: Vito, principalmente. Il gruppo è di **3 persone** (non più 6), con
telefoni misti iPhone/Android. Niente sincronizzazione fra telefoni: ognuno ha i
suoi dati, l'itinerario si passa agli altri via file.

Viaggio: volo in partenza **sabato 7 agosto 2027 alle 12:30**, atterraggio
in Giappone **domenica 8 agosto alle 14:00**, volo di ritorno **venerdì 27
agosto verso le 20:00**. Anno 2027 assunto (oggi è settembre 2026); la data di
partenza è modificabile dall'app e tutte le date dei giorni si ricalcolano.

## 2. Tecnica

- **Vite + React + TypeScript**, nel repo esistente. Il vecchio `index.html`
  viene sostituito; la sua cronologia resta in git.
- **Pubblicazione**: GitHub Actions compila e pubblica su GitHub Pages a ogni
  push su `main`. Una tantum: in *Settings → Pages* la sorgente va impostata su
  *GitHub Actions* (lo fa Vito).
- **Stato**: Zustand con persistenza in `localStorage` per tutti i dati
  testuali; **IndexedDB** (`idb-keyval`) per le immagini allegate (biglietti,
  QR), che in `localStorage` non ci stanno.
- **PWA**: `vite-plugin-pwa` (Workbox). App shell in precache; cache a runtime
  per tile della mappa, foto di Wikipedia/Commons, meteo e cambio. Installabile
  sulla Home da Safari e Chrome, con istruzioni in app per entrambi.
- **Mappe**: Leaflet (`react-leaflet`) su tile OpenStreetMap.
- **Servizi gratuiti, senza chiave, chiamati dal browser**:
  - meteo: Open-Meteo (previsione fino a 16 giorni; prima di allora si mostra
    il clima tipico di agosto per la città, scritto nei dati);
  - cambio EUR↔JPY: `api.frankfurter.dev` (tassi BCE), ultimo tasso salvato
    per l'uso offline, sovrascrivibile a mano;
  - ricerca luoghi per le tappe nuove: Nominatim (OSM), una richiesta per
    ricerca, nel rispetto della sua policy;
  - foto dei luoghi: Wikipedia/Commons, come oggi.
- **Indicazioni**: link diretti a Google Maps
  (`/maps/dir/?api=1&destination=lat,lng&travelmode=transit|walking`), che su
  telefono apre l'app.
- **Stile**: impostazione Apple (font di sistema, titoli grandi, liste a gruppi
  arrotondati, tab bar traslucida in basso, pannelli che salgono dal basso,
  target touch ≥ 44 px, `prefers-reduced-motion` rispettato).
  **Tema chiaro "Washi"** (carta calda, inchiostro, rosso torii) e **tema scuro
  "Notte"** (quasi nero, card grafite, accento corallo), scelti in automatico dal
  telefono con possibilità di forzarli. Il colore della città del giorno è la
  tinta dei controlli, come il *tint color* di iOS.

## 3. Modello dei dati

L'itinerario è **dati dell'utente**, non codice. I dati di partenza vivono in
`src/data/itinerario-base.json` (ricavato dal vecchio `DEFAULT_DATA` più
`PLACE_COORDS`, `BOOKING_LINKS`, `SPECIAL_DINING`, `CITY_META`) e al primo avvio
vengono copiati nello stato dell'app; da lì in poi si modificano solo dall'app.

```ts
Viaggio {
  versione: number            // per le migrazioni future
  titolo: string
  dataPartenza: string        // "2027-08-08": data del primo giorno (G0)
  persone: Persona[]          // { id, nome }, 3 all'inizio
  citta: Citta[]              // { id, nome, kanji, romaji, colore, lat, lng, climaAgosto }
  giorni: Giorno[]            // IN ORDINE: la posizione dà numero e data
  prenotazioni: Prenotazione[]
  spese: Spesa[]
  checklist: VoceChecklist[]
  impostazioni: { tema, valutaBase, cambioManuale? }
}
Giorno {
  id, cittaId, titolo, note,
  alloggio?: string           // id di una Prenotazione di tipo hotel
  tappe: Tappa[]
}
Tappa {
  id, ora: "HH:MM", durataMin?, titolo, descrizione, consiglio,
  tipo: "visita" | "cibo" | "evento" | "spostamento" | "hotel" | "libero",
  luogo?: { nome, query, lat?, lng?, indirizzoJa? },
  sera: boolean,
  link?: string               // prenotazione/biglietti
  spostamento?: { modo: "piedi"|"mezzi"|"treno"|"taxi", minuti?, nota? }  // verso la tappa dopo
  evento?: { nome, nomeJa, affidabilita: "certa"|"probabile"|"da-verificare", fonte }
  stato: "da-fare" | "fatta" | "saltata"
  nota: string                // nota personale, separata dalla descrizione
  foto?: string               // URL scelto a mano, vince sulla foto automatica
}
Prenotazione {
  id, tipo: "volo"|"hotel"|"treno"|"biglietto"|"ristorante"|"altro",
  titolo, inizio, fine?, codice?, indirizzo?, indirizzoJa?, telefono?, link?,
  note, allegati: string[]    // chiavi IndexedDB
  daPrenotareEntro?: string   // per i promemoria
}
Spesa { id, data, importo, valuta: "JPY"|"EUR", categoria, descrizione,
        pagatoDa: personaId, divisaFra: personaId[] }
```

Numero e data di ogni giorno **si calcolano**: giorno i = `dataPartenza + i`.
Spostare, aggiungere o togliere giorni non richiede di rinumerare niente. La
città è una proprietà del giorno, quindi "un giorno in più a Kyoto" significa
aggiungere un giorno con `cittaId = kyoto`.

**Migrazione**: al primo avvio, se esiste `localStorage["japan_itinerary_v1"]`
(stessa origine della versione attuale), il suo contenuto viene convertito nel
nuovo modello al posto dei dati di partenza, e la chiave vecchia resta intatta
come copia di sicurezza. `versione` permette migrazioni future.

**Backup e condivisione**: esportazione dell'intero viaggio in un file `.json`
(con Web Share API sul telefono, per mandarlo su WhatsApp agli altri due) e
importazione da file con anteprima e conferma. Le immagini allegate sono
incluse nel file come base64. Promemoria di backup se l'ultimo ha più di 3
giorni.

## 4. Schermate

Tab bar in basso: **Oggi · Programma · Mappa · Viaggio · Spese**.

### Oggi
- **Prima della partenza**: conto alla rovescia, prenotazioni con
  `daPrenotareEntro` in scadenza (in ordine di data), checklist ancora aperta,
  promemoria "installa l'app sulla Home" e "fai un backup".
- **Durante il viaggio**: testata con città, data e "G8 · 16 agosto" (20 giorni in tutto, da G0 a G19); meteo del
  giorno; card **Adesso** (la tappa il cui orario è passato e la successiva no)
  e **Dopo**, con "fra 25 min" e il tempo di spostamento; pulsanti *Vai*
  (Google Maps) e *Fatto*; alloggio della sera con indirizzo in giapponese
  (tocco = scheda a tutto schermo da mostrare al tassista); avvisi del giorno
  (eventi, Obon, caldo).
- **Dopo il viaggio**: riepilogo (tappe fatte, spese totali).
- L'ora usata è quella del **Giappone** (`Asia/Tokyo`), qualunque sia il fuso
  del telefono.

### Programma
- Striscia orizzontale dei giorni con data e colore della città; "oggi"
  evidenziato. Elenco a gruppi per città.
- Timeline del giorno: orario a sinistra, card con foto, descrizione,
  consiglio, badge del tipo (gli **eventi** hanno un badge proprio e
  l'affidabilità della data), fra una card e l'altra il segmento di spostamento.
- Tocco su una tappa = pannello dal basso con dettagli, nota personale, stato,
  link, indicazioni.
- **Modifica** (interruttore in alto): modifica di ogni campo; aggiunta di
  tappe con ricerca del luogo; riordino trascinando; eliminazione con
  annullamento. Sui giorni: aggiungere, duplicare, eliminare, spostare,
  cambiare città. Sulle città: aggiungere, rinominare, cambiare colore.

### Mappa
- Tappe del giorno numerate e unite dal percorso, oppure tutto il viaggio
  (colorato per città).
- Posizione attuale e "vicino a me" (tappe del viaggio ordinate per distanza).
- Tocco su un segnaposto = stesso pannello della tappa.

### Viaggio
- **Prenotazioni** raggruppate per tipo, in ordine di data: voli, hotel,
  treni, biglietti, ristoranti. Codice di conferma copiabile, allegati
  fotografati o caricati (visibili offline, a tutto schermo per i QR).
- **Altro** (fase 3): checklist valigia e pre-partenza, frasario, emergenze,
  guida pratica, eventi del periodo, esportazioni, impostazioni.

### Spese
- Inserimento rapido: importo in yen (o euro), categoria, chi ha pagato, fra
  chi si divide (di default fra tutti e 3).
- Totali per giorno e per categoria, in yen e in euro; budget giornaliero
  facoltativo.
- **Chi deve a chi**: saldi netti e numero minimo di rimborsi per pareggiare.

## 5. Contenuto dell'itinerario (nuova versione di partenza)

Hiroshima e Koyasan escono; i due giorni liberati vanno a Kyoto e Osaka. Si
aggiungono il giorno di arrivo e quello di partenza.

| G | Data 2027 | Città | Contenuto |
|---|---|---|---|
| 0 | dom 8 | Tokyo | **Nuovo**. Arrivo alle 14:00, trasferimento all'Asakusa View Hotel, check-in, passeggiata serale ad Asakusa e Sumida, cena leggera |
| 1–3 | 9–11 | Tokyo | Come ora (l'11 è festivo: Yama no Hi) |
| 4 | gio 12 | Nikko | Come ora |
| 5 | ven 13 | Kanazawa | Come ora. Avviso Obon: treni molto pieni, prenotare un mese prima |
| 6 | sab 14 | Kanazawa | Shirakawa-go, come ora |
| 7 | dom 15 | Kyoto + Nara | **Cambiato**. Kanazawa→Kyoto in mattinata (avviso Obon, controesodo), check-in; pomeriggio a Nara con le tappe dell'ex G10, compattate; sera: evento **Kasuga Chūgen Mantōrō** e **Tōdai-ji Mantō Kuyōe**, falò **Nara Daimonji** alle 20:00 |
| 8 | lun 16 | Kyoto | Kinkaku-ji e Arashiyama come ora, spostati verso sera; eventi **Arashiyama Tōrō Nagashi** (19–21) e **Gozan no Okuribi** (torii-gata alle 20:20) |
| 9 | mar 17 | Kyoto | Fushimi Inari + Higashiyama (ex G7) |
| 10 | mer 18 | Kyoto | Centro, Nishiki ed esperienze (ex G9) |
| 11 | gio 19 | Kyoto | **Nuovo**. Kurama e Kibune (sentiero, pranzo sulle *kawadoko* sopra il torrente); alternativa Uji |
| 12–14 | 20–22 | Osaka | Come ora (ex G12–14) |
| 15 | lun 23 | Himeji + Kobe | **Nuovo**. Castello di Himeji all'apertura (9:00), giardino Kōko-en; sera a Kobe: manzo di Kobe, Harborland; rientro a Osaka. Evento facoltativo Jizō-bon nei quartieri (23–24) |
| 16 | mar 24 | Hakone | Come ora (partenza da Osaka) |
| 17–18 | 25–26 | Tokyo | Come ora |
| 19 | ven 27 | Tokyo | **Nuovo**. Mattina libera, check-out, trasferimento in aeroporto per il volo delle 20:00 (circa 3 ore prima) |

I **"6 persone"** nei consigli sui ristoranti diventano 3.

**Eventi** inseriti come tappe (con affidabilità e fonte) o come avvisi del
giorno; quelli con data incerta ("probabile"/"da verificare") sono segnati e
riportati in *Viaggio → Eventi del periodo* per essere ricontrollati nella
primavera 2027:

- certi: Nara Mantōrō e Daimonji (14–15, falò il 15), Arashiyama Tōrō
  Nagashi e Gozan no Okuribi (16), Higashi Ōtani Mantōe e visite notturne a
  Kiyomizu (14–16), Obon (13–16);
- probabili, fuori dal percorso o da verificare: Jingū Gaien Hanabi (fra il
  7 e il 21), Kōenji Awa Odori, Azabu-Jūban Noryo Matsuri e Harajuku Super
  Yosakoi (21–22 **o** 28–29: se cadono il 21–22 si scambiano Osaka e Hakone
  per restare a Tokyo nel weekend), Sumida Tōrō Nagashi (14–15, siete a
  Kanazawa), Kamakura Bonbori (7–9, possibile gita il 9), GREEN×EXPO 2027 a
  Yokohama, Jizō-bon a Osaka (23–24).

Prenotazioni di partenza già note: volo di andata (7/8, 12:30), volo di
ritorno (27/8, ~20:00), hotel per città presi dal vecchio itinerario (Asakusa
View Hotel, ryokan Nikko Hoshinoyado, Hotel Kanazawa, Kyoto Gion Hotel, Hotel
Forza Osaka Namba, ryokan a Hakone-Yumoto). Codici, compagnie, aeroporto e
hotel di Tokyo per il 25–26 sono da completare dall'app.

## 6. Fasi

Ogni fase finisce pubblicata e usabile.

1. **Base + Oggi, Programma, Mappa, offline.** Progetto, pubblicazione
   automatica, modello dei dati, migrazione dalla versione attuale, nuovo
   itinerario di partenza (sezione 5), temi Washi/Notte, le tre schede con
   modifica completa, meteo, PWA installabile, backup/importazione.
2. **Viaggio e Spese.** Prenotazioni con allegati in IndexedDB, promemoria
   "da prenotare entro", spese con cambio e saldi fra le 3 persone.
3. **Il resto.** Checklist, frasario (italiano → giapponese con lettura in
   rōmaji, scheda a tutto schermo), emergenze (110 polizia, 119
   ambulanza/pompieri, Ambasciata d'Italia a Tokyo, assicurazione), guida
   pratica (Suica sul telefono, tax-free con le regole in vigore dal 1°
   novembre 2026, rifiuti, galateo, konbini, caldo di agosto), elenco eventi
   del periodo, esportazione del calendario `.ics`, impostazioni.

## 7. Errori e casi limite

- Nessuna rete: tutto funziona coi dati salvati; meteo e cambio mostrano
  l'ultimo valore con la sua ora, la mappa mostra le tile già viste.
- Servizio esterno giù: il blocco relativo sparisce o mostra l'ultimo dato,
  l'app non si blocca mai per un servizio esterno.
- Memoria piena (allegati grandi): le foto vengono ridimensionate prima di
  salvarle (lato lungo 1600 px); se lo spazio manca comunque, messaggio chiaro.
- File di importazione non valido o di una versione sconosciuta: rifiutato con
  spiegazione, i dati attuali non vengono toccati.
- Tappe senza coordinate: niente segnaposto, *Vai* usa la ricerca per nome.
- Un giorno senza tappe, o una città senza giorni: gestiti e mostrati come
  stato vuoto con l'azione per riempirli.

## 8. Verifica

- **Vitest** sulle parti di logica pura: data e numero dei giorni, "adesso/dopo"
  nel fuso di Tokyo (anche attraverso la mezzanotte e prima/dopo il viaggio),
  saldi e rimborsi minimi, conversione valuta, migrazione dal formato v1
  (usando il `DEFAULT_DATA` reale), validazione dell'importazione.
- Controllo che `itinerario-base.json` sia coerente: ogni giorno ha una città
  esistente, ogni tappa ha ora valida, nessun id duplicato.
- Prova manuale nel browser a misura di telefono (375×812), tema chiaro e
  scuro, offline simulato, prima di ogni pubblicazione; istruzioni di prova per
  Vito su iPhone e Android alla fine di ogni fase.

## 9. Fuori dal progetto

Sincronizzazione in tempo reale fra telefoni, notifiche push programmate,
import automatico delle prenotazioni dalle email, stato live dei voli: tutti
richiedono un server. Il modello dei dati tiene gli id stabili, così una
sincronizzazione si potrà aggiungere dopo senza rifare l'app.
