# Fase 2 — Documenti, spese, promemoria e comodità

Data: 2026-09-30 · Segue: `2026-09-30-app-viaggio-giappone-design.md` (fase 1, pubblicata).
La fase 3 (vicino a me, frasario, emergenze, checklist, guida, meteo orario, diario, consigli dai reel) avrà un documento suo.

## 1. Obiettivo

Rendere l'app autosufficiente in viaggio: tutti i documenti e QR offline, le spese divise fra le 3 persone, promemoria che arrivano anche ad app chiusa, avvisi sulle chiusure, e le piccole comodità che le app di riferimento hanno (Tricount per le spese, Tripsy/TripIt per i documenti) e a noi mancano. Nessun server: resta tutto sul telefono.

## 2. Navigazione

- La tab bar passa da 4 a 5 voci: **Oggi · Programma · Mappa · Documenti · Spese** (icone lucide: `Sun`, `CalendarDays`, `Map`, `Ticket`, `Wallet`).
- La barra diventa **più visibile**:
  - area toccabile alta 56 px più la safe area;
  - icone da 26 px, etichette da 12 px semibold;
  - una **pillola** colorata con `--tinta-tenue` dietro l'icona attiva;
  - sfondo meno trasparente, con opacità 0.92 invece di 0.8;
  - bordo superiore visibile, `--bordo`, a 1 px.
- Le **impostazioni** (oggi la scheda Viaggio) diventano la rotta `#/impostazioni`, aperta da un'icona ingranaggio a sinistra nella barra in alto di Oggi. La vecchia `#/viaggio` porta a `#/impostazioni`.
- Rotte nuove: `#/documenti`, `#/documenti/<id>`, `#/spese`, `#/spese/nuova` (apre subito il foglio di inserimento), `#/impostazioni`.
- **Tasto "+" flottante**: tondo, 56 px, in basso a destra sopra la tab bar, raggiungibile col pollice. È presente su Oggi, Programma, Documenti e Spese. Apre un foglio con tre scelte: **Spesa**, **Tappa** (nel giorno mostrato, o in quello di oggi), **Prenotazione**. Sulla Mappa non c'è, perché coprirebbe i controlli.
- **Ricerca**: una lente nella barra in alto di Programma e Documenti apre un foglio che cerca in titoli, descrizioni, note e consigli delle tappe, e in titoli, codici e note delle prenotazioni. I risultati sono raggruppati, mostrano giorno e data e aprono il dettaglio. La ricerca ignora maiuscole e accenti.

## 3. Modello dei dati (additivo, `VERSIONE_DATI` resta 2)

`prenotazioni` e `spese` esistono già come elenchi vuoti, e `Tappa.orari` è un campo facoltativo nuovo: i dati salvati e i backup della fase 1 restano validi senza migrazione. `validaViaggio` si estende ai tipi nuovi con la stessa severità di oggi.

```ts
type TipoPrenotazione = 'volo' | 'hotel' | 'treno' | 'biglietto' | 'ristorante' | 'altro'
interface Prenotazione {
  id: Id
  tipo: TipoPrenotazione
  titolo: string                 // "Volo Roma → Tokyo", "Kyoto Gion Hotel"
  stato: 'da-prenotare' | 'prenotata'
  inizio?: string                // "2027-08-07T12:30" ora locale di `fuso`
  fine?: string                  // idem; per gli hotel = check-out
  fuso: string                   // IANA, default "Asia/Tokyo" ("Europe/Rome" per il volo di andata)
  luogo?: Luogo                  // hotel, stazione, aeroporto (con indirizzoJa)
  codice?: string                // codice di conferma / PNR
  riferimento?: string           // "AZ 784", "Nozomi 21 · carrozza 7 posto 12D"
  daPrenotareEntro?: string      // "2027-07-15"
  costo?: { importo: number; valuta: 'JPY' | 'EUR' }
  link?: string                  // sito/app della prenotazione (passato per linkSicuro)
  note: string
  allegati: Allegato[]
  tappaId?: Id                   // collega un biglietto alla sua tappa
}
interface Allegato { id: Id; nome: string; mime: string; byte: number }  // i dati stanno in IndexedDB

type CategoriaSpesa = 'cibo' | 'trasporti' | 'alloggio' | 'biglietti' | 'shopping' | 'altro'
interface Spesa {
  id: Id
  data: string                   // "2027-08-10"
  importo: number                // > 0, nella valuta indicata
  valuta: 'JPY' | 'EUR'
  cambio: number                 // yen per 1 euro al momento dell'inserimento (per totali stabili)
  categoria: CategoriaSpesa
  descrizione: string
  pagatoDa: Id                   // persona
  divisaFra: Id[]                // almeno una persona
  metodo: 'contanti' | 'carta'
}
interface OrariTappa {
  chiusoIl: number[]             // giorni della settimana chiusi, 0 = domenica
  apre?: string                  // "09:00"
  chiude?: string                // "17:00"
  nota?: string                  // "Molti banchi chiusi mercoledì e festivi"
  fonte?: 'manuale' | 'osm' | 'base'
}
// Tappa acquista: orari?: OrariTappa
// Impostazioni acquista: budgetGiornaliero?: { importo: number; valuta: 'JPY' | 'EUR' },
//                        cambioManuale?: number, ultimoCambio?: { valore: number; data: string }
```

**Allegati**: foto o PDF, salvati in **IndexedDB** con `idb-keyval`.
- Le foto si ridimensionano prima di salvarle: lato lungo 1600 px, JPEG di qualità 0.85, con `createImageBitmap` su un canvas.
- I PDF si salvano così come sono, fino a 15 MB.
- Se lo spazio non basta, compare un messaggio chiaro e l'allegato non viene aggiunto a metà.
- Eliminando una prenotazione si eliminano anche i suoi allegati, e il gesto si annulla come gli altri.

**Backup**: il file di backup include gli allegati in base64, nel campo `allegati: Record<id, { mime, dati }>`. L'importazione li riscrive in IndexedDB. Un file della fase 1, senza allegati, resta importabile.

## 4. Documenti

- Elenco raggruppato per tipo, in ordine di `inizio`, con **"da prenotare" in cima** e la scadenza evidenziata: in rosso se mancano 7 giorni o meno, poi "scaduta".
- Riga: icona del tipo, titolo, data e ora nel fuso della prenotazione, codice. Tocco = dettaglio.
- **Dettaglio**, a tutto schermo:
  - codice in grande, **copiabile con un tocco**;
  - riferimento, luogo con "Vai", link, note;
  - **allegati** in griglia; un tocco apre il **visualizzatore a tutto schermo** (sfondo bianco, per lo scanner del QR), con zoom e scorrimento fra gli allegati. I PDF si aprono con il visore del telefono tramite object URL.
- **Modifica/nuova**: foglio con i campi del modello. Per gli allegati "Scatta foto" usa `<input type=file accept="image/*" capture>` e "Scegli file" accetta `image/*,application/pdf`.
- **Hotel e giorni**: un hotel `prenotata` con `inizio`/`fine` copre le notti dal giorno di check-in al giorno prima del check-out. "Stanotte" in Oggi e l'hotel del giorno nel Programma mostrano la prenotazione, con codice e indirizzo giapponese per il taxi. Se nessuna prenotazione copre la notte, resta `Giorno.alloggio`.
- **In Oggi**: se una prenotazione con `inizio` cade nelle prossime 24 ore compare una card "Prossimo: Volo fra 3 h" con i pulsanti per il codice e gli allegati.
- **Dati di partenza**, generati come oggi dallo script:
  - volo di andata (7/8 12:30, fuso Europe/Rome, da prenotare);
  - arrivo (8/8 14:00, Asia/Tokyo) come parte dello stesso volo, cioè con `fine`;
  - volo di ritorno (27/8 20:00);
  - gli hotel, con check-in e check-out ricavati dai giorni: Asakusa View 8→12, Nikko Hoshinoyado 12→13, Hotel Kanazawa 13→15, Kyoto Gion Hotel 15→20, Hotel Forza Osaka 20→24, ryokan di Hakone-Yumoto 24→25, hotel di Tokyo 25→27 "da scegliere";
  - le prenotazioni dei biglietti già segnati sulle tappe (Skytree, Shibuya Sky, teamLab, Himeji…), come `biglietto` da prenotare e collegate con `tappaId`.
  Tutte partono in stato `da-prenotare` senza codici: li completa Vito.

## 5. Spese

- **Inserimento in 3 tocchi**, dal "+" o da `#/spese/nuova`:
  - l'importo ha il focus con la tastiera numerica (`inputmode="decimal"`);
  - "pagato da" è preselezionato sull'ultima persona usata;
  - si divide fra tutti di default;
  - categoria, valuta e metodo ricordano l'ultima scelta;
  - Salva.
  La data di default è oggi, in ora di Tokyo, o G0 se il viaggio non è iniziato. Validazione: importo > 0, almeno una persona.
- **Cambio**: `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=JPY` (BCE, senza chiave).
  - L'ultimo valore si salva in `impostazioni.ultimoCambio` con la data.
  - Si può impostare un cambio manuale, che vince sul resto.
  - Offline si usa l'ultimo valore; se non c'è niente si chiede di inserirlo.
  - Ogni spesa memorizza il cambio del suo momento.
- **Schermata Spese**:
  - in alto totale del viaggio in ¥ e €, e quota di ciascuno;
  - budget giornaliero se impostato, con la barra di oggi;
  - elenco per giorno, dal più recente, con il totale del giorno;
  - totali per categoria;
  - scorrimento per eliminare, con "Annulla".
- **Chi deve a chi**: saldo di ogni persona, cioè pagato meno la sua quota, calcolato in yen. Suggerisce il numero minimo di rimborsi (algoritmo greedy su creditori e debitori, arrotondato allo yen) e mostra anche l'equivalente in euro. Pulsante "Segna come saldato", che aggiunge una spesa di tipo rimborso: `categoria: 'altro'`, descrizione "Rimborso", `divisaFra: [creditore]`.
- Contanti o carta: filtro e totale a parte. In Giappone serve sapere quanti contanti restano.

## 6. Promemoria sul calendario (.ics)

In Impostazioni e in Documenti c'è "Aggiungi al calendario", che genera `giappone-2027.ics` e lo condivide o lo scarica (stesso meccanismo del backup). Contenuto:
- ogni prenotazione con `inizio`, come evento: fine = `fine` o un'ora dopo; luogo; codice nella descrizione;
- un **VALARM** 3 ore prima per voli e treni, 1 ora prima per gli altri;
- per ogni `daPrenotareEntro` di una prenotazione ancora da prenotare, un evento di un giorno "Prenotare: …" con avviso alle 09:00 di quel giorno;
- evento "Tax-free: rimborso in aeroporto prima del check-in" il giorno del volo di ritorno, 4 ore prima della partenza;
- facoltativo, con un interruttore: tutte le tappe del programma come eventi senza avviso.

Orari in **UTC** (`DTSTART:20270807T103000Z`), calcolati dal `fuso` con `Intl`: niente VTIMEZONE da mantenere. `UID` stabili (`<id>@jap-itinerario`), così reimportando il file il calendario aggiorna gli eventi invece di duplicarli. Testo con l'escaping RFC 5545 e righe spezzate a 75 ottetti.

## 7. Orari di apertura sulle tappe

- `Tappa.orari`, modificabile nell'editor della tappa: giorni chiusi (7 interruttori), apertura e chiusura, nota.
- Pulsante "Cerca orari su OpenStreetMap": Overpass API, con una richiesta sola al tocco. Cerca per nome entro 300 m dalle coordinate della tappa, legge `opening_hours` e lo mostra **così com'è**, come testo da copiare nei campi. Non si interpreta la sintassi OSM.
- `statoApertura(tappa, data)` restituisce `'chiuso-oggi' | 'fuori-orario' | 'aperto' | 'sconosciuto'`: guarda il giorno della settimana della data del giorno e confronta l'`ora` e l'eventuale durata con apre/chiude.
- La card della tappa e il dettaglio mostrano un badge d'avviso "Chiuso il mercoledì" / "Apre alle 10:00". Oggi mostra l'avviso nella card "Adesso/Dopo".
- **Pre-compilati nei dati di partenza** (`fonte: 'base'`), sempre con la nota "verifica sul sito prima di andare":
  - Tsukiji Outer Market: chiusa la domenica, molti banchi chiusi il mercoledì e i festivi. Il G3 è mercoledì 11 agosto, festivo: l'avviso compare.
  - Museo del 21° secolo di Kanazawa: chiuso il lunedì, 10:00–18:00.
  - Kinkaku-ji: 9:00–17:00.
  - Tenryu-ji, giardino: 8:30–17:00.
  - Tōdai-ji: 7:30–17:30.
  - Castello di Himeji: 9:00–17:00.
  - Castello di Osaka: 9:00–17:00.
  - Nikko Tōshōgū: 8:00–17:00.
  - Tokyo Skytree: 10:00–21:00.
  - Shibuya Sky: 10:00–22:30.
  - Umeda Sky Building: 9:30–22:30.
  - Kenrokuen: 7:00–18:00.
  Solo questi. Il resto lo aggiunge Vito o lo legge da OSM.

## 8. Comodità

- **Scorri per segnare**: sulla card di una tappa, uno scorrimento orizzontale verso destra oltre 72 px, con |dx| > 2|dy|, alterna fatta e da fare. Durante il gesto si vede un'etichetta verde "Fatta". Non si attiva sulla maniglia di riordino né in modalità Modifica. Con `prefers-reduced-motion` niente animazione. `navigator.vibrate(10)` dove esiste (su iOS no).
- **Schermo sempre acceso**: in Oggi durante il viaggio, un interruttore "Tieni acceso lo schermo" usa la Wake Lock API, si riattiva quando l'app torna visibile e non compare dove l'API non esiste.
- **Scorciatoie dall'icona**: `shortcuts` nel manifest, "Oggi" (`#/oggi`) e "Aggiungi spesa" (`#/spese/nuova`), con icone 96 px.
- **Codici copiabili ovunque** compaiano (prenotazioni, indirizzo del taxi), con il toast "Copiato".
- **Spazio usato**: in Impostazioni, `navigator.storage.estimate()` mostra lo spazio usato da dati e allegati.

## 9. Errori e casi limite

- Nessuna rete: tutto funziona. Il cambio usa l'ultimo valore o quello manuale; OSM e la ricerca luoghi mostrano "non disponibile".
- IndexedDB non disponibile o pieno: gli allegati non si aggiungono e compare un messaggio. Il resto dell'app non ne risente.
- Un allegato manca da IndexedDB (cancellato dal sistema): nel dettaglio compare "allegato non più disponibile, ricaricalo".
- Una prenotazione con date incoerenti (fine prima di inizio) viene rifiutata dall'editor con un messaggio in linea.
- Nessuna persona in `divisaFra`: salvataggio rifiutato. Se una persona viene rinominata, i saldi usano gli id e non cambiano.
- Il foglio del "+" resta fuori dalla Mappa.

## 10. Verifica

- Vitest sulle parti pure, con i nuovi moduli in `src/model/`:
  - `saldi` e `rimborsiMinimi`: casi con 2 e 3 persone, spese in valute miste, divisione parziale, arrotondamenti;
  - `generaIcs`: UTC da Europe/Rome e Asia/Tokyo, escaping, piegatura delle righe, VALARM, UID stabili;
  - `statoApertura`: giorno chiuso, prima dell'apertura, durata che sfora, dati mancanti;
  - `notteCoperta`: quale hotel copre quale notte;
  - `cerca`: accenti, maiuscole, raggruppamento;
  - validazione dei tipi nuovi (casi validi e rifiutati);
  - backup con allegati, andata e ritorno con un IndexedDB finto;
  - ridimensionamento solo nella logica delle dimensioni.
- I dati di partenza sono rigenerati dallo script e coperti dai test, come in fase 1: prenotazioni degli hotel coerenti con i giorni e orari pre-compilati.
- Prova nel browser a 375×812, in chiaro e scuro. La prova di offline e installazione si fa in **Chrome con l'estensione Claude**, perché il browser integrato non registra il service worker.
- Revisione per ogni task, revisione finale, poi pubblicazione su `main`.

## 11. Fuori da questa fase

Import delle email, stato dei voli in tempo reale, notifiche push, widget, sincronizzazione fra telefoni: richiedono un server. Sono sostituiti da backup, `.ics` e link alle app esterne.
