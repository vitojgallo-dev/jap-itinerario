# Fase 2 — Documenti, spese, promemoria, orari e comodità — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere l'app autosufficiente in viaggio: prenotazioni con QR e PDF offline, spese divise fra 3 persone con chi-deve-a-chi, promemoria sul calendario (`.ics`), orari di apertura con avvisi sulle chiusure, e le comodità mancanti (tab bar a 5 voci più visibile, tasto "+", ricerca, scorri per segnare, schermo acceso, scorciatoie, codici copiabili, spazio usato).

**Architecture:** Il modello resta additivo (`VERSIONE_DATI` 2): `prenotazioni` e `spese` smettono di essere `unknown[]`, `Tappa.orari` e i campi nuovi di `Impostazioni` sono facoltativi. Tutta la logica nuova sta in funzioni pure in `src/model/` (spese, ics, orari, prenotazioni, ricerca, fusi) coperte da Vitest; i servizi esterni (Frankfurter, Overpass) e l'archivio degli allegati (IndexedDB con `idb-keyval`) stanno in `src/servizi/` con dipendenze iniettabili, così i test girano in Node con un archivio finto. L'interfaccia aggiunge le schermate `documenti` e `spese`, sposta la scheda Viaggio in `impostazioni` e riusa i primitivi esistenti (`Gruppo`, `Riga`, `Foglio`, `Segmentato`, `applica`/`applicaAnnullabile`).

**Tech Stack:** Vite 8, React 19.3, TypeScript strict, Zustand 5 (persist), vaul, sonner, lucide-react, @dnd-kit, react-leaflet 5, vite-plugin-pwa 1.3, Vitest 5 (ambiente node), idb-keyval (nuovo), sharp (solo per generare due icone), tsx.

**Spec:** `docs/superpowers/specs/2026-09-30-fase-2-documenti-spese-design.md`

## Global Constraints

- Interfaccia e nomi di dominio in **italiano** (`prenotazione`, `spesa`, `allegato`, `saldi`, `orari`).
- Pubblicazione sotto Vite `base: '/jap-itinerario/'`; routing **solo via hash** (`#/oggi`, `#/programma/7`, `#/mappa`, `#/documenti`, `#/documenti/<id>`, `#/spese`, `#/spese/nuova`, `#/impostazioni`; `#/viaggio` porta a `#/impostazioni`).
- Ora di riferimento sempre **`Asia/Tokyo`**; date `YYYY-MM-DD`; istanti delle prenotazioni `YYYY-MM-DDTHH:MM` nell'ora locale del loro `fuso` IANA, convertiti in UTC solo con `Intl` (`src/model/fusi.ts`).
- Tab bar: 5 voci **Oggi · Programma · Mappa · Documenti · Spese** (lucide `Sun`, `CalendarDays`, `Map`, `Ticket`, `Wallet`), area alta 56 px + safe area, icone 26 px, etichette 12 px semibold, pillola `--tinta-tenue` dietro l'icona attiva, sfondo a opacità 0.92, bordo superiore 1 px `--bordo`.
- Tasto "+" tondo da 56 px sopra la tab bar, a destra, su Oggi, Programma, Documenti (elenco) e Spese; **mai sulla Mappa**.
- Contrasto del testo ≥ 4.5:1: il testo colorato usa solo `--tinta-testo`, `--su-tinta`, `--avviso-testo`, `--pericolo`, `--su-pericolo` (verificati come in fase 1 con `calcolaTinta`/`SUPERFICI`); target touch ≥ 44 px; rispettare `prefers-reduced-motion`; nessuno scroll orizzontale della pagina a 375 px.
- Nessun servizio con chiave o account: Frankfurter (`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=JPY`), Overpass (`https://overpass-api.de/api/interpreter`, **una richiesta al tocco del pulsante**), Nominatim (come in fase 1, una richiesta per ricerca). Niente push, niente server.
- Nessun servizio esterno o IndexedDB può bloccare l'app: in errore si mostra l'ultimo dato, un messaggio in linea o niente.
- `VERSIONE_DATI` resta **2**: modello solo additivo, i salvataggi e i backup della fase 1 restano validi senza migrazione.
- Ogni `href`/`src` che viene dai dati passa da `linkSicuro` (link delle prenotazioni compresi); gli allegati si mostrano solo tramite object URL creati dall'app.
- Allegati: foto ridotte a lato lungo **1600 px**, JPEG qualità **0.85**; PDF così come sono fino a **15 MB**; backup con `allegati: Record<id, { mime, dati }>` in base64.
- `.ics`: orari in UTC (`DTSTART:20270807T103000Z`), `UID` stabili `<prefisso>-<id>@jap-itinerario`, escaping RFC 5545, righe piegate a 75 ottetti, CRLF; VALARM 3 h prima per voli e treni, 1 h per il resto, 09:00 per le scadenze.
- Chiave dei dati vecchi `localStorage["japan_itinerary_v1"]`: **mai cancellata**. Chiave nuova `giappone-viaggio` invariata.
- Git: ramo `fase-2` (già attivo); commit piccoli con messaggio in italiano che termina esattamente con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; **niente push**; mai aggiungere `.superpowers/` (usare sempre `git add` con i percorsi espliciti).
- Ogni task che tocca l'interfaccia finisce con `npm test && npm run build` e un elenco di controlli visivi a 375×812 in chiaro e in scuro, da fare dal controllore (chi implementa non ha un browser).

## Mappa dei file

```
src/model/tipi.ts                    tipi nuovi: Prenotazione, Allegato, Spesa, OrariTappa, Importo; campi nuovi di Tappa e Impostazioni
src/model/fusi.ts                    ora locale di un fuso IANA ↔ istante UTC, con Intl
src/model/validazione.ts             validaViaggio esteso a prenotazioni, spese, orari, impostazioni
src/model/fixture.ts                 prenotazioneDiProva, spesaDiProva
src/model/spese.ts                   yen/euro, quote, saldi, rimborsiMinimi, riepilogo, nuova spesa, formati degli importi
src/model/ics.ts                     eventi del calendario e file .ics (escaping, piegatura, VALARM)
src/model/orari.ts                   statoApertura, avviso "Chiuso il…/Apre alle…", descrizione, pulizia degli orari
src/model/prenotazioni.ts            notteCoperta, operazioni, controllo dell'editor, gruppi, scadenze, "prossimo"
src/model/ricerca.ts                 ricerca senza accenti né maiuscole su tappe e prenotazioni
src/model/operazioni.ts              + integraDatiDiPartenza (prenotazioni e orari di partenza per chi ha già dati)
src/servizi/cambio.ts                cambio EUR→JPY da Frankfurter
src/servizi/allegati.ts              IndexedDB (idb-keyval), riduzione delle foto, backup e pulizia degli allegati
src/servizi/backup.ts                backup con allegati in base64
src/servizi/condividi.ts             condividere o scaricare un file (backup e .ics)
src/servizi/osm.ts                   orari da OpenStreetMap via Overpass
scripts/revisione-2027.ts            + prenotazioni e orari di partenza
scripts/icone-scorciatoie.ts         genera le due icone da 96 px delle scorciatoie
src/data/itinerario-base.json        RIGENERATO
src/ui/rotta.ts                      rotte nuove, id nelle rotte, reindirizzamento di #/viaggio
src/ui/TabBar.tsx                    5 voci con pillola
src/ui/componenti.tsx                + LinkImpostazioni, LinkIndietro, Badge "pericolo"
src/ui/copia.ts                      copia negli appunti con il toast "Copiato"
src/ui/scorrimento.ts                gesto orizzontale riusabile (spese, tappe, visualizzatore)
src/ui/datiDiPartenza.ts             hook per aggiungere prenotazioni e orari di partenza
src/ui/Aggiungi.tsx                  tasto "+" e il suo foglio
src/ui/Calendario.tsx                foglio "Aggiungi al calendario"
src/ui/SchermoAcceso.tsx             interruttore Wake Lock
src/ui/SpazioUsato.tsx               spazio usato da dati e allegati
src/ui/Backup.tsx                    esportazione con gli allegati
src/schermate/impostazioni/          (era schermate/viaggio/) Impostazioni, EditorCitta, PrimoAvvio
src/schermate/documenti/             Documenti (elenco), DettaglioDocumento, Allegati (griglia e visualizzatore),
                                     EditorPrenotazione, FoglioPrenotazione, documenti.css
src/schermate/spese/                 Spese, FoglioSpesa, ImpostazioniSpese, spese.css
src/schermate/oggi/                  + CardProssimo, Stanotte; SchedaTaxi generalizzata
src/schermate/programma/             + EditorOrari; orari in CardTappa/VistaTappa; scorri per segnare
src/schermate/ricerca/Ricerca.tsx    lente e foglio di ricerca
docs/PROVA-FASE-2.md                 guida di prova della fase 2
```

---

### Task 1: Tipi, fusi orari e validazione

**Files:**
- Modify: `src/model/tipi.ts`, `src/model/validazione.ts` (riscritto intero), `src/model/validazione.test.ts`, `src/model/fixture.ts`
- Create: `src/model/fusi.ts`
- Test: `src/model/fusi.test.ts`, `src/model/validazione.test.ts`

**Interfaces:**
- Consumes: `aggiungiGiorni` (`src/model/date.ts`), i tipi esistenti.
- Produces (tipi): `TIPI_PRENOTAZIONE`, `TipoPrenotazione`, `STATI_PRENOTAZIONE`, `StatoPrenotazione`, `VALUTE`, `Valuta`, `Importo { importo: number; valuta: Valuta }`, `Allegato { id; nome; mime; byte }`, `Prenotazione` (campi dello spec più `fusoFine?: string`), `CATEGORIE_SPESA`, `CategoriaSpesa`, `METODI_PAGAMENTO`, `MetodoPagamento`, `Spesa` (campi dello spec più `rimborso?: boolean`), `FONTI_ORARI`, `FonteOrari`, `OrariTappa`; `Tappa.orari?: OrariTappa`; `Impostazioni.budgetGiornaliero?: Importo`, `cambioManuale?: number`, `ultimoCambio?: { valore: number; data: string }`; `Viaggio.prenotazioni: Prenotazione[]`, `Viaggio.spese: Spesa[]`.
- Produces (fusi): `fusoValido(f: unknown): f is string`, `localeDaUtc(d: Date, fuso: string): string` ("YYYY-MM-DDTHH:MM"), `utcDaLocale(locale: string, fuso: string): Date`.
- Produces (fixture): `prenotazioneDiProva(p: Partial<Prenotazione> & { id: string }): Prenotazione`, `spesaDiProva(p: Partial<Spesa> & { id: string }): Spesa`.

- [ ] **Step 1: Aggiungere i tipi nuovi a `src/model/tipi.ts`**

In `interface Tappa`, sostituire

```ts
  nota: string
  foto?: string
}
```

con

```ts
  nota: string
  foto?: string
  orari?: OrariTappa
}
```

Sostituire l'intera `interface Impostazioni` con

```ts
export interface Impostazioni {
  tema: Tema
  ultimoBackup?: string
  budgetGiornaliero?: Importo
  /** Yen per 1 euro scritti a mano: vince sul cambio scaricato. */
  cambioManuale?: number
  /** L'ultimo cambio scaricato dalla BCE, con la sua data. */
  ultimoCambio?: { valore: number; data: string }
}
```

Nella `interface Viaggio`, sostituire

```ts
  prenotazioni: unknown[]
  spese: unknown[]
```

con

```ts
  prenotazioni: Prenotazione[]
  spese: Spesa[]
```

In fondo al file aggiungere:

```ts
export const TIPI_PRENOTAZIONE = ['volo', 'hotel', 'treno', 'biglietto', 'ristorante', 'altro'] as const
export type TipoPrenotazione = (typeof TIPI_PRENOTAZIONE)[number]

export const STATI_PRENOTAZIONE = ['da-prenotare', 'prenotata'] as const
export type StatoPrenotazione = (typeof STATI_PRENOTAZIONE)[number]

export const VALUTE = ['JPY', 'EUR'] as const
export type Valuta = (typeof VALUTE)[number]

export interface Importo {
  importo: number
  valuta: Valuta
}

/** I dati dell'allegato stanno in IndexedDB, sotto lo stesso id. */
export interface Allegato {
  id: Id
  nome: string
  mime: string
  byte: number
}

export interface Prenotazione {
  id: Id
  tipo: TipoPrenotazione
  titolo: string
  stato: StatoPrenotazione
  /** "2027-08-07T12:30", ora locale di `fuso`. */
  inizio?: string
  /** Idem, ma nel fuso `fusoFine` se c'è; per gli hotel è il check-out. */
  fine?: string
  /** IANA: "Asia/Tokyo", "Europe/Rome". */
  fuso: string
  /** Fuso di `fine` quando è diverso da `fuso` (un volo che atterra in un altro paese). */
  fusoFine?: string
  luogo?: Luogo
  codice?: string
  riferimento?: string
  daPrenotareEntro?: string
  costo?: Importo
  link?: string
  note: string
  allegati: Allegato[]
  tappaId?: Id
}

export const CATEGORIE_SPESA = ['cibo', 'trasporti', 'alloggio', 'biglietti', 'shopping', 'altro'] as const
export type CategoriaSpesa = (typeof CATEGORIE_SPESA)[number]

export const METODI_PAGAMENTO = ['contanti', 'carta'] as const
export type MetodoPagamento = (typeof METODI_PAGAMENTO)[number]

export interface Spesa {
  id: Id
  data: string
  /** > 0, nella valuta indicata. */
  importo: number
  valuta: Valuta
  /** Yen per 1 euro al momento dell'inserimento: i totali non cambiano col cambio di domani. */
  cambio: number
  categoria: CategoriaSpesa
  descrizione: string
  pagatoDa: Id
  divisaFra: Id[]
  metodo: MetodoPagamento
  /** Un rimborso fra persone: conta nei saldi, non nei totali delle spese. */
  rimborso?: boolean
}

export const FONTI_ORARI = ['manuale', 'osm', 'base'] as const
export type FonteOrari = (typeof FONTI_ORARI)[number]

export interface OrariTappa {
  /** Giorni della settimana di chiusura, 0 = domenica. */
  chiusoIl: number[]
  apre?: string
  chiude?: string
  nota?: string
  fonte?: FonteOrari
}
```

- [ ] **Step 2: Test dei fusi orari**

Creare `src/model/fusi.test.ts`:

```ts
import { expect, test } from 'vitest'
import { fusoValido, localeDaUtc, utcDaLocale } from './fusi'

test('utcDaLocale: ora legale di Roma, ora solare di Roma, ora di Tokyo', () => {
  expect(utcDaLocale('2027-08-07T12:30', 'Europe/Rome').toISOString()).toBe('2027-08-07T10:30:00.000Z')
  expect(utcDaLocale('2027-01-10T12:00', 'Europe/Rome').toISOString()).toBe('2027-01-10T11:00:00.000Z')
  expect(utcDaLocale('2027-08-08T14:00', 'Asia/Tokyo').toISOString()).toBe('2027-08-08T05:00:00.000Z')
  expect(utcDaLocale('2027-08-27T00:30', 'Asia/Tokyo').toISOString()).toBe('2027-08-26T15:30:00.000Z')
})

test('localeDaUtc è l\'inverso', () => {
  expect(localeDaUtc(new Date('2027-08-07T10:30:00Z'), 'Europe/Rome')).toBe('2027-08-07T12:30')
  expect(localeDaUtc(new Date('2027-08-26T15:30:00Z'), 'Asia/Tokyo')).toBe('2027-08-27T00:30')
})

test('fusoValido', () => {
  expect(fusoValido('Asia/Tokyo')).toBe(true)
  expect(fusoValido('Europe/Rome')).toBe(true)
  expect(fusoValido('Marte/Olimpo')).toBe(false)
  expect(fusoValido('')).toBe(false)
  expect(fusoValido(5)).toBe(false)
})
```

Run: `npm test -- src/model/fusi.test.ts`
Expected: FAIL, `Failed to resolve import "./fusi"`.

- [ ] **Step 3: Implementare `src/model/fusi.ts`**

```ts
const formati = new Map<string, Intl.DateTimeFormat>()

function formato(fuso: string): Intl.DateTimeFormat {
  let f = formati.get(fuso)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
    formati.set(fuso, f)
  }
  return f
}

/** Vero se `fuso` è un nome IANA che il telefono conosce ("Asia/Tokyo"). */
export function fusoValido(fuso: unknown): fuso is string {
  if (typeof fuso !== 'string' || fuso === '') return false
  try {
    formato(fuso)
    return true
  } catch {
    return false
  }
}

/** "YYYY-MM-DDTHH:MM" che l'orologio del fuso segna nell'istante `d`. */
export function localeDaUtc(d: Date, fuso: string): string {
  const parti = formato(fuso).formatToParts(d)
  const p = (tipo: string) => parti.find(x => x.type === tipo)!.value
  return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`
}

function msDaLocale(locale: string): number {
  const [data, ora] = locale.split('T')
  const [a, m, g] = data.split('-').map(Number)
  const [h, min] = ora.split(':').map(Number)
  return Date.UTC(a, m - 1, g, h, min)
}

/** L'istante in cui l'orologio del fuso segna `locale` ("2027-08-07T12:30"). Niente tabelle: lo scarto lo dà Intl. */
export function utcDaLocale(locale: string, fuso: string): Date {
  const voluto = msDaLocale(locale)
  let t = voluto
  // Due passi bastano anche a cavallo del cambio dell'ora legale.
  for (let i = 0; i < 2; i++) t += voluto - msDaLocale(localeDaUtc(new Date(t), fuso))
  return new Date(t)
}
```

Run: `npm test -- src/model/fusi.test.ts`
Expected: PASS (3 test).

- [ ] **Step 4: Aiutanti di prova in `src/model/fixture.ts`**

Sostituire la prima riga

```ts
import type { Citta, Giorno, Tappa, Viaggio } from './tipi'
```

con

```ts
import type { Citta, Giorno, Prenotazione, Spesa, Tappa, Viaggio } from './tipi'
```

e aggiungere in fondo al file:

```ts
export function prenotazioneDiProva(p: Partial<Prenotazione> & { id: string }): Prenotazione {
  return { tipo: 'biglietto', titolo: p.id, stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [], ...p }
}

export function spesaDiProva(p: Partial<Spesa> & { id: string }): Spesa {
  return {
    data: '2027-08-10', importo: 1000, valuta: 'JPY', cambio: 160, categoria: 'cibo', descrizione: p.id,
    pagatoDa: 'p1', divisaFra: ['p1'], metodo: 'contanti', ...p,
  }
}
```

- [ ] **Step 5: Test della validazione dei tipi nuovi**

In `src/model/validazione.test.ts` sostituire la riga di import della fixture

```ts
import { cittaDiProva, giornoDiProva, tappaDiProva, viaggioDiProva } from './fixture'
```

con

```ts
import { cittaDiProva, giornoDiProva, prenotazioneDiProva, spesaDiProva, tappaDiProva, viaggioDiProva } from './fixture'
```

e aggiungere in fondo al file:

```ts
const tre = [{ id: 'p1', nome: 'Vito' }, { id: 'p2', nome: 'Anna' }, { id: 'p3', nome: 'Luca' }]

test('accetta prenotazioni, spese, orari e impostazioni nuove', () => {
  const v = viaggioDiProva({
    persone: tre,
    giorni: [giornoDiProva({
      id: 'g0',
      tappe: [tappaDiProva({ id: 'a', ora: '10:00', orari: { chiusoIl: [1, 3], apre: '09:00', chiude: '17:00', nota: 'verifica', fonte: 'base' } })],
    })],
    prenotazioni: [prenotazioneDiProva({
      id: 'pr-1', tipo: 'volo', titolo: 'Volo Roma → Tokyo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome',
      fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo', luogo: { nome: 'Fiumicino', query: 'Rome Fiumicino Airport', lat: 41.8, lng: 12.24 },
      codice: 'ABC123', riferimento: 'AZ 784', daPrenotareEntro: '2027-07-15', costo: { importo: 850, valuta: 'EUR' },
      link: 'https://www.ita-airways.com', allegati: [{ id: 'a-1', nome: 'carta.jpg', mime: 'image/jpeg', byte: 120000 }], tappaId: 'a',
    })],
    spese: [
      spesaDiProva({ id: 's-1', pagatoDa: 'p2', divisaFra: ['p1', 'p2', 'p3'] }),
      spesaDiProva({ id: 's-2', valuta: 'EUR', importo: 12.5, metodo: 'carta', rimborso: true }),
    ],
    impostazioni: { tema: 'auto', budgetGiornaliero: { importo: 15000, valuta: 'JPY' }, cambioManuale: 160, ultimoCambio: { valore: 162.4, data: '2027-08-10' } },
  })
  const r = validaViaggio(v)
  expect(r.ok ? [] : r.errori).toEqual([])
})

test('rifiuta prenotazioni sbagliate', () => {
  const v = viaggioDiProva({
    prenotazioni: [
      prenotazioneDiProva({ id: 'x', tipo: 'nave' as never, inizio: '2027-08-07 12:30', fuso: 'Marte/Olimpo', allegati: [{ id: 'a', nome: 'x', mime: 'image/jpeg' } as never] }),
      prenotazioneDiProva({ id: 'x', stato: 'forse' as never, costo: { importo: -1, valuta: 'JPY' }, daPrenotareEntro: '2027-02-31' }),
    ],
  })
  expect(rifiutato(v)).toEqual(expect.arrayContaining([
    'prenotazione x: tipo non valido "nave"',
    'prenotazione x: inizio non valido "2027-08-07 12:30"',
    'prenotazione x: fuso non valido "Marte/Olimpo"',
    'prenotazione x: allegato non valido',
    'id prenotazione duplicato: x',
    'prenotazione x: stato non valido "forse"',
    'prenotazione x: costo non valido',
    'prenotazione x: data entro cui prenotare non valida',
  ]))
})

test('rifiuta spese sbagliate', () => {
  const v = viaggioDiProva({
    spese: [
      spesaDiProva({ id: 's', importo: 0, divisaFra: [] }),
      spesaDiProva({ id: 't', pagatoDa: 'p9', metodo: 'bitcoin' as never, valuta: 'USD' as never, cambio: 0 }),
      spesaDiProva({ id: 'u', divisaFra: ['p1', 'p1'], data: '10 agosto' }),
    ],
  })
  expect(rifiutato(v)).toEqual(expect.arrayContaining([
    'spesa s: importo non valido',
    'spesa s: divisione non valida',
    'spesa t: chi ha pagato non è fra le persone',
    'spesa t: metodo non valido "bitcoin"',
    'spesa t: valuta non valida "USD"',
    'spesa t: cambio non valido',
    'spesa u: divisione non valida',
    'spesa u: data non valida',
  ]))
})

test('rifiuta orari e impostazioni sbagliati', () => {
  const v = viaggioDiProva({
    giorni: [giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', orari: { chiusoIl: [7], apre: '9:00', fonte: 'sito' as never } })] })],
    impostazioni: { tema: 'auto', budgetGiornaliero: { importo: -5, valuta: 'JPY' }, cambioManuale: 0, ultimoCambio: { valore: 160, data: 'ieri' } },
  })
  expect(rifiutato(v)).toEqual(expect.arrayContaining([
    'tappa a: giorni di chiusura non validi',
    'tappa a: ora di apertura non valida',
    'tappa a: fonte degli orari non valida',
    'budget giornaliero non valido',
    'cambio manuale non valido',
    'ultimo cambio non valido',
  ]))
})

test('un viaggio della fase 1, senza niente di nuovo, resta valido', () => {
  expect(validaViaggio(viaggioDiProva({ prenotazioni: [], spese: [] })).ok).toBe(true)
})
```

Run: `npm test -- src/model/validazione.test.ts`
Expected: FAIL, i tre test "rifiuta prenotazioni/spese/orari…" falliscono (`validaViaggio` non guarda ancora prenotazioni, spese, orari e impostazioni nuove, quindi dice `ok: true`); "accetta…" e "un viaggio della fase 1…" passano già.

- [ ] **Step 6: Riscrivere `src/model/validazione.ts`**

```ts
import { aggiungiGiorni } from './date'
import { fusoValido } from './fusi'
import {
  CATEGORIE_SPESA, FONTI_ORARI, METODI_PAGAMENTO, MODI_SPOSTAMENTO, STATI_PRENOTAZIONE, STATI_TAPPA,
  TIPI_PRENOTAZIONE, TIPI_TAPPA, VALUTE, VERSIONE_DATI, type Viaggio,
} from './tipi'

type Esito = { ok: true; viaggio: Viaggio } | { ok: false; errori: string[] }
type Obj = Record<string, unknown>

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/
const DATA = /^\d{4}-\d{2}-\d{2}$/
const LOCALE = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d$/
const TEMI = ['auto', 'chiaro', 'scuro']
const LIVELLI_AVVISO = ['info', 'attenzione']
const TIPI_SUGGERIMENTO = ['cibo', 'opzionale', 'souvenir']
const AFFIDABILITA = ['certa', 'probabile', 'da-verificare']

const oggetto = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)
const stringa = (x: unknown): x is string => typeof x === 'string'
const numero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const tra = (x: unknown, ammessi: readonly string[]) => typeof x === 'string' && ammessi.includes(x)
/** I campi di `o` elencati in `chiavi` che non sono stringhe. */
const nonStringhe = (o: Obj, chiavi: string[]) => chiavi.filter(k => !stringa(o[k]))

/** Una data "YYYY-MM-DD" che esiste davvero nel calendario. */
function dataVera(d: unknown): boolean {
  if (!stringa(d) || !DATA.test(d)) return false
  try {
    return aggiungiGiorni(d, 0) === d
  } catch {
    return false
  }
}

/** "YYYY-MM-DDTHH:MM" con una data che esiste. */
function localeVera(x: unknown): boolean {
  if (!stringa(x)) return false
  const m = LOCALE.exec(x)
  return m !== null && dataVera(m[1])
}

/** Un importo con una valuta ammessa; `positivo` esclude anche lo zero. */
function importoValido(x: unknown, positivo: boolean): boolean {
  return oggetto(x) && numero(x.importo) && (positivo ? x.importo > 0 : x.importo >= 0) && tra(x.valuta, VALUTE)
}

/** Gli errori di un Luogo, con `dove` davanti; vuoto se è valido. */
function erroriLuogo(l: unknown, dove: string): string[] {
  if (!oggetto(l)) return [`${dove}: luogo non valido`]
  const e: string[] = []
  for (const k of nonStringhe(l, ['nome', 'query'])) e.push(`${dove}: ${k} del luogo deve essere un testo`)
  for (const k of ['lat', 'lng']) if (l[k] !== undefined && !numero(l[k])) e.push(`${dove}: ${k} del luogo deve essere un numero`)
  if (l.indirizzoJa !== undefined && !stringa(l.indirizzoJa)) e.push(`${dove}: indirizzoJa del luogo deve essere un testo`)
  return e
}

function erroriCitta(c: Obj): string[] {
  const e: string[] = []
  const dove = `città ${c.id}`
  for (const k of nonStringhe(c, ['nome', 'kanji', 'romaji', 'colore', 'intro'])) e.push(`${dove}: ${k} deve essere un testo`)
  if (!numero(c.lat) || !numero(c.lng)) e.push(`${dove}: coordinate mancanti`)
  if (!oggetto(c.clima) || !numero(c.clima.max) || !numero(c.clima.min)) e.push(`${dove}: clima mancante`)
  return e
}

function erroriGiorno(g: Obj): string[] {
  const e: string[] = []
  const dove = `giorno ${g.id}`
  for (const k of nonStringhe(g, ['titolo', 'intro', 'note'])) e.push(`${dove}: ${k} deve essere un testo`)
  if (g.alloggio !== null) e.push(...erroriLuogo(g.alloggio, `${dove}, alloggio`))
  if (Array.isArray(g.consigli) && !g.consigli.every(stringa)) e.push(`${dove}: i consigli devono essere testi`)
  if (Array.isArray(g.avvisi)) {
    for (const a of g.avvisi) {
      if (!oggetto(a) || !stringa(a.testo) || !tra(a.livello, LIVELLI_AVVISO)) e.push(`${dove}: avviso non valido`)
    }
  }
  if (Array.isArray(g.suggerimenti)) {
    for (const s of g.suggerimenti) {
      if (!oggetto(s) || !tra(s.tipo, TIPI_SUGGERIMENTO) || !stringa(s.nome) || !stringa(s.descrizione)) {
        e.push(`${dove}: suggerimento non valido`)
        continue
      }
      if (s.luogo !== undefined) e.push(...erroriLuogo(s.luogo, `${dove}, suggerimento "${s.nome}"`))
    }
  }
  if (g.speciale !== null) {
    const s = g.speciale
    const valido = oggetto(s) && stringa(s.titolo) && stringa(s.nota) && Array.isArray(s.opzioni)
      && s.opzioni.every(o => oggetto(o) && nonStringhe(o, ['livello', 'nome', 'descrizione', 'link']).length === 0)
    if (!valido) e.push(`${dove}: speciale non valido`)
  }
  return e
}

function erroriOrari(o: unknown, dove: string): string[] {
  if (!oggetto(o)) return [`${dove}: orari non validi`]
  const e: string[] = []
  const giorni = o.chiusoIl
  if (!Array.isArray(giorni) || !giorni.every(g => Number.isInteger(g) && g >= 0 && g <= 6)) e.push(`${dove}: giorni di chiusura non validi`)
  for (const [k, nome] of [['apre', 'apertura'], ['chiude', 'chiusura']] as const) {
    const ora = o[k]
    if (ora !== undefined && !(stringa(ora) && ORA.test(ora))) e.push(`${dove}: ora di ${nome} non valida`)
  }
  if (o.nota !== undefined && !stringa(o.nota)) e.push(`${dove}: nota degli orari non valida`)
  if (o.fonte !== undefined && !tra(o.fonte, FONTI_ORARI)) e.push(`${dove}: fonte degli orari non valida`)
  return e
}

function erroriTappa(t: Obj): string[] {
  const e: string[] = []
  const dove = `tappa ${t.id}`
  if (t.ora !== null && (!stringa(t.ora) || !ORA.test(t.ora))) e.push(`${dove}: ora non valida "${String(t.ora)}"`)
  if (!tra(t.stato, STATI_TAPPA)) e.push(`${dove}: stato non valido "${String(t.stato)}"`)
  if (!tra(t.tipo, TIPI_TAPPA)) e.push(`${dove}: tipo non valido "${String(t.tipo)}"`)
  if (!stringa(t.titolo)) e.push(`${dove}: titolo mancante`)
  for (const k of nonStringhe(t, ['descrizione', 'consiglio', 'nota'])) e.push(`${dove}: ${k} deve essere un testo`)
  if (typeof t.sera !== 'boolean') e.push(`${dove}: sera deve essere sì o no`)
  if (t.durataMin !== undefined && (!numero(t.durataMin) || t.durataMin < 0)) e.push(`${dove}: durata non valida`)
  if (t.luogo !== undefined) e.push(...erroriLuogo(t.luogo, dove))
  if (t.biglietti !== undefined && !(oggetto(t.biglietti) && (t.biglietti.link === null || stringa(t.biglietti.link)))) {
    e.push(`${dove}: biglietti non validi`)
  }
  if (t.spostamento !== undefined) {
    const s = t.spostamento
    const valido = oggetto(s) && tra(s.modo, MODI_SPOSTAMENTO)
      && (s.minuti === undefined || numero(s.minuti)) && (s.nota === undefined || stringa(s.nota))
    if (!valido) e.push(`${dove}: spostamento non valido`)
  }
  if (t.evento !== undefined) {
    const v = t.evento
    const valido = oggetto(v) && stringa(v.nome) && tra(v.affidabilita, AFFIDABILITA)
      && (v.nomeJa === undefined || stringa(v.nomeJa)) && (v.fonte === undefined || stringa(v.fonte))
    if (!valido) e.push(`${dove}: evento non valido`)
  }
  if (t.foto !== undefined && !stringa(t.foto)) e.push(`${dove}: foto non valida`)
  if (t.orari !== undefined) e.push(...erroriOrari(t.orari, dove))
  return e
}

function erroriPrenotazione(p: Obj): string[] {
  const e: string[] = []
  const dove = `prenotazione ${p.id}`
  if (!tra(p.tipo, TIPI_PRENOTAZIONE)) e.push(`${dove}: tipo non valido "${String(p.tipo)}"`)
  if (!tra(p.stato, STATI_PRENOTAZIONE)) e.push(`${dove}: stato non valido "${String(p.stato)}"`)
  if (!stringa(p.titolo)) e.push(`${dove}: titolo mancante`)
  if (!stringa(p.note)) e.push(`${dove}: note deve essere un testo`)
  for (const k of ['inizio', 'fine'] as const) {
    const x = p[k]
    if (x !== undefined && !localeVera(x)) e.push(`${dove}: ${k} non valido "${String(x)}"`)
  }
  if (!fusoValido(p.fuso)) e.push(`${dove}: fuso non valido "${String(p.fuso)}"`)
  if (p.fusoFine !== undefined && !fusoValido(p.fusoFine)) e.push(`${dove}: fuso della fine non valido "${String(p.fusoFine)}"`)
  if (p.luogo !== undefined) e.push(...erroriLuogo(p.luogo, dove))
  for (const k of ['codice', 'riferimento', 'link', 'tappaId'] as const) {
    if (p[k] !== undefined && !stringa(p[k])) e.push(`${dove}: ${k} deve essere un testo`)
  }
  if (p.daPrenotareEntro !== undefined && !dataVera(p.daPrenotareEntro)) e.push(`${dove}: data entro cui prenotare non valida`)
  if (p.costo !== undefined && !importoValido(p.costo, false)) e.push(`${dove}: costo non valido`)
  if (!Array.isArray(p.allegati)) {
    e.push(`${dove}: allegati deve essere un elenco`)
  } else {
    for (const a of p.allegati) {
      if (!oggetto(a) || !stringa(a.id) || !stringa(a.nome) || !stringa(a.mime) || !numero(a.byte) || a.byte < 0) e.push(`${dove}: allegato non valido`)
    }
  }
  return e
}

function erroriSpesa(s: Obj, persone: Set<string>): string[] {
  const e: string[] = []
  const dove = `spesa ${s.id}`
  if (!dataVera(s.data)) e.push(`${dove}: data non valida`)
  if (!numero(s.importo) || s.importo <= 0) e.push(`${dove}: importo non valido`)
  if (!tra(s.valuta, VALUTE)) e.push(`${dove}: valuta non valida "${String(s.valuta)}"`)
  if (!numero(s.cambio) || s.cambio <= 0) e.push(`${dove}: cambio non valido`)
  if (!tra(s.categoria, CATEGORIE_SPESA)) e.push(`${dove}: categoria non valida "${String(s.categoria)}"`)
  if (!stringa(s.descrizione)) e.push(`${dove}: descrizione deve essere un testo`)
  if (!stringa(s.pagatoDa) || !persone.has(s.pagatoDa)) e.push(`${dove}: chi ha pagato non è fra le persone`)
  const fra = s.divisaFra
  const divisaBene = Array.isArray(fra) && fra.length > 0 && fra.every(id => stringa(id) && persone.has(id)) && new Set(fra).size === fra.length
  if (!divisaBene) e.push(`${dove}: divisione non valida`)
  if (!tra(s.metodo, METODI_PAGAMENTO)) e.push(`${dove}: metodo non valido "${String(s.metodo)}"`)
  if (s.rimborso !== undefined && typeof s.rimborso !== 'boolean') e.push(`${dove}: rimborso deve essere sì o no`)
  return e
}

/** Controlla un Viaggio arrivato da fuori (file importato, stato salvato, dati base), tipi dei campi compresi. */
export function validaViaggio(x: unknown): Esito {
  if (!oggetto(x)) return { ok: false, errori: ['non è un oggetto'] }
  if (x.versione !== VERSIONE_DATI) return { ok: false, errori: [`versione dei dati non supportata: ${String(x.versione)}`] }
  const strutturali: string[] = []
  for (const k of ['persone', 'citta', 'giorni', 'prenotazioni', 'spese', 'checklist'] as const) {
    if (!Array.isArray(x[k])) strutturali.push(`${k} deve essere un elenco`)
  }
  if (!oggetto(x.impostazioni)) strutturali.push('impostazioni mancanti')
  if (strutturali.length) return { ok: false, errori: strutturali }

  const errori: string[] = []
  if (!stringa(x.titolo)) errori.push('titolo mancante')
  if (!dataVera(x.dataPartenza)) errori.push(`dataPartenza non valida: ${String(x.dataPartenza)}`)

  const persone = new Set<string>()
  for (const p of x.persone as unknown[]) {
    if (!oggetto(p) || !stringa(p.id) || !stringa(p.nome)) { errori.push('persona non valida'); continue }
    persone.add(p.id)
  }
  const imp = x.impostazioni as Obj
  if (!tra(imp.tema, TEMI)) errori.push(`tema non valido: ${String(imp.tema)}`)
  if (imp.ultimoBackup !== undefined && !stringa(imp.ultimoBackup)) errori.push('data dell\'ultimo backup non valida')
  if (imp.budgetGiornaliero !== undefined && !importoValido(imp.budgetGiornaliero, true)) errori.push('budget giornaliero non valido')
  if (imp.cambioManuale !== undefined && (!numero(imp.cambioManuale) || imp.cambioManuale <= 0)) errori.push('cambio manuale non valido')
  if (imp.ultimoCambio !== undefined) {
    const c = imp.ultimoCambio
    if (!(oggetto(c) && numero(c.valore) && c.valore > 0 && dataVera(c.data))) errori.push('ultimo cambio non valido')
  }

  const citta = new Set<string>()
  for (const c of x.citta as unknown[]) {
    if (!oggetto(c) || !stringa(c.id)) { errori.push('città senza id'); continue }
    if (citta.has(c.id)) errori.push(`id città duplicato: ${c.id}`)
    citta.add(c.id)
    errori.push(...erroriCitta(c))
  }
  const idGiorni = new Set<string>()
  const idTappe = new Set<string>()
  for (const g of x.giorni as unknown[]) {
    if (!oggetto(g) || !stringa(g.id)) { errori.push('giorno senza id'); continue }
    if (idGiorni.has(g.id)) errori.push(`id giorno duplicato: ${g.id}`)
    idGiorni.add(g.id)
    if (!stringa(g.cittaId) || !citta.has(g.cittaId)) errori.push(`giorno ${g.id}: città "${String(g.cittaId)}" inesistente`)
    for (const k of ['consigli', 'avvisi', 'suggerimenti', 'tappe'] as const) {
      if (!Array.isArray(g[k])) errori.push(`giorno ${g.id}: ${k} deve essere un elenco`)
    }
    errori.push(...erroriGiorno(g))
    for (const t of (Array.isArray(g.tappe) ? g.tappe : []) as unknown[]) {
      if (!oggetto(t) || !stringa(t.id)) { errori.push(`giorno ${g.id}: tappa senza id`); continue }
      if (idTappe.has(t.id)) errori.push(`id tappa duplicato: ${t.id}`)
      idTappe.add(t.id)
      errori.push(...erroriTappa(t))
    }
  }
  const idPrenotazioni = new Set<string>()
  for (const p of x.prenotazioni as unknown[]) {
    if (!oggetto(p) || !stringa(p.id)) { errori.push('prenotazione senza id'); continue }
    if (idPrenotazioni.has(p.id)) errori.push(`id prenotazione duplicato: ${p.id}`)
    idPrenotazioni.add(p.id)
    errori.push(...erroriPrenotazione(p))
  }
  const idSpese = new Set<string>()
  for (const s of x.spese as unknown[]) {
    if (!oggetto(s) || !stringa(s.id)) { errori.push('spesa senza id'); continue }
    if (idSpese.has(s.id)) errori.push(`id spesa duplicato: ${s.id}`)
    idSpese.add(s.id)
    errori.push(...erroriSpesa(s, persone))
  }
  return errori.length ? { ok: false, errori } : { ok: true, viaggio: x as unknown as Viaggio }
}
```

Run: `npm test`
Expected: PASS (tutta la suite, compresi i test nuovi e "l'itinerario base resta valido").

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 8: Commit**

```bash
git add src/model/tipi.ts src/model/fusi.ts src/model/fusi.test.ts src/model/validazione.ts src/model/validazione.test.ts src/model/fixture.ts
git commit -m "Modello della fase 2: prenotazioni, spese, orari, fusi orari e la loro validazione

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: I conti delle spese e il cambio

**Files:**
- Create: `src/model/spese.ts`, `src/servizi/cambio.ts`
- Test: `src/model/spese.test.ts`, `src/servizi/cambio.test.ts`

**Interfaces:**
- Consumes: `Spesa`, `Persona`, `Impostazioni`, `Viaggio`, `CATEGORIE_SPESA` (Task 1); `differenzaGiorni`, `istanteTokyo` (`date.ts`); `nuovoId` (`id.ts`).
- Produces (`src/model/spese.ts`): `inYen(s): number`, `inEuro(s): number`, `quote(s: Spesa): Map<Id, number>`, `saldi(persone: Persona[], spese: Spesa[]): Record<Id, number>`, `interface Rimborso { da: Id; a: Id; yen: number }`, `rimborsiMinimi(saldi: Record<Id, number>): Rimborso[]`, `spesaRimborso(r: Rimborso, data: string, cambio: number): Spesa`, `interface RiepilogoSpese { yen; euro; quote: Record<Id, number>; perMetodo: Record<MetodoPagamento, number>; perCategoria: { categoria; yen }[]; perGiorno: { data; yen; spese: Spesa[] }[] }`, `riepilogoSpese(spese: Spesa[]): RiepilogoSpese`, `cambioDaUsare(imp: Impostazioni): number | null`, `dataPredefinita(v: Viaggio, adesso: Date): string`, `ultimeScelte(v: Viaggio)`, `nuovaSpesa(v: Viaggio, adesso: Date): Spesa`, `aggiungiSpesa(v, s)`, `sostituisciSpesa(v, s)`, `eliminaSpesa(v, id)`, `controllaSpesa(s: Spesa): string[]`, `leggiImporto(testo: string): number | null`, `formatoYen(n)`, `formatoEuro(n)`, `formatoImporto(n, valuta)`, `formatoNumero(n)`.
- Produces (`src/servizi/cambio.ts`): `URL_CAMBIO`, `leggiCambio(j: unknown): { valore: number; data: string } | null`, `scaricaCambio(prendi?: (url: string) => Promise<unknown>): Promise<{ valore: number; data: string } | null>` (non lancia mai).

- [ ] **Step 1: Test dei conti**

Creare `src/model/spese.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { spesaDiProva as s, viaggioDiProva } from './fixture'
import * as sp from './spese'

const persone = [{ id: 'p1', nome: 'Vito' }, { id: 'p2', nome: 'Anna' }, { id: 'p3', nome: 'Luca' }]

describe('saldi', () => {
  test('due persone, divisa a metà', () => {
    expect(sp.saldi(persone.slice(0, 2), [s({ id: 'a', importo: 3000, pagatoDa: 'p1', divisaFra: ['p1', 'p2'] })])).toEqual({ p1: 1500, p2: -1500 })
  })
  test('tre persone: il resto dello yen va ai primi dell\'elenco', () => {
    expect(sp.saldi(persone, [s({ id: 'a', importo: 1000, pagatoDa: 'p1', divisaFra: ['p1', 'p2', 'p3'] })])).toEqual({ p1: 666, p2: -333, p3: -333 })
  })
  test('valute miste: gli euro diventano yen col cambio della spesa', () => {
    const r = sp.saldi(persone, [
      s({ id: 'a', importo: 10, valuta: 'EUR', cambio: 160, pagatoDa: 'p1', divisaFra: ['p1', 'p2'] }),
      s({ id: 'b', importo: 1000, pagatoDa: 'p2', divisaFra: ['p1', 'p2', 'p3'] }),
    ])
    expect(r).toEqual({ p1: 466, p2: -133, p3: -333 })
  })
  test('divisione parziale: chi paga può non essere fra chi divide', () => {
    expect(sp.saldi(persone, [s({ id: 'a', importo: 900, pagatoDa: 'p1', divisaFra: ['p2', 'p3'] })])).toEqual({ p1: 900, p2: -450, p3: -450 })
  })
  test('gli euro con i centesimi si arrotondano allo yen', () => {
    // 12,35 € × 161,27 = 1991,68 → 1992 ¥
    expect(sp.saldi(persone.slice(0, 2), [s({ id: 'a', importo: 12.35, valuta: 'EUR', cambio: 161.27, pagatoDa: 'p2', divisaFra: ['p1', 'p2'] })])).toEqual({ p1: -996, p2: 996 })
  })
  test('una persona rinominata non cambia i saldi: contano gli id', () => {
    const spese = [s({ id: 'a', importo: 3000, pagatoDa: 'p1', divisaFra: ['p1', 'p2', 'p3'] })]
    const rinominate = persone.map(p => (p.id === 'p2' ? { ...p, nome: 'Anna Maria' } : p))
    expect(sp.saldi(rinominate, spese)).toEqual(sp.saldi(persone, spese))
  })
})

describe('rimborsiMinimi', () => {
  test('due debitori verso un creditore', () => {
    expect(sp.rimborsiMinimi({ p1: 466, p2: -133, p3: -333 })).toEqual([
      { da: 'p3', a: 'p1', yen: 333 },
      { da: 'p2', a: 'p1', yen: 133 },
    ])
  })
  test('un debitore verso due creditori', () => {
    expect(sp.rimborsiMinimi({ p1: 700, p2: 300, p3: -1000 })).toEqual([
      { da: 'p3', a: 'p1', yen: 700 },
      { da: 'p3', a: 'p2', yen: 300 },
    ])
  })
  test('pari: nessun rimborso', () => {
    expect(sp.rimborsiMinimi({ p1: 0, p2: 0 })).toEqual([])
  })
  test('segnare i rimborsi suggeriti azzera i saldi', () => {
    const spese = [
      s({ id: 'a', importo: 1000, pagatoDa: 'p1', divisaFra: ['p1', 'p2', 'p3'] }),
      s({ id: 'b', importo: 10, valuta: 'EUR', cambio: 160, pagatoDa: 'p2', divisaFra: ['p2', 'p3'] }),
    ]
    const rimborsi = sp.rimborsiMinimi(sp.saldi(persone, spese))
    const dopo = [...spese, ...rimborsi.map(r => sp.spesaRimborso(r, '2027-08-12', 160))]
    expect(Object.values(sp.saldi(persone, dopo))).toEqual([0, 0, 0])
  })
  test('il rimborso è una spesa "altro" divisa col solo creditore', () => {
    const r = sp.spesaRimborso({ da: 'p2', a: 'p1', yen: 1500 }, '2027-08-12', 161)
    expect(r).toMatchObject({ data: '2027-08-12', importo: 1500, valuta: 'JPY', cambio: 161, categoria: 'altro', descrizione: 'Rimborso', pagatoDa: 'p2', divisaFra: ['p1'], rimborso: true })
    expect(r.id).toMatch(/^s-/)
  })
})

describe('riepilogoSpese', () => {
  const spese = [
    s({ id: 'a', data: '2027-08-10', importo: 3000, categoria: 'cibo', pagatoDa: 'p1', divisaFra: ['p1', 'p2', 'p3'], metodo: 'contanti' }),
    s({ id: 'b', data: '2027-08-11', importo: 20, valuta: 'EUR', cambio: 160, categoria: 'trasporti', pagatoDa: 'p2', divisaFra: ['p1', 'p2'], metodo: 'carta' }),
    s({ id: 'c', data: '2027-08-11', importo: 500, categoria: 'cibo', pagatoDa: 'p3', divisaFra: ['p3'], metodo: 'contanti' }),
    s({ id: 'r', data: '2027-08-11', importo: 1000, categoria: 'altro', descrizione: 'Rimborso', pagatoDa: 'p2', divisaFra: ['p1'], rimborso: true }),
  ]
  test('totali in yen ed euro, quote e metodi, senza i rimborsi', () => {
    const r = sp.riepilogoSpese(spese)
    expect(r.yen).toBe(6700)
    expect(r.euro).toBeCloseTo(3000 / 160 + 20 + 500 / 160, 6)
    expect(r.quote).toEqual({ p1: 2600, p2: 2600, p3: 1500 })
    expect(r.perMetodo).toEqual({ contanti: 3500, carta: 3200 })
  })
  test('per categoria e per giorno, dal più recente', () => {
    const r = sp.riepilogoSpese(spese)
    expect(r.perCategoria).toEqual([{ categoria: 'cibo', yen: 3500 }, { categoria: 'trasporti', yen: 3200 }])
    expect(r.perGiorno.map(g => [g.data, g.yen, g.spese.map(x => x.id)])).toEqual([
      ['2027-08-11', 3700, ['r', 'c', 'b']],
      ['2027-08-10', 3000, ['a']],
    ])
  })
  test('niente spese: tutto a zero', () => {
    expect(sp.riepilogoSpese([])).toEqual({ yen: 0, euro: 0, quote: {}, perMetodo: { contanti: 0, carta: 0 }, perCategoria: [], perGiorno: [] })
  })
})

describe('inserimento', () => {
  test('dataPredefinita: oggi a Tokyo, o G0 prima della partenza', () => {
    const v = viaggioDiProva()
    expect(sp.dataPredefinita(v, new Date('2027-08-09T23:30:00+09:00'))).toBe('2027-08-09')
    expect(sp.dataPredefinita(v, new Date('2027-08-09T15:30:00Z'))).toBe('2027-08-10')
    expect(sp.dataPredefinita(v, new Date('2026-10-01T12:00:00+09:00'))).toBe('2027-08-08')
  })
  test('nuovaSpesa ricorda le ultime scelte (non i rimborsi) e divide fra tutti', () => {
    const v = viaggioDiProva({
      persone,
      spese: [s({ id: 'a', pagatoDa: 'p2', categoria: 'trasporti', valuta: 'EUR', metodo: 'carta' }), s({ id: 'r', pagatoDa: 'p3', rimborso: true, categoria: 'altro' })],
      impostazioni: { tema: 'auto', ultimoCambio: { valore: 162, data: '2027-08-09' } },
    })
    const n = sp.nuovaSpesa(v, new Date('2027-08-10T12:00:00+09:00'))
    expect(n).toMatchObject({ data: '2027-08-10', importo: 0, pagatoDa: 'p2', categoria: 'trasporti', valuta: 'EUR', metodo: 'carta', divisaFra: ['p1', 'p2', 'p3'], cambio: 162, descrizione: '' })
    expect(n.id).toMatch(/^s-/)
  })
  test('senza spese: la prima persona, cibo, yen, contanti, cambio da chiedere', () => {
    const n = sp.nuovaSpesa(viaggioDiProva({ persone }), new Date('2027-08-10T12:00:00+09:00'))
    expect(n).toMatchObject({ pagatoDa: 'p1', categoria: 'cibo', valuta: 'JPY', metodo: 'contanti', cambio: 0 })
  })
  test('cambioDaUsare: il manuale vince sull\'ultimo scaricato', () => {
    expect(sp.cambioDaUsare({ tema: 'auto' })).toBeNull()
    expect(sp.cambioDaUsare({ tema: 'auto', ultimoCambio: { valore: 162, data: '2027-08-09' } })).toBe(162)
    expect(sp.cambioDaUsare({ tema: 'auto', cambioManuale: 150, ultimoCambio: { valore: 162, data: '2027-08-09' } })).toBe(150)
  })
  test('controllaSpesa', () => {
    expect(sp.controllaSpesa(s({ id: 'a' }))).toEqual([])
    expect(sp.controllaSpesa(s({ id: 'a', importo: 0, divisaFra: [], cambio: 0 }))).toEqual([
      'Scrivi un importo maggiore di zero.',
      'Scegli almeno una persona con cui dividere.',
      'Serve il cambio: scrivi quanti yen vale 1 euro.',
    ])
  })
  test('leggiImporto accetta la virgola', () => {
    expect(sp.leggiImporto('12,50')).toBe(12.5)
    expect(sp.leggiImporto(' 1500 ')).toBe(1500)
    expect(sp.leggiImporto('1.234,5')).toBe(1234.5)
    expect(sp.leggiImporto('12.5')).toBe(12.5)
    expect(sp.leggiImporto('')).toBeNull()
    expect(sp.leggiImporto('boh')).toBeNull()
  })
  test('aggiungi, sostituisci, elimina', () => {
    const v = viaggioDiProva({ spese: [s({ id: 'a' })] })
    const conB = sp.aggiungiSpesa(v, s({ id: 'b' }))
    expect(conB.spese.map(x => x.id)).toEqual(['a', 'b'])
    expect(sp.sostituisciSpesa(conB, s({ id: 'a', importo: 5 })).spese[0].importo).toBe(5)
    expect(sp.eliminaSpesa(conB, 'a').spese.map(x => x.id)).toEqual(['b'])
    expect(() => sp.sostituisciSpesa(v, s({ id: 'z' }))).toThrow('spesa z')
  })
})

test('formati degli importi', () => {
  expect(sp.formatoYen(1234567)).toBe('1.234.567 ¥')
  expect(sp.formatoYen(-333.4)).toBe('-333 ¥')
  expect(sp.formatoYen(999)).toBe('999 ¥')
  expect(sp.formatoEuro(12.5)).toBe('12,50 €')
  expect(sp.formatoEuro(1234.567)).toBe('1.234,57 €')
  expect(sp.formatoImporto(900, 'JPY')).toBe('900 ¥')
  expect(sp.formatoImporto(9, 'EUR')).toBe('9,00 €')
  expect(sp.formatoNumero(162.35)).toBe('162,35')
  expect(sp.formatoNumero(160)).toBe('160')
})
```

Run: `npm test -- src/model/spese.test.ts`
Expected: FAIL, `Failed to resolve import "./spese"`.

- [ ] **Step 2: Implementare `src/model/spese.ts`**

```ts
import { differenzaGiorni, istanteTokyo } from './date'
import { nuovoId } from './id'
import {
  CATEGORIE_SPESA, type CategoriaSpesa, type Id, type Impostazioni, type MetodoPagamento, type Persona, type Spesa,
  type Valuta, type Viaggio,
} from './tipi'

type Valore = Pick<Spesa, 'importo' | 'valuta' | 'cambio'>

/** Il valore di una spesa in yen, col cambio salvato nella spesa stessa. */
export function inYen(s: Valore): number {
  return s.valuta === 'JPY' ? s.importo : s.importo * s.cambio
}

/** Il valore di una spesa in euro, col cambio salvato nella spesa stessa. */
export function inEuro(s: Valore): number {
  return s.valuta === 'EUR' ? s.importo : s.importo / s.cambio
}

/** Le quote in yen interi: il resto della divisione va, uno yen a testa, ai primi dell'elenco. La somma è il totale esatto. */
export function quote(s: Spesa): Map<Id, number> {
  const totale = Math.round(inYen(s))
  const n = s.divisaFra.length
  const base = Math.floor(totale / n)
  let resto = totale - base * n
  const q = new Map<Id, number>()
  for (const id of s.divisaFra) {
    q.set(id, (q.get(id) ?? 0) + base + (resto > 0 ? 1 : 0))
    if (resto > 0) resto--
  }
  return q
}

/** Pagato meno la propria quota, in yen interi, per id di persona. La somma dei saldi è zero. */
export function saldi(persone: Persona[], spese: Spesa[]): Record<Id, number> {
  const s: Record<Id, number> = Object.fromEntries(persone.map(p => [p.id, 0]))
  for (const x of spese) {
    s[x.pagatoDa] = (s[x.pagatoDa] ?? 0) + Math.round(inYen(x))
    for (const [id, q] of quote(x)) s[id] = (s[id] ?? 0) - q
  }
  return s
}

export interface Rimborso { da: Id; a: Id; yen: number }

/** Il numero minimo di rimborsi: il debitore più grande paga il creditore più grande, e così via. */
export function rimborsiMinimi(saldi: Record<Id, number>): Rimborso[] {
  const ordina = (x: [Id, number][]) => x.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  const creditori = ordina(Object.entries(saldi).filter(([, v]) => v > 0))
  const debitori = ordina(Object.entries(saldi).filter(([, v]) => v < 0).map(([k, v]): [Id, number] => [k, -v]))
  const r: Rimborso[] = []
  let i = 0
  let j = 0
  while (i < debitori.length && j < creditori.length) {
    const yen = Math.min(debitori[i][1], creditori[j][1])
    r.push({ da: debitori[i][0], a: creditori[j][0], yen })
    debitori[i][1] -= yen
    creditori[j][1] -= yen
    if (debitori[i][1] === 0) i++
    if (creditori[j][1] === 0) j++
  }
  return r
}

/** "Segna come saldato": chi deve paga, e la spesa è tutta del creditore. */
export function spesaRimborso(r: Rimborso, data: string, cambio: number): Spesa {
  return {
    id: nuovoId('s'), data, importo: r.yen, valuta: 'JPY', cambio, categoria: 'altro', descrizione: 'Rimborso',
    pagatoDa: r.da, divisaFra: [r.a], metodo: 'contanti', rimborso: true,
  }
}

export interface RiepilogoSpese {
  yen: number
  euro: number
  quote: Record<Id, number>
  perMetodo: Record<MetodoPagamento, number>
  perCategoria: { categoria: CategoriaSpesa; yen: number }[]
  perGiorno: { data: string; yen: number; spese: Spesa[] }[]
}

/** Totali (i rimborsi non sono spese), quote di ciascuno, per metodo, per categoria e per giorno dal più recente. */
export function riepilogoSpese(spese: Spesa[]): RiepilogoSpese {
  const quoteTotali: Record<Id, number> = {}
  const perMetodo: Record<MetodoPagamento, number> = { contanti: 0, carta: 0 }
  const categorie = new Map<CategoriaSpesa, number>()
  let yen = 0
  let euro = 0
  for (const s of spese) {
    if (s.rimborso) continue
    const y = Math.round(inYen(s))
    yen += y
    euro += inEuro(s)
    perMetodo[s.metodo] += y
    categorie.set(s.categoria, (categorie.get(s.categoria) ?? 0) + y)
    for (const [id, q] of quote(s)) quoteTotali[id] = (quoteTotali[id] ?? 0) + q
  }
  const giorni = new Map<string, Spesa[]>()
  for (const s of [...spese].reverse()) giorni.set(s.data, [...(giorni.get(s.data) ?? []), s])
  const perGiorno = [...giorni.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([data, elenco]) => ({ data, spese: elenco, yen: elenco.filter(s => !s.rimborso).reduce((t, s) => t + Math.round(inYen(s)), 0) }))
  const perCategoria = CATEGORIE_SPESA
    .flatMap(categoria => { const y = categorie.get(categoria); return y ? [{ categoria, yen: y }] : [] })
    .sort((a, b) => b.yen - a.yen)
  return { yen, euro, quote: quoteTotali, perMetodo, perCategoria, perGiorno }
}

/** Il cambio manuale vince; poi l'ultimo scaricato; altrimenti va chiesto. */
export function cambioDaUsare(imp: Impostazioni): number | null {
  return imp.cambioManuale ?? imp.ultimoCambio?.valore ?? null
}

/** Oggi in ora di Tokyo; prima della partenza, il G0. */
export function dataPredefinita(v: Viaggio, adesso: Date): string {
  const oggi = istanteTokyo(adesso).data
  return differenzaGiorni(v.dataPartenza, oggi) < 0 ? v.dataPartenza : oggi
}

/** Chi ha pagato, categoria, valuta e metodo dell'ultima spesa vera (i rimborsi non contano). */
export function ultimeScelte(v: Viaggio): Pick<Spesa, 'pagatoDa' | 'categoria' | 'valuta' | 'metodo'> {
  const prima = v.persone[0]?.id ?? ''
  const ultima = [...v.spese].reverse().find(s => !s.rimborso)
  if (!ultima) return { pagatoDa: prima, categoria: 'cibo', valuta: 'JPY', metodo: 'contanti' }
  const pagatoDa = v.persone.some(p => p.id === ultima.pagatoDa) ? ultima.pagatoDa : prima
  return { pagatoDa, categoria: ultima.categoria, valuta: ultima.valuta, metodo: ultima.metodo }
}

/** La bozza del foglio "Nuova spesa": divisa fra tutti, con le ultime scelte e il cambio di adesso (0 = da chiedere). */
export function nuovaSpesa(v: Viaggio, adesso: Date): Spesa {
  return {
    id: nuovoId('s'), data: dataPredefinita(v, adesso), importo: 0, cambio: cambioDaUsare(v.impostazioni) ?? 0,
    descrizione: '', divisaFra: v.persone.map(p => p.id), ...ultimeScelte(v),
  }
}

function conSpesa(v: Viaggio, id: string, fn: (s: Spesa) => Spesa): Viaggio {
  if (!v.spese.some(s => s.id === id)) throw new Error(`spesa ${id} inesistente`)
  return { ...v, spese: v.spese.map(s => (s.id === id ? fn(s) : s)) }
}

export function aggiungiSpesa(v: Viaggio, s: Spesa): Viaggio {
  return { ...v, spese: [...v.spese, s] }
}

export function sostituisciSpesa(v: Viaggio, s: Spesa): Viaggio {
  return conSpesa(v, s.id, () => s)
}

export function eliminaSpesa(v: Viaggio, id: string): Viaggio {
  return { ...v, spese: v.spese.filter(s => s.id !== id) }
}

/** I messaggi in linea del foglio: importo > 0, almeno una persona, un cambio. */
export function controllaSpesa(s: Spesa): string[] {
  const e: string[] = []
  if (!(s.importo > 0)) e.push('Scrivi un importo maggiore di zero.')
  if (s.divisaFra.length === 0) e.push('Scegli almeno una persona con cui dividere.')
  if (!(s.cambio > 0)) e.push('Serve il cambio: scrivi quanti yen vale 1 euro.')
  return e
}

/** "12,50" → 12.5; "1.234,5" → 1234.5; vuoto o non numerico → null. */
export function leggiImporto(testo: string): number | null {
  const t = testo.replace(/\s/g, '')
  if (t === '') return null
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) ? n : null
}

function raggruppa(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatoYen(yen: number): string {
  const r = Math.round(yen)
  return `${r < 0 ? '-' : ''}${raggruppa(Math.abs(r))} ¥`
}

export function formatoEuro(euro: number): string {
  const c = Math.round(euro * 100)
  const a = Math.abs(c)
  return `${c < 0 ? '-' : ''}${raggruppa(Math.floor(a / 100))},${String(a % 100).padStart(2, '0')} €`
}

export function formatoImporto(importo: number, valuta: Valuta): string {
  return valuta === 'JPY' ? formatoYen(importo) : formatoEuro(importo)
}

/** Un numero da rimettere in un campo di testo: al massimo due decimali, con la virgola. */
export function formatoNumero(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',')
}
```

Run: `npm test -- src/model/spese.test.ts`
Expected: PASS.

- [ ] **Step 3: Test del cambio**

Creare `src/servizi/cambio.test.ts`:

```ts
import { expect, test, vi } from 'vitest'
import { leggiCambio, scaricaCambio, URL_CAMBIO } from './cambio'

test('leggiCambio', () => {
  expect(leggiCambio({ amount: 1, base: 'EUR', date: '2027-08-10', rates: { JPY: 162.35 } })).toEqual({ valore: 162.35, data: '2027-08-10' })
  expect(leggiCambio({ date: '2027-08-10', rates: {} })).toBeNull()
  expect(leggiCambio({ date: '2027-08-10', rates: { JPY: -1 } })).toBeNull()
  expect(leggiCambio({ rates: { JPY: 160 } })).toBeNull()
  expect(leggiCambio(null)).toBeNull()
})

test('scaricaCambio: una richiesta alla BCE, null se la rete manca', async () => {
  const prendi = vi.fn().mockResolvedValue({ date: '2027-08-10', rates: { JPY: 162.35 } })
  expect(await scaricaCambio(prendi)).toEqual({ valore: 162.35, data: '2027-08-10' })
  expect(prendi).toHaveBeenCalledTimes(1)
  expect(prendi).toHaveBeenCalledWith(URL_CAMBIO)
  expect(await scaricaCambio(() => Promise.reject(new Error('offline')))).toBeNull()
})

test('l\'indirizzo è quello della BCE via Frankfurter, senza chiave', () => {
  expect(URL_CAMBIO).toBe('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=JPY')
})
```

Run: `npm test -- src/servizi/cambio.test.ts`
Expected: FAIL, `Failed to resolve import "./cambio"`.

- [ ] **Step 4: Implementare `src/servizi/cambio.ts`**

```ts
export const URL_CAMBIO = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=JPY'

export interface Cambio { valore: number; data: string }

type Risposta = { date?: unknown; rates?: { JPY?: unknown } }

export function leggiCambio(j: unknown): Cambio | null {
  const r = j as Risposta | null
  const valore = r?.rates?.JPY
  const data = r?.date
  if (typeof valore !== 'number' || !Number.isFinite(valore) || valore <= 0) return null
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null
  return { valore, data }
}

const prendiJson = async (url: string): Promise<unknown> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

/** Il cambio del giorno (BCE, senza chiave). Offline o in errore restituisce null: si usa l'ultimo salvato. */
export async function scaricaCambio(prendi: (url: string) => Promise<unknown> = prendiJson): Promise<Cambio | null> {
  try {
    return leggiCambio(await prendi(URL_CAMBIO))
  } catch {
    return null
  }
}
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/model/spese.ts src/model/spese.test.ts src/servizi/cambio.ts src/servizi/cambio.test.ts
git commit -m "Conti delle spese: saldi in yen, rimborsi minimi, riepiloghi, formati e cambio della BCE

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Promemoria sul calendario (.ics)

**Files:**
- Create: `src/model/ics.ts`
- Test: `src/model/ics.test.ts`

**Interfaces:**
- Consumes: `utcDaLocale` (Task 1), `aggiungiGiorni`, `dataGiorno` (`date.ts`), `linkSicuro` (`src/servizi/mappe.ts`, funzione pura), tipi `Viaggio`, `Prenotazione`, `Luogo`.
- Produces: `NOME_FILE_ICS = 'giappone-2027.ics'`, `type Quando = { tipo: 'ore'; inizio: Date; fine: Date } | { tipo: 'giorno'; data: string }`, `interface EventoCalendario { uid: string; quando: Quando; titolo: string; luogo?: string; descrizione?: string; avviso?: string }`, `testoIcs(s: string): string`, `piegaRiga(riga: string): string`, `istanteIcs(d: Date): string`, `voloDiRitorno(v: Viaggio): Prenotazione | null`, `eventiCalendario(v: Viaggio, opzioni: { tappe: boolean }): EventoCalendario[]`, `generaIcs(v: Viaggio, opzioni: { tappe: boolean; adesso: Date }): string`.

- [ ] **Step 1: Test del calendario**

Creare `src/model/ics.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { giornoDiProva, prenotazioneDiProva as p, tappaDiProva, viaggioDiProva } from './fixture'
import { eventiCalendario, generaIcs, istanteIcs, piegaRiga, testoIcs, voloDiRitorno } from './ics'

const adesso = new Date('2026-10-01T08:00:00Z')
const byte = (s: string) => new TextEncoder().encode(s).length

// Viaggio di prova: tre giorni, dall'8 al 10 agosto 2027.
const viaggio = () => viaggioDiProva({
  giorni: [
    giornoDiProva({
      id: 'g0',
      tappe: [
        tappaDiProva({ id: 't-a', ora: '11:15', durataMin: 90, titolo: 'Tokyo Skytree', luogo: { nome: 'Skytree', query: 'Tokyo Skytree' } }),
        tappaDiProva({ id: 't-b', titolo: 'Senza ora' }),
      ],
    }),
    giornoDiProva({ id: 'g1' }),
    giornoDiProva({ id: 'g2', cittaId: 'kyoto' }),
  ],
  prenotazioni: [
    p({ id: 'andata', tipo: 'volo', titolo: 'Volo Roma → Tokyo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome', fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo', codice: 'ABC123' }),
    p({ id: 'hotel', tipo: 'hotel', titolo: 'Kyoto Gion Hotel', stato: 'prenotata', inizio: '2027-08-09T15:00', fine: '2027-08-10T10:00', luogo: { nome: 'Kyoto Gion Hotel', query: 'x', indirizzoJa: '京都市東山区' } }),
    p({ id: 'museo', titolo: 'Museo, biglietto; intero', inizio: '2027-08-09T10:00', daPrenotareEntro: '2027-07-15', link: 'https://www.kanazawa21.jp/' }),
    p({ id: 'senza-data', titolo: 'Da decidere' }),
    p({ id: 'ritorno', tipo: 'volo', titolo: 'Volo Tokyo → Roma', inizio: '2027-08-10T20:00' }),
  ],
})

test('istanteIcs: UTC compatto', () => {
  expect(istanteIcs(new Date('2027-08-07T10:30:00Z'))).toBe('20270807T103000Z')
})

test('testoIcs: escaping RFC 5545', () => {
  expect(testoIcs('Cena, sushi; sake\\ e\nbasta')).toBe('Cena\\, sushi\\; sake\\\\ e\\nbasta')
})

describe('piegaRiga', () => {
  test('le righe corte restano intere', () => {
    expect(piegaRiga('SUMMARY:Ciao')).toBe('SUMMARY:Ciao')
  })
  test('spezza a 75 ottetti, la continuazione comincia con uno spazio', () => {
    const riga = 'DESCRIPTION:' + 'x'.repeat(100)
    const parti = piegaRiga(riga).split('\r\n')
    expect(parti.map(byte)).toEqual([75, 38])
    expect(parti[1].startsWith(' ')).toBe(true)
    expect(piegaRiga(riga).replace(/\r\n /g, '')).toBe(riga)
  })
  test('non spezza a metà un carattere giapponese', () => {
    const riga = 'LOCATION:' + 'あ'.repeat(40)
    for (const r of piegaRiga(riga).split('\r\n')) expect(byte(r)).toBeLessThanOrEqual(75)
    expect(piegaRiga(riga).replace(/\r\n /g, '')).toBe(riga)
  })
})

describe('eventiCalendario', () => {
  test('ogni prenotazione con inizio, in UTC dal suo fuso', () => {
    const e = eventiCalendario(viaggio(), { tappe: false })
    const andata = e.find(x => x.uid === 'prenotazione-andata@jap-itinerario')!
    expect(andata.quando).toEqual({ tipo: 'ore', inizio: new Date('2027-08-07T10:30:00Z'), fine: new Date('2027-08-08T05:00:00Z') })
    expect(andata.avviso).toBe('-PT3H')
    expect(andata.descrizione).toBe('Codice: ABC123')
    const hotel = e.find(x => x.uid === 'prenotazione-hotel@jap-itinerario')!
    expect(hotel.avviso).toBe('-PT1H')
    expect(hotel.luogo).toBe('Kyoto Gion Hotel · 京都市東山区')
    const museo = e.find(x => x.uid === 'prenotazione-museo@jap-itinerario')!
    expect(museo.quando).toEqual({ tipo: 'ore', inizio: new Date('2027-08-09T01:00:00Z'), fine: new Date('2027-08-09T02:00:00Z') })
    expect(e.some(x => x.uid.includes('senza-data'))).toBe(false)
  })
  test('promemoria per prenotare entro la scadenza, alle 9 di quel giorno', () => {
    const e = eventiCalendario(viaggio(), { tappe: false }).find(x => x.uid === 'prenotare-museo@jap-itinerario')
    expect(e).toEqual({
      uid: 'prenotare-museo@jap-itinerario', quando: { tipo: 'giorno', data: '2027-07-15' },
      titolo: 'Prenotare: Museo, biglietto; intero', descrizione: 'https://www.kanazawa21.jp/', avviso: 'PT9H',
    })
  })
  test('una prenotazione già fatta non ha il promemoria della scadenza', () => {
    const v = viaggio()
    v.prenotazioni[2] = { ...v.prenotazioni[2], stato: 'prenotata' }
    expect(eventiCalendario(v, { tappe: false }).some(x => x.uid.startsWith('prenotare-'))).toBe(false)
  })
  test('tax-free 4 ore prima del volo di ritorno', () => {
    const v = viaggio()
    expect(voloDiRitorno(v)?.id).toBe('ritorno')
    const t = eventiCalendario(v, { tappe: false }).find(x => x.uid === 'taxfree@jap-itinerario')!
    expect(t.titolo).toBe('Tax-free: rimborso in aeroporto prima del check-in')
    expect(t.quando).toEqual({ tipo: 'ore', inizio: new Date('2027-08-10T07:00:00Z'), fine: new Date('2027-08-10T07:30:00Z') })
  })
  test('senza volo di ritorno niente tax-free: il volo di andata non conta', () => {
    const v = viaggio()
    v.prenotazioni = v.prenotazioni.filter(x => x.id !== 'ritorno')
    expect(voloDiRitorno(v)).toBeNull()
    expect(eventiCalendario(v, { tappe: false }).some(x => x.uid === 'taxfree@jap-itinerario')).toBe(false)
  })
  test('le tappe solo con l\'interruttore, e senza avviso', () => {
    expect(eventiCalendario(viaggio(), { tappe: false }).some(x => x.uid.startsWith('tappa-'))).toBe(false)
    const tappe = eventiCalendario(viaggio(), { tappe: true }).filter(x => x.uid.startsWith('tappa-'))
    expect(tappe).toEqual([{
      uid: 'tappa-t-a@jap-itinerario', titolo: 'Tokyo Skytree', luogo: 'Skytree',
      quando: { tipo: 'ore', inizio: new Date('2027-08-08T02:15:00Z'), fine: new Date('2027-08-08T03:45:00Z') },
    }])
  })
})

describe('generaIcs', () => {
  test('calendario con CRLF, UID stabili, UTC e VALARM', () => {
    const testo = generaIcs(viaggio(), { tappe: false, adesso })
    expect(testo.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(testo.endsWith('END:VCALENDAR\r\n')).toBe(true)
    const righe = testo.replace(/\r\n /g, '').split('\r\n')
    expect(righe).toEqual(expect.arrayContaining([
      'UID:prenotazione-andata@jap-itinerario',
      'DTSTAMP:20261001T080000Z',
      'DTSTART:20270807T103000Z',
      'DTEND:20270808T050000Z',
      'SUMMARY:Volo Roma → Tokyo',
      'TRIGGER:-PT3H',
      'DTSTART;VALUE=DATE:20270715',
      'DTEND;VALUE=DATE:20270716',
      'TRIGGER:PT9H',
      'SUMMARY:Prenotare: Museo\\, biglietto\\; intero',
    ]))
    // andata, hotel, museo, ritorno, scadenza del museo, tax-free
    expect(righe.filter(r => r === 'BEGIN:VEVENT').length).toBe(6)
    expect(righe.filter(r => r === 'END:VEVENT').length).toBe(6)
    expect(righe.filter(r => r === 'BEGIN:VALARM').length).toBe(6)
  })
  test('rigenerato un altro giorno, gli UID non cambiano', () => {
    const uid = (t: string) => t.split('\r\n').filter(r => r.startsWith('UID:'))
    expect(uid(generaIcs(viaggio(), { tappe: true, adesso }))).toEqual(uid(generaIcs(viaggio(), { tappe: true, adesso: new Date('2027-08-01T00:00:00Z') })))
  })
  test('nessuna riga supera i 75 ottetti', () => {
    const v = viaggio()
    v.prenotazioni[0].note = 'Nota lunghissima con virgole, punti e virgola; e a capo\n'.repeat(10)
    for (const r of generaIcs(v, { tappe: true, adesso }).split('\r\n')) expect(byte(r)).toBeLessThanOrEqual(75)
  })
})
```

Run: `npm test -- src/model/ics.test.ts`
Expected: FAIL, `Failed to resolve import "./ics"`.

- [ ] **Step 2: Implementare `src/model/ics.ts`**

```ts
import { linkSicuro } from '../servizi/mappe'
import { aggiungiGiorni, dataGiorno } from './date'
import { utcDaLocale } from './fusi'
import type { Luogo, Prenotazione, Viaggio } from './tipi'

const DOMINIO = 'jap-itinerario'
const ORA_MS = 3_600_000
export const NOME_FILE_ICS = 'giappone-2027.ics'

export type Quando = { tipo: 'ore'; inizio: Date; fine: Date } | { tipo: 'giorno'; data: string }

export interface EventoCalendario {
  /** Stabile: reimportando il file il calendario aggiorna l'evento invece di duplicarlo. */
  uid: string
  quando: Quando
  titolo: string
  luogo?: string
  descrizione?: string
  /** Valore di TRIGGER del VALARM ("-PT3H", "PT9H"); senza, nessun avviso. */
  avviso?: string
}

/** Escaping dei testi RFC 5545: barra rovesciata, punto e virgola, virgola, a capo. */
export function testoIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

const codificatore = new TextEncoder()

/** Spezza una riga a 75 ottetti (RFC 5545 §3.1) senza tagliare un carattere; la continuazione comincia con uno spazio. */
export function piegaRiga(riga: string): string {
  const parti: string[] = []
  let corrente = ''
  let byte = 0
  for (const c of riga) {
    const n = codificatore.encode(c).length
    if (byte + n > 75) {
      parti.push(corrente)
      corrente = ' '
      byte = 1
    }
    corrente += c
    byte += n
  }
  parti.push(corrente)
  return parti.join('\r\n')
}

/** 2027-08-07T10:30:00.000Z → "20270807T103000Z". */
export function istanteIcs(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function luogoTesto(l: Luogo | undefined): string | undefined {
  return l ? [l.nome, l.indirizzoJa].filter(Boolean).join(' · ') : undefined
}

/** L'ultimo volo che parte dal primo giorno del viaggio in poi (quello di andata parte prima). */
export function voloDiRitorno(v: Viaggio): Prenotazione | null {
  const voli = v.prenotazioni.filter(p => p.tipo === 'volo' && p.inizio && p.inizio.slice(0, 10) >= v.dataPartenza)
  voli.sort((a, b) => utcDaLocale(b.inizio!, b.fuso).getTime() - utcDaLocale(a.inizio!, a.fuso).getTime())
  return voli[0] ?? null
}

function eventoPrenotazione(p: Prenotazione, inizioLocale: string): EventoCalendario {
  const inizio = utcDaLocale(inizioLocale, p.fuso)
  const fine = p.fine ? utcDaLocale(p.fine, p.fusoFine ?? p.fuso) : null
  const descrizione = [p.codice && `Codice: ${p.codice}`, p.riferimento, p.note].filter(Boolean).join('\n')
  return {
    uid: `prenotazione-${p.id}@${DOMINIO}`,
    quando: { tipo: 'ore', inizio, fine: fine && fine.getTime() > inizio.getTime() ? fine : new Date(inizio.getTime() + ORA_MS) },
    titolo: p.titolo,
    luogo: luogoTesto(p.luogo),
    descrizione: descrizione || undefined,
    avviso: p.tipo === 'volo' || p.tipo === 'treno' ? '-PT3H' : '-PT1H',
  }
}

/** Gli eventi del file: prenotazioni, scadenze per prenotare, tax-free del ritorno e, a richiesta, le tappe. */
export function eventiCalendario(v: Viaggio, opzioni: { tappe: boolean }): EventoCalendario[] {
  const eventi: EventoCalendario[] = []
  for (const p of v.prenotazioni) {
    if (p.inizio) eventi.push(eventoPrenotazione(p, p.inizio))
    if (p.stato === 'da-prenotare' && p.daPrenotareEntro) {
      eventi.push({
        uid: `prenotare-${p.id}@${DOMINIO}`,
        quando: { tipo: 'giorno', data: p.daPrenotareEntro },
        titolo: `Prenotare: ${p.titolo}`,
        descrizione: linkSicuro(p.link),
        avviso: 'PT9H',
      })
    }
  }
  const ritorno = voloDiRitorno(v)
  if (ritorno?.inizio) {
    const partenza = utcDaLocale(ritorno.inizio, ritorno.fuso).getTime()
    eventi.push({
      uid: `taxfree@${DOMINIO}`,
      quando: { tipo: 'ore', inizio: new Date(partenza - 4 * ORA_MS), fine: new Date(partenza - 3.5 * ORA_MS) },
      titolo: 'Tax-free: rimborso in aeroporto prima del check-in',
      luogo: luogoTesto(ritorno.luogo),
      avviso: 'PT0S',
    })
  }
  if (opzioni.tappe) {
    v.giorni.forEach((g, i) => {
      const data = dataGiorno(v, i)
      for (const t of g.tappe) {
        if (!t.ora) continue
        const inizio = utcDaLocale(`${data}T${t.ora}`, 'Asia/Tokyo')
        eventi.push({
          uid: `tappa-${t.id}@${DOMINIO}`,
          quando: { tipo: 'ore', inizio, fine: new Date(inizio.getTime() + (t.durataMin || 60) * 60_000) },
          titolo: t.titolo,
          luogo: luogoTesto(t.luogo),
        })
      }
    })
  }
  return eventi
}

function righeEvento(e: EventoCalendario, timbro: string): string[] {
  const r = ['BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${timbro}`]
  if (e.quando.tipo === 'giorno') {
    const d = e.quando.data
    r.push(`DTSTART;VALUE=DATE:${d.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${aggiungiGiorni(d, 1).replace(/-/g, '')}`)
  } else {
    r.push(`DTSTART:${istanteIcs(e.quando.inizio)}`, `DTEND:${istanteIcs(e.quando.fine)}`)
  }
  r.push(`SUMMARY:${testoIcs(e.titolo)}`)
  if (e.luogo) r.push(`LOCATION:${testoIcs(e.luogo)}`)
  if (e.descrizione) r.push(`DESCRIPTION:${testoIcs(e.descrizione)}`)
  if (e.avviso) r.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${testoIcs(e.titolo)}`, `TRIGGER:${e.avviso}`, 'END:VALARM')
  r.push('END:VEVENT')
  return r
}

/** Il file giappone-2027.ics: orari in UTC, niente VTIMEZONE, righe piegate, CRLF. */
export function generaIcs(v: Viaggio, opzioni: { tappe: boolean; adesso: Date }): string {
  const timbro = istanteIcs(opzioni.adesso)
  const righe = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jap-itinerario//Giappone 2027//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${testoIcs(v.titolo)}`,
  ]
  for (const e of eventiCalendario(v, opzioni)) righe.push(...righeEvento(e, timbro))
  righe.push('END:VCALENDAR')
  return righe.map(piegaRiga).join('\r\n') + '\r\n'
}
```

Run: `npm test -- src/model/ics.test.ts`
Expected: PASS.

- [ ] **Step 3: Tutta la suite e typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, nessun errore di tipo.

- [ ] **Step 4: Commit**

```bash
git add src/model/ics.ts src/model/ics.test.ts
git commit -m "Calendario .ics: prenotazioni in UTC con avvisi, scadenze, tax-free e tappe a richiesta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Orari di apertura, notti in hotel, ricerca

**Files:**
- Modify: `src/model/date.ts` (esporta `SETTIMANA` e `giornoSettimana`)
- Create: `src/model/orari.ts`, `src/model/prenotazioni.ts`, `src/model/ricerca.ts`
- Test: `src/model/orari.test.ts`, `src/model/prenotazioni.test.ts`, `src/model/ricerca.test.ts`

**Interfaces:**
- Consumes: `minutiDaOra`, `dataGiorno` (`date.ts`), tipi del Task 1.
- Produces (`date.ts`): `SETTIMANA: string[]` (0 = domenica), `giornoSettimana(data: string): number`.
- Produces (`orari.ts`): `type StatoApertura = 'chiuso-oggi' | 'fuori-orario' | 'aperto' | 'sconosciuto'`, `ORDINE_SETTIMANA = [1, 2, 3, 4, 5, 6, 0]`, `statoApertura(tappa: Pick<Tappa, 'ora' | 'durataMin' | 'orari'>, data: string): StatoApertura`, `avvisoApertura(tappa, data): string | null`, `descriviOrari(o: OrariTappa): string`.
- Produces (`prenotazioni.ts`): `notteCoperta(v: Viaggio, data: string): Prenotazione | null`.
- Produces (`ricerca.ts`): `normalizzaTesto(s: string): string`, `interface GiornoTrovato { indice: number; data: string; giorno: Giorno; tappe: Tappa[] }`, `interface Risultati { giorni: GiornoTrovato[]; prenotazioni: Prenotazione[]; totale: number }`, `cerca(v: Viaggio, testo: string): Risultati`.

- [ ] **Step 1: Esportare i giorni della settimana da `src/model/date.ts`**

Sostituire

```ts
const SETTIMANA = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
```

con

```ts
/** I nomi dei giorni, 0 = domenica (come Date.getDay). */
export const SETTIMANA = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
```

e sostituire

```ts
function giornoSettimana(data: string): number {
```

con

```ts
/** Il giorno della settimana di una data "YYYY-MM-DD", 0 = domenica. */
export function giornoSettimana(data: string): number {
```

- [ ] **Step 2: Test degli orari**

Creare `src/model/orari.test.ts`:

```ts
import { expect, test } from 'vitest'
import { tappaDiProva as t } from './fixture'
import { avvisoApertura, descriviOrari, statoApertura } from './orari'

// 2027-08-11 è mercoledì, 2027-08-08 domenica, 2027-08-12 giovedì.
const MERCOLEDI = '2027-08-11'

test('giorno chiuso', () => {
  const x = t({ id: 'a', ora: '10:00', orari: { chiusoIl: [3] } })
  expect(statoApertura(x, MERCOLEDI)).toBe('chiuso-oggi')
  expect(avvisoApertura(x, MERCOLEDI)).toBe('Chiuso il mercoledì')
  expect(avvisoApertura(t({ id: 'b', ora: null, orari: { chiusoIl: [0] } }), '2027-08-08')).toBe('Chiuso la domenica')
  expect(statoApertura(x, '2027-08-12')).toBe('sconosciuto')
})

test('prima dell\'apertura', () => {
  const x = t({ id: 'a', ora: '09:30', orari: { chiusoIl: [], apre: '10:00', chiude: '18:00' } })
  expect(statoApertura(x, MERCOLEDI)).toBe('fuori-orario')
  expect(avvisoApertura(x, MERCOLEDI)).toBe('Apre alle 10:00')
})

test('la durata sfora la chiusura', () => {
  const x = t({ id: 'a', ora: '16:30', durataMin: 60, orari: { chiusoIl: [], apre: '09:00', chiude: '17:00' } })
  expect(statoApertura(x, MERCOLEDI)).toBe('fuori-orario')
  expect(avvisoApertura(x, MERCOLEDI)).toBe('Chiude alle 17:00')
  expect(statoApertura({ ...x, durataMin: 30 }, MERCOLEDI)).toBe('aperto')
  expect(avvisoApertura({ ...x, durataMin: 30 }, MERCOLEDI)).toBeNull()
})

test('dati mancanti', () => {
  expect(statoApertura(t({ id: 'a', ora: '10:00' }), MERCOLEDI)).toBe('sconosciuto')
  expect(statoApertura(t({ id: 'a', ora: null, orari: { chiusoIl: [], apre: '09:00', chiude: '17:00' } }), MERCOLEDI)).toBe('sconosciuto')
  expect(avvisoApertura(t({ id: 'a', ora: '10:00' }), MERCOLEDI)).toBeNull()
})

test('descriviOrari', () => {
  expect(descriviOrari({ chiusoIl: [1], apre: '10:00', chiude: '18:00' })).toBe('10:00–18:00 · chiuso il lunedì')
  expect(descriviOrari({ chiusoIl: [0, 3] })).toBe('chiuso il mercoledì e la domenica')
  expect(descriviOrari({ chiusoIl: [0, 1, 2] })).toBe('chiuso il lunedì, il martedì e la domenica')
  expect(descriviOrari({ chiusoIl: [], apre: '07:30' })).toBe('dalle 07:30')
  expect(descriviOrari({ chiusoIl: [], chiude: '22:30' })).toBe('fino alle 22:30')
  expect(descriviOrari({ chiusoIl: [] })).toBe('Orari non indicati')
})
```

Run: `npm test -- src/model/orari.test.ts`
Expected: FAIL, `Failed to resolve import "./orari"`.

- [ ] **Step 3: Implementare `src/model/orari.ts`**

```ts
import { giornoSettimana, minutiDaOra, SETTIMANA } from './date'
import type { OrariTappa, Tappa } from './tipi'

export type StatoApertura = 'chiuso-oggi' | 'fuori-orario' | 'aperto' | 'sconosciuto'
type ConOrari = Pick<Tappa, 'ora' | 'durataMin' | 'orari'>

/** Lunedì prima, domenica in fondo: l'ordine in cui si leggono i giorni. */
export const ORDINE_SETTIMANA = [1, 2, 3, 4, 5, 6, 0]

const conArticolo = (g: number) => `${g === 0 ? 'la' : 'il'} ${SETTIMANA[g]}`

/** Guarda il giorno della settimana della data e confronta ora e durata della tappa con apertura e chiusura. */
export function statoApertura(tappa: ConOrari, data: string): StatoApertura {
  const o = tappa.orari
  if (!o) return 'sconosciuto'
  if (o.chiusoIl.includes(giornoSettimana(data))) return 'chiuso-oggi'
  const inizio = minutiDaOra(tappa.ora)
  const apre = minutiDaOra(o.apre ?? null)
  const chiude = minutiDaOra(o.chiude ?? null)
  if (inizio === null || (apre === null && chiude === null)) return 'sconosciuto'
  if (apre !== null && inizio < apre) return 'fuori-orario'
  if (chiude !== null && inizio + (tappa.durataMin ?? 0) > chiude) return 'fuori-orario'
  return 'aperto'
}

/** Il testo del badge: "Chiuso il mercoledì", "Apre alle 10:00", "Chiude alle 17:00"; null se non c'è niente da dire. */
export function avvisoApertura(tappa: ConOrari, data: string): string | null {
  const o = tappa.orari
  const stato = statoApertura(tappa, data)
  if (!o) return null
  if (stato === 'chiuso-oggi') return `Chiuso ${conArticolo(giornoSettimana(data))}`
  if (stato !== 'fuori-orario') return null
  const inizio = minutiDaOra(tappa.ora)
  const apre = minutiDaOra(o.apre ?? null)
  return apre !== null && inizio !== null && inizio < apre ? `Apre alle ${o.apre}` : `Chiude alle ${o.chiude}`
}

/** "10:00–18:00 · chiuso il lunedì". */
export function descriviOrari(o: OrariTappa): string {
  const parti: string[] = []
  if (o.apre && o.chiude) parti.push(`${o.apre}–${o.chiude}`)
  else if (o.apre) parti.push(`dalle ${o.apre}`)
  else if (o.chiude) parti.push(`fino alle ${o.chiude}`)
  const chiusi = ORDINE_SETTIMANA.filter(g => o.chiusoIl.includes(g)).map(conArticolo)
  if (chiusi.length) parti.push(`chiuso ${chiusi.length === 1 ? chiusi[0] : `${chiusi.slice(0, -1).join(', ')} e ${chiusi[chiusi.length - 1]}`}`)
  return parti.length ? parti.join(' · ') : 'Orari non indicati'
}
```

Run: `npm test -- src/model/orari.test.ts`
Expected: PASS.

- [ ] **Step 4: Test delle notti in hotel**

Creare `src/model/prenotazioni.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { prenotazioneDiProva as p, viaggioDiProva } from './fixture'
import { notteCoperta } from './prenotazioni'

describe('notteCoperta', () => {
  const v = viaggioDiProva({
    prenotazioni: [
      p({ id: 'nikko', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-12T15:00', fine: '2027-08-13T10:00' }),
      p({ id: 'kanazawa', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-13T15:00', fine: '2027-08-15T10:00' }),
      p({ id: 'kyoto', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-15T15:00', fine: '2027-08-20T10:00' }),
      p({ id: 'osaka', tipo: 'hotel', stato: 'da-prenotare', inizio: '2027-08-20T15:00', fine: '2027-08-24T10:00' }),
      p({ id: 'museo', tipo: 'biglietto', stato: 'prenotata', inizio: '2027-08-16T10:00', fine: '2027-08-17T10:00' }),
      p({ id: 'senza-fine', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-24T15:00' }),
    ],
  })
  test('dal giorno del check-in al giorno prima del check-out', () => {
    expect(notteCoperta(v, '2027-08-15')?.id).toBe('kyoto')
    expect(notteCoperta(v, '2027-08-19')?.id).toBe('kyoto')
    expect(notteCoperta(v, '2027-08-20')).toBeNull()
  })
  test('il giorno del cambio di hotel conta quello nuovo', () => {
    expect(notteCoperta(v, '2027-08-12')?.id).toBe('nikko')
    expect(notteCoperta(v, '2027-08-13')?.id).toBe('kanazawa')
  })
  test('solo hotel prenotati, con check-in e check-out', () => {
    expect(notteCoperta(v, '2027-08-21')).toBeNull()
    expect(notteCoperta(v, '2027-08-16')?.id).toBe('kyoto')
    expect(notteCoperta(v, '2027-08-24')).toBeNull()
  })
})
```

Run: `npm test -- src/model/prenotazioni.test.ts`
Expected: FAIL, `Failed to resolve import "./prenotazioni"`.

- [ ] **Step 5: Implementare `src/model/prenotazioni.ts`**

```ts
import type { Prenotazione, Viaggio } from './tipi'

/**
 * L'hotel prenotato che copre la notte di `data`: dal giorno del check-in al giorno prima del check-out.
 * Se due si sovrappongono vince quello col check-in più recente. Senza prenotazione, chi chiama usa `Giorno.alloggio`.
 */
export function notteCoperta(v: Viaggio, data: string): Prenotazione | null {
  const coprono = v.prenotazioni.filter(p =>
    p.tipo === 'hotel' && p.stato === 'prenotata' && p.inizio && p.fine
    && p.inizio.slice(0, 10) <= data && data < p.fine.slice(0, 10))
  coprono.sort((a, b) => (a.inizio! < b.inizio! ? 1 : -1))
  return coprono[0] ?? null
}
```

Run: `npm test -- src/model/prenotazioni.test.ts`
Expected: PASS.

- [ ] **Step 6: Test della ricerca**

Creare `src/model/ricerca.test.ts`:

```ts
import { expect, test } from 'vitest'
import { giornoDiProva, prenotazioneDiProva as p, tappaDiProva as t, viaggioDiProva } from './fixture'
import { cerca, normalizzaTesto } from './ricerca'

const v = viaggioDiProva({
  giorni: [
    giornoDiProva({ id: 'g0', tappe: [t({ id: 'a', titolo: 'Tōdai-ji', descrizione: 'Grande Buddha' }), t({ id: 'b', titolo: 'Pranzo', nota: 'Caffè buonissimo' })] }),
    giornoDiProva({ id: 'g1', tappe: [t({ id: 'c', titolo: 'Kinkaku-ji', consiglio: 'Arrivate presto, prima del TODAI' })] }),
    giornoDiProva({ id: 'g2', cittaId: 'kyoto' }),
  ],
  prenotazioni: [p({ id: 'x', titolo: 'Volo', codice: 'AB12CD' }), p({ id: 'y', titolo: 'Hotel', note: 'Colazione vicino al todai' })],
})

test('normalizzaTesto toglie accenti e maiuscole', () => {
  expect(normalizzaTesto('Tōdai-ji Caffè')).toBe('todai-ji caffe')
})

test('ignora maiuscole e accenti', () => {
  expect(cerca(v, 'TODAI').giorni.flatMap(g => g.tappe.map(x => x.id))).toEqual(['a', 'c'])
  expect(cerca(v, 'caffe').giorni.flatMap(g => g.tappe.map(x => x.id))).toEqual(['b'])
})

test('raggruppa le tappe per giorno con la data, e a parte le prenotazioni', () => {
  const r = cerca(v, 'todai')
  expect(r.giorni.map(g => [g.indice, g.data, g.giorno.id, g.tappe.length])).toEqual([[0, '2027-08-08', 'g0', 1], [1, '2027-08-09', 'g1', 1]])
  expect(r.prenotazioni.map(x => x.id)).toEqual(['y'])
  expect(r.totale).toBe(3)
})

test('cerca anche nei codici delle prenotazioni', () => {
  expect(cerca(v, 'ab12').prenotazioni.map(x => x.id)).toEqual(['x'])
})

test('meno di due lettere: niente', () => {
  expect(cerca(v, ' t ')).toEqual({ giorni: [], prenotazioni: [], totale: 0 })
})
```

Run: `npm test -- src/model/ricerca.test.ts`
Expected: FAIL, `Failed to resolve import "./ricerca"`.

- [ ] **Step 7: Implementare `src/model/ricerca.ts`**

```ts
import { dataGiorno } from './date'
import type { Giorno, Prenotazione, Tappa, Viaggio } from './tipi'

/** Minuscole e senza accenti né macron: "Tōdai" e "TODAI" diventano "todai". */
export function normalizzaTesto(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export interface GiornoTrovato { indice: number; data: string; giorno: Giorno; tappe: Tappa[] }
export interface Risultati { giorni: GiornoTrovato[]; prenotazioni: Prenotazione[]; totale: number }

/** Cerca in titoli, descrizioni, note e consigli delle tappe, e in titoli, codici e note delle prenotazioni. */
export function cerca(v: Viaggio, testo: string): Risultati {
  const q = normalizzaTesto(testo.trim())
  if (q.length < 2) return { giorni: [], prenotazioni: [], totale: 0 }
  const trova = (...campi: (string | undefined)[]) => campi.some(c => c !== undefined && normalizzaTesto(c).includes(q))
  const giorni = v.giorni.flatMap((giorno, indice) => {
    const tappe = giorno.tappe.filter(t => trova(t.titolo, t.descrizione, t.nota, t.consiglio))
    return tappe.length ? [{ indice, data: dataGiorno(v, indice), giorno, tappe }] : []
  })
  const prenotazioni = v.prenotazioni.filter(p => trova(p.titolo, p.codice, p.note))
  return { giorni, prenotazioni, totale: giorni.reduce((n, g) => n + g.tappe.length, 0) + prenotazioni.length }
}
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/model/date.ts src/model/orari.ts src/model/orari.test.ts src/model/prenotazioni.ts src/model/prenotazioni.test.ts src/model/ricerca.ts src/model/ricerca.test.ts
git commit -m "Orari di apertura con avvisi, hotel che copre la notte, ricerca senza accenti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Allegati in IndexedDB e backup con gli allegati

**Files:**
- Create: `src/servizi/allegati.ts`, `src/servizi/condividi.ts`
- Modify: `src/servizi/backup.ts` (riscritto intero), `src/servizi/backup.test.ts`, `src/ui/Backup.tsx` (riscritto intero), `src/schermate/viaggio/SchermataViaggio.tsx` (importazione con gli allegati), `package.json` (dipendenza `idb-keyval`)
- Test: `src/servizi/allegati.test.ts`, `src/servizi/backup.test.ts`

**Interfaces:**
- Consumes: `Allegato`, `Viaggio` (Task 1), `nuovoId`, `validaViaggio`, `istanteTokyo`.
- Produces (`src/servizi/allegati.ts`): `LATO_MASSIMO = 1600`, `QUALITA_JPEG = 0.85`, `PDF_MASSIMO = 15 * 1024 * 1024`, `interface ArchivioAllegati { leggi(id): Promise<Blob | undefined>; scrivi(id, dati: Blob): Promise<void>; elimina(id): Promise<void> }`, `archivioIndexedDb: ArchivioAllegati`, `dimensioniRidotte(larghezza, altezza, lato?): { larghezza; altezza }`, `riduciFoto(foto: Blob): Promise<Blob>`, `ERRORI_ALLEGATO: { tipo; grande; spazio; archivio; foto }`, `type EsitoAllegato = { ok: true; allegato: Allegato } | { ok: false; errore: string }`, `interface DipendenzeAllegati { archivio; riduci }`, `salvaAllegato(file: File, dip?): Promise<EsitoAllegato>`, `idAllegati(v): string[]`, `byteAllegati(v): number`, `allegatiPerBackup(v, archivio?): Promise<{ allegati: AllegatiBackup; mancanti: number }>`, `ripristinaAllegati(allegati: AllegatiBackup, archivio?): Promise<void>` (lancia se lo spazio non basta), `eliminaSeOrfani(ids: string[], v: Viaggio, archivio?): Promise<void>` (non lancia), `base64DaByte(b: Uint8Array): string`, `byteDaBase64(s: string): Uint8Array<ArrayBuffer>`, `formatoByte(n: number): string`.
- Produces (`src/servizi/condividi.ts`): `condividiFile(file: File, titolo: string): Promise<'condiviso' | 'scaricato' | 'annullato'>`.
- Produces (`src/servizi/backup.ts`): `type AllegatiBackup = Record<string, { mime: string; dati: string }>`, `FileBackup.allegati?: AllegatiBackup`, `creaBackup(v, adesso, allegati?)`, `leggiBackup(testo): { ok: true; viaggio: Viaggio; allegati: AllegatiBackup } | { ok: false; errore: string }`; `nomeFileBackup` e `condividiOScarica(b, adesso?)` con la firma di prima.

- [ ] **Step 1: Installare `idb-keyval`**

```bash
npm install idb-keyval
```

Expected: `idb-keyval` compare in `dependencies` di `package.json`.

- [ ] **Step 2: Test degli allegati e del backup**

Creare `src/servizi/allegati.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { prenotazioneDiProva as p, viaggioDiProva } from '../model/fixture'
import {
  allegatiPerBackup, base64DaByte, byteAllegati, byteDaBase64, dimensioniRidotte, eliminaSeOrfani, ERRORI_ALLEGATO,
  formatoByte, idAllegati, PDF_MASSIMO, ripristinaAllegati, salvaAllegato, type ArchivioAllegati,
} from './allegati'
import { creaBackup, leggiBackup } from './backup'

/** Un IndexedDB finto in memoria; `pieno` e `rotto` simulano lo spazio finito e IndexedDB assente. */
function archivioFinto(opzioni: { pieno?: boolean; rotto?: boolean } = {}) {
  const m = new Map<string, Blob>()
  const archivio: ArchivioAllegati = {
    leggi: async id => m.get(id),
    scrivi: async (id, dati) => {
      if (opzioni.rotto) throw new Error('indexedDB is not defined')
      if (opzioni.pieno) throw new DOMException('pieno', 'QuotaExceededError')
      m.set(id, dati)
    },
    elimina: async id => { m.delete(id) },
  }
  return { archivio, m }
}
const nonRidurre = async (b: Blob) => b

describe('dimensioniRidotte', () => {
  test('il lato lungo scende a 1600', () => {
    expect(dimensioniRidotte(4032, 3024)).toEqual({ larghezza: 1600, altezza: 1200 })
    expect(dimensioniRidotte(3024, 4032)).toEqual({ larghezza: 1200, altezza: 1600 })
  })
  test('le foto piccole restano come sono', () => {
    expect(dimensioniRidotte(800, 600)).toEqual({ larghezza: 800, altezza: 600 })
    expect(dimensioniRidotte(1600, 900)).toEqual({ larghezza: 1600, altezza: 900 })
  })
  test('arrotonda ai pixel', () => {
    expect(dimensioniRidotte(4000, 2250)).toEqual({ larghezza: 1600, altezza: 900 })
    expect(dimensioniRidotte(3000, 2001)).toEqual({ larghezza: 1600, altezza: 1067 })
  })
})

describe('salvaAllegato', () => {
  test('una foto passa dalla riduzione e diventa JPEG', async () => {
    const { archivio, m } = archivioFinto()
    const riduci = async () => new Blob(['piccola'], { type: 'image/jpeg' })
    const r = await salvaAllegato(new File(['grandissima'], 'IMG_0001.HEIC', { type: 'image/heic' }), { archivio, riduci })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.allegato).toMatchObject({ nome: 'IMG_0001.jpg', mime: 'image/jpeg', byte: 7 })
    expect(r.allegato.id).toMatch(/^a-/)
    expect(await m.get(r.allegato.id)?.text()).toBe('piccola')
  })
  test('un PDF resta com\'è', async () => {
    const { archivio, m } = archivioFinto()
    const r = await salvaAllegato(new File(['%PDF-1.7'], 'volo.pdf', { type: 'application/pdf' }), { archivio, riduci: nonRidurre })
    expect(r.ok && r.allegato).toMatchObject({ nome: 'volo.pdf', mime: 'application/pdf', byte: 8 })
    expect(m.size).toBe(1)
  })
  test('un PDF oltre 15 MB viene rifiutato senza scrivere niente', async () => {
    const { archivio, m } = archivioFinto()
    const grande = new File([new Uint8Array(PDF_MASSIMO + 1)], 'x.pdf', { type: 'application/pdf' })
    expect(await salvaAllegato(grande, { archivio, riduci: nonRidurre })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.grande })
    expect(m.size).toBe(0)
  })
  test('solo foto e PDF', async () => {
    const { archivio, m } = archivioFinto()
    expect(await salvaAllegato(new File(['x'], 'nota.txt', { type: 'text/plain' }), { archivio, riduci: nonRidurre })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.tipo })
    expect(m.size).toBe(0)
  })
  test('spazio finito: messaggio chiaro e niente a metà', async () => {
    const { archivio, m } = archivioFinto({ pieno: true })
    expect(await salvaAllegato(new File(['x'], 'x.pdf', { type: 'application/pdf' }), { archivio, riduci: nonRidurre })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.spazio })
    expect(m.size).toBe(0)
  })
  test('IndexedDB non disponibile', async () => {
    const { archivio } = archivioFinto({ rotto: true })
    expect(await salvaAllegato(new File(['x'], 'x.pdf', { type: 'application/pdf' }), { archivio, riduci: nonRidurre })).toEqual({ ok: false, errore: ERRORI_ALLEGATO.archivio })
  })
  test('se la riduzione non riesce si tiene la foto originale', async () => {
    const { archivio } = archivioFinto()
    const riduci = async (): Promise<Blob> => { throw new Error('formato sconosciuto') }
    const r = await salvaAllegato(new File(['png'], 'qr.png', { type: 'image/png' }), { archivio, riduci })
    expect(r.ok && r.allegato).toMatchObject({ nome: 'qr.png', mime: 'image/png', byte: 3 })
  })
})

describe('backup con allegati', () => {
  const conAllegati = () => viaggioDiProva({
    prenotazioni: [p({ id: 'pr', allegati: [{ id: 'a-1', nome: 'qr.jpg', mime: 'image/jpeg', byte: 3 }, { id: 'a-2', nome: 'x.pdf', mime: 'application/pdf', byte: 3 }] })],
  })
  test('andata e ritorno con un IndexedDB finto', async () => {
    const prima = archivioFinto()
    await prima.archivio.scrivi('a-1', new Blob([new Uint8Array([0, 255, 128])], { type: 'image/jpeg' }))
    await prima.archivio.scrivi('a-2', new Blob(['%PD'], { type: 'application/pdf' }))
    const v = conAllegati()
    const { allegati, mancanti } = await allegatiPerBackup(v, prima.archivio)
    expect(mancanti).toBe(0)
    const letto = leggiBackup(JSON.stringify(creaBackup(v, new Date('2027-08-10T12:00:00+09:00'), allegati)))
    expect(letto.ok).toBe(true)
    if (!letto.ok) return
    expect(letto.viaggio).toEqual(v)
    const dopo = archivioFinto()
    await ripristinaAllegati(letto.allegati, dopo.archivio)
    expect([...new Uint8Array(await dopo.m.get('a-1')!.arrayBuffer())]).toEqual([0, 255, 128])
    expect(dopo.m.get('a-1')!.type).toBe('image/jpeg')
    expect(await dopo.m.get('a-2')!.text()).toBe('%PD')
  })
  test('un allegato sparito dal telefono viene contato e non blocca', async () => {
    const { archivio } = archivioFinto()
    expect(await allegatiPerBackup(conAllegati(), archivio)).toEqual({ allegati: {}, mancanti: 2 })
  })
  test('ripristinare senza spazio lancia: chi chiama avvisa', async () => {
    const { archivio } = archivioFinto({ pieno: true })
    await expect(ripristinaAllegati({ 'a-1': { mime: 'image/jpeg', dati: base64DaByte(new Uint8Array([1])) } }, archivio)).rejects.toThrow()
  })
  test('un backup della fase 1, senza allegati, resta importabile', () => {
    const v = viaggioDiProva()
    const vecchio = { tipo: 'viaggio-giappone', creato: '2026-09-30T10:00:00.000Z', viaggio: v }
    expect(leggiBackup(JSON.stringify(vecchio))).toEqual({ ok: true, viaggio: v, allegati: {} })
  })
  test('allegati scritti male nel backup: errore chiaro', () => {
    const r = leggiBackup(JSON.stringify({ ...creaBackup(viaggioDiProva(), new Date()), allegati: { 'a-1': { mime: 5 } } }))
    expect(r).toEqual({ ok: false, errore: 'Il backup contiene allegati non validi.' })
  })
})

describe('pulizia e conti', () => {
  test('eliminaSeOrfani toglie solo quelli che nessuna prenotazione usa più', async () => {
    const { archivio, m } = archivioFinto()
    for (const id of ['a-1', 'a-2', 'a-3']) await archivio.scrivi(id, new Blob(['x']))
    const v = viaggioDiProva({ prenotazioni: [p({ id: 'pr', allegati: [{ id: 'a-1', nome: 'x', mime: 'image/jpeg', byte: 1 }] })] })
    await eliminaSeOrfani(['a-1', 'a-3'], v, archivio)
    expect([...m.keys()]).toEqual(['a-1', 'a-2'])
  })
  test('idAllegati e byteAllegati', () => {
    const v = viaggioDiProva({
      prenotazioni: [
        p({ id: 'x', allegati: [{ id: 'a-1', nome: 'x', mime: 'image/jpeg', byte: 1000 }] }),
        p({ id: 'y', allegati: [{ id: 'a-2', nome: 'y', mime: 'application/pdf', byte: 2500 }] }),
      ],
    })
    expect(idAllegati(v)).toEqual(['a-1', 'a-2'])
    expect(byteAllegati(v)).toBe(3500)
  })
  test('base64 andata e ritorno, anche oltre i 32 KB', () => {
    const b = new Uint8Array(70_000).map((_, i) => i % 256)
    expect(byteDaBase64(base64DaByte(b))).toEqual(b)
  })
  test('formatoByte', () => {
    expect(formatoByte(900)).toBe('900 B')
    expect(formatoByte(2048)).toBe('2 KB')
    expect(formatoByte(1_572_864)).toBe('1,5 MB')
    expect(formatoByte(3 * 1024 ** 3)).toBe('3,0 GB')
  })
})
```

In `src/servizi/backup.test.ts` sostituire

```ts
  expect(leggiBackup(JSON.stringify(creaBackup(v, adesso)))).toEqual({ ok: true, viaggio: v })
```

con

```ts
  expect(leggiBackup(JSON.stringify(creaBackup(v, adesso)))).toEqual({ ok: true, viaggio: v, allegati: {} })
```

Run: `npm test -- src/servizi`
Expected: FAIL, `Failed to resolve import "./allegati"` e il test "andata e ritorno" di `backup.test.ts` che non trova `allegati: {}`.

- [ ] **Step 3: Implementare `src/servizi/condividi.ts`**

```ts
/** Sul telefono apre il menu di condivisione (WhatsApp, File, Calendario…); altrove, o se la condivisione non va, scarica il file. */
export async function condividiFile(file: File, titolo: string): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo })
      return 'condiviso'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'annullato'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'scaricato'
}
```

- [ ] **Step 4: Riscrivere `src/servizi/backup.ts`**

```ts
import { istanteTokyo } from '../model/date'
import type { Viaggio } from '../model/tipi'
import { validaViaggio } from '../model/validazione'
import { condividiFile } from './condividi'

export const TIPO_FILE = 'viaggio-giappone'

/** I dati degli allegati delle prenotazioni, in base64, sotto il loro id. */
export type AllegatiBackup = Record<string, { mime: string; dati: string }>

export interface FileBackup {
  tipo: typeof TIPO_FILE
  creato: string
  viaggio: Viaggio
  /** Assente nei backup della fase 1. */
  allegati?: AllegatiBackup
}

export function creaBackup(v: Viaggio, adesso: Date, allegati: AllegatiBackup = {}): FileBackup {
  return { tipo: TIPO_FILE, creato: adesso.toISOString(), viaggio: v, allegati }
}

function allegatiValidi(x: unknown): x is AllegatiBackup {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false
  return Object.values(x).every(a => {
    const o = a as { mime?: unknown; dati?: unknown } | null
    return typeof o === 'object' && o !== null && typeof o.mime === 'string' && typeof o.dati === 'string'
  })
}

export function leggiBackup(testo: string): { ok: true; viaggio: Viaggio; allegati: AllegatiBackup } | { ok: false; errore: string } {
  let dati: unknown
  try {
    dati = JSON.parse(testo)
  } catch {
    return { ok: false, errore: 'Il file non è un JSON leggibile.' }
  }
  if (!dati || typeof dati !== 'object' || (dati as { tipo?: unknown }).tipo !== TIPO_FILE) {
    return { ok: false, errore: "Il file non è un backup di quest'app." }
  }
  const esito = validaViaggio((dati as { viaggio?: unknown }).viaggio)
  if (!esito.ok) return { ok: false, errore: `Il backup contiene errori: ${esito.errori.slice(0, 3).join('; ')}` }
  const grezzi = (dati as { allegati?: unknown }).allegati
  const allegati = grezzi === undefined ? {} : grezzi
  if (!allegatiValidi(allegati)) return { ok: false, errore: 'Il backup contiene allegati non validi.' }
  return { ok: true, viaggio: esito.viaggio, allegati }
}

export function nomeFileBackup(adesso: Date): string {
  return `giappone-backup-${istanteTokyo(adesso).data}.json`
}

/** Sul telefono apre il menu di condivisione (WhatsApp, File…); altrove scarica il file. */
export function condividiOScarica(b: FileBackup, adesso = new Date()): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  return condividiFile(new File([JSON.stringify(b)], nomeFileBackup(adesso), { type: 'application/json' }), 'Itinerario Giappone')
}
```

- [ ] **Step 5: Implementare `src/servizi/allegati.ts`**

```ts
import { createStore, del, get, set, type UseStore } from 'idb-keyval'
import { nuovoId } from '../model/id'
import type { Allegato, Viaggio } from '../model/tipi'
import type { AllegatiBackup } from './backup'

export const LATO_MASSIMO = 1600
export const QUALITA_JPEG = 0.85
export const PDF_MASSIMO = 15 * 1024 * 1024

/** Dove stanno i dati degli allegati. Nei test si passa un archivio finto in memoria. */
export interface ArchivioAllegati {
  leggi(id: string): Promise<Blob | undefined>
  scrivi(id: string, dati: Blob): Promise<void>
  elimina(id: string): Promise<void>
}

let negozio: UseStore | null = null
// Aperto al primo uso: senza IndexedDB l'errore arriva come promessa rifiutata, non all'avvio dell'app.
const negozioAllegati = () => (negozio ??= createStore('giappone-allegati', 'file'))

export const archivioIndexedDb: ArchivioAllegati = {
  leggi: async id => get<Blob>(id, negozioAllegati()),
  scrivi: async (id, dati) => set(id, dati, negozioAllegati()),
  elimina: async id => del(id, negozioAllegati()),
}

/** Le dimensioni con il lato lungo al massimo `lato`, in pixel interi; le foto più piccole restano come sono. */
export function dimensioniRidotte(larghezza: number, altezza: number, lato = LATO_MASSIMO): { larghezza: number; altezza: number } {
  const lungo = Math.max(larghezza, altezza)
  if (lungo <= lato) return { larghezza, altezza }
  const k = lato / lungo
  return { larghezza: Math.round(larghezza * k), altezza: Math.round(altezza * k) }
}

/** Foto ridotta a 1600 px sul lato lungo, JPEG 0.85, con createImageBitmap su un canvas. */
export async function riduciFoto(foto: Blob): Promise<Blob> {
  const immagine = await createImageBitmap(foto, { imageOrientation: 'from-image' })
  const { larghezza, altezza } = dimensioniRidotte(immagine.width, immagine.height)
  const tela = document.createElement('canvas')
  tela.width = larghezza
  tela.height = altezza
  const ctx = tela.getContext('2d')
  if (!ctx) { immagine.close(); throw new Error('canvas non disponibile') }
  ctx.drawImage(immagine, 0, 0, larghezza, altezza)
  immagine.close()
  return new Promise((ok, ko) => tela.toBlob(b => (b ? ok(b) : ko(new Error('conversione non riuscita'))), 'image/jpeg', QUALITA_JPEG))
}

export const ERRORI_ALLEGATO = {
  tipo: 'Si possono allegare solo foto e PDF.',
  grande: 'Il PDF supera i 15 MB: non lo posso allegare.',
  spazio: "Spazio del telefono esaurito: l'allegato non è stato aggiunto.",
  archivio: 'Su questo telefono non riesco a salvare allegati.',
  foto: 'Non riesco a leggere questa foto.',
} as const

export type EsitoAllegato = { ok: true; allegato: Allegato } | { ok: false; errore: string }
export interface DipendenzeAllegati { archivio: ArchivioAllegati; riduci: (foto: Blob) => Promise<Blob> }

const spazioFinito = (e: unknown) => (e as { name?: unknown } | null)?.name === 'QuotaExceededError'

/** Foto (ridotta) o PDF (fino a 15 MB) in IndexedDB. Se qualcosa non va non resta niente a metà e torna un messaggio chiaro. */
export async function salvaAllegato(file: File, dip: DipendenzeAllegati = { archivio: archivioIndexedDb, riduci: riduciFoto }): Promise<EsitoAllegato> {
  const foto = file.type.startsWith('image/')
  if (!foto && file.type !== 'application/pdf') return { ok: false, errore: ERRORI_ALLEGATO.tipo }
  if (!foto && file.size > PDF_MASSIMO) return { ok: false, errore: ERRORI_ALLEGATO.grande }
  let dati: Blob = file
  if (foto) {
    try {
      dati = await dip.riduci(file)
    } catch {
      // Un formato che il canvas non legge: si tiene l'originale, se non è enorme.
      if (file.size > PDF_MASSIMO) return { ok: false, errore: ERRORI_ALLEGATO.foto }
    }
  }
  const id = nuovoId('a')
  try {
    await dip.archivio.scrivi(id, dati)
  } catch (e) {
    return { ok: false, errore: spazioFinito(e) ? ERRORI_ALLEGATO.spazio : ERRORI_ALLEGATO.archivio }
  }
  const ridotta = dati !== file
  const nome = ridotta ? `${file.name.replace(/\.[^.]*$/, '') || 'foto'}.jpg` : file.name || 'allegato'
  return { ok: true, allegato: { id, nome, mime: dati.type || file.type, byte: dati.size } }
}

export function idAllegati(v: Viaggio): string[] {
  return v.prenotazioni.flatMap(p => p.allegati.map(a => a.id))
}

export function byteAllegati(v: Viaggio): number {
  return v.prenotazioni.reduce((t, p) => t + p.allegati.reduce((s, a) => s + a.byte, 0), 0)
}

export function base64DaByte(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

export function byteDaBase64(s: string): Uint8Array<ArrayBuffer> {
  const t = atob(s)
  const b = new Uint8Array(t.length)
  for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i)
  return b
}

/** Gli allegati del viaggio in base64 per il file di backup; quelli che il telefono non ha più vengono contati. */
export async function allegatiPerBackup(v: Viaggio, archivio: ArchivioAllegati = archivioIndexedDb): Promise<{ allegati: AllegatiBackup; mancanti: number }> {
  const mime = new Map(v.prenotazioni.flatMap(p => p.allegati.map(a => [a.id, a.mime] as const)))
  const allegati: AllegatiBackup = {}
  let mancanti = 0
  for (const [id, tipo] of mime) {
    try {
      const b = await archivio.leggi(id)
      if (!b) { mancanti++; continue }
      allegati[id] = { mime: b.type || tipo, dati: base64DaByte(new Uint8Array(await b.arrayBuffer())) }
    } catch {
      mancanti++
    }
  }
  return { allegati, mancanti }
}

/** Riscrive in IndexedDB gli allegati di un backup importato. Lancia se lo spazio non basta: chi chiama avvisa. */
export async function ripristinaAllegati(allegati: AllegatiBackup, archivio: ArchivioAllegati = archivioIndexedDb): Promise<void> {
  for (const [id, a] of Object.entries(allegati)) await archivio.scrivi(id, new Blob([byteDaBase64(a.dati)], { type: a.mime }))
}

/** Cancella dagli allegati `ids` quelli che nessuna prenotazione di `v` usa più. Non lancia mai. */
export async function eliminaSeOrfani(ids: string[], v: Viaggio, archivio: ArchivioAllegati = archivioIndexedDb): Promise<void> {
  const usati = new Set(idAllegati(v))
  for (const id of ids) {
    if (usati.has(id)) continue
    try {
      await archivio.elimina(id)
    } catch { /* archivio non disponibile: resta un file orfano, nessun danno */ }
  }
}

export function formatoByte(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB`
  return `${(n / 1024 ** 3).toFixed(1).replace('.', ',')} GB`
}
```

Run: `npm test`
Expected: PASS (anche `backup.test.ts` aggiornato).

- [ ] **Step 6: Esportare il backup con gli allegati — riscrivere `src/ui/Backup.tsx`**

```tsx
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { aggiornaImpostazioni } from '../model/operazioni'
import { allegatiPerBackup } from '../servizi/allegati'
import { condividiOScarica, creaBackup } from '../servizi/backup'
import { useViaggio } from '../store/viaggio'
import './inviti.css'

export function useEsportaBackup() {
  const applica = useViaggio(s => s.applica)
  return async () => {
    const adesso = new Date()
    const viaggio = useViaggio.getState().viaggio
    const { allegati, mancanti } = await allegatiPerBackup(viaggio)
    const esito = await condividiOScarica(creaBackup(viaggio, adesso, allegati), adesso)
    if (esito === 'annullato') return
    applica(v => aggiornaImpostazioni(v, { ultimoBackup: adesso.toISOString() }))
    toast(esito === 'condiviso' ? 'Backup condiviso' : 'Backup scaricato')
    if (mancanti > 0) toast(`${mancanti === 1 ? 'Un allegato non è' : `${mancanti} allegati non sono`} più sul telefono: nel backup manca.`)
  }
}

export function PromemoriaBackup() {
  const esporta = useEsportaBackup()
  return (
    <div className="card invito">
      <Save size={24} aria-hidden />
      <div>
        <strong>Fai un backup</strong>
        <p className="testo-2">Salva l'itinerario in un file: se il telefono perde i dati, lo reimporti in un attimo.</p>
      </div>
      <button type="button" className="pulsante piccolo" onClick={() => void esporta()}>Salva</button>
    </div>
  )
}
```

(Su iPhone, l'attesa per leggere gli allegati può far scadere il permesso di condividere: `condividiFile` allora ricade da sola sullo scaricamento del file.)

- [ ] **Step 7: Importare anche gli allegati in `src/schermate/viaggio/SchermataViaggio.tsx`**

Sostituire

```tsx
import { leggiBackup } from '../../servizi/backup'
```

con

```tsx
import { eliminaSeOrfani, idAllegati, ripristinaAllegati } from '../../servizi/allegati'
import { leggiBackup, type AllegatiBackup } from '../../servizi/backup'
```

Sostituire

```tsx
  const [daImportare, setDaImportare] = useState<Viaggio | null>(null)
```

con

```tsx
  const [daImportare, setDaImportare] = useState<{ viaggio: Viaggio; allegati: AllegatiBackup } | null>(null)
```

Sostituire

```tsx
    else setDaImportare(esito.viaggio)
```

con

```tsx
    else setDaImportare({ viaggio: esito.viaggio, allegati: esito.allegati })
```

Subito prima di `  return (` del componente, aggiungere:

```tsx
  // Finita la finestra per annullare, gli allegati che il viaggio sostituito usava (e il nuovo no) si cancellano.
  const pulisciDopo = (ids: string[]) => {
    if (ids.length) setTimeout(() => void eliminaSeOrfani(ids, useViaggio.getState().viaggio), 7000)
  }
  const confermaImportazione = async () => {
    if (!daImportare) return
    const { viaggio: nuovo, allegati } = daImportare
    setDaImportare(null)
    const vecchi = idAllegati(useViaggio.getState().viaggio)
    try {
      await ripristinaAllegati(allegati)
    } catch {
      toast("Gli allegati del backup non entrano nello spazio del telefono: importo solo l'itinerario.")
    }
    applicaAnnullabile(() => nuovo, 'Backup importato')
    pulisciDopo(vecchi)
  }
  const ripristina = () => {
    const vecchi = idAllegati(viaggio)
    applicaAnnullabile(() => viaggioBase(), 'Itinerario ripristinato')
    setRipristino(false)
    pulisciDopo(vecchi)
  }
```

Sostituire il contenuto del foglio "Importa backup"

```tsx
        {daImportare && (
          <>
            <p style={{ margin: '8px 0' }}><strong>{daImportare.titolo}</strong></p>
            <p className="testo-2" style={{ marginBottom: 16 }}>
              {daImportare.giorni.length} giorni dal {formatoData(daImportare.dataPartenza, 'lungo')}. Sostituisce l'itinerario su questo telefono (si può annullare subito dopo).
            </p>
            <button type="button" className="pulsante primario largo" onClick={() => { const n = daImportare; applicaAnnullabile(() => n, 'Backup importato'); setDaImportare(null) }}>Importa</button>
          </>
        )}
```

con

```tsx
        {daImportare && (
          <>
            <p style={{ margin: '8px 0' }}><strong>{daImportare.viaggio.titolo}</strong></p>
            <p className="testo-2" style={{ marginBottom: 16 }}>
              {daImportare.viaggio.giorni.length} giorni dal {formatoData(daImportare.viaggio.dataPartenza, 'lungo')}
              {Object.keys(daImportare.allegati).length > 0 && `, con ${Object.keys(daImportare.allegati).length} allegati`}.
              {' '}Sostituisce l'itinerario su questo telefono (si può annullare subito dopo).
            </p>
            <button type="button" className="pulsante primario largo" onClick={() => void confermaImportazione()}>Importa</button>
          </>
        )}
```

e sostituire il pulsante del foglio "Ripristina l'itinerario 2027"

```tsx
        <button type="button" className="pulsante primario largo" onClick={() => { applicaAnnullabile(() => viaggioBase(), 'Itinerario ripristinato'); setRipristino(false) }}>Ripristina</button>
```

con

```tsx
        <button type="button" className="pulsante primario largo" onClick={ripristina}>Ripristina</button>
```

- [ ] **Step 8: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812, chiaro e scuro), `/jap-itinerario/#/viaggio`:
- "Salva o condividi un backup" scarica ancora `giappone-backup-AAAA-MM-GG.json`; aprendo il file, c'è il campo `"allegati": {}`.
- "Importa un backup" con un file salvato dalla fase 1 (senza `allegati`): il foglio mostra titolo e giorni, "Importa" sostituisce l'itinerario e il toast "Backup importato" ha "Annulla".
- "Ripristina l'itinerario 2027" funziona come prima.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/servizi/allegati.ts src/servizi/allegati.test.ts src/servizi/condividi.ts src/servizi/backup.ts src/servizi/backup.test.ts src/ui/Backup.tsx src/schermate/viaggio/SchermataViaggio.tsx
git commit -m "Allegati in IndexedDB con foto ridotte, e backup che li porta con sé

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Prenotazioni e orari nei dati di partenza

**Files:**
- Modify: `scripts/revisione-2027.ts`, `scripts/genera-base.ts`, `src/model/operazioni.ts`, `src/model/operazioni.test.ts`, `src/data/itinerario-base.test.ts`
- Regenerate: `src/data/itinerario-base.json`

**Interfaces:**
- Consumes: `aggiungiGiorni`, `minutiDaOra` (`date.ts`), `linkSicuro` (`servizi/mappe.ts`), tipi `Prenotazione`, `OrariTappa` (Task 1).
- Produces (dati): `viaggioBase().prenotazioni` con 19 prenotazioni tutte `da-prenotare` senza codici — `pr-volo-andata` (7/8 12:30 Europe/Rome → 8/8 14:00 Asia/Tokyo), `pr-volo-ritorno` (27/8 20:00), sette hotel `pr-hotel-<indice del primo giorno>` (check-in 15:00, check-out 10:00), dieci `pr-<id tappa>` di tipo `biglietto` (o `ristorante` per una tappa di tipo cibo) con `tappaId`; 12 tappe con `orari` `fonte: 'base'`; un avviso sul Tsukiji al G3.
- Produces (`operazioni.ts`): `integraDatiDiPartenza(v: Viaggio, base: Viaggio): { viaggio: Viaggio; prenotazioni: number; orari: number }` — aggiunge solo ciò che manca (prenotazioni per id, orari sulle tappe con lo stesso id che non ne hanno), toglie `tappaId` che puntano a tappe inesistenti.

- [ ] **Step 1: Test dei dati di partenza**

In `src/data/itinerario-base.test.ts`, prima dell'ultima riga `})` del file (la chiusura del `describe('itinerario di partenza 2027', …)`), aggiungere:

```ts
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
```

In `src/model/operazioni.test.ts` sostituire la riga di import della fixture

```ts
import { giornoDiProva, tappaDiProva as t, viaggioDiProva } from './fixture'
```

con

```ts
import { giornoDiProva, prenotazioneDiProva, tappaDiProva as t, viaggioDiProva } from './fixture'
```

e aggiungere in fondo al file:

```ts
describe('integraDatiDiPartenza', () => {
  const base = viaggioDiProva({
    giorni: [giornoDiProva({ id: 'g0', tappe: [t({ id: 'a', orari: { chiusoIl: [1], fonte: 'base' } }), t({ id: 'b', orari: { chiusoIl: [], apre: '09:00', fonte: 'base' } })] })],
    prenotazioni: [prenotazioneDiProva({ id: 'pr-1', tappaId: 'a' }), prenotazioneDiProva({ id: 'pr-2', tappaId: 'z' }), prenotazioneDiProva({ id: 'pr-3' })],
  })
  test('aggiunge solo quello che manca', () => {
    const mio = viaggioDiProva({
      giorni: [giornoDiProva({ id: 'g0', tappe: [t({ id: 'a' }), t({ id: 'b', orari: { chiusoIl: [3], fonte: 'manuale' } })] })],
      prenotazioni: [prenotazioneDiProva({ id: 'pr-3', codice: 'MIO' })],
    })
    const r = op.integraDatiDiPartenza(mio, base)
    expect(r.prenotazioni).toBe(2)
    expect(r.orari).toBe(1)
    expect(r.viaggio.prenotazioni.map(p => p.id)).toEqual(['pr-3', 'pr-1', 'pr-2'])
    expect(r.viaggio.prenotazioni[0].codice).toBe('MIO')
    expect(r.viaggio.giorni[0].tappe[0].orari).toEqual({ chiusoIl: [1], fonte: 'base' })
    expect(r.viaggio.giorni[0].tappe[1].orari).toEqual({ chiusoIl: [3], fonte: 'manuale' })
  })
  test('un collegamento a una tappa che non c\'è più viene tolto', () => {
    const r = op.integraDatiDiPartenza(viaggioDiProva({ giorni: [giornoDiProva({ id: 'g0', tappe: [t({ id: 'a' })] })] }), base)
    expect(r.viaggio.prenotazioni.find(p => p.id === 'pr-1')?.tappaId).toBe('a')
    expect('tappaId' in r.viaggio.prenotazioni.find(p => p.id === 'pr-2')!).toBe(false)
  })
  test('già tutto presente: niente da aggiungere', () => {
    const r = op.integraDatiDiPartenza(base, base)
    expect([r.prenotazioni, r.orari]).toEqual([0, 0])
  })
})
```

Run: `npm test -- src/data src/model/operazioni.test.ts`
Expected: FAIL, i test nuovi dei dati (niente prenotazioni né orari nel JSON di adesso) e `op.integraDatiDiPartenza is not a function`.

- [ ] **Step 2: `integraDatiDiPartenza` in `src/model/operazioni.ts`**

Aggiungere in fondo al file:

```ts
/**
 * Per chi ha già dati salvati: aggiunge le prenotazioni di partenza che non ha (per id) e gli orari
 * sulle tappe con lo stesso id che non ne hanno. Niente di quello che c'è viene toccato.
 */
export function integraDatiDiPartenza(v: Viaggio, base: Viaggio): { viaggio: Viaggio; prenotazioni: number; orari: number } {
  const tappe = new Set(v.giorni.flatMap(g => g.tappe.map(t => t.id)))
  const presenti = new Set(v.prenotazioni.map(p => p.id))
  const nuove = base.prenotazioni.filter(p => !presenti.has(p.id)).map(p => {
    const copia = structuredClone(p)
    if (copia.tappaId !== undefined && !tappe.has(copia.tappaId)) delete copia.tappaId
    return copia
  })
  const orariBase = new Map(base.giorni.flatMap(g => g.tappe.flatMap(t => (t.orari ? [[t.id, t.orari] as const] : []))))
  let orari = 0
  const giorni = v.giorni.map(g => ({
    ...g,
    tappe: g.tappe.map(t => {
      const o = orariBase.get(t.id)
      if (!o || t.orari) return t
      orari++
      return { ...t, orari: structuredClone(o) }
    }),
  }))
  return { viaggio: { ...v, giorni, prenotazioni: [...v.prenotazioni, ...nuove] }, prenotazioni: nuove.length, orari }
}
```

- [ ] **Step 3: Prenotazioni e orari in `scripts/revisione-2027.ts`**

Sostituire le prime due righe

```ts
import { minutiDaOra } from '../src/model/date'
import type { Avviso, Giorno, InfoEvento, Luogo, Suggerimento, Tappa, TipoTappa, Viaggio } from '../src/model/tipi'
```

con

```ts
import { aggiungiGiorni, minutiDaOra } from '../src/model/date'
import type { Avviso, Giorno, InfoEvento, Luogo, OrariTappa, Prenotazione, Suggerimento, Tappa, TipoTappa, Viaggio } from '../src/model/tipi'
import { linkSicuro } from '../src/servizi/mappe'
```

Subito prima di `/** Applica la sezione 5 dello spec all'itinerario convertito dalla vecchia app. */` aggiungere:

```ts
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

```

Sostituire

```ts
  g(3).avvisi = [info('Festa nazionale (Yama no Hi): più gente nei luoghi famosi.')]
```

con

```ts
  g(3).avvisi = [
    info('Festa nazionale (Yama no Hi): più gente nei luoghi famosi.'),
    attenzione('Tsukiji Outer Market: oggi è mercoledì e festivo, molti banchi restano chiusi. Verificate sul sito prima di andare.'),
  ]
```

Sostituire il `return` finale

```ts
  return {
    ...v,
    titolo: 'Giappone — agosto 2027',
    dataPartenza: '2027-08-08',
    citta,
    giorni: [
      arrivo, g(1), g(2), g(3), g(4), g(5), g(6),
      nara, g8, g(7), g(9), kurama,
      g(12), g(13), g(14), himeji,
      g(16), g(17), g(18), partenza,
    ],
  }
}
```

con

```ts
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
```

- [ ] **Step 4: Il riepilogo dello script conta anche le prenotazioni**

In `scripts/genera-base.ts` sostituire l'ultima riga

```ts
console.log(`Itinerario: ${viaggio.giorni.length} giorni, ${viaggio.giorni.flatMap(g => g.tappe).length} tappe`)
```

con

```ts
console.log(`Itinerario: ${viaggio.giorni.length} giorni, ${viaggio.giorni.flatMap(g => g.tappe).length} tappe, ${viaggio.prenotazioni.length} prenotazioni`)
```

- [ ] **Step 5: Rigenerare i dati di partenza**

Run: `npm run genera-base`
Expected: `Itinerario: 20 giorni, … tappe, 19 prenotazioni`, nessun errore di validazione.

- [ ] **Step 6: Verificare**

Run: `npm test && npx tsc --noEmit`
Expected: PASS (compresi "è aggiornato rispetto allo script", i test nuovi dei dati e `integraDatiDiPartenza`), nessun errore di tipo.

- [ ] **Step 7: Commit**

```bash
git add scripts/revisione-2027.ts scripts/genera-base.ts src/model/operazioni.ts src/model/operazioni.test.ts src/data/itinerario-base.test.ts src/data/itinerario-base.json
git commit -m "Dati di partenza: voli, hotel e biglietti da prenotare, orari dei luoghi principali, avviso sul Tsukiji

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Navigazione a 5 voci e Impostazioni

**Files:**
- Modify: `src/ui/rotta.ts` (riscritto intero), `src/ui/rotta.test.ts` (riscritto intero), `src/ui/TabBar.tsx` (riscritto intero), `src/ui/componenti.tsx`, `src/ui/base.css`, `src/ui/tema.css`, `src/App.tsx` (riscritto intero), `src/schermate/oggi/PrimaDelViaggio.tsx`, `src/schermate/oggi/DuranteIlViaggio.tsx`, `src/schermate/oggi/DopoIlViaggio.tsx`, `src/schermate/programma/Programma.tsx`
- Move: `src/schermate/viaggio/` → `src/schermate/impostazioni/`, `SchermataViaggio.tsx` → `Impostazioni.tsx` (riscritto intero), `PrimoAvvio.tsx` (un testo)
- Create: `src/ui/datiDiPartenza.ts`, `src/schermate/documenti/Documenti.tsx` (provvisoria, la riscrive il Task 8), `src/schermate/spese/Spese.tsx` (provvisoria, la riscrive il Task 10)
- Test: `src/ui/rotta.test.ts`

**Interfaces:**
- Consumes: `integraDatiDiPartenza` (Task 6), `viaggioBase`, `eliminaSeOrfani`, `idAllegati`, `ripristinaAllegati`, `AllegatiBackup` (Task 5).
- Produces (`rotta.ts`): `type Schermata = 'oggi' | 'programma' | 'mappa' | 'documenti' | 'spese' | 'impostazioni'`, `interface Rotta { schermata; indice: number | null; id: string | null }`, `leggiRotta(hash): Rotta`, `reindirizzamento(hash): string | null`, `hrefRotta(s, indice?)`, `hrefDocumento(id: string): string`, `HREF_NUOVA_SPESA = '#/spese/nuova'`, `vai(s, indice?)`, `sostituisciRotta(href: string): void` (cambia rotta senza lasciare un passo nella cronologia, e fa partire `hashchange`), `useRotta()`, `leggiOverride()`.
- Produces (`componenti.tsx`): `LinkImpostazioni()`, `LinkIndietro({ href, etichetta })`.
- Produces (`datiDiPartenza.ts`): `useAggiungiDatiDiPartenza(): () => void`.
- Produces (schermate): `Documenti({ id: string | null })`, `Spese({ id: string | null })`, `Impostazioni()` (default export).

- [ ] **Step 1: Test delle rotte**

Riscrivere `src/ui/rotta.test.ts`:

```ts
import { expect, test } from 'vitest'
import { HREF_NUOVA_SPESA, hrefDocumento, hrefRotta, leggiOverride, leggiRotta, reindirizzamento } from './rotta'

test('leggiRotta', () => {
  expect(leggiRotta('')).toEqual({ schermata: 'oggi', indice: null, id: null })
  expect(leggiRotta('#/programma/7')).toEqual({ schermata: 'programma', indice: 7, id: null })
  expect(leggiRotta('#/mappa')).toEqual({ schermata: 'mappa', indice: null, id: null })
  expect(leggiRotta('#/boh/x')).toEqual({ schermata: 'oggi', indice: null, id: null })
})

test('rotte della fase 2', () => {
  expect(leggiRotta('#/documenti')).toEqual({ schermata: 'documenti', indice: null, id: null })
  expect(leggiRotta('#/documenti/pr-volo%20andata')).toEqual({ schermata: 'documenti', indice: null, id: 'pr-volo andata' })
  expect(leggiRotta('#/spese/nuova')).toEqual({ schermata: 'spese', indice: null, id: 'nuova' })
  expect(leggiRotta('#/impostazioni')).toEqual({ schermata: 'impostazioni', indice: null, id: null })
  expect(leggiRotta('#/viaggio')).toEqual({ schermata: 'impostazioni', indice: null, id: null })
  expect(leggiRotta('#/constructor')).toEqual({ schermata: 'oggi', indice: null, id: null })
  expect(leggiRotta('#/documenti/%E0%A4%A')).toEqual({ schermata: 'documenti', indice: null, id: null })
})

test('la vecchia scheda Viaggio porta alle Impostazioni', () => {
  expect(reindirizzamento('#/viaggio')).toBe('#/impostazioni')
  expect(reindirizzamento('#/viaggio/2')).toBe('#/impostazioni')
  expect(reindirizzamento('#/viaggiatori')).toBeNull()
  expect(reindirizzamento('#/programma/2')).toBeNull()
})

test('hrefRotta, hrefDocumento, nuova spesa', () => {
  expect(hrefRotta('programma', 3)).toBe('#/programma/3')
  expect(hrefRotta('impostazioni')).toBe('#/impostazioni')
  expect(hrefDocumento('pr volo')).toBe('#/documenti/pr%20volo')
  expect(HREF_NUOVA_SPESA).toBe('#/spese/nuova')
})

test('leggiOverride per provare l\'app "durante" il viaggio', () => {
  expect(leggiOverride('?oggi=2027-08-16T10:15')?.toISOString()).toBe('2027-08-16T01:15:00.000Z')
  expect(leggiOverride('?oggi=2027-08-16')?.toISOString()).toBe('2027-08-16T00:00:00.000Z')
  expect(leggiOverride('')).toBeNull()
  expect(leggiOverride('?oggi=boh')).toBeNull()
})
```

Run: `npm test -- src/ui/rotta.test.ts`
Expected: FAIL, `reindirizzamento`, `hrefDocumento` e `HREF_NUOVA_SPESA` non esportati e `id` assente nelle rotte.

- [ ] **Step 2: Riscrivere `src/ui/rotta.ts`**

```ts
import { useSyncExternalStore } from 'react'

export type Schermata = 'oggi' | 'programma' | 'mappa' | 'documenti' | 'spese' | 'impostazioni'
/** `indice`: il giorno (Programma, Mappa). `id`: la prenotazione aperta (Documenti) o "nuova" (Spese). */
export interface Rotta { schermata: Schermata; indice: number | null; id: string | null }
const SCHERMATE: Schermata[] = ['oggi', 'programma', 'mappa', 'documenti', 'spese', 'impostazioni']
/** Rotte vecchie che portano altrove. */
const ALIAS = new Map<string, Schermata>([['viaggio', 'impostazioni']])
export const HREF_NUOVA_SPESA = '#/spese/nuova'

function decodifica(x: string): string | null {
  try {
    return decodeURIComponent(x)
  } catch {
    return null
  }
}

export function leggiRotta(hash: string): Rotta {
  const [, s = '', x] = hash.replace(/^#/, '').split('/')
  const schermata = SCHERMATE.find(k => k === s) ?? ALIAS.get(s) ?? 'oggi'
  const perGiorno = schermata === 'programma' || schermata === 'mappa'
  const indice = perGiorno && x !== undefined && /^\d+$/.test(x) ? Number(x) : null
  const id = !perGiorno && schermata !== 'oggi' && x ? decodifica(x) : null
  return { schermata, indice, id }
}

/** Dove va rimandata una rotta vecchia (#/viaggio → #/impostazioni); null se va bene così. */
export function reindirizzamento(hash: string): string | null {
  return /^#\/viaggio(\/|$)/.test(hash) ? hrefRotta('impostazioni') : null
}

export function hrefRotta(s: Schermata, indice?: number | null): string {
  return `#/${s}${indice != null ? `/${indice}` : ''}`
}

export function hrefDocumento(id: string): string {
  return `#/documenti/${encodeURIComponent(id)}`
}

export function vai(s: Schermata, indice?: number | null): void {
  location.hash = hrefRotta(s, indice)
}

/** Cambia rotta senza lasciare un passo indietro nella cronologia; `hashchange` parte comunque. */
export function sostituisciRotta(href: string): void {
  location.replace(href)
}

function iscrivi(cb: () => void) {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}

export function useRotta(): Rotta {
  return leggiRotta(useSyncExternalStore(iscrivi, () => location.hash))
}

/** `?oggi=2027-08-16T10:15` finge di essere in quel momento (ora di Tokyo). Serve per le prove. */
export function leggiOverride(search: string): Date | null {
  const p = new URLSearchParams(search).get('oggi')
  if (!p) return null
  const d = new Date(p.length === 10 ? `${p}T09:00:00+09:00` : `${p}:00+09:00`)
  return Number.isNaN(d.getTime()) ? null : d
}
```

Run: `npm test -- src/ui/rotta.test.ts`
Expected: PASS.

- [ ] **Step 3: Tab bar a 5 voci — riscrivere `src/ui/TabBar.tsx`**

```tsx
import { CalendarDays, Map as IconaMappa, Sun, Ticket, Wallet } from 'lucide-react'
import { hrefRotta, type Schermata } from './rotta'

const VOCI = [
  { s: 'oggi', etichetta: 'Oggi', Icona: Sun },
  { s: 'programma', etichetta: 'Programma', Icona: CalendarDays },
  { s: 'mappa', etichetta: 'Mappa', Icona: IconaMappa },
  { s: 'documenti', etichetta: 'Documenti', Icona: Ticket },
  { s: 'spese', etichetta: 'Spese', Icona: Wallet },
] as const

export function TabBar({ attiva }: { attiva: Schermata }) {
  // Le impostazioni si aprono da Oggi: la voce accesa resta quella.
  const accesa = attiva === 'impostazioni' ? 'oggi' : attiva
  return (
    <nav className="tabbar" aria-label="Sezioni">
      {VOCI.map(({ s, etichetta, Icona }) => (
        <a key={s} href={hrefRotta(s)} aria-current={s === accesa ? 'page' : undefined}>
          <span className="tabbar-pillola"><Icona size={26} strokeWidth={s === accesa ? 2.2 : 1.8} aria-hidden /></span>
          <span>{etichetta}</span>
        </a>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Stili della barra e del link indietro**

In `src/ui/base.css` sostituire le due regole della tab bar

```css
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; justify-content: space-around;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); background: var(--barra);
  -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px); border-top: 0.5px solid var(--bordo);
}
.tabbar a { flex: 1; max-width: 120px; min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: var(--testo-3); text-decoration: none; font-size: 11px; font-weight: 500; }
.tabbar a[aria-current='page'] { color: var(--tinta-testo); }
```

con

```css
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; justify-content: space-around;
  padding: 0 4px env(safe-area-inset-bottom); background: var(--barra-tab);
  -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px); border-top: 1px solid var(--bordo);
}
.tabbar a {
  flex: 1; min-width: 0; max-width: 120px; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  color: var(--testo-3); text-decoration: none; font-size: 12px; font-weight: 600; line-height: 1.1;
}
.tabbar-pillola { display: flex; align-items: center; justify-content: center; width: 56px; height: 30px; border-radius: 15px; transition: background-color 0.2s ease; }
.tabbar a[aria-current='page'] { color: var(--tinta-testo); }
.tabbar a[aria-current='page'] .tabbar-pillola { background: var(--tinta-tenue); }
.indietro { display: inline-flex; align-items: center; text-decoration: none; padding-left: 0; white-space: nowrap; }
```

In `src/ui/tema.css`, nel blocco chiaro, dopo `  --barra: rgba(251, 248, 242, 0.82);` aggiungere

```css
  --barra-tab: rgba(251, 248, 242, 0.92);
```

e nel blocco scuro, dopo `  --barra: rgba(22, 23, 29, 0.8);` aggiungere

```css
  --barra-tab: rgba(22, 23, 29, 0.92);
```

(La base opaca è la stessa di `SUPERFICI.barra` in `colore.ts`: il contrasto verificato dai test resta valido.)

- [ ] **Step 5: Ingranaggio e link indietro in `src/ui/componenti.tsx`**

Sostituire le prime due righe

```tsx
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
```

con

```tsx
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { hrefRotta } from './rotta'
```

e aggiungere in fondo al file:

```tsx
/** L'ingranaggio in alto a sinistra di Oggi. */
export function LinkImpostazioni() {
  return (
    <a className="pulsante-icona" href={hrefRotta('impostazioni')} aria-label="Impostazioni">
      <Settings size={22} aria-hidden />
    </a>
  )
}

export function LinkIndietro({ href, etichetta }: { href: string; etichetta: string }) {
  return (
    <a className="pulsante-testo indietro" href={href}>
      <ChevronLeft size={22} aria-hidden /> {etichetta}
    </a>
  )
}
```

- [ ] **Step 6: Aggiungere i dati di partenza a chi ha già dati — creare `src/ui/datiDiPartenza.ts`**

```ts
import { toast } from 'sonner'
import { integraDatiDiPartenza } from '../model/operazioni'
import { viaggioBase } from '../store/avvio'
import { useViaggio } from '../store/viaggio'

/** Aggiunge le prenotazioni e gli orari dell'itinerario 2027 che mancano sul telefono; si può annullare. */
export function useAggiungiDatiDiPartenza(): () => void {
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  return () => {
    const esito = integraDatiDiPartenza(useViaggio.getState().viaggio, viaggioBase())
    if (esito.prenotazioni + esito.orari === 0) {
      toast('Ci sono già tutte: niente da aggiungere.')
      return
    }
    applicaAnnullabile(() => esito.viaggio, `Aggiunte ${esito.prenotazioni} prenotazioni e ${esito.orari} orari di apertura`)
  }
}
```

- [ ] **Step 7: Spostare la scheda Viaggio in Impostazioni**

```bash
git mv src/schermate/viaggio src/schermate/impostazioni
git mv src/schermate/impostazioni/SchermataViaggio.tsx src/schermate/impostazioni/Impostazioni.tsx
```

Riscrivere `src/schermate/impostazioni/Impostazioni.tsx`:

```tsx
import { Check, Download, History, ListPlus, Plus, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'
import { dataGiorno, formatoData } from '../../model/date'
import { aggiornaImpostazioni, aggiornaPersona, aggiornaViaggio, aggiungiCitta } from '../../model/operazioni'
import type { Tema, Viaggio } from '../../model/tipi'
import { validaViaggio } from '../../model/validazione'
import { eliminaSeOrfani, idAllegati, ripristinaAllegati } from '../../servizi/allegati'
import { leggiBackup, type AllegatiBackup } from '../../servizi/backup'
import { ERRORE_V1, leggiV1, viaggioBase, viaggioDaV1 } from '../../store/avvio'
import { useViaggio } from '../../store/viaggio'
import { useEsportaBackup } from '../../ui/Backup'
import { BarraNav, Campo, Gruppo, LinkIndietro, Riga, Segmentato, TitoloGrande } from '../../ui/componenti'
import { useAggiungiDatiDiPartenza } from '../../ui/datiDiPartenza'
import { Foglio } from '../../ui/Foglio'
import { useInstallazione } from '../../ui/hook'
import { InvitoInstallazione, IstruzioniInstallazione } from '../../ui/Installazione'
import { hrefRotta } from '../../ui/rotta'
import { EditorCitta } from './EditorCitta'

const TEMI: { valore: Tema; etichetta: string }[] = [
  { valore: 'auto', etichetta: 'Automatico' },
  { valore: 'chiaro', etichetta: 'Washi' },
  { valore: 'scuro', etichetta: 'Notte' },
]

/** Finita la finestra per annullare, gli allegati che il viaggio sostituito usava (e il nuovo no) si cancellano. */
function pulisciDopo(ids: string[]) {
  if (ids.length) setTimeout(() => void eliminaSeOrfani(ids, useViaggio.getState().viaggio), 7000)
}

export default function Impostazioni() {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const esporta = useEsportaBackup()
  const aggiungiPartenza = useAggiungiDatiDiPartenza()
  const { installata, ios } = useInstallazione()
  const file = useRef<HTMLInputElement>(null)
  const [daImportare, setDaImportare] = useState<{ viaggio: Viaggio; allegati: AllegatiBackup } | null>(null)
  const [cittaAperta, setCittaAperta] = useState<string | null>(null)
  const [ripristino, setRipristino] = useState(false)
  // La chiave vecchia non cambia mai mentre l'app è aperta: basta leggerla una volta.
  const [v1] = useState(() => {
    try { return leggiV1(localStorage) } catch { return null }
  })
  const ultimo = viaggio.impostazioni.ultimoBackup

  const importa = async (f: File | undefined) => {
    if (!f) return
    let testo: string
    try {
      testo = await f.text()
    } catch {
      toast('Non riesco a leggere il file.')
      if (file.current) file.current.value = ''
      return
    }
    const esito = leggiBackup(testo)
    if (!esito.ok) toast(esito.errore)
    else setDaImportare({ viaggio: esito.viaggio, allegati: esito.allegati })
    if (file.current) file.current.value = ''
  }
  const confermaImportazione = async () => {
    if (!daImportare) return
    const { viaggio: nuovo, allegati } = daImportare
    setDaImportare(null)
    const vecchi = idAllegati(useViaggio.getState().viaggio)
    try {
      await ripristinaAllegati(allegati)
    } catch {
      toast("Gli allegati del backup non entrano nello spazio del telefono: importo solo l'itinerario.")
    }
    applicaAnnullabile(() => nuovo, 'Backup importato')
    pulisciDopo(vecchi)
  }
  const ripristina = () => {
    const vecchi = idAllegati(viaggio)
    applicaAnnullabile(() => viaggioBase(), 'Itinerario ripristinato')
    setRipristino(false)
    pulisciDopo(vecchi)
  }
  const nuovaCitta = () => {
    const { viaggio: n, id } = aggiungiCitta(viaggio, { nome: 'Nuova città', kanji: '', romaji: '', colore: '#8E8E93', lat: 36.2, lng: 138.2, intro: '', clima: { max: 31, min: 24 } })
    applica(() => n)
    setCittaAperta(id)
  }
  const recuperaV1 = () => {
    if (!v1) return
    let esito: ReturnType<typeof validaViaggio>
    try {
      esito = validaViaggio(viaggioDaV1(v1))
    } catch {
      toast(ERRORE_V1)
      return
    }
    if (!esito.ok) { toast(ERRORE_V1); return }
    const recuperato = esito.viaggio
    applicaAnnullabile(() => recuperato, 'Modifiche vecchie recuperate')
  }

  return (
    <div className="schermata">
      <BarraNav titolo="Impostazioni" sinistra={<LinkIndietro href={hrefRotta('oggi')} etichetta="Oggi" />} />
      <TitoloGrande>Impostazioni</TitoloGrande>

      <Gruppo titolo="Il viaggio" piede="Cambiando la data del primo giorno, tutte le date si spostano insieme.">
        <div style={{ padding: '4px 16px 8px' }}>
          <Campo etichetta="Titolo"><input value={viaggio.titolo} onChange={e => applica(v => aggiornaViaggio(v, { titolo: e.target.value }))} /></Campo>
          <Campo etichetta={`Primo giorno (G0) · ultimo: ${viaggio.giorni.length ? formatoData(dataGiorno(viaggio, viaggio.giorni.length - 1), 'lungo') : '—'}`}>
            <input type="date" value={viaggio.dataPartenza} onChange={e => e.target.value && applica(v => aggiornaViaggio(v, { dataPartenza: e.target.value }))} />
          </Campo>
          {viaggio.persone.map((p, i) => (
            <Campo key={p.id} etichetta={`Persona ${i + 1}`}><input value={p.nome} onChange={e => applica(v => aggiornaPersona(v, p.id, e.target.value))} /></Campo>
          ))}
        </div>
      </Gruppo>

      <Gruppo titolo="Aspetto">
        <div style={{ padding: 12 }}>
          <Segmentato etichetta="Tema" valore={viaggio.impostazioni.tema} opzioni={TEMI} onCambia={tema => applica(v => aggiornaImpostazioni(v, { tema }))} />
        </div>
      </Gruppo>

      <Gruppo titolo="Città">
        {viaggio.citta.map(c => (
          <Riga key={c.id} icona={<span style={{ width: 14, height: 14, borderRadius: 7, background: c.colore, display: 'block' } as CSSProperties} />}
            titolo={<>{c.nome} <span className="kanji testo-2">{c.kanji}</span></>}
            sottotitolo={`${viaggio.giorni.filter(g => g.cittaId === c.id).length} giorni`} onClick={() => setCittaAperta(c.id)} />
        ))}
        <Riga icona={<Plus size={20} />} titolo="Aggiungi città" onClick={nuovaCitta} destra={null} />
      </Gruppo>

      <Gruppo titolo="Dati" piede={ultimo ? `Ultimo backup: ${new Date(ultimo).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Nessun backup ancora.'}>
        <Riga icona={<Download size={20} />} titolo="Salva o condividi un backup" sottotitolo="Con gli allegati: anche per mandare tutto agli altri" onClick={() => void esporta()} />
        <Riga icona={<Upload size={20} />} titolo="Importa un backup" onClick={() => file.current?.click()} />
        <Riga icona={<ListPlus size={20} />} titolo="Aggiungi prenotazioni e orari del 2027" sottotitolo="Solo quelli che mancano su questo telefono" onClick={aggiungiPartenza} />
        {v1 && <Riga icona={<History size={20} />} titolo="Recupera le modifiche della versione vecchia" onClick={recuperaV1} />}
        <Riga icona={<RotateCcw size={20} />} titolo="Ripristina l'itinerario 2027" pericolo onClick={() => setRipristino(true)} />
      </Gruppo>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => void importa(e.target.files?.[0])} />

      {installata
        ? <Gruppo titolo="App"><Riga icona={<Check size={20} />} titolo="Installata sulla Home" /></Gruppo>
        : <><InvitoInstallazione /><Gruppo titolo="Come si installa"><div style={{ padding: '8px 16px' }}><IstruzioniInstallazione ios={ios} /></div></Gruppo></>}

      <p className="testo-3" style={{ margin: '24px 16px' }}>
        Mappe © OpenStreetMap · Meteo Open-Meteo · Foto Wikipedia e Wikimedia Commons · Ricerca luoghi Nominatim · Cambio BCE via Frankfurter · Orari OpenStreetMap via Overpass
      </p>

      <EditorCitta cittaId={cittaAperta} onChiudi={() => setCittaAperta(null)} />
      <Foglio aperto={!!daImportare} onChiudi={() => setDaImportare(null)} titolo="Importa backup">
        {daImportare && (
          <>
            <p style={{ margin: '8px 0' }}><strong>{daImportare.viaggio.titolo}</strong></p>
            <p className="testo-2" style={{ marginBottom: 16 }}>
              {daImportare.viaggio.giorni.length} giorni dal {formatoData(daImportare.viaggio.dataPartenza, 'lungo')}
              {Object.keys(daImportare.allegati).length > 0 && `, con ${Object.keys(daImportare.allegati).length} allegati`}.
              {' '}Sostituisce l'itinerario su questo telefono (si può annullare subito dopo).
            </p>
            <button type="button" className="pulsante primario largo" onClick={() => void confermaImportazione()}>Importa</button>
          </>
        )}
      </Foglio>
      <Foglio aperto={ripristino} onChiudi={() => setRipristino(false)} titolo="Ripristina l'itinerario 2027">
        <p className="testo-2" style={{ margin: '8px 0 16px' }}>Sostituisce l'itinerario su questo telefono (si può annullare subito dopo).</p>
        <button type="button" className="pulsante primario largo" onClick={ripristina}>Ripristina</button>
      </Foglio>
    </div>
  )
}
```

In `src/schermate/impostazioni/PrimoAvvio.tsx` sostituire

```tsx
Potrai cambiare idea da Viaggio → Dati.
```

con

```tsx
Potrai cambiare idea da Impostazioni → Dati.
```

- [ ] **Step 8: Schermate provvisorie di Documenti e Spese**

Creare `src/schermate/documenti/Documenti.tsx` (il Task 8 la riscrive):

```tsx
import { BarraNav, TitoloGrande, Vuoto } from '../../ui/componenti'

export default function Documenti({ id }: { id: string | null }) {
  return (
    <div className="schermata">
      <BarraNav titolo="Documenti" />
      <TitoloGrande>Documenti</TitoloGrande>
      <Vuoto titolo="Prenotazioni" testo={id ? `Prenotazione ${id}` : 'Voli, hotel, treni e biglietti, con i QR offline.'} />
    </div>
  )
}
```

Creare `src/schermate/spese/Spese.tsx` (il Task 10 la riscrive):

```tsx
import { BarraNav, TitoloGrande, Vuoto } from '../../ui/componenti'

export default function Spese({ id }: { id: string | null }) {
  return (
    <div className="schermata">
      <BarraNav titolo="Spese" />
      <TitoloGrande>Spese</TitoloGrande>
      <Vuoto titolo={id === 'nuova' ? 'Nuova spesa' : 'Spese'} testo="Chi ha pagato, quanto, per chi; e chi deve a chi." />
    </div>
  )
}
```

- [ ] **Step 9: Rotte nuove in `src/App.tsx`** — riscrivere il file:

```tsx
import { useEffect, useLayoutEffect } from 'react'
import { Toaster } from 'sonner'
import { faseViaggio } from './model/adesso'
import { coloreSicuro } from './model/mappa'
import { cittaDi } from './model/riepilogo'
import Documenti from './schermate/documenti/Documenti'
import Impostazioni from './schermate/impostazioni/Impostazioni'
import { PrimoAvvio } from './schermate/impostazioni/PrimoAvvio'
import Mappa from './schermate/mappa/Mappa'
import Oggi from './schermate/oggi/Oggi'
import Programma from './schermate/programma/Programma'
import Spese from './schermate/spese/Spese'
import { useViaggio } from './store/viaggio'
import { calcolaTinta } from './ui/colore'
import { useAdesso, useTemaRisolto } from './ui/hook'
import { reindirizzamento, sostituisciRotta, useRotta } from './ui/rotta'
import { TabBar } from './ui/TabBar'

export default function App() {
  const rotta = useRotta()
  const viaggio = useViaggio(s => s.viaggio)
  const tema = useTemaRisolto(viaggio.impostazioni.tema)
  const adesso = useAdesso(60_000)
  const fase = faseViaggio(viaggio, adesso)

  // Il colore dei controlli è quello della città del giorno che si sta guardando (o di oggi).
  const indice = Math.min(rotta.indice ?? (fase.fase === 'durante' ? fase.indice : 0), viaggio.giorni.length - 1)
  const giorno = viaggio.giorni[indice]
  const colore = coloreSicuro(giorno ? cittaDi(viaggio, giorno).colore : '#C8452C')

  // #/viaggio (fase 1) porta a #/impostazioni.
  useEffect(() => {
    const altrove = reindirizzamento(location.hash)
    if (altrove) sostituisciRotta(altrove)
  })

  useLayoutEffect(() => {
    const r = document.documentElement
    r.dataset.tema = tema
    const t = calcolaTinta(colore, tema)
    r.style.setProperty('--tinta', colore)
    r.style.setProperty('--tinta-forte', t.forte)
    r.style.setProperty('--su-tinta', t.suForte)
    r.style.setProperty('--tinta-testo', t.testo)
    r.style.setProperty('--tinta-tenue', t.tenue)
  }, [tema, colore])

  return (
    <>
      {rotta.schermata === 'oggi' && <Oggi />}
      {rotta.schermata === 'programma' && <Programma indice={rotta.indice} />}
      {rotta.schermata === 'mappa' && <Mappa indice={rotta.indice} />}
      {rotta.schermata === 'documenti' && <Documenti id={rotta.id} />}
      {rotta.schermata === 'spese' && <Spese id={rotta.id} />}
      {rotta.schermata === 'impostazioni' && <Impostazioni />}
      <TabBar attiva={rotta.schermata} />
      <PrimoAvvio />
      <Toaster position="top-center" theme={tema === 'scuro' ? 'dark' : 'light'} offset="calc(12px + env(safe-area-inset-top))" />
    </>
  )
}
```

- [ ] **Step 10: Ingranaggio in Oggi e testo del Programma vuoto**

In `src/schermate/oggi/PrimaDelViaggio.tsx` sostituire

```tsx
import { BarraNav, Gruppo, Riga, TitoloGrande } from '../../ui/componenti'
```

con

```tsx
import { BarraNav, Gruppo, LinkImpostazioni, Riga, TitoloGrande } from '../../ui/componenti'
```

e `      <BarraNav titolo="Oggi" />` con `      <BarraNav titolo="Oggi" sinistra={<LinkImpostazioni />} />`.

In `src/schermate/oggi/DopoIlViaggio.tsx` sostituire

```tsx
import { BarraNav, TitoloGrande } from '../../ui/componenti'
```

con

```tsx
import { BarraNav, LinkImpostazioni, TitoloGrande } from '../../ui/componenti'
```

e `      <BarraNav titolo="Oggi" />` con `      <BarraNav titolo="Oggi" sinistra={<LinkImpostazioni />} />`.

In `src/schermate/oggi/DuranteIlViaggio.tsx` sostituire

```tsx
import { BarraNav, Gruppo, Riga, TitoloGrande } from '../../ui/componenti'
```

con

```tsx
import { BarraNav, Gruppo, LinkImpostazioni, Riga, TitoloGrande } from '../../ui/componenti'
```

e

```tsx
      <BarraNav titolo={`${citta.nome} · G${indice}`} />
```

con

```tsx
      <BarraNav titolo={`${citta.nome} · G${indice}`} sinistra={<LinkImpostazioni />} />
```

In `src/schermate/programma/Programma.tsx` sostituire `'Aggiungi prima una città in Viaggio.'` con `'Aggiungi prima una città in Impostazioni.'`.

- [ ] **Step 11: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita (nessun import rimasto verso `schermate/viaggio/`).

Nella preview (375×812, chiaro e scuro):
- La tab bar ha 5 voci **Oggi · Programma · Mappa · Documenti · Spese**, etichette intere senza tagli né a capo, icone più grandi; dietro l'icona attiva una pillola colorata col tenue della città; bordo superiore visibile; sotto la barra il contenuto si intravede appena (opacità 0.92).
- In scuro, le etichette inattive si leggono bene sul fondo della barra e l'etichetta attiva ha il colore della città.
- Oggi (`#/oggi`, anche con `?oggi=2027-08-16T10:15`): ingranaggio in alto a sinistra, area di tocco 44 px; porta a `#/impostazioni`.
- Impostazioni: "‹ Oggi" in alto a sinistra torna a Oggi; nella tab bar resta accesa Oggi; c'è la riga "Aggiungi prenotazioni e orari del 2027": su un telefono con i dati della fase 1 aggiunge e mostra "Aggiunte 19 prenotazioni e 12 orari di apertura" con "Annulla"; toccata una seconda volta dice "Ci sono già tutte".
- Aprendo `/jap-itinerario/#/viaggio` l'indirizzo diventa `#/impostazioni` e il tasto indietro del browser non torna a `#/viaggio`.
- `#/documenti`, `#/documenti/qualcosa`, `#/spese`, `#/spese/nuova` mostrano le schermate provvisorie senza errori in console.
- Nessuno scroll orizzontale della pagina a 375 px.

- [ ] **Step 12: Commit**

```bash
git add src/ui/rotta.ts src/ui/rotta.test.ts src/ui/TabBar.tsx src/ui/componenti.tsx src/ui/base.css src/ui/tema.css src/ui/datiDiPartenza.ts src/App.tsx src/schermate/impostazioni src/schermate/documenti/Documenti.tsx src/schermate/spese/Spese.tsx src/schermate/oggi/PrimaDelViaggio.tsx src/schermate/oggi/DuranteIlViaggio.tsx src/schermate/oggi/DopoIlViaggio.tsx src/schermate/programma/Programma.tsx
git commit -m "Tab bar a cinque voci più visibile, Impostazioni dall'ingranaggio di Oggi, rotte di documenti e spese

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Documenti — elenco, dettaglio, visualizzatore, editor

**Files:**
- Modify: `src/model/prenotazioni.ts` (riscritto intero), `src/model/prenotazioni.test.ts`, `src/ui/icone.ts`, `src/ui/componenti.tsx` (Badge "pericolo"), `src/ui/base.css`, `src/ui/tema.css`
- Create: `src/ui/copia.ts`, `src/ui/scorrimento.ts`, `src/schermate/documenti/DettaglioDocumento.tsx`, `src/schermate/documenti/Allegati.tsx`, `src/schermate/documenti/EditorPrenotazione.tsx`, `src/schermate/documenti/FoglioPrenotazione.tsx`, `src/schermate/documenti/documenti.css`
- Modify: `src/schermate/documenti/Documenti.tsx` (riscritto intero, sostituisce la provvisoria)
- Test: `src/model/prenotazioni.test.ts`, `src/ui/scorrimento.test.ts`

**Interfaces:**
- Consumes: `notteCoperta` (Task 4), `utcDaLocale` (Task 1), `salvaAllegato`, `eliminaSeOrfani`, `archivioIndexedDb` (Task 5), `leggiImporto`, `formatoImporto`, `formatoNumero` (Task 2), `hrefDocumento`, `hrefRotta`, `vai`, `LinkIndietro` (Task 7), `useAggiungiDatiDiPartenza` (Task 7), `CercaLuogo`, `Foglio`, `Gruppo`, `Riga`, `Segmentato`, `Campo`.
- Produces (`prenotazioni.ts`, oltre a `notteCoperta`): `nuovaPrenotazione(tipo?): Prenotazione`, `aggiungiPrenotazione(v, p)`, `sostituisciPrenotazione(v, p)`, `aggiornaPrenotazione(v, id, modifiche)`, `eliminaPrenotazione(v, id)`, `controllaPrenotazione(p): string[]`, `type Scadenza = 'scaduta' | 'vicina' | 'lontana'`, `scadenza(p, oggi): Scadenza | null`, `interface GruppoDocumenti { tipo; voci }`, `gruppiDocumenti(ps): GruppoDocumenti[]`, `etichettaFuso(fuso): string`, `descriviIstante(locale, fuso): string`, `descriviQuando(p): string`, `etichetteDate(tipo): [string, string]`, `tappaCollegata(v, tappaId?): { indice: number; tappa: Tappa } | null`.
- Produces (ui): `copia(testo: string): void` (toast "Copiato"); `type Verso = 'destra' | 'sinistra'`, `direzioneGesto(dx, dy): 'orizzontale' | 'verticale' | null`, `versoScattato(dx, soglia, versi): Verso | null`, `riduciMovimento(): boolean`, `useScorrimento({ versi, soglia, attivo?, onScatta }): { gestori; dx: number; oltre: boolean }`; `ICONA_PRENOTAZIONE`, `ETICHETTA_PRENOTAZIONE`, `GRUPPO_PRENOTAZIONE`; `Badge` accetta `tono="pericolo"`.
- Produces (schermate): `DettaglioDocumento({ id })`, `GrigliaAllegati({ allegati, onTogli? })`, `useUrlAllegato(id)`, `EditorPrenotazione(...)`, `FoglioPrenotazione({ aperto, iniziale: Prenotazione | null, onChiudi, onSalvata?: (id: string) => void, onEliminata?: () => void })`, `Documenti({ id })`.

- [ ] **Step 1: Test delle operazioni e descrizioni delle prenotazioni**

In `src/model/prenotazioni.test.ts` sostituire le prime tre righe

```ts
import { describe, expect, test } from 'vitest'
import { prenotazioneDiProva as p, viaggioDiProva } from './fixture'
import { notteCoperta } from './prenotazioni'
```

con

```ts
import { describe, expect, test } from 'vitest'
import { giornoDiProva, prenotazioneDiProva as p, tappaDiProva, viaggioDiProva } from './fixture'
import {
  aggiornaPrenotazione, aggiungiPrenotazione, controllaPrenotazione, descriviIstante, descriviQuando, eliminaPrenotazione,
  etichetteDate, gruppiDocumenti, notteCoperta, nuovaPrenotazione, scadenza, sostituisciPrenotazione, tappaCollegata,
} from './prenotazioni'
```

e aggiungere in fondo al file:

```ts
describe('operazioni', () => {
  test('nuova, aggiungi, sostituisci, aggiorna, elimina', () => {
    const n = nuovaPrenotazione('hotel')
    expect(n).toMatchObject({ tipo: 'hotel', titolo: '', stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [] })
    expect(n.id).toMatch(/^pr-/)
    const v = aggiungiPrenotazione(viaggioDiProva(), { ...n, titolo: 'Hotel' })
    expect(v.prenotazioni.map(x => x.titolo)).toEqual(['Hotel'])
    expect(sostituisciPrenotazione(v, { ...n, titolo: 'Ryokan' }).prenotazioni[0].titolo).toBe('Ryokan')
    expect(aggiornaPrenotazione(v, n.id, { stato: 'prenotata', codice: 'X1' }).prenotazioni[0]).toMatchObject({ titolo: 'Hotel', stato: 'prenotata', codice: 'X1' })
    expect(eliminaPrenotazione(v, n.id).prenotazioni).toEqual([])
    expect(() => aggiornaPrenotazione(v, 'boh', {})).toThrow('prenotazione boh')
  })
})

describe('controllaPrenotazione', () => {
  test('titolo obbligatorio', () => {
    expect(controllaPrenotazione(p({ id: 'a', titolo: '  ' }))).toEqual(['Scrivi un titolo.'])
  })
  test('fine prima dell\'inizio, confrontate ognuna nel suo fuso', () => {
    const volo = p({ id: 'v', tipo: 'volo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome', fine: '2027-08-08T14:00', fusoFine: 'Asia/Tokyo' })
    expect(controllaPrenotazione(volo)).toEqual([])
    // Le 07:00 di Tokyo del 7 agosto sono la mezzanotte di Roma: prima della partenza delle 12:30.
    expect(controllaPrenotazione({ ...volo, fine: '2027-08-07T07:00' })).toEqual(["La fine è prima dell'inizio."])
    expect(controllaPrenotazione(p({ id: 'h', tipo: 'hotel', inizio: '2027-08-15T15:00', fine: '2027-08-15T10:00' }))).toEqual(['Il check-out è prima del check-in.'])
  })
  test('una fine senza inizio', () => {
    expect(controllaPrenotazione(p({ id: 'h', tipo: 'hotel', fine: '2027-08-15T10:00' }))).toEqual(['Manca il check-in.'])
  })
})

describe('scadenza', () => {
  const entro = p({ id: 'a', daPrenotareEntro: '2027-07-15' })
  test('vicina da 7 giorni prima, poi scaduta', () => {
    expect(scadenza(entro, '2027-07-07')).toBe('lontana')
    expect(scadenza(entro, '2027-07-08')).toBe('vicina')
    expect(scadenza(entro, '2027-07-15')).toBe('vicina')
    expect(scadenza(entro, '2027-07-16')).toBe('scaduta')
  })
  test('niente scadenza se è già prenotata o manca la data', () => {
    expect(scadenza({ ...entro, stato: 'prenotata' }, '2027-07-16')).toBeNull()
    expect(scadenza(p({ id: 'b' }), '2027-07-16')).toBeNull()
  })
})

test('gruppiDocumenti: per tipo, da prenotare in cima, poi in ordine di inizio', () => {
  const g = gruppiDocumenti([
    p({ id: 'h2', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-15T15:00' }),
    p({ id: 'b1', inizio: '2027-08-09T11:15' }),
    p({ id: 'h1', tipo: 'hotel', stato: 'prenotata', inizio: '2027-08-08T15:00' }),
    p({ id: 'h3', tipo: 'hotel', inizio: '2027-08-20T15:00' }),
    p({ id: 'v1', tipo: 'volo', inizio: '2027-08-27T20:00', daPrenotareEntro: '2027-06-01' }),
    p({ id: 'v2', tipo: 'volo', inizio: '2027-08-07T12:30' }),
  ])
  expect(g.map(x => [x.tipo, x.voci.map(v => v.id)])).toEqual([
    ['volo', ['v1', 'v2']],
    ['hotel', ['h3', 'h1', 'h2']],
    ['biglietto', ['b1']],
  ])
})

describe('descrizioni', () => {
  test('descriviIstante nel fuso della prenotazione', () => {
    expect(descriviIstante('2027-08-07T12:30', 'Europe/Rome')).toBe('sab 7 ago · 12:30 ora italiana')
    expect(descriviIstante('2027-08-09T11:15', 'Asia/Tokyo')).toBe('lun 9 ago · 11:15')
    expect(descriviIstante('2027-08-09T11:15', 'America/New_York')).toBe('lun 9 ago · 11:15 America/New_York')
  })
  test('descriviQuando', () => {
    expect(descriviQuando(p({ id: 'v', tipo: 'volo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome' }))).toBe('sab 7 ago · 12:30 ora italiana')
    expect(descriviQuando(p({ id: 'h', tipo: 'hotel', inizio: '2027-08-15T15:00', fine: '2027-08-20T10:00' }))).toBe('dom 15 ago → ven 20 ago')
    expect(descriviQuando(p({ id: 'x' }))).toBe('')
  })
  test('etichetteDate', () => {
    expect(etichetteDate('hotel')).toEqual(['Check-in', 'Check-out'])
    expect(etichetteDate('volo')).toEqual(['Partenza', 'Arrivo'])
    expect(etichetteDate('biglietto')).toEqual(['Inizio', 'Fine'])
  })
})

test('tappaCollegata', () => {
  const v = viaggioDiProva({ giorni: [giornoDiProva({ id: 'g0' }), giornoDiProva({ id: 'g1', tappe: [tappaDiProva({ id: 't1', titolo: 'Skytree' })] })] })
  expect(tappaCollegata(v, 't1')).toMatchObject({ indice: 1, tappa: { titolo: 'Skytree' } })
  expect(tappaCollegata(v, 'z')).toBeNull()
  expect(tappaCollegata(v, undefined)).toBeNull()
})
```

Creare `src/ui/scorrimento.test.ts`:

```ts
import { expect, test } from 'vitest'
import { direzioneGesto, versoScattato } from './scorrimento'

test('direzioneGesto: orizzontale solo se |dx| > 2|dy|, dopo 10 px', () => {
  expect(direzioneGesto(5, 3)).toBeNull()
  expect(direzioneGesto(30, 10)).toBe('orizzontale')
  expect(direzioneGesto(30, 15)).toBe('verticale')
  expect(direzioneGesto(-40, 5)).toBe('orizzontale')
  expect(direzioneGesto(2, 40)).toBe('verticale')
})

test('versoScattato: oltre la soglia e in un verso ammesso', () => {
  expect(versoScattato(80, 72, ['destra'])).toBe('destra')
  expect(versoScattato(72, 72, ['destra'])).toBeNull()
  expect(versoScattato(-100, 72, ['destra'])).toBeNull()
  expect(versoScattato(-100, 96, ['sinistra'])).toBe('sinistra')
  expect(versoScattato(-100, 60, ['destra', 'sinistra'])).toBe('sinistra')
})
```

Run: `npm test -- src/model/prenotazioni.test.ts src/ui/scorrimento.test.ts`
Expected: FAIL, le funzioni nuove non sono esportate e `./scorrimento` non si risolve.

- [ ] **Step 2: Riscrivere `src/model/prenotazioni.ts`**

```ts
import { differenzaGiorni, formatoData } from './date'
import { utcDaLocale } from './fusi'
import { nuovoId } from './id'
import { TIPI_PRENOTAZIONE, type Prenotazione, type Tappa, type TipoPrenotazione, type Viaggio } from './tipi'

/**
 * L'hotel prenotato che copre la notte di `data`: dal giorno del check-in al giorno prima del check-out.
 * Se due si sovrappongono vince quello col check-in più recente. Senza prenotazione, chi chiama usa `Giorno.alloggio`.
 */
export function notteCoperta(v: Viaggio, data: string): Prenotazione | null {
  const coprono = v.prenotazioni.filter(p =>
    p.tipo === 'hotel' && p.stato === 'prenotata' && p.inizio && p.fine
    && p.inizio.slice(0, 10) <= data && data < p.fine.slice(0, 10))
  coprono.sort((a, b) => (a.inizio! < b.inizio! ? 1 : -1))
  return coprono[0] ?? null
}

export function nuovaPrenotazione(tipo: TipoPrenotazione = 'biglietto'): Prenotazione {
  return { id: nuovoId('pr'), tipo, titolo: '', stato: 'da-prenotare', fuso: 'Asia/Tokyo', note: '', allegati: [] }
}

function conPrenotazione(v: Viaggio, id: string, fn: (p: Prenotazione) => Prenotazione): Viaggio {
  if (!v.prenotazioni.some(p => p.id === id)) throw new Error(`prenotazione ${id} inesistente`)
  return { ...v, prenotazioni: v.prenotazioni.map(p => (p.id === id ? fn(p) : p)) }
}

export function aggiungiPrenotazione(v: Viaggio, p: Prenotazione): Viaggio {
  return { ...v, prenotazioni: [...v.prenotazioni, p] }
}

export function sostituisciPrenotazione(v: Viaggio, p: Prenotazione): Viaggio {
  return conPrenotazione(v, p.id, () => p)
}

export function aggiornaPrenotazione(v: Viaggio, id: string, modifiche: Partial<Omit<Prenotazione, 'id'>>): Viaggio {
  return conPrenotazione(v, id, p => ({ ...p, ...modifiche }))
}

export function eliminaPrenotazione(v: Viaggio, id: string): Viaggio {
  return { ...v, prenotazioni: v.prenotazioni.filter(p => p.id !== id) }
}

/** "Check-in"/"Check-out" per gli hotel, "Partenza"/"Arrivo" per voli e treni, altrimenti "Inizio"/"Fine". */
export function etichetteDate(tipo: TipoPrenotazione): [string, string] {
  if (tipo === 'hotel') return ['Check-in', 'Check-out']
  if (tipo === 'volo' || tipo === 'treno') return ['Partenza', 'Arrivo']
  return ['Inizio', 'Fine']
}

/** I messaggi in linea dell'editor. Le date si confrontano come istanti, ognuna nel suo fuso. */
export function controllaPrenotazione(p: Prenotazione): string[] {
  const e: string[] = []
  const hotel = p.tipo === 'hotel'
  if (!p.titolo.trim()) e.push('Scrivi un titolo.')
  if (p.fine && !p.inizio) e.push(hotel ? 'Manca il check-in.' : "Manca l'inizio.")
  if (p.inizio && p.fine && utcDaLocale(p.fine, p.fusoFine ?? p.fuso).getTime() < utcDaLocale(p.inizio, p.fuso).getTime()) {
    e.push(hotel ? 'Il check-out è prima del check-in.' : "La fine è prima dell'inizio.")
  }
  return e
}

export type Scadenza = 'scaduta' | 'vicina' | 'lontana'

/** Per le prenotazioni ancora da fare con una data limite: "vicina" da 7 giorni prima, poi "scaduta". */
export function scadenza(p: Prenotazione, oggi: string): Scadenza | null {
  if (p.stato !== 'da-prenotare' || !p.daPrenotareEntro) return null
  const d = differenzaGiorni(oggi, p.daPrenotareEntro)
  return d < 0 ? 'scaduta' : d <= 7 ? 'vicina' : 'lontana'
}

/** Confronto di testi dove quello che manca va in fondo. */
function confronta(a: string | undefined, b: string | undefined): number {
  if (a === b) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return a < b ? -1 : 1
}

export interface GruppoDocumenti { tipo: TipoPrenotazione; voci: Prenotazione[] }

/** Un gruppo per tipo; in ognuno prima le "da prenotare" (per scadenza), poi le prenotate, in ordine di inizio. */
export function gruppiDocumenti(ps: Prenotazione[]): GruppoDocumenti[] {
  const ordina = (a: Prenotazione, b: Prenotazione) =>
    (a.stato === b.stato ? 0 : a.stato === 'da-prenotare' ? -1 : 1)
    || (a.stato === 'da-prenotare' ? confronta(a.daPrenotareEntro, b.daPrenotareEntro) : 0)
    || confronta(a.inizio, b.inizio)
    || confronta(a.titolo, b.titolo)
  return TIPI_PRENOTAZIONE
    .map(tipo => ({ tipo, voci: ps.filter(p => p.tipo === tipo).sort(ordina) }))
    .filter(g => g.voci.length > 0)
}

const NOMI_FUSO = new Map([['Asia/Tokyo', ''], ['Europe/Rome', 'ora italiana']])

/** Niente per l'ora del Giappone, "ora italiana" per Roma, il nome IANA per gli altri. */
export function etichettaFuso(fuso: string): string {
  return NOMI_FUSO.get(fuso) ?? fuso
}

/** "sab 7 ago · 12:30 ora italiana". */
export function descriviIstante(locale: string, fuso: string): string {
  const f = etichettaFuso(fuso)
  return `${formatoData(locale.slice(0, 10), 'breve')} · ${locale.slice(11, 16)}${f ? ` ${f}` : ''}`
}

/** La riga dell'elenco: data e ora nel fuso della prenotazione; per gli hotel, check-in → check-out. */
export function descriviQuando(p: Prenotazione): string {
  if (!p.inizio) return ''
  if (p.tipo === 'hotel' && p.fine) return `${formatoData(p.inizio.slice(0, 10), 'breve')} → ${formatoData(p.fine.slice(0, 10), 'breve')}`
  return descriviIstante(p.inizio, p.fuso)
}

export function tappaCollegata(v: Viaggio, tappaId: string | undefined): { indice: number; tappa: Tappa } | null {
  if (!tappaId) return null
  for (const [indice, g] of v.giorni.entries()) {
    const tappa = g.tappe.find(t => t.id === tappaId)
    if (tappa) return { indice, tappa }
  }
  return null
}
```

- [ ] **Step 3: Implementare `src/ui/scorrimento.ts`**

```ts
import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'

export type Verso = 'destra' | 'sinistra'
export type Direzione = 'orizzontale' | 'verticale'

/** Dopo 10 px di movimento: orizzontale se |dx| > 2|dy|; altrimenti verticale, e lo scorrimento resta al browser. */
export function direzioneGesto(dx: number, dy: number): Direzione | null {
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return null
  return Math.abs(dx) > 2 * Math.abs(dy) ? 'orizzontale' : 'verticale'
}

/** Il verso in cui `dx` ha superato la soglia, se è fra quelli ammessi. */
export function versoScattato(dx: number, soglia: number, versi: readonly Verso[]): Verso | null {
  const verso: Verso | null = dx > soglia ? 'destra' : dx < -soglia ? 'sinistra' : null
  return verso && versi.includes(verso) ? verso : null
}

export const riduciMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches

interface Opzioni { versi: readonly Verso[]; soglia: number; attivo?: boolean; onScatta: (verso: Verso) => void }

/**
 * Scorrimento orizzontale su un elemento: `dx` segue il dito (solo nei versi ammessi) e `oltre` dice se, rilasciando,
 * il gesto scatta. Il click che segue un gesto viene assorbito. L'elemento deve avere `touch-action: pan-y`.
 * Non parte dalla maniglia di riordino né dai campi di testo.
 */
export function useScorrimento({ versi, soglia, attivo = true, onScatta }: Opzioni) {
  const inizio = useRef<{ x: number; y: number; id: number } | null>(null)
  const direzione = useRef<Direzione | null>(null)
  const appenaScorso = useRef(false)
  const [dx, setDx] = useState(0)
  const limita = (x: number) => (versi.includes('destra') ? (versi.includes('sinistra') ? x : Math.max(0, x)) : Math.min(0, x))
  const ferma = () => {
    inizio.current = null
    direzione.current = null
    setDx(0)
  }
  const gestori = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!attivo || e.button !== 0) return
      if ((e.target as Element).closest('.maniglia, input, textarea, select')) return
      inizio.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
      direzione.current = null
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = inizio.current
      if (!s || s.id !== e.pointerId) return
      const mx = e.clientX - s.x
      if (direzione.current === null) {
        direzione.current = direzioneGesto(mx, e.clientY - s.y)
        if (direzione.current === 'verticale') { ferma(); return }
        if (direzione.current === 'orizzontale') e.currentTarget.setPointerCapture?.(e.pointerId)
      }
      if (direzione.current === 'orizzontale') setDx(limita(mx))
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const s = inizio.current
      if (s && direzione.current === 'orizzontale') {
        appenaScorso.current = true
        setTimeout(() => { appenaScorso.current = false }, 0)
        const verso = versoScattato(limita(e.clientX - s.x), soglia, versi)
        if (verso) {
          navigator.vibrate?.(10)
          onScatta(verso)
        }
      }
      ferma()
    },
    onPointerCancel: () => ferma(),
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (!appenaScorso.current) return
      e.preventDefault()
      e.stopPropagation()
      appenaScorso.current = false
    },
  }
  return { gestori, dx, oltre: versoScattato(dx, soglia, versi) !== null }
}
```

Run: `npm test -- src/model/prenotazioni.test.ts src/ui/scorrimento.test.ts`
Expected: PASS.

- [ ] **Step 4: Copiare con un tocco — creare `src/ui/copia.ts`**

```ts
import { toast } from 'sonner'

/** Copia negli appunti e lo dice con "Copiato"; senza clipboard (http, browser vecchi) l'avviso arriva comunque. */
export function copia(testo: string): void {
  if (!navigator.clipboard) {
    toast('Copia non riuscita')
    return
  }
  navigator.clipboard.writeText(testo).then(() => toast('Copiato'), () => toast('Copia non riuscita'))
}
```

- [ ] **Step 5: Icone dei tipi e badge rosso**

In `src/ui/icone.ts` sostituire le prime due righe

```ts
import { BedDouble, Car, Coffee, Footprints, Landmark, PartyPopper, Train, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import type { InfoEvento, ModoSpostamento, TipoTappa } from '../model/tipi'
```

con

```ts
import { BedDouble, Car, Coffee, FileText, Footprints, Landmark, PartyPopper, Plane, Ticket, Train, TrainFront, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import type { InfoEvento, ModoSpostamento, TipoPrenotazione, TipoTappa } from '../model/tipi'
```

e aggiungere in fondo al file:

```ts
export const ICONA_PRENOTAZIONE: Record<TipoPrenotazione, LucideIcon> = { volo: Plane, hotel: BedDouble, treno: TrainFront, biglietto: Ticket, ristorante: Utensils, altro: FileText }
export const ETICHETTA_PRENOTAZIONE: Record<TipoPrenotazione, string> = { volo: 'Volo', hotel: 'Hotel', treno: 'Treno', biglietto: 'Biglietto', ristorante: 'Ristorante', altro: 'Altro' }
export const GRUPPO_PRENOTAZIONE: Record<TipoPrenotazione, string> = { volo: 'Voli', hotel: 'Hotel', treno: 'Treni', biglietto: 'Biglietti', ristorante: 'Ristoranti', altro: 'Altro' }
```

In `src/ui/componenti.tsx` sostituire

```tsx
export function Badge({ tono = 'tinta', children }: { tono?: 'tinta' | 'avviso' | 'neutro'; children: ReactNode }) {
```

con

```tsx
export function Badge({ tono = 'tinta', children }: { tono?: 'tinta' | 'avviso' | 'neutro' | 'pericolo'; children: ReactNode }) {
```

In `src/ui/base.css`, dopo `.badge.neutro { background: var(--riempimento); color: var(--testo-2); }` aggiungere

```css
.badge.pericolo { background: var(--pericolo-sfondo); color: var(--pericolo); }
```

In `src/ui/tema.css`, nel blocco chiaro dopo `  --pericolo: #b3261e;` aggiungere

```css
  --pericolo-sfondo: #fbe4e1;
  --su-pericolo: #ffffff;
```

e nel blocco scuro dopo `  --pericolo: #ff6b6b;` aggiungere

```css
  --pericolo-sfondo: #3a1618;
  --su-pericolo: #111114;
```

(Contrasti: `#b3261e` su `#fbe4e1` ≈ 5,6:1 e bianco su `#b3261e` ≈ 6,5:1; `#ff6b6b` su `#3a1618` ≈ 6:1 e `#111114` su `#ff6b6b` ≈ 6,8:1.)

- [ ] **Step 6: Stili dei documenti — creare `src/schermate/documenti/documenti.css`**

```css
.documento-testa { margin: 14px 0 12px; }
.documento-tipo { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--tinta-testo); }
.documento-testa h1 { font-size: 28px; line-height: 1.15; font-weight: 700; margin-top: 6px; overflow-wrap: anywhere; }
.documento-codice { display: grid; gap: 2px; width: 100%; text-align: left; cursor: pointer; margin: 12px 0; color: var(--testo); }
.documento-codice strong { font-size: 34px; line-height: 1.15; letter-spacing: 0.08em; overflow-wrap: anywhere; font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
.documento-azioni { margin: 12px 0; }
.documento-note { white-space: pre-wrap; padding: 12px 16px; font-size: 16px; }
.documento-vuoto { margin: 0 16px; }
.griglia-allegati { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.miniatura-cella { position: relative; }
.miniatura {
  width: 100%; aspect-ratio: 1; border-radius: 12px; border: 0.5px solid var(--bordo); background: var(--superficie-2); overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 0; color: var(--testo-2);
  text-decoration: none; cursor: pointer; font-size: 12px; text-align: center;
}
.miniatura img { width: 100%; height: 100%; object-fit: cover; display: block; }
.miniatura span { padding: 0 6px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
.miniatura.mancante { cursor: default; color: var(--pericolo); background: var(--pericolo-sfondo); }
.miniatura-togli {
  position: absolute; top: 0; right: 0; width: 44px; height: 44px; border: 0; background: none; cursor: pointer;
  display: flex; align-items: flex-start; justify-content: flex-end; padding: 4px;
}
.miniatura-togli > span { width: 26px; height: 26px; border-radius: 13px; background: var(--pericolo); color: var(--su-pericolo); display: flex; align-items: center; justify-content: center; }
.allegati-editor { margin: 12px 0; display: grid; gap: 8px; }
.visore { position: fixed; inset: 0; z-index: 70; background: #ffffff; color: #111114; display: flex; flex-direction: column; }
.visore-testa, .visore-piede { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: calc(4px + env(safe-area-inset-top)) 8px 4px; }
.visore-piede { padding: 4px 12px calc(10px + env(safe-area-inset-bottom)); }
.visore .pulsante-icona { color: #111114; }
.visore .pulsante { background: rgba(0, 0, 0, 0.07); color: #111114; }
.visore-corpo { flex: 1; min-height: 0; overflow: auto; display: flex; }
.visore-corpo img { margin: auto; display: block; max-width: none; }
.visore-corpo img.adatta { max-width: 100%; max-height: 100%; object-fit: contain; }
.visore-corpo p { margin: auto; padding: 24px; text-align: center; }
```

- [ ] **Step 7: Griglia degli allegati e visualizzatore — creare `src/schermate/documenti/Allegati.tsx`**

```tsx
import { ChevronLeft, ChevronRight, FileText, ImageOff, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Allegato } from '../../model/tipi'
import { archivioIndexedDb } from '../../servizi/allegati'
import { useScorrimento } from '../../ui/scorrimento'

/** L'indirizzo temporaneo (object URL) di un allegato: undefined mentre si legge, null se non c'è più. */
export function useUrlAllegato(id: string): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let vivo = true
    let creato: string | null = null
    setUrl(undefined)
    archivioIndexedDb.leggi(id).then(
      b => {
        if (!vivo) return
        if (!b) { setUrl(null); return }
        creato = URL.createObjectURL(b)
        setUrl(creato)
      },
      () => { if (vivo) setUrl(null) },
    )
    return () => {
      vivo = false
      if (creato) URL.revokeObjectURL(creato)
    }
  }, [id])
  return url
}

const MANCA = 'Allegato non più disponibile, ricaricalo'

/** Senza `onApri` (nell'editor, dentro un foglio) la foto non si apre: si può solo togliere. */
function Miniatura({ allegato, onApri }: { allegato: Allegato; onApri?: () => void }) {
  const url = useUrlAllegato(allegato.id)
  if (url === null) {
    return <div className="miniatura mancante" role="img" aria-label={`${allegato.nome}: ${MANCA}`}><ImageOff size={24} aria-hidden /><span>{MANCA}</span></div>
  }
  if (allegato.mime === 'application/pdf') {
    // I PDF li apre il visore del telefono.
    return <a className="miniatura" href={url} target="_blank" rel="noreferrer" aria-label={`Apri ${allegato.nome}`}><FileText size={30} aria-hidden /><span>{allegato.nome}</span></a>
  }
  const foto = url ? <img src={url} alt="" /> : null
  if (!onApri) return <div className="miniatura" role="img" aria-label={allegato.nome}>{foto}</div>
  return <button type="button" className="miniatura" onClick={onApri} disabled={!url} aria-label={`Apri ${allegato.nome}`}>{foto}</button>
}

function ImmagineGrande({ allegato, zoom }: { allegato: Allegato; zoom: number }) {
  const url = useUrlAllegato(allegato.id)
  if (url === null) return <p>{MANCA}.</p>
  if (!url) return null
  return <img src={url} alt={allegato.nome} className={zoom === 1 ? 'adatta' : undefined} style={zoom === 1 ? undefined : { width: `${zoom * 100}%` }} />
}

/** A tutto schermo su fondo bianco (per lo scanner del QR), con zoom e scorrimento fra le foto. */
function Visualizzatore({ immagini, indice, onChiudi }: { immagini: Allegato[]; indice: number | null; onChiudi: () => void }) {
  const [attuale, setAttuale] = useState(0)
  const [zoom, setZoom] = useState(1)
  const n = immagini.length
  const sposta = (d: number) => {
    setAttuale(i => (i + d + n) % n)
    setZoom(1)
  }
  const { gestori } = useScorrimento({ versi: ['destra', 'sinistra'], soglia: 60, attivo: zoom === 1 && n > 1, onScatta: v => sposta(v === 'sinistra' ? 1 : -1) })
  useEffect(() => {
    if (indice === null) return
    setAttuale(indice)
    setZoom(1)
  }, [indice])
  useEffect(() => {
    if (indice === null) return
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
      else if (e.key === 'ArrowRight' && n > 1) sposta(1)
      else if (e.key === 'ArrowLeft' && n > 1) sposta(-1)
    }
    addEventListener('keydown', tasto)
    return () => removeEventListener('keydown', tasto)
  })
  if (indice === null || n === 0) return null
  const a = immagini[Math.min(attuale, n - 1)]
  return createPortal(
    <div className="visore" role="dialog" aria-modal="true" aria-label={a.nome}>
      <div className="visore-testa">
        <button type="button" className="pulsante-icona" onClick={onChiudi} aria-label="Chiudi"><X size={26} aria-hidden /></button>
        <span>{n > 1 ? `${Math.min(attuale, n - 1) + 1} di ${n}` : a.nome}</span>
        <button type="button" className="pulsante-icona" onClick={() => setZoom(z => (z >= 3 ? 1 : z + 1))} aria-label={zoom >= 3 ? 'Torna a schermo intero' : 'Ingrandisci'}>
          {zoom >= 3 ? <ZoomOut size={24} aria-hidden /> : <ZoomIn size={24} aria-hidden />}
        </button>
      </div>
      <div className="visore-corpo" {...gestori} style={{ touchAction: zoom === 1 ? 'pan-y pinch-zoom' : 'pan-x pan-y pinch-zoom' }}
        onDoubleClick={() => setZoom(z => (z === 1 ? 2 : 1))}>
        <ImmagineGrande key={a.id} allegato={a} zoom={zoom} />
      </div>
      {n > 1 && (
        <div className="visore-piede">
          <button type="button" className="pulsante" onClick={() => sposta(-1)}><ChevronLeft size={20} aria-hidden /> Prima</button>
          <button type="button" className="pulsante" onClick={() => sposta(1)}>Dopo <ChevronRight size={20} aria-hidden /></button>
        </div>
      )}
    </div>,
    document.body,
  )
}

/** Gli allegati in griglia. Con `onTogli` è la griglia dell'editor: ogni allegato ha la sua ×. */
export function GrigliaAllegati({ allegati, onTogli }: { allegati: Allegato[]; onTogli?: (id: string) => void }) {
  const [aperto, setAperto] = useState<number | null>(null)
  const immagini = allegati.filter(a => a.mime.startsWith('image/'))
  if (allegati.length === 0) return null
  return (
    <>
      <div className="griglia-allegati">
        {allegati.map(a => (
          <div key={a.id} className="miniatura-cella">
            <Miniatura allegato={a} onApri={onTogli ? undefined : () => setAperto(immagini.findIndex(x => x.id === a.id))} />
            {onTogli && (
              <button type="button" className="miniatura-togli" aria-label={`Togli ${a.nome}`} onClick={() => onTogli(a.id)}>
                <span><X size={16} aria-hidden /></span>
              </button>
            )}
          </div>
        ))}
      </div>
      {!onTogli && <Visualizzatore immagini={immagini} indice={aperto} onChiudi={() => setAperto(null)} />}
    </>
  )
}
```

- [ ] **Step 8: Editor della prenotazione — creare `src/schermate/documenti/EditorPrenotazione.tsx`**

```tsx
import { Camera, Paperclip, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { differenzaGiorni } from '../../model/date'
import { controllaPrenotazione, etichetteDate } from '../../model/prenotazioni'
import { CITTA_SCONOSCIUTA, cittaDi } from '../../model/riepilogo'
import { formatoNumero, leggiImporto } from '../../model/spese'
import { TIPI_PRENOTAZIONE, type Allegato, type Citta, type Prenotazione, type TipoPrenotazione, type Valuta, type Viaggio } from '../../model/tipi'
import { salvaAllegato } from '../../servizi/allegati'
import { Campo, Segmentato } from '../../ui/componenti'
import { ETICHETTA_PRENOTAZIONE } from '../../ui/icone'
import { CercaLuogo } from '../programma/CercaLuogo'
import { GrigliaAllegati } from './Allegati'
import '../programma/editor.css'
import './documenti.css'

const FUSI = [{ valore: 'Asia/Tokyo', etichetta: 'Ora del Giappone' }, { valore: 'Europe/Rome', etichetta: 'Ora italiana' }]
const STATI: { valore: Prenotazione['stato']; etichetta: string }[] = [{ valore: 'da-prenotare', etichetta: 'Da prenotare' }, { valore: 'prenotata', etichetta: 'Prenotata' }]
const VALUTE: { valore: Valuta; etichetta: string }[] = [{ valore: 'JPY', etichetta: '¥ Yen' }, { valore: 'EUR', etichetta: '€ Euro' }]

const opzioniFuso = (attuale: string) => (FUSI.some(f => f.valore === attuale) ? FUSI : [...FUSI, { valore: attuale, etichetta: attuale }])

/** La città del giorno in cui cade la prenotazione, per cercare il luogo lì intorno. */
function cittaPerData(v: Viaggio, inizio: string | undefined): Citta {
  if (v.giorni.length === 0) return CITTA_SCONOSCIUTA
  const i = inizio ? differenzaGiorni(v.dataPartenza, inizio.slice(0, 10)) : 0
  return cittaDi(v, v.giorni[Math.min(Math.max(i, 0), v.giorni.length - 1)])
}

interface Props {
  viaggio: Viaggio
  iniziale: Prenotazione
  onSalva: (p: Prenotazione) => void
  /** Ogni allegato scritto in IndexedDB: se poi il foglio si chiude senza salvare, chi chiama lo cancella. */
  onAllegato: (id: string) => void
  onElimina?: () => void
}

export function EditorPrenotazione({ viaggio, iniziale, onSalva, onAllegato, onElimina }: Props) {
  const [b, setB] = useState<Prenotazione>(iniziale)
  const [costo, setCosto] = useState(iniziale.costo ? formatoNumero(iniziale.costo.importo) : '')
  const [valutaCosto, setValutaCosto] = useState<Valuta>(iniziale.costo?.valuta ?? 'JPY')
  const [errori, setErrori] = useState<string[]>([])
  const [erroreAllegato, setErroreAllegato] = useState('')
  const [carico, setCarico] = useState(false)
  const foto = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const agg = (m: Partial<Prenotazione>) => { setB(x => ({ ...x, ...m })); setErrori([]) }
  const [etInizio, etFine] = etichetteDate(b.tipo)
  const viaggia = b.tipo === 'volo' || b.tipo === 'treno'
  const tappe = viaggio.giorni.flatMap((g, i) => g.tappe.map(t => ({ id: t.id, etichetta: `G${i} · ${t.titolo}` })))

  const aggiungiFile = async (lista: FileList | null) => {
    if (!lista?.length) return
    setCarico(true)
    setErroreAllegato('')
    const nuovi: Allegato[] = []
    for (const f of Array.from(lista)) {
      const r = await salvaAllegato(f)
      if (!r.ok) { setErroreAllegato(r.errore); break }
      nuovi.push(r.allegato)
      onAllegato(r.allegato.id)
    }
    setB(x => ({ ...x, allegati: [...x.allegati, ...nuovi] }))
    setCarico(false)
    if (foto.current) foto.current.value = ''
    if (file.current) file.current.value = ''
  }

  const salva = () => {
    const importo = leggiImporto(costo)
    if (costo.trim() && (importo === null || importo < 0)) { setErrori(['Il costo non è un numero.']); return }
    const pulita: Prenotazione = { ...b, titolo: b.titolo.trim(), ...(importo !== null ? { costo: { importo, valuta: valutaCosto } } : {}) }
    if (importo === null) delete pulita.costo
    for (const k of ['inizio', 'fine', 'codice', 'riferimento', 'daPrenotareEntro', 'link', 'tappaId'] as const) {
      if (!pulita[k]?.trim()) delete pulita[k]
    }
    if (pulita.codice) pulita.codice = pulita.codice.trim()
    if (!pulita.luogo) delete pulita.luogo
    if (pulita.stato === 'prenotata') delete pulita.daPrenotareEntro
    if (!viaggia || pulita.fusoFine === pulita.fuso) delete pulita.fusoFine
    const e = controllaPrenotazione(pulita)
    if (e.length) { setErrori(e); return }
    onSalva(pulita)
  }

  return (
    <form className="editor" onSubmit={e => { e.preventDefault(); salva() }}>
      <Campo etichetta="Tipo">
        <select value={b.tipo} onChange={e => agg({ tipo: e.target.value as TipoPrenotazione })}>
          {TIPI_PRENOTAZIONE.map(t => <option key={t} value={t}>{ETICHETTA_PRENOTAZIONE[t]}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Titolo">
        <input value={b.titolo} placeholder="Volo Roma → Tokyo" autoFocus={!iniziale.titolo} onChange={e => agg({ titolo: e.target.value })} />
      </Campo>
      <div className="campo"><Segmentato etichetta="Stato" valore={b.stato} opzioni={STATI} onCambia={stato => agg({ stato })} /></div>
      <div className="fila">
        <Campo etichetta={etInizio}><input type="datetime-local" value={b.inizio ?? ''} onChange={e => agg({ inizio: e.target.value || undefined })} /></Campo>
        <Campo etichetta={etFine}><input type="datetime-local" value={b.fine ?? ''} onChange={e => agg({ fine: e.target.value || undefined })} /></Campo>
      </div>
      <div className="fila">
        <Campo etichetta={viaggia ? 'Fuso della partenza' : 'Fuso'}>
          <select value={b.fuso} onChange={e => agg({ fuso: e.target.value })}>
            {opzioniFuso(b.fuso).map(f => <option key={f.valore} value={f.valore}>{f.etichetta}</option>)}
          </select>
        </Campo>
        {viaggia && (
          <Campo etichetta="Fuso dell'arrivo">
            <select value={b.fusoFine ?? b.fuso} onChange={e => agg({ fusoFine: e.target.value })}>
              {opzioniFuso(b.fusoFine ?? b.fuso).map(f => <option key={f.valore} value={f.valore}>{f.etichetta}</option>)}
            </select>
          </Campo>
        )}
      </div>
      <CercaLuogo etichetta="Luogo" luogo={b.luogo} citta={cittaPerData(viaggio, b.inizio)} onCambia={luogo => agg({ luogo })} />
      {b.luogo && (
        <Campo etichetta="Indirizzo in giapponese (per il taxi)">
          <input lang="ja" value={b.luogo.indirizzoJa ?? ''} placeholder="京都市東山区祇園町南側555"
            onChange={e => agg({ luogo: { ...b.luogo!, indirizzoJa: e.target.value || undefined } })} />
        </Campo>
      )}
      <Campo etichetta="Codice di conferma">
        <input value={b.codice ?? ''} autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={e => agg({ codice: e.target.value })} />
      </Campo>
      <Campo etichetta="Riferimento">
        <input value={b.riferimento ?? ''} placeholder="AZ 784 · Nozomi 21 carrozza 7 posto 12D" onChange={e => agg({ riferimento: e.target.value })} />
      </Campo>
      {b.stato === 'da-prenotare' && (
        <Campo etichetta="Da prenotare entro">
          <input type="date" value={b.daPrenotareEntro ?? ''} onChange={e => agg({ daPrenotareEntro: e.target.value || undefined })} />
        </Campo>
      )}
      <div className="fila">
        <Campo etichetta="Costo"><input inputMode="decimal" value={costo} placeholder="0" onChange={e => { setCosto(e.target.value); setErrori([]) }} /></Campo>
        <div style={{ flex: 1, minWidth: 150 }}><Segmentato etichetta="Valuta del costo" valore={valutaCosto} opzioni={VALUTE} onCambia={setValutaCosto} /></div>
      </div>
      <Campo etichetta="Link (sito o app della prenotazione)">
        <input type="url" inputMode="url" value={b.link ?? ''} placeholder="https://" onChange={e => agg({ link: e.target.value })} />
      </Campo>
      <Campo etichetta="Tappa collegata">
        <select value={b.tappaId ?? ''} onChange={e => agg({ tappaId: e.target.value || undefined })}>
          <option value="">Nessuna</option>
          {tappe.map(t => <option key={t.id} value={t.id}>{t.etichetta}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Note"><textarea value={b.note} onChange={e => agg({ note: e.target.value })} /></Campo>
      <div className="allegati-editor">
        <span className="etichetta-campo">Allegati (foto del QR, PDF del biglietto)</span>
        <GrigliaAllegati allegati={b.allegati} onTogli={id => agg({ allegati: b.allegati.filter(a => a.id !== id) })} />
        <div className="fila">
          <button type="button" className="pulsante" disabled={carico} onClick={() => foto.current?.click()}><Camera size={18} aria-hidden /> Scatta foto</button>
          <button type="button" className="pulsante" disabled={carico} onClick={() => file.current?.click()}><Paperclip size={18} aria-hidden /> Scegli file</button>
        </div>
        {carico && <p className="testo-2" aria-live="polite">Salvo l'allegato…</p>}
        {erroreAllegato && <p className="errore" role="alert">{erroreAllegato}</p>}
        <input ref={foto} type="file" accept="image/*" capture="environment" hidden onChange={e => void aggiungiFile(e.target.files)} />
        <input ref={file} type="file" accept="image/*,application/pdf" multiple hidden onChange={e => void aggiungiFile(e.target.files)} />
      </div>
      {errori.map(x => <p key={x} className="errore" role="alert">{x}</p>)}
      <div className="editor-azioni">
        <button type="submit" className="pulsante primario largo" disabled={carico}>Salva</button>
        {onElimina && <button type="button" className="pulsante pericolo largo" onClick={onElimina}><Trash2 size={18} aria-hidden /> Elimina prenotazione</button>}
      </div>
    </form>
  )
}
```

- [ ] **Step 9: Il foglio che salva, elimina e pulisce — creare `src/schermate/documenti/FoglioPrenotazione.tsx`**

```tsx
import { useRef, useState } from 'react'
import { aggiungiPrenotazione, eliminaPrenotazione, nuovaPrenotazione, sostituisciPrenotazione } from '../../model/prenotazioni'
import type { Prenotazione } from '../../model/tipi'
import { eliminaSeOrfani } from '../../servizi/allegati'
import { useViaggio } from '../../store/viaggio'
import { Foglio } from '../../ui/Foglio'
import { EditorPrenotazione } from './EditorPrenotazione'

interface Props {
  aperto: boolean
  /** null = nuova prenotazione. Chi apre il foglio cambia `key` a ogni apertura, così la bozza riparte dai dati salvati. */
  iniziale: Prenotazione | null
  onChiudi: () => void
  onSalvata?: (id: string) => void
  onEliminata?: () => void
}

export function FoglioPrenotazione({ aperto, iniziale, onChiudi, onSalvata, onEliminata }: Props) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const [bozza] = useState(() => iniziale ?? nuovaPrenotazione())
  const aggiunti = useRef<string[]>([])
  // Cancella gli allegati che nessuna prenotazione salvata usa (aggiunti e poi abbandonati, o tolti).
  const pulisci = (ids: string[]) => { if (ids.length) void eliminaSeOrfani(ids, useViaggio.getState().viaggio) }

  const annulla = () => {
    pulisci(aggiunti.current)
    aggiunti.current = []
    onChiudi()
  }
  const salva = (p: Prenotazione) => {
    const tolti = (iniziale?.allegati ?? []).map(a => a.id).filter(id => !p.allegati.some(a => a.id === id))
    applica(v => (iniziale ? sostituisciPrenotazione(v, p) : aggiungiPrenotazione(v, p)))
    pulisci([...tolti, ...aggiunti.current])
    aggiunti.current = []
    onChiudi()
    onSalvata?.(p.id)
  }
  const elimina = () => {
    if (!iniziale) return
    const ids = [...iniziale.allegati.map(a => a.id), ...aggiunti.current]
    aggiunti.current = []
    applicaAnnullabile(v => eliminaPrenotazione(v, iniziale.id), 'Prenotazione eliminata')
    // Gli allegati restano finché si può annullare; poi, se nessuno li usa più, si cancellano.
    setTimeout(() => pulisci(ids), 7000)
    onChiudi()
    onEliminata?.()
  }

  return (
    <Foglio aperto={aperto} onChiudi={annulla} titolo={iniziale ? 'Modifica prenotazione' : 'Nuova prenotazione'} pieno>
      {aperto && (
        <EditorPrenotazione viaggio={viaggio} iniziale={bozza} onSalva={salva} onAllegato={id => aggiunti.current.push(id)}
          onElimina={iniziale ? elimina : undefined} />
      )}
    </Foglio>
  )
}
```

- [ ] **Step 10: Dettaglio a tutto schermo — creare `src/schermate/documenti/DettaglioDocumento.tsx`**

```tsx
import { CalendarClock, CalendarDays, Copy, ExternalLink, MapPinned, Navigation, Wallet } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { formatoData, istanteTokyo } from '../../model/date'
import { aggiornaPrenotazione, descriviIstante, etichetteDate, scadenza, tappaCollegata } from '../../model/prenotazioni'
import { formatoImporto } from '../../model/spese'
import { linkSicuro, urlIndicazioni } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Badge, BarraNav, Gruppo, LinkIndietro, Riga, Vuoto } from '../../ui/componenti'
import { copia } from '../../ui/copia'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_PRENOTAZIONE, ICONA_PRENOTAZIONE } from '../../ui/icone'
import { hrefRotta, vai } from '../../ui/rotta'
import { GrigliaAllegati } from './Allegati'
import { FoglioPrenotazione } from './FoglioPrenotazione'
import './documenti.css'

export function DettaglioDocumento({ id }: { id: string }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const oggi = istanteTokyo(useAdesso()).data
  const [modifica, setModifica] = useState(false)
  const [chiave, setChiave] = useState(0)
  useEffect(() => { scrollTo({ top: 0 }) }, [id])
  const indietro = <LinkIndietro href={hrefRotta('documenti')} etichetta="Documenti" />
  const p = viaggio.prenotazioni.find(x => x.id === id)
  if (!p) {
    return (
      <div className="schermata">
        <BarraNav titolo="Documento" sinistra={indietro} />
        <Vuoto titolo="Prenotazione non trovata" testo="Forse è stata eliminata." />
      </div>
    )
  }
  const Icona = ICONA_PRENOTAZIONE[p.tipo]
  const [etInizio, etFine] = etichetteDate(p.tipo)
  const link = linkSicuro(p.link)
  const tappa = tappaCollegata(viaggio, p.tappaId)
  const s = scadenza(p, oggi)
  const apri = () => { setChiave(k => k + 1); setModifica(true) }
  const righe: ReactNode[] = [
    p.inizio && <Riga key="inizio" icona={<CalendarDays size={20} />} titolo={descriviIstante(p.inizio, p.fuso)} sottotitolo={etInizio} />,
    p.fine && <Riga key="fine" icona={<CalendarDays size={20} />} titolo={descriviIstante(p.fine, p.fusoFine ?? p.fuso)} sottotitolo={etFine} />,
    p.riferimento && <Riga key="rif" icona={<Copy size={20} />} titolo={p.riferimento} sottotitolo="Riferimento · tocca per copiare" onClick={() => copia(p.riferimento!)} destra={null} />,
    p.luogo && <Riga key="luogo" icona={<Navigation size={20} />} titolo={p.luogo.nome} sottotitolo="Vai: indicazioni in Google Maps" href={urlIndicazioni(p.luogo)} />,
    p.luogo?.indirizzoJa && <Riga key="ja" icona={<Copy size={20} />} titolo={<span lang="ja">{p.luogo.indirizzoJa}</span>} sottotitolo="Indirizzo per il taxi · tocca per copiare" onClick={() => copia(p.luogo!.indirizzoJa!)} destra={null} />,
    link && <Riga key="link" icona={<ExternalLink size={20} />} titolo="Sito o app della prenotazione" href={link} />,
    p.costo && <Riga key="costo" icona={<Wallet size={20} />} titolo={formatoImporto(p.costo.importo, p.costo.valuta)} sottotitolo="Costo" />,
    p.stato === 'da-prenotare' && p.daPrenotareEntro && (
      <Riga key="entro" icona={<CalendarClock size={20} />} titolo={formatoData(p.daPrenotareEntro, 'lungo')} sottotitolo={s === 'scaduta' ? 'La data per prenotare è passata' : 'Da prenotare entro'} />
    ),
    tappa && <Riga key="tappa" icona={<MapPinned size={20} />} titolo={tappa.tappa.titolo} sottotitolo={`Tappa del G${tappa.indice}`} href={hrefRotta('programma', tappa.indice)} />,
  ].filter(Boolean)

  return (
    <div className="schermata">
      <BarraNav titolo={ETICHETTA_PRENOTAZIONE[p.tipo]} sinistra={indietro}
        destra={<button type="button" className="pulsante-testo" onClick={apri}>Modifica</button>} />
      <header className="documento-testa">
        <div className="documento-tipo">
          <Icona size={16} aria-hidden /> {ETICHETTA_PRENOTAZIONE[p.tipo]}
          {p.stato === 'prenotata'
            ? <Badge>Prenotata</Badge>
            : <Badge tono={s === 'scaduta' || s === 'vicina' ? 'pericolo' : 'avviso'}>{s === 'scaduta' ? 'Scaduta' : 'Da prenotare'}</Badge>}
        </div>
        <h1>{p.titolo || 'Senza titolo'}</h1>
      </header>
      {p.codice && (
        <button type="button" className="card documento-codice" onClick={() => copia(p.codice!)} aria-label={`Codice ${p.codice}: tocca per copiare`}>
          <span className="testo-3">Codice · tocca per copiare</span>
          <strong>{p.codice}</strong>
        </button>
      )}
      {p.stato === 'da-prenotare' && (
        <div className="fila documento-azioni">
          {link && <a className="pulsante primario" href={link} target="_blank" rel="noreferrer"><ExternalLink size={18} aria-hidden /> Prenota</a>}
          <button type="button" className={'pulsante' + (link ? '' : ' primario')} onClick={() => applica(v => aggiornaPrenotazione(v, p.id, { stato: 'prenotata' }))}>
            Segna come prenotata
          </button>
        </div>
      )}
      {righe.length > 0 && <Gruppo>{righe}</Gruppo>}
      {p.note && <Gruppo titolo="Note"><p className="documento-note">{p.note}</p></Gruppo>}
      <section className="gruppo">
        <h2 className="gruppo-titolo">Allegati</h2>
        {p.allegati.length > 0
          ? <GrigliaAllegati allegati={p.allegati} />
          : <p className="testo-2 documento-vuoto">Nessun allegato: da Modifica aggiungi la foto del QR o il PDF del biglietto.</p>}
      </section>
      <FoglioPrenotazione key={chiave} aperto={modifica} iniziale={p} onChiudi={() => setModifica(false)} onEliminata={() => vai('documenti')} />
    </div>
  )
}
```

- [ ] **Step 11: Elenco raggruppato — riscrivere `src/schermate/documenti/Documenti.tsx`**

```tsx
import { ListPlus, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatoData, istanteTokyo } from '../../model/date'
import { descriviQuando, gruppiDocumenti, scadenza } from '../../model/prenotazioni'
import type { Prenotazione } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Badge, BarraNav, Gruppo, Riga, TitoloGrande, Vuoto } from '../../ui/componenti'
import { useAggiungiDatiDiPartenza } from '../../ui/datiDiPartenza'
import { useAdesso } from '../../ui/hook'
import { GRUPPO_PRENOTAZIONE, ICONA_PRENOTAZIONE } from '../../ui/icone'
import { hrefDocumento } from '../../ui/rotta'
import { DettaglioDocumento } from './DettaglioDocumento'
import { FoglioPrenotazione } from './FoglioPrenotazione'
import './documenti.css'

export default function Documenti({ id }: { id: string | null }) {
  return id ? <DettaglioDocumento id={id} /> : <ElencoDocumenti />
}

function RigaDocumento({ p, oggi }: { p: Prenotazione; oggi: string }) {
  const Icona = ICONA_PRENOTAZIONE[p.tipo]
  const s = scadenza(p, oggi)
  const sotto = [descriviQuando(p), p.codice].filter(Boolean).join(' · ')
  let badge: ReactNode
  if (p.stato === 'da-prenotare') {
    const testo = s === 'scaduta' ? 'Scaduta' : p.daPrenotareEntro ? `Entro ${formatoData(p.daPrenotareEntro, 'breve')}` : 'Da prenotare'
    badge = <Badge tono={s === 'scaduta' || s === 'vicina' ? 'pericolo' : 'avviso'}>{testo}</Badge>
  }
  return <Riga icona={<Icona size={20} />} titolo={p.titolo || 'Senza titolo'} sottotitolo={sotto || undefined} destra={badge} href={hrefDocumento(p.id)} />
}

function ElencoDocumenti() {
  const prenotazioni = useViaggio(s => s.viaggio.prenotazioni)
  const aggiungiPartenza = useAggiungiDatiDiPartenza()
  const oggi = istanteTokyo(useAdesso()).data
  const [nuova, setNuova] = useState(false)
  const [chiave, setChiave] = useState(0)
  const gruppi = gruppiDocumenti(prenotazioni)
  const daFare = prenotazioni.filter(p => p.stato === 'da-prenotare').length
  const apriNuova = () => { setChiave(k => k + 1); setNuova(true) }
  return (
    <div className="schermata">
      <BarraNav titolo="Documenti" />
      <TitoloGrande sotto={prenotazioni.length ? (daFare ? `${daFare} da prenotare su ${prenotazioni.length}` : 'Tutto prenotato') : undefined}>Documenti</TitoloGrande>
      {gruppi.length === 0 && (
        <Vuoto titolo="Nessuna prenotazione" testo="Voli, hotel, treni e biglietti, con codici, QR e PDF che restano anche offline."
          azione={<button type="button" className="pulsante primario" onClick={aggiungiPartenza}><ListPlus size={18} aria-hidden /> Parti da quelle del 2027</button>} />
      )}
      {gruppi.map(g => (
        <Gruppo key={g.tipo} titolo={GRUPPO_PRENOTAZIONE[g.tipo]}>
          {g.voci.map(p => <RigaDocumento key={p.id} p={p} oggi={oggi} />)}
        </Gruppo>
      ))}
      <Gruppo>
        <Riga icona={<Plus size={20} />} titolo="Nuova prenotazione" onClick={apriNuova} destra={null} />
      </Gruppo>
      <FoglioPrenotazione key={chiave} aperto={nuova} iniziale={null} onChiudi={() => setNuova(false)} onSalvata={id => { location.hash = hrefDocumento(id) }} />
    </div>
  )
}
```

- [ ] **Step 12: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812, chiaro e scuro):
- `#/documenti` con i dati di partenza (o dopo "Parti da quelle del 2027"): gruppi **Voli, Hotel, Biglietti, Ristoranti**; righe con icona, titolo, "sab 7 ago · 12:30 ora italiana" per l'andata, "dom 15 ago → ven 20 ago" per Kyoto; badge "Da prenotare" giallo; sotto il titolo "19 da prenotare su 19".
- Modifica di un biglietto con "Da prenotare entro" a 5 giorni da oggi: il badge diventa rosso "Entro …"; con una data passata, rosso "Scaduta". Il rosso si legge in chiaro e in scuro.
- Tocco su "Volo Roma → Tokyo": dettaglio a tutto schermo con "‹ Documenti", "Modifica", righe Partenza e Arrivo ("dom 8 ago · 14:00" nell'ora del Giappone), luogo con "Vai" che apre Google Maps.
- Modifica: scrivere il codice `ABC123`, stato "Prenotata", Salva: nel dettaglio il codice compare in grande; un tocco mostra il toast "Copiato".
- Modifica di un hotel con check-out prima del check-in: sotto i campi compare "Il check-out è prima del check-in." e il foglio non si chiude.
- "Scegli file" con una foto grande e un PDF: le miniature compaiono nel foglio con la ×; Salva; nel dettaglio la foto si apre nel visualizzatore bianco a tutto schermo; il pulsante di zoom ingrandisce (×2, ×3) e si scorre la foto; con due foto, "Prima"/"Dopo" e lo scorrimento laterale cambiano foto; Esc (da tastiera) chiude. Il PDF si apre in una scheda nuova col visore del browser.
- Un file `.txt` da "Scegli file": messaggio in linea "Si possono allegare solo foto e PDF."
- Da DevTools → Application → IndexedDB → `giappone-allegati` → `file`, cancellare una chiave: riaprendo il dettaglio, quella miniatura dice "Allegato non più disponibile, ricaricalo".
- Elimina prenotazione: si torna all'elenco, toast "Prenotazione eliminata" con "Annulla" che la riporta con gli allegati ancora visibili.
- "Nuova prenotazione" in fondo all'elenco apre il foglio; salvando si arriva al suo dettaglio.
- Nessuno scroll orizzontale a 375 px, anche con un codice lungo.

- [ ] **Step 13: Commit**

```bash
git add src/model/prenotazioni.ts src/model/prenotazioni.test.ts src/ui/icone.ts src/ui/componenti.tsx src/ui/base.css src/ui/tema.css src/ui/copia.ts src/ui/scorrimento.ts src/ui/scorrimento.test.ts src/schermate/documenti
git commit -m "Documenti: prenotazioni per tipo con scadenze, dettaglio con codice copiabile, allegati e visualizzatore per i QR

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: L'hotel della notte e la card "Prossimo"

**Files:**
- Modify: `src/model/prenotazioni.ts`, `src/model/prenotazioni.test.ts`, `src/schermate/oggi/SchedaTaxi.tsx` (riscritto intero), `src/schermate/oggi/DuranteIlViaggio.tsx` (riscritto intero), `src/schermate/oggi/PrimaDelViaggio.tsx`, `src/schermate/oggi/oggi.css`, `src/schermate/programma/Programma.tsx`
- Create: `src/schermate/oggi/Stanotte.tsx`, `src/schermate/oggi/CardProssimo.tsx`
- Test: `src/model/prenotazioni.test.ts`

**Interfaces:**
- Consumes: `notteCoperta`, `aggiornaPrenotazione`, `descriviQuando` (Task 4 e 8), `utcDaLocale` (Task 1), `copia` (Task 8), `ICONA_PRENOTAZIONE`, `ETICHETTA_PRENOTAZIONE`, `hrefDocumento`, `aggiornaAlloggio`, `formatoDurata`, `dataGiorno`.
- Produces: `prossimaPrenotazione(v: Viaggio, adesso: Date): { prenotazione: Prenotazione; minuti: number } | null` (inizio fra 1 minuto e 24 ore); `SchedaTaxi({ aperto, onChiudi, luogo: Luogo, codice?: string, onCambiaIndirizzo: (ja: string | undefined) => void })`; `Stanotte({ indice }: { indice: number })`; `CardProssimo({ adesso }: { adesso: Date })`.

- [ ] **Step 1: Test di `prossimaPrenotazione`**

In `src/model/prenotazioni.test.ts` aggiungere `prossimaPrenotazione` all'elenco importato da `./prenotazioni` (dopo `nuovaPrenotazione,`) e in fondo al file:

```ts
describe('prossimaPrenotazione', () => {
  const v = viaggioDiProva({
    prenotazioni: [
      p({ id: 'andata', tipo: 'volo', inizio: '2027-08-07T12:30', fuso: 'Europe/Rome' }),
      p({ id: 'hotel', tipo: 'hotel', inizio: '2027-08-08T15:00' }),
      p({ id: 'senza' }),
    ],
  })
  test('la prima che comincia nelle prossime 24 ore, con i minuti che mancano', () => {
    expect(prossimaPrenotazione(v, new Date('2027-08-07T07:30:00Z'))).toMatchObject({ prenotazione: { id: 'andata' }, minuti: 180 })
    expect(prossimaPrenotazione(v, new Date('2027-08-06T10:31:00Z'))?.minuti).toBe(1439)
  })
  test('troppo lontana o già cominciata: si passa alla successiva o a niente', () => {
    expect(prossimaPrenotazione(v, new Date('2027-08-06T10:29:00Z'))).toBeNull()
    expect(prossimaPrenotazione(v, new Date('2027-08-07T10:30:00Z'))).toMatchObject({ prenotazione: { id: 'hotel' }, minuti: 1170 })
  })
})
```

Run: `npm test -- src/model/prenotazioni.test.ts`
Expected: FAIL, `prossimaPrenotazione` non esportata.

- [ ] **Step 2: Implementare `prossimaPrenotazione`**

In fondo a `src/model/prenotazioni.ts` aggiungere:

```ts
/** La prenotazione che comincia prima, fra adesso e le prossime 24 ore, e quanti minuti mancano. */
export function prossimaPrenotazione(v: Viaggio, adesso: Date): { prenotazione: Prenotazione; minuti: number } | null {
  let migliore: { prenotazione: Prenotazione; minuti: number } | null = null
  for (const p of v.prenotazioni) {
    if (!p.inizio) continue
    const minuti = Math.round((utcDaLocale(p.inizio, p.fuso).getTime() - adesso.getTime()) / 60_000)
    if (minuti <= 0 || minuti > 24 * 60) continue
    if (!migliore || minuti < migliore.minuti) migliore = { prenotazione: p, minuti }
  }
  return migliore
}
```

Run: `npm test -- src/model/prenotazioni.test.ts`
Expected: PASS.

- [ ] **Step 3: Scheda per il tassista che vale per un hotel qualsiasi — riscrivere `src/schermate/oggi/SchedaTaxi.tsx`**

```tsx
import { Copy, MapPin } from 'lucide-react'
import type { Luogo } from '../../model/tipi'
import { urlCerca } from '../../servizi/mappe'
import { Campo } from '../../ui/componenti'
import { copia } from '../../ui/copia'
import { Foglio } from '../../ui/Foglio'

interface Props {
  aperto: boolean
  onChiudi: () => void
  luogo: Luogo
  /** Il codice della prenotazione, se c'è: alla reception serve. */
  codice?: string
  onCambiaIndirizzo: (indirizzoJa: string | undefined) => void
}

/** Scheda a tutto schermo da mostrare al tassista. */
export function SchedaTaxi({ aperto, onChiudi, luogo, codice, onCambiaIndirizzo }: Props) {
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Per il tassista" pieno>
      <div className="taxi">
        <p className="testo-2" lang="ja">この住所までお願いします。</p>
        <p className="taxi-nome">{luogo.nome}</p>
        {luogo.indirizzoJa
          ? <p className="taxi-indirizzo" lang="ja">{luogo.indirizzoJa}</p>
          : <p className="testo-2">Manca l'indirizzo in giapponese: copialo dalla prenotazione o dal sito dell'hotel e incollalo qui sotto.</p>}
        <Campo etichetta="Indirizzo in giapponese">
          <input lang="ja" value={luogo.indirizzoJa ?? ''} placeholder="東京都台東区西浅草3-17-1" onChange={e => onCambiaIndirizzo(e.target.value || undefined)} />
        </Campo>
        <div className="fila">
          <a className="pulsante" href={urlCerca(luogo)} target="_blank" rel="noreferrer"><MapPin size={18} aria-hidden /> Mappa</a>
          {luogo.indirizzoJa && <button type="button" className="pulsante" onClick={() => copia(luogo.indirizzoJa!)}><Copy size={18} aria-hidden /> Copia</button>}
          {codice && <button type="button" className="pulsante" onClick={() => copia(codice)}><Copy size={18} aria-hidden /> Codice {codice}</button>}
        </div>
      </div>
    </Foglio>
  )
}
```

- [ ] **Step 4: "Stanotte" con la prenotazione — creare `src/schermate/oggi/Stanotte.tsx`**

```tsx
import { BedDouble, Copy, Ticket } from 'lucide-react'
import { useState } from 'react'
import { dataGiorno } from '../../model/date'
import { aggiornaAlloggio } from '../../model/operazioni'
import { aggiornaPrenotazione, notteCoperta } from '../../model/prenotazioni'
import { useViaggio } from '../../store/viaggio'
import { Gruppo, Riga } from '../../ui/componenti'
import { copia } from '../../ui/copia'
import { hrefDocumento } from '../../ui/rotta'
import { SchedaTaxi } from './SchedaTaxi'

/** L'hotel della notte del giorno `indice`: la prenotazione che la copre, altrimenti `Giorno.alloggio`. */
export function Stanotte({ indice }: { indice: number }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const [taxi, setTaxi] = useState(false)
  const giorno = viaggio.giorni[indice]
  if (!giorno) return null
  const notte = notteCoperta(viaggio, dataGiorno(viaggio, indice))
  const luogo = notte ? (notte.luogo ?? giorno.alloggio ?? { nome: notte.titolo, query: notte.titolo }) : giorno.alloggio
  if (!luogo) return null
  // L'indirizzo scritto qui va dove sta l'hotel: nella prenotazione, o in tutti i giorni con lo stesso alloggio.
  const cambiaIndirizzo = (indirizzoJa: string | undefined) => applica(v => (notte
    ? aggiornaPrenotazione(v, notte.id, { luogo: { ...luogo, indirizzoJa } })
    : aggiornaAlloggio(v, luogo.nome, { indirizzoJa })))
  return (
    <>
      <Gruppo titolo="Stanotte">
        <Riga icona={<BedDouble size={20} />} titolo={notte?.titolo ?? luogo.nome}
          sottotitolo={luogo.indirizzoJa || "Tocca per l'indirizzo da mostrare al tassista"} onClick={() => setTaxi(true)} />
        {notte?.codice && <Riga icona={<Copy size={20} />} titolo={`Codice ${notte.codice}`} sottotitolo="Tocca per copiare" onClick={() => copia(notte.codice!)} destra={null} />}
        {notte && <Riga icona={<Ticket size={20} />} titolo="Prenotazione e allegati" href={hrefDocumento(notte.id)} />}
      </Gruppo>
      <SchedaTaxi aperto={taxi} onChiudi={() => setTaxi(false)} luogo={luogo} codice={notte?.codice} onCambiaIndirizzo={cambiaIndirizzo} />
    </>
  )
}
```

- [ ] **Step 5: La card "Prossimo" — creare `src/schermate/oggi/CardProssimo.tsx`**

```tsx
import { Copy, Paperclip } from 'lucide-react'
import { formatoDurata } from '../../model/date'
import { descriviQuando, prossimaPrenotazione } from '../../model/prenotazioni'
import { useViaggio } from '../../store/viaggio'
import { copia } from '../../ui/copia'
import { ETICHETTA_PRENOTAZIONE, ICONA_PRENOTAZIONE } from '../../ui/icone'
import { hrefDocumento } from '../../ui/rotta'

/** "Prossimo: Volo fra 3 h", se una prenotazione comincia nelle prossime 24 ore. */
export function CardProssimo({ adesso }: { adesso: Date }) {
  const viaggio = useViaggio(s => s.viaggio)
  const prossimo = prossimaPrenotazione(viaggio, adesso)
  if (!prossimo) return null
  const { prenotazione: p, minuti } = prossimo
  const Icona = ICONA_PRENOTAZIONE[p.tipo]
  return (
    <article className="card card-adesso">
      <div className="card-adesso-etichetta">Prossimo: {ETICHETTA_PRENOTAZIONE[p.tipo]} fra {formatoDurata(minuti)}</div>
      <a className="card-adesso-corpo" href={hrefDocumento(p.id)}>
        <Icona size={30} className="card-adesso-icona" aria-hidden />
        <div>
          <h3>{p.titolo}</h3>
          <p className="testo-2">{[descriviQuando(p), p.riferimento].filter(Boolean).join(' · ')}</p>
        </div>
      </a>
      <div className="fila">
        {p.codice && <button type="button" className="pulsante primario" onClick={() => copia(p.codice!)}><Copy size={18} aria-hidden /> {p.codice}</button>}
        <a className="pulsante" href={hrefDocumento(p.id)}><Paperclip size={18} aria-hidden /> {p.allegati.length ? `Allegati (${p.allegati.length})` : 'Dettagli'}</a>
      </div>
    </article>
  )
}
```

In `src/schermate/oggi/oggi.css`, dopo la riga `.card-adesso-corpo { … }` aggiungere:

```css
a.card-adesso-corpo { color: inherit; text-decoration: none; }
.card-adesso-icona { color: var(--tinta-testo); flex-shrink: 0; }
```

- [ ] **Step 6: Oggi durante il viaggio — riscrivere `src/schermate/oggi/DuranteIlViaggio.tsx`**

```tsx
import { Check, Circle } from 'lucide-react'
import { useState } from 'react'
import { tappeAdessoDopo } from '../../model/adesso'
import { dataGiorno, formatoData, formatoDurata, istanteTokyo } from '../../model/date'
import { aggiornaTappa } from '../../model/operazioni'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Avvisi } from '../../ui/Avvisi'
import { BarraNav, Gruppo, LinkImpostazioni, Riga, TitoloGrande } from '../../ui/componenti'
import { hrefRotta } from '../../ui/rotta'
import { FoglioTappa } from '../programma/FoglioTappa'
import { CardAdesso } from './CardAdesso'
import { CardProssimo } from './CardProssimo'
import { Meteo } from './Meteo'
import { Stanotte } from './Stanotte'

export function DuranteIlViaggio({ indice, adesso }: { indice: number; adesso: Date }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const [aperta, setAperta] = useState<string | null>(null)
  const giorno = viaggio.giorni[indice]
  const citta = cittaDi(viaggio, giorno)
  const data = dataGiorno(viaggio, indice)
  const { data: oggi, minuti } = istanteTokyo(adesso)
  const { adesso: ora, dopo, minutiAlDopo } = tappeAdessoDopo(giorno.tappe, minuti)
  const fatta = (id: string) => applica(v => aggiornaTappa(v, giorno.id, id, { stato: 'fatta' }))
  const spostamento = ora?.spostamento?.minuti ? ` · ${formatoDurata(ora.spostamento.minuti)} di strada` : ''

  return (
    <div className="schermata">
      <BarraNav titolo={`${citta.nome} · G${indice}`} sinistra={<LinkImpostazioni />} />
      <TitoloGrande sopra={formatoData(data, 'lungo')} sotto={giorno.titolo}>
        <span className="kanji">{citta.kanji}</span> {citta.nome}
      </TitoloGrande>
      <Meteo citta={citta} data={data} oggi={oggi} />
      <Avvisi avvisi={giorno.avvisi} />
      <CardProssimo adesso={adesso} />
      {ora && <CardAdesso etichetta="Adesso" tappa={ora} onApri={() => setAperta(ora.id)} onFatto={() => fatta(ora.id)} />}
      {dopo && (
        <CardAdesso secondaria tappa={dopo} onApri={() => setAperta(dopo.id)}
          etichetta={`Dopo${minutiAlDopo && minutiAlDopo > 0 ? ` · fra ${formatoDurata(minutiAlDopo)}` : ''}${spostamento}`} />
      )}
      {!ora && !dopo && <div className="card vuoto"><strong>Giornata finita</strong><p>Riposatevi: domani si riparte.</p></div>}
      {giorno.tappe.length > 0 && (
        <Gruppo titolo="Tutta la giornata" piede={<a href={hrefRotta('programma', indice)}>Apri nel Programma</a>}>
          {giorno.tappe.map(t => (
            <Riga key={t.id} icona={t.stato === 'fatta' ? <Check size={18} /> : <Circle size={18} />} titolo={t.titolo}
              sottotitolo={[t.ora, t.stato === 'saltata' ? 'saltata' : ''].filter(Boolean).join(' · ') || undefined} onClick={() => setAperta(t.id)} />
          ))}
        </Gruppo>
      )}
      <Stanotte indice={indice} />
      <FoglioTappa giornoId={giorno.id} tappaId={aperta} onChiudi={() => setAperta(null)} />
    </div>
  )
}
```

- [ ] **Step 7: "Prossimo" anche prima della partenza, "Stanotte" nel Programma**

In `src/schermate/oggi/PrimaDelViaggio.tsx` aggiungere l'import

```tsx
import { CardProssimo } from './CardProssimo'
```

dopo `import { Meteo } from './Meteo'`, e sostituire

```tsx
      <InvitoInstallazione />
```

con

```tsx
      <CardProssimo adesso={adesso} />
      <InvitoInstallazione />
```

(Il volo di andata parte il giorno prima del G0: la card compare quando mancano meno di 24 ore.)

In `src/schermate/programma/Programma.tsx` aggiungere l'import

```tsx
import { Stanotte } from '../oggi/Stanotte'
```

dopo `import { hrefRotta } from '../../ui/rotta'`, e sostituire

```tsx
      <ExtraGiorno giorno={giorno} />
```

con

```tsx
      <Stanotte indice={i} />
      <ExtraGiorno giorno={giorno} />
```

- [ ] **Step 8: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812, chiaro e scuro):
- `?oggi=2027-08-16T10:15#/oggi`: "Stanotte: Kyoto Gion Hotel" come prima (l'hotel dei dati di partenza è "da prenotare", quindi vale `Giorno.alloggio`); il tocco apre la scheda del tassista.
- In Documenti segnare "Kyoto Gion Hotel" come prenotata col codice `KGH-778`: nello stesso momento a Oggi "Stanotte" mostra il titolo della prenotazione, la riga "Codice KGH-778" (tocco → "Copiato") e "Prenotazione e allegati" che porta al dettaglio. Scrivere l'indirizzo giapponese nella scheda del tassista: compare anche nel dettaglio della prenotazione.
- `?oggi=2027-08-20T10:00#/oggi` (Osaka, hotel non prenotato): "Stanotte: Hotel Forza…" da `Giorno.alloggio`.
- Programma G8 e G10: gruppo "Stanotte" dopo la timeline con lo stesso hotel; G17 senza alloggio e senza prenotazione: niente gruppo.
- `?oggi=2027-08-07T09:30#/oggi` (prima della partenza): card "Prossimo: Volo fra 10 h" con "Volo Roma → Tokyo" e "Dettagli"; con un codice salvato compare il pulsante col codice.
- `?oggi=2027-08-15T12:00#/oggi` con il Kyoto Gion Hotel che ha check-in alle 15:00: "Prossimo: Hotel fra 3 h".
- Le etichette colorate si leggono in chiaro e in scuro; niente scroll orizzontale.

- [ ] **Step 9: Commit**

```bash
git add src/model/prenotazioni.ts src/model/prenotazioni.test.ts src/schermate/oggi src/schermate/programma/Programma.tsx
git commit -m "L'hotel prenotato copre le sue notti in Oggi e nel Programma; card Prossimo nelle 24 ore

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Spese — schermata, inserimento in tre tocchi, cambio, chi deve a chi

**Files:**
- Modify: `src/ui/icone.ts`, `src/schermate/spese/Spese.tsx` (riscritto intero, sostituisce la provvisoria)
- Create: `src/schermate/spese/FoglioSpesa.tsx`, `src/schermate/spese/ImpostazioniSpese.tsx`, `src/schermate/spese/spese.css`

**Interfaces:**
- Consumes: tutto `src/model/spese.ts` (Task 2), `scaricaCambio` (Task 2), `aggiornaImpostazioni`, `useScorrimento`, `riduciMovimento` (Task 8), `HREF_NUOVA_SPESA`, `hrefRotta`, `sostituisciRotta` (Task 7), `Foglio`, `Gruppo`, `Riga`, `Segmentato`, `Campo`, `Vuoto`.
- Produces: `ICONA_CATEGORIA: Record<CategoriaSpesa, LucideIcon>`, `ETICHETTA_CATEGORIA: Record<CategoriaSpesa, string>`; `FoglioSpesa({ aperto, iniziale: Spesa | null, onChiudi })`; `ImpostazioniSpese()`; `Spese({ id })` che apre il foglio quando `id === 'nuova'` e poi torna a `#/spese` senza lasciare `#/spese/nuova` nella cronologia.

- [ ] **Step 1: Icone delle categorie in `src/ui/icone.ts`**

Sostituire le prime due righe (come lasciate dal Task 8)

```ts
import { BedDouble, Car, Coffee, FileText, Footprints, Landmark, PartyPopper, Plane, Ticket, Train, TrainFront, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import type { InfoEvento, ModoSpostamento, TipoPrenotazione, TipoTappa } from '../model/tipi'
```

con

```ts
import { BedDouble, Car, Coffee, FileText, Footprints, Landmark, PartyPopper, Plane, Receipt, ShoppingBag, Ticket, Train, TrainFront, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import type { CategoriaSpesa, InfoEvento, ModoSpostamento, TipoPrenotazione, TipoTappa } from '../model/tipi'
```

e aggiungere in fondo al file:

```ts
export const ICONA_CATEGORIA: Record<CategoriaSpesa, LucideIcon> = { cibo: Utensils, trasporti: TramFront, alloggio: BedDouble, biglietti: Ticket, shopping: ShoppingBag, altro: Receipt }
export const ETICHETTA_CATEGORIA: Record<CategoriaSpesa, string> = { cibo: 'Cibo', trasporti: 'Trasporti', alloggio: 'Alloggio', biglietti: 'Biglietti', shopping: 'Shopping', altro: 'Altro' }
```

- [ ] **Step 2: Stili — creare `src/schermate/spese/spese.css`**

```css
.spese-filtro { margin: 4px 0 12px; }
.spese-totale { margin: 12px 0; display: grid; gap: 2px; }
.spese-totale-yen { font-size: 40px; line-height: 1.1; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.spese-quote { list-style: none; padding: 0; margin: 10px 0 0; display: grid; gap: 4px; }
.spese-quote li { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; }
.spese-quote b { font-variant-numeric: tabular-nums; }
.spese-metodi { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
.budget { margin: 12px 0; display: grid; gap: 8px; }
.budget-testa { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.budget-barra { height: 10px; border-radius: 5px; background: var(--riempimento); overflow: hidden; }
.budget-barra > div { height: 100%; background: var(--tinta-forte); border-radius: 5px; }
.budget-barra > div.oltre { background: var(--pericolo); }
.budget-oltre { color: var(--pericolo); font-weight: 600; }
.rimborso { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 16px; flex-wrap: wrap; }
.rimborso + .rimborso { border-top: 0.5px solid var(--bordo); }
.rimborso > div { min-width: 0; }
.spese-giorno { display: flex; justify-content: space-between; gap: 12px; }
.spesa-scorri { position: relative; overflow: hidden; }
.spesa-scorri + .spesa-scorri { border-top: 0.5px solid var(--bordo); }
.spesa-scorri-sotto {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-end; gap: 6px; padding-right: 16px;
  background: var(--pericolo); color: var(--su-pericolo); font-weight: 600;
}
.spesa-riga { position: relative; background: var(--superficie); touch-action: pan-y; }
button.spesa-riga:active { background: var(--superficie-2); }
.spesa-scorri.oltre .spesa-riga { background: var(--pericolo-sfondo); }
.spesa-importo { flex-direction: column; align-items: flex-end; gap: 0; color: var(--testo); font-variant-numeric: tabular-nums; }
.spesa-importo small { font-size: 12px; color: var(--testo-2); }
.importo-fila { align-items: flex-end; }
.importo-fila > .campo { flex: 1 1 150px; }
.importo-valuta { flex: 1 1 150px; margin: 12px 0; }
.importo-grande { font-size: 30px !important; font-weight: 700; font-variant-numeric: tabular-nums; }
.scelte { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.scelte.persone { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
.scelta {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; min-width: 0; padding: 0 8px;
  border-radius: 12px; border: 0.5px solid var(--bordo); background: var(--superficie); font-size: 15px; font-weight: 500; cursor: pointer;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.scelta[aria-checked='true'], .scelta[aria-pressed='true'] { background: var(--tinta-forte); color: var(--su-tinta); border-color: transparent; font-weight: 600; }
```

- [ ] **Step 3: Il foglio di inserimento — creare `src/schermate/spese/FoglioSpesa.tsx`**

```tsx
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { istanteTokyo } from '../../model/date'
import { aggiornaImpostazioni } from '../../model/operazioni'
import {
  aggiungiSpesa, cambioDaUsare, controllaSpesa, eliminaSpesa, formatoImporto, formatoNumero, leggiImporto, nuovaSpesa, sostituisciSpesa,
} from '../../model/spese'
import { CATEGORIE_SPESA, type MetodoPagamento, type Spesa, type Valuta } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo, Segmentato } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_CATEGORIA, ICONA_CATEGORIA } from '../../ui/icone'
import '../programma/editor.css'
import './spese.css'

const VALUTE: { valore: Valuta; etichetta: string }[] = [{ valore: 'JPY', etichetta: '¥ Yen' }, { valore: 'EUR', etichetta: '€ Euro' }]
const METODI: { valore: MetodoPagamento; etichetta: string }[] = [{ valore: 'contanti', etichetta: 'Contanti' }, { valore: 'carta', etichetta: 'Carta' }]
const ERRORE_IMPORTO = 'Scrivi un importo maggiore di zero.'

/** Nuova spesa (iniziale null) o modifica. Chi apre il foglio cambia `key` a ogni apertura. */
export function FoglioSpesa({ aperto, iniziale, onChiudi }: { aperto: boolean; iniziale: Spesa | null; onChiudi: () => void }) {
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo={iniziale ? 'Modifica spesa' : 'Nuova spesa'} pieno>
      {aperto && <EditorSpesa iniziale={iniziale} onFatto={onChiudi} />}
    </Foglio>
  )
}

/** Tre tocchi: l'importo ha già il focus, chi paga, categoria, valuta e metodo sono gli ultimi usati, si divide fra tutti. */
function EditorSpesa({ iniziale, onFatto }: { iniziale: Spesa | null; onFatto: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const adesso = useAdesso()
  const cambioNoto = cambioDaUsare(viaggio.impostazioni)
  const [b, setB] = useState<Spesa>(() => iniziale ?? nuovaSpesa(viaggio, adesso))
  const [importo, setImporto] = useState(() => (iniziale ? formatoNumero(iniziale.importo) : ''))
  const [cambio, setCambio] = useState(() => (iniziale ? formatoNumero(iniziale.cambio) : ''))
  const [errori, setErrori] = useState<string[]>([])
  const agg = (m: Partial<Spesa>) => { setB(x => ({ ...x, ...m })); setErrori([]) }
  // Il cambio si chiede solo se non se ne conosce nessuno (offline al primo uso); in modifica si può correggere.
  const chiediCambio = iniziale !== null || cambioNoto === null
  const divisa = (id: string) => b.divisaFra.includes(id)
  const alterna = (id: string) => agg({ divisaFra: viaggio.persone.map(p => p.id).filter(x => (x === id ? !divisa(id) : divisa(x))) })

  const salva = () => {
    const s: Spesa = {
      ...b,
      importo: leggiImporto(importo) ?? 0,
      cambio: chiediCambio ? leggiImporto(cambio) ?? 0 : cambioNoto ?? 0,
      descrizione: b.descrizione.trim() || ETICHETTA_CATEGORIA[b.categoria],
    }
    const e = controllaSpesa(s)
    if (e.length) { setErrori(e); return }
    const cambioScrittoOra = iniziale === null && cambioNoto === null
    applica(v => {
      const conSpesa = iniziale ? sostituisciSpesa(v, s) : aggiungiSpesa(v, s)
      // Il cambio scritto a mano diventa l'ultimo noto: vale per le prossime spese finché la BCE non ne dà uno nuovo.
      return cambioScrittoOra ? aggiornaImpostazioni(conSpesa, { ultimoCambio: { valore: s.cambio, data: istanteTokyo(adesso).data } }) : conSpesa
    })
    toast(iniziale ? 'Spesa aggiornata' : `Spesa di ${formatoImporto(s.importo, s.valuta)} salvata`)
    onFatto()
  }
  const elimina = () => {
    if (!iniziale) return
    applicaAnnullabile(v => eliminaSpesa(v, iniziale.id), 'Spesa eliminata')
    onFatto()
  }

  return (
    <form className="editor" onSubmit={e => { e.preventDefault(); salva() }}>
      <div className="fila importo-fila">
        <Campo etichetta="Importo">
          <input className="importo-grande" inputMode="decimal" autoFocus value={importo} placeholder="0" aria-invalid={errori.includes(ERRORE_IMPORTO)}
            onChange={e => { setImporto(e.target.value); setErrori([]) }} />
        </Campo>
        <div className="importo-valuta"><Segmentato etichetta="Valuta" valore={b.valuta} opzioni={VALUTE} onCambia={valuta => agg({ valuta })} /></div>
      </div>
      <Campo etichetta="Descrizione">
        <input value={b.descrizione} placeholder={ETICHETTA_CATEGORIA[b.categoria]} onChange={e => agg({ descrizione: e.target.value })} />
      </Campo>
      <div className="campo">
        <span className="etichetta-campo">Categoria</span>
        <div className="scelte" role="radiogroup" aria-label="Categoria">
          {CATEGORIE_SPESA.map(c => {
            const Icona = ICONA_CATEGORIA[c]
            return (
              <button key={c} type="button" role="radio" aria-checked={b.categoria === c} className="scelta" onClick={() => agg({ categoria: c })}>
                <Icona size={18} aria-hidden /> {ETICHETTA_CATEGORIA[c]}
              </button>
            )
          })}
        </div>
      </div>
      <div className="campo">
        <span className="etichetta-campo">Pagato da</span>
        <Segmentato etichetta="Pagato da" valore={b.pagatoDa} opzioni={viaggio.persone.map(p => ({ valore: p.id, etichetta: p.nome || '—' }))} onCambia={pagatoDa => agg({ pagatoDa })} />
      </div>
      <div className="campo">
        <span className="etichetta-campo">Diviso fra</span>
        <div className="scelte persone">
          {viaggio.persone.map(p => (
            <button key={p.id} type="button" className="scelta" aria-pressed={divisa(p.id)} onClick={() => alterna(p.id)}>{p.nome || '—'}</button>
          ))}
        </div>
      </div>
      <div className="campo"><Segmentato etichetta="Pagato in" valore={b.metodo} opzioni={METODI} onCambia={metodo => agg({ metodo })} /></div>
      <Campo etichetta="Data"><input type="date" value={b.data} onChange={e => e.target.value && agg({ data: e.target.value })} /></Campo>
      {chiediCambio && (
        <Campo etichetta="Cambio: quanti yen vale 1 euro">
          <input inputMode="decimal" value={cambio} placeholder="es. 162" onChange={e => { setCambio(e.target.value); setErrori([]) }} />
        </Campo>
      )}
      {errori.map(x => <p key={x} className="errore" role="alert">{x}</p>)}
      <div className="editor-azioni">
        <button type="submit" className="pulsante primario largo">Salva</button>
        {iniziale && <button type="button" className="pulsante pericolo largo" onClick={elimina}><Trash2 size={18} aria-hidden /> Elimina spesa</button>}
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Budget e cambio manuale — creare `src/schermate/spese/ImpostazioniSpese.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { formatoData } from '../../model/date'
import { aggiornaImpostazioni } from '../../model/operazioni'
import { formatoNumero, leggiImporto } from '../../model/spese'
import type { Impostazioni, Valuta } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo, Gruppo, Segmentato } from '../../ui/componenti'

const VALUTE: { valore: Valuta; etichetta: string }[] = [{ valore: 'JPY', etichetta: '¥ Yen' }, { valore: 'EUR', etichetta: '€ Euro' }]

/** Un numero scritto con la virgola, salvato quando si esce dal campo. */
function CampoNumero({ etichetta, valore, onCambia }: { etichetta: string; valore: number | undefined; onCambia: (n: number | null) => void }) {
  const [testo, setTesto] = useState(valore !== undefined ? formatoNumero(valore) : '')
  // Se il valore cambia altrove (un backup importato), il campo lo segue.
  useEffect(() => { setTesto(valore !== undefined ? formatoNumero(valore) : '') }, [valore])
  return (
    <Campo etichetta={etichetta}>
      <input inputMode="decimal" value={testo} onChange={e => setTesto(e.target.value)} onBlur={() => onCambia(leggiImporto(testo))}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
    </Campo>
  )
}

/** Budget di ogni giorno e cambio manuale, in fondo alle Spese. */
export function ImpostazioniSpese() {
  const imp = useViaggio(s => s.viaggio.impostazioni)
  const applica = useViaggio(s => s.applica)
  const budget = imp.budgetGiornaliero
  const [valuta, setValuta] = useState<Valuta>(budget?.valuta ?? 'JPY')
  const imposta = (m: Partial<Impostazioni>) => applica(v => aggiornaImpostazioni(v, m))
  const ultimo = imp.ultimoCambio
  const piede = ultimo
    ? `Ultimo cambio, del ${formatoData(ultimo.data, 'breve')}: 1 € = ${formatoNumero(ultimo.valore)} ¥ (BCE, o quello scritto in una spesa). Il cambio manuale vince su tutti; ogni spesa tiene il cambio del suo momento.`
    : 'Nessun cambio scaricato ancora: scrivilo qui, o riapri le Spese con la rete.'
  return (
    <Gruppo titolo="Budget e cambio" piede={piede}>
      <div style={{ padding: '4px 16px 8px' }}>
        <div className="fila">
          <CampoNumero etichetta="Budget di ogni giorno" valore={budget?.importo}
            onCambia={n => imposta({ budgetGiornaliero: n !== null && n > 0 ? { importo: n, valuta } : undefined })} />
          <div style={{ flex: 1, minWidth: 150 }}>
            <Segmentato etichetta="Valuta del budget" valore={valuta} opzioni={VALUTE}
              onCambia={x => { setValuta(x); if (budget) imposta({ budgetGiornaliero: { ...budget, valuta: x } }) }} />
          </div>
        </div>
        <CampoNumero etichetta="Cambio manuale (¥ per 1 €, vuoto = automatico)" valore={imp.cambioManuale}
          onCambia={n => imposta({ cambioManuale: n !== null && n > 0 ? n : undefined })} />
      </div>
    </Gruppo>
  )
}
```

- [ ] **Step 5: La schermata — riscrivere `src/schermate/spese/Spese.tsx`**

```tsx
import { Banknote, CreditCard, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { differenzaGiorni, formatoData } from '../../model/date'
import { aggiornaImpostazioni } from '../../model/operazioni'
import {
  aggiungiSpesa, cambioDaUsare, dataPredefinita, eliminaSpesa, formatoEuro, formatoImporto, formatoYen, inYen,
  riepilogoSpese, rimborsiMinimi, saldi, spesaRimborso, type Rimborso,
} from '../../model/spese'
import type { MetodoPagamento, Spesa } from '../../model/tipi'
import { scaricaCambio } from '../../servizi/cambio'
import { useViaggio } from '../../store/viaggio'
import { BarraNav, Gruppo, Riga, Segmentato, TitoloGrande, Vuoto } from '../../ui/componenti'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_CATEGORIA, ICONA_CATEGORIA } from '../../ui/icone'
import { HREF_NUOVA_SPESA, hrefRotta, sostituisciRotta } from '../../ui/rotta'
import { riduciMovimento, useScorrimento } from '../../ui/scorrimento'
import { FoglioSpesa } from './FoglioSpesa'
import { ImpostazioniSpese } from './ImpostazioniSpese'
import './spese.css'

type Filtro = 'tutte' | MetodoPagamento
const FILTRI: { valore: Filtro; etichetta: string }[] = [
  { valore: 'tutte', etichetta: 'Tutte' }, { valore: 'contanti', etichetta: 'Contanti' }, { valore: 'carta', etichetta: 'Carta' },
]

// Una richiesta sola per apertura dell'app; offline resta l'ultimo cambio salvato.
let cambioChiesto = false

function useCambioDelGiorno() {
  const applica = useViaggio(s => s.applica)
  useEffect(() => {
    if (cambioChiesto) return
    cambioChiesto = true
    void scaricaCambio().then(c => {
      if (!c) return
      const attuale = useViaggio.getState().viaggio.impostazioni.ultimoCambio
      if (c.valore !== attuale?.valore || c.data !== attuale?.data) applica(v => aggiornaImpostazioni(v, { ultimoCambio: c }))
    })
  }, [applica])
}

/** Una riga: scorrendo verso sinistra oltre 96 px si elimina (con "Annulla"); il tocco apre la modifica. */
function RigaSpesa({ spesa, nome, onApri, onElimina }: { spesa: Spesa; nome: string; onApri: () => void; onElimina: () => void }) {
  const { gestori, dx, oltre } = useScorrimento({ versi: ['sinistra'], soglia: 96, onScatta: onElimina })
  const Icona = ICONA_CATEGORIA[spesa.categoria]
  const sposta = dx !== 0 && !riduciMovimento()
  return (
    <div className={'spesa-scorri' + (oltre ? ' oltre' : '')}>
      <div className="spesa-scorri-sotto" aria-hidden><Trash2 size={18} /> Elimina</div>
      <button type="button" className="riga spesa-riga" onClick={onApri} {...gestori} style={sposta ? { transform: `translateX(${dx}px)` } : undefined}>
        <span className="riga-icona" aria-hidden><Icona size={20} /></span>
        <span className="riga-testo">
          <span>{spesa.descrizione}</span>
          <span className="riga-sotto" style={{ display: 'block' }}>{spesa.rimborso ? `Rimborso pagato da ${nome}` : `${nome} · ${spesa.metodo}`}</span>
        </span>
        <span className="riga-destra spesa-importo">
          <span>{formatoImporto(spesa.importo, spesa.valuta)}</span>
          {spesa.valuta === 'EUR' && <small>≈ {formatoYen(inYen(spesa))}</small>}
        </span>
      </button>
    </div>
  )
}

function Budget({ spesoYen, budgetYen, data }: { spesoYen: number; budgetYen: number; data: string }) {
  const oltre = spesoYen > budgetYen
  return (
    <div className="card budget">
      <div className="budget-testa">
        <strong>Oggi · {formatoData(data, 'breve')}</strong>
        <span className={oltre ? 'budget-oltre' : 'testo-2'}>{formatoYen(spesoYen)} di {formatoYen(budgetYen)}</span>
      </div>
      <div className="budget-barra" role="progressbar" aria-label="Budget di oggi" aria-valuemin={0} aria-valuemax={Math.round(budgetYen)}
        aria-valuenow={Math.round(Math.min(spesoYen, budgetYen))}>
        <div className={oltre ? 'oltre' : undefined} style={{ width: `${Math.min(100, (spesoYen / budgetYen) * 100)}%` }} />
      </div>
      <p className="testo-3">{oltre ? `Oltre il budget di ${formatoYen(spesoYen - budgetYen)}` : `Restano ${formatoYen(budgetYen - spesoYen)}`}</p>
    </div>
  )
}

export default function Spese({ id }: { id: string | null }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const adesso = useAdesso()
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [foglio, setFoglio] = useState<{ spesa: Spesa | null } | null>(null)
  const [chiave, setChiave] = useState(0)
  useCambioDelGiorno()
  const apri = (spesa: Spesa | null) => {
    setChiave(k => k + 1)
    setFoglio({ spesa })
  }
  // #/spese/nuova (dal tasto "+" o dalla scorciatoia dell'icona) apre subito il foglio.
  useEffect(() => { if (id === 'nuova') apri(null) }, [id])
  const chiudi = () => {
    setFoglio(null)
    if (location.hash === HREF_NUOVA_SPESA) sostituisciRotta(hrefRotta('spese'))
  }

  const nome = (pid: string) => viaggio.persone.find(p => p.id === pid)?.nome || '—'
  const cambio = cambioDaUsare(viaggio.impostazioni)
  const visibili = filtro === 'tutte' ? viaggio.spese : viaggio.spese.filter(s => s.metodo === filtro)
  const r = riepilogoSpese(visibili)
  const perMetodo = riepilogoSpese(viaggio.spese).perMetodo
  const rimborsi = rimborsiMinimi(saldi(viaggio.persone, viaggio.spese))
  const oggi = dataPredefinita(viaggio, adesso)
  const spesoOggi = riepilogoSpese(viaggio.spese.filter(s => s.data === oggi)).yen
  const budget = viaggio.impostazioni.budgetGiornaliero
  const budgetYen = !budget ? null : budget.valuta === 'JPY' ? budget.importo : cambio ? budget.importo * cambio : null
  // Un rimborso è una spesa: gli serve un cambio, quello di adesso o quello dell'ultima spesa.
  const cambioRimborsi = cambio ?? viaggio.spese[viaggio.spese.length - 1]?.cambio ?? null
  const equivalente = (yen: number) => (cambioRimborsi ? ` · ≈ ${formatoEuro(yen / cambioRimborsi)}` : '')
  const salda = (x: Rimborso) => {
    if (!cambioRimborsi) return
    applicaAnnullabile(v => aggiungiSpesa(v, spesaRimborso(x, oggi, cambioRimborsi)), `${nome(x.da)} ha saldato ${nome(x.a)}`)
  }
  const elimina = (s: Spesa) => applicaAnnullabile(v => eliminaSpesa(v, s.id), 'Spesa eliminata')
  const giornoDelViaggio = (data: string) => {
    const i = differenzaGiorni(viaggio.dataPartenza, data)
    return i >= 0 && i < viaggio.giorni.length ? ` · G${i}` : ''
  }

  return (
    <div className="schermata">
      <BarraNav titolo="Spese" />
      <TitoloGrande>Spese</TitoloGrande>
      {viaggio.spese.length === 0 ? (
        <Vuoto titolo="Ancora nessuna spesa" testo="Importo, chi ha pagato, salva: si divide fra tutti e i conti li fa l'app."
          azione={<button type="button" className="pulsante primario" onClick={() => apri(null)}>Aggiungi una spesa</button>} />
      ) : (
        <>
          <div className="spese-filtro"><Segmentato<Filtro> etichetta="Contanti o carta" valore={filtro} opzioni={FILTRI} onCambia={setFiltro} /></div>
          <div className="card spese-totale">
            <div className="testo-3">{filtro === 'tutte' ? 'Totale del viaggio' : filtro === 'contanti' ? 'Totale in contanti' : 'Totale con la carta'}</div>
            <div className="spese-totale-yen">{formatoYen(r.yen)}</div>
            <div className="testo-2">≈ {formatoEuro(r.euro)}</div>
            <ul className="spese-quote" aria-label="Quota di ciascuno">
              {viaggio.persone.map(p => <li key={p.id}><span>{p.nome || '—'}</span><b>{formatoYen(r.quote[p.id] ?? 0)}</b></li>)}
            </ul>
            {filtro === 'tutte' && (
              <p className="testo-3 spese-metodi">
                <Banknote size={14} aria-hidden /> Contanti {formatoYen(perMetodo.contanti)} · <CreditCard size={14} aria-hidden /> Carta {formatoYen(perMetodo.carta)}
              </p>
            )}
          </div>
          {budgetYen !== null && <Budget spesoYen={spesoOggi} budgetYen={budgetYen} data={oggi} />}
          <Gruppo titolo="Chi deve a chi" piede="In yen, col cambio di ogni spesa; il numero minimo di rimborsi.">
            {rimborsi.length === 0 ? <Riga titolo="Siete pari" /> : rimborsi.map(x => (
              <div key={`${x.da}-${x.a}`} className="rimborso">
                <div>
                  <strong>{nome(x.da)} → {nome(x.a)}</strong>
                  <div className="testo-2">{formatoYen(x.yen)}{equivalente(x.yen)}</div>
                </div>
                <button type="button" className="pulsante piccolo" onClick={() => salda(x)}>Segna come saldato</button>
              </div>
            ))}
          </Gruppo>
          {r.perCategoria.length > 0 && (
            <Gruppo titolo="Per categoria">
              {r.perCategoria.map(c => {
                const Icona = ICONA_CATEGORIA[c.categoria]
                return <Riga key={c.categoria} icona={<Icona size={20} />} titolo={ETICHETTA_CATEGORIA[c.categoria]} destra={formatoYen(c.yen)} />
              })}
            </Gruppo>
          )}
          {r.perGiorno.map(g => (
            <Gruppo key={g.data} titolo={<span className="spese-giorno"><span>{formatoData(g.data, 'breve')}{giornoDelViaggio(g.data)}</span><span>{formatoYen(g.yen)}</span></span>}>
              {g.spese.map(s => <RigaSpesa key={s.id} spesa={s} nome={nome(s.pagatoDa)} onApri={() => apri(s)} onElimina={() => elimina(s)} />)}
            </Gruppo>
          ))}
          {visibili.length > 0 && <p className="testo-3" style={{ margin: '0 16px' }}>Scorri una spesa verso sinistra per eliminarla.</p>}
        </>
      )}
      <ImpostazioniSpese />
      <FoglioSpesa key={chiave} aperto={foglio !== null} iniziale={foglio?.spesa ?? null} onChiudi={chiudi} />
    </div>
  )
}
```

- [ ] **Step 6: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812, chiaro e scuro); per i test del cambio, in DevTools → Network si può mettere "Offline":
- `#/spese` vuoto: "Ancora nessuna spesa" con "Aggiungi una spesa". Con la rete, alla prima apertura parte **una** richiesta a `api.frankfurter.dev`; in fondo compare "Ultimo cambio, del …: 1 € = … ¥".
- `#/spese/nuova`: il foglio si apre subito con il focus sull'importo (tastiera decimale sul telefono); scrivere `1500` e Salva: toast "Spesa di 1.500 ¥ salvata", l'indirizzo torna a `#/spese` e il tasto indietro del browser non riapre il foglio.
- Seconda spesa da `#/spese/nuova`: "Pagato da", categoria, valuta e metodo sono quelli della prima; "Diviso fra" ha tutte e tre le persone accese; senza nessuna persona accesa, Salva mostra "Scegli almeno una persona con cui dividere."; importo vuoto → "Scrivi un importo maggiore di zero.".
- Una spesa in euro (`12,50 €`): nella riga compare "≈ … ¥"; totale in ¥ e in €, quote di ciascuno.
- "Chi deve a chi": dopo una spesa di 3.000 ¥ pagata da Vito e divisa fra tre, due righe "Persona 2 → Vito 1.000 ¥ · ≈ …€"; "Segna come saldato" le fa sparire ("Siete pari") con toast e "Annulla"; nell'elenco del giorno compare "Rimborso", non conteggiato nel totale del giorno.
- Filtro Contanti/Carta: cambia totale ed elenco; con "Tutte" c'è la riga "Contanti … · Carta …".
- Budget di ogni giorno `10000` (uscire dal campo): compare la card "Oggi" con la barra; superato il budget la barra e il testo diventano rossi.
- Senza nessun cambio noto (finestra in incognito, Network → Offline prima di aprire `#/spese/nuova`): il foglio chiede "Cambio: quanti yen vale 1 euro"; scritto `160` e salvata la spesa, la successiva non lo chiede più.
- Scorrere una riga verso sinistra: appare il rosso "Elimina"; oltre la soglia la spesa sparisce con "Annulla". Con "Riduci animazioni" attivo la riga non si sposta ma si colora quando si supera la soglia.
- Nessuno scroll orizzontale; le scelte delle categorie stanno su due file di tre.

- [ ] **Step 7: Commit**

```bash
git add src/ui/icone.ts src/schermate/spese
git commit -m "Spese: inserimento in tre tocchi, cambio della BCE o manuale, totali, budget, chi deve a chi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Tasto "+" e "Aggiungi al calendario"

**Files:**
- Create: `src/schermate/aggiungi/Aggiungi.tsx`, `src/ui/Calendario.tsx`
- Modify: `src/App.tsx`, `src/ui/base.css`, `src/schermate/documenti/Documenti.tsx`, `src/schermate/impostazioni/Impostazioni.tsx`

**Interfaces:**
- Consumes: `FoglioNuovaTappa({ giornoId, aperto, onChiudi })` (fase 1, `programma/FoglioTappa.tsx`), `FoglioPrenotazione` (Task 8), `HREF_NUOVA_SPESA`, `hrefDocumento` (Task 7), `generaIcs`, `eventiCalendario`, `NOME_FILE_ICS` (Task 3), `condividiFile` (Task 5).
- Produces: `PulsanteAggiungi({ indiceGiorno }: { indiceGiorno: number })` (tasto tondo + foglio Spesa/Tappa/Prenotazione); `FoglioCalendario({ aperto, onChiudi })`.

- [ ] **Step 1: Il tasto e il suo foglio — creare `src/schermate/aggiungi/Aggiungi.tsx`**

```tsx
import { MapPin, Plus, Ticket, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useViaggio } from '../../store/viaggio'
import { Gruppo, Riga } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { HREF_NUOVA_SPESA, hrefDocumento } from '../../ui/rotta'
import { FoglioPrenotazione } from '../documenti/FoglioPrenotazione'
import { FoglioNuovaTappa } from '../programma/FoglioTappa'

type Scelta = 'spesa' | 'tappa' | 'prenotazione'

/** Il "+" tondo sopra la tab bar: spesa, tappa (nel giorno mostrato o di oggi), prenotazione. */
export function PulsanteAggiungi({ indiceGiorno }: { indiceGiorno: number }) {
  const giorno = useViaggio(s => s.viaggio.giorni[indiceGiorno])
  const [menu, setMenu] = useState(false)
  const [scelta, setScelta] = useState<Exclude<Scelta, 'spesa'> | null>(null)
  const [chiave, setChiave] = useState(0)
  const scegli = (s: Scelta) => {
    setMenu(false)
    // La spesa ha la sua rotta: apre le Spese col foglio già aperto.
    if (s === 'spesa') { location.hash = HREF_NUOVA_SPESA; return }
    setChiave(k => k + 1)
    setScelta(s)
  }
  return (
    <>
      <button type="button" className="fab" aria-label="Aggiungi spesa, tappa o prenotazione" onClick={() => setMenu(true)}>
        <Plus size={28} aria-hidden />
      </button>
      <Foglio aperto={menu} onChiudi={() => setMenu(false)} titolo="Aggiungi">
        <Gruppo>
          <Riga icona={<Wallet size={22} />} titolo="Spesa" sottotitolo="Quanto, chi ha pagato, per chi" onClick={() => scegli('spesa')} />
          {giorno && <Riga icona={<MapPin size={22} />} titolo="Tappa" sottotitolo={`Nel G${indiceGiorno} · ${giorno.titolo}`} onClick={() => scegli('tappa')} />}
          <Riga icona={<Ticket size={22} />} titolo="Prenotazione" sottotitolo="Volo, hotel, treno, biglietto, con QR e PDF" onClick={() => scegli('prenotazione')} />
        </Gruppo>
      </Foglio>
      {giorno && <FoglioNuovaTappa key={`tappa-${chiave}`} giornoId={giorno.id} aperto={scelta === 'tappa'} onChiudi={() => setScelta(null)} />}
      <FoglioPrenotazione key={`prenotazione-${chiave}`} aperto={scelta === 'prenotazione'} iniziale={null} onChiudi={() => setScelta(null)}
        onSalvata={id => { location.hash = hrefDocumento(id) }} />
    </>
  )
}
```

- [ ] **Step 2: Mostrarlo dove serve, mai sulla Mappa — `src/App.tsx`**

Aggiungere l'import

```tsx
import { PulsanteAggiungi } from './schermate/aggiungi/Aggiungi'
```

dopo `import { cittaDi } from './model/riepilogo'`. Subito dopo la riga `const colore = coloreSicuro(giorno ? cittaDi(viaggio, giorno).colore : '#C8452C')` aggiungere:

```tsx
  // Su Oggi, Programma, l'elenco dei Documenti e Spese; sulla Mappa coprirebbe i controlli.
  const conAggiungi = rotta.schermata === 'oggi' || rotta.schermata === 'programma' || rotta.schermata === 'spese'
    || (rotta.schermata === 'documenti' && rotta.id === null)
```

e sostituire

```tsx
      <TabBar attiva={rotta.schermata} />
```

con

```tsx
      {conAggiungi && <PulsanteAggiungi indiceGiorno={indice} />}
      <TabBar attiva={rotta.schermata} />
```

(`indice` è già il giorno mostrato nel Programma, o quello di oggi durante il viaggio, o il G0.)

- [ ] **Step 3: Stile del tasto — `src/ui/base.css`**

Sostituire

```css
.schermata { max-width: 720px; margin: 0 auto; padding: 0 16px calc(100px + env(safe-area-inset-bottom)); }
```

con

```css
.schermata { max-width: 720px; margin: 0 auto; padding: 0 16px calc(150px + env(safe-area-inset-bottom)); }
```

(il fondo della pagina deve poter salire sopra tab bar e tasto "+") e, dopo la regola `.indietro { … }`, aggiungere:

```css
.fab {
  position: fixed; z-index: 45; right: max(16px, calc((100vw - 720px) / 2 + 16px)); bottom: calc(56px + 16px + env(safe-area-inset-bottom));
  width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--tinta-forte); color: var(--su-tinta);
  display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28); cursor: pointer; transition: transform 0.12s ease;
}
.fab:active { transform: scale(0.94); }
```

- [ ] **Step 4: Il foglio del calendario — creare `src/ui/Calendario.tsx`**

```tsx
import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { eventiCalendario, generaIcs, NOME_FILE_ICS } from '../model/ics'
import { condividiFile } from '../servizi/condividi'
import { useViaggio } from '../store/viaggio'
import { Foglio } from './Foglio'

/** Genera giappone-2027.ics e lo condivide o lo scarica, come il backup. */
export function FoglioCalendario({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const [tappe, setTappe] = useState(false)
  const [lavoro, setLavoro] = useState(false)
  const quanti = eventiCalendario(viaggio, { tappe }).length
  const crea = async () => {
    setLavoro(true)
    try {
      const testo = generaIcs(useViaggio.getState().viaggio, { tappe, adesso: new Date() })
      const esito = await condividiFile(new File([testo], NOME_FILE_ICS, { type: 'text/calendar' }), 'Giappone 2027')
      if (esito === 'annullato') return
      toast(esito === 'condiviso' ? 'Calendario condiviso' : `${NOME_FILE_ICS} scaricato: aprilo per aggiungere gli eventi`)
      onChiudi()
    } finally {
      setLavoro(false)
    }
  }
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Aggiungi al calendario">
      <p style={{ margin: '8px 0' }}>
        Voli e treni con un avviso 3 ore prima, hotel e biglietti 1 ora prima, le scadenze per prenotare alle 9 di quel giorno
        e il tax-free 4 ore prima del volo di ritorno. Gli avvisi li dà il calendario: arrivano anche ad app chiusa.
      </p>
      <p className="testo-2" style={{ marginBottom: 8 }}>
        Rifacendo il file più avanti gli eventi hanno lo stesso identificativo: i calendari che lo supportano li aggiornano invece di duplicarli.
      </p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, margin: '8px 4px 16px' }}>
        <input type="checkbox" checked={tappe} onChange={e => setTappe(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--tinta-forte)' }} />
        Anche tutte le tappe del programma, senza avviso
      </label>
      <button type="button" className="pulsante primario largo" disabled={lavoro || quanti === 0} onClick={() => void crea()}>
        <CalendarPlus size={18} aria-hidden /> {quanti === 0 ? 'Nessun evento da aggiungere' : `Crea ${NOME_FILE_ICS} · ${quanti} eventi`}
      </button>
    </Foglio>
  )
}
```

- [ ] **Step 5: "Aggiungi al calendario" in Documenti**

In `src/schermate/documenti/Documenti.tsx` sostituire

```tsx
import { ListPlus, Plus } from 'lucide-react'
```

con

```tsx
import { CalendarPlus, ListPlus, Plus } from 'lucide-react'
```

aggiungere l'import

```tsx
import { FoglioCalendario } from '../../ui/Calendario'
```

dopo `import { useAggiungiDatiDiPartenza } from '../../ui/datiDiPartenza'`; in `ElencoDocumenti`, dopo `  const [chiave, setChiave] = useState(0)` aggiungere

```tsx
  const [calendario, setCalendario] = useState(false)
```

sostituire

```tsx
      <Gruppo>
        <Riga icona={<Plus size={20} />} titolo="Nuova prenotazione" onClick={apriNuova} destra={null} />
      </Gruppo>
```

con

```tsx
      <Gruppo>
        <Riga icona={<Plus size={20} />} titolo="Nuova prenotazione" onClick={apriNuova} destra={null} />
        <Riga icona={<CalendarPlus size={20} />} titolo="Aggiungi al calendario" sottotitolo="Promemoria che arrivano anche ad app chiusa" onClick={() => setCalendario(true)} destra={null} />
      </Gruppo>
```

e dopo la riga `<FoglioPrenotazione key={chiave} … />` aggiungere

```tsx
      <FoglioCalendario aperto={calendario} onChiudi={() => setCalendario(false)} />
```

- [ ] **Step 6: …e in Impostazioni**

In `src/schermate/impostazioni/Impostazioni.tsx` sostituire

```tsx
import { Check, Download, History, ListPlus, Plus, RotateCcw, Upload } from 'lucide-react'
```

con

```tsx
import { CalendarPlus, Check, Download, History, ListPlus, Plus, RotateCcw, Upload } from 'lucide-react'
```

aggiungere l'import

```tsx
import { FoglioCalendario } from '../../ui/Calendario'
```

dopo `import { useEsportaBackup } from '../../ui/Backup'`; dopo `  const [ripristino, setRipristino] = useState(false)` aggiungere

```tsx
  const [calendario, setCalendario] = useState(false)
```

subito prima di `      {installata` aggiungere

```tsx
      <Gruppo titolo="Promemoria" piede="Voli, treni, hotel e biglietti con i loro avvisi, le scadenze per prenotare e il tax-free del ritorno.">
        <Riga icona={<CalendarPlus size={20} />} titolo="Aggiungi al calendario" sottotitolo="giappone-2027.ics" onClick={() => setCalendario(true)} />
      </Gruppo>

```

e dopo `      <EditorCitta cittaId={cittaAperta} onChiudi={() => setCittaAperta(null)} />` aggiungere

```tsx
      <FoglioCalendario aperto={calendario} onChiudi={() => setCalendario(false)} />
```

- [ ] **Step 7: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812, chiaro e scuro):
- Il "+" tondo (56 px, colore della città, icona chiara leggibile) sta in basso a destra sopra la tab bar, a portata di pollice, su Oggi, Programma, Documenti e Spese; **non** c'è sulla Mappa, in Impostazioni e nel dettaglio di un documento. Scorrendo in fondo a ogni schermata l'ultimo elemento resta sopra il tasto.
- "+" → foglio con Spesa, Tappa, Prenotazione. Spesa → `#/spese/nuova` con il foglio aperto. Tappa dal Programma G8 → "Nel G8 · …", salvata compare nella timeline del G8; da Oggi (senza `?oggi`) va nel G0. Prenotazione → editor; salvata, si apre il suo dettaglio.
- Documenti → "Aggiungi al calendario": il pulsante dice quanti eventi (con i dati di partenza: 19 prenotazioni con inizio + tax-free = 20 eventi; con l'interruttore delle tappe molti di più). Sul computer scarica `giappone-2027.ics`; aprendolo con un editor di testo: righe che finiscono in CRLF, `DTSTART:20270807T103000Z` per il volo di andata, `UID:prenotazione-pr-volo-andata@jap-itinerario`, blocchi `VALARM`.
- Importato in Google Calendar (o Calendario di macOS): il volo di andata alle 12:30 ora italiana, gli hotel dal check-in al check-out, "Tax-free: rimborso in aeroporto prima del check-in" il 27 alle 16:00 ora di Tokyo.
- Impostazioni → gruppo "Promemoria" con la stessa riga.

- [ ] **Step 8: Commit**

```bash
git add src/schermate/aggiungi/Aggiungi.tsx src/ui/Calendario.tsx src/App.tsx src/ui/base.css src/schermate/documenti/Documenti.tsx src/schermate/impostazioni/Impostazioni.tsx
git commit -m "Tasto + per spese, tappe e prenotazioni; promemoria sul calendario da Documenti e Impostazioni

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Orari nelle tappe e ricerca su OpenStreetMap

**Files:**
- Modify: `src/model/orari.ts`, `src/model/orari.test.ts`, `src/schermate/programma/EditorTappa.tsx`, `src/schermate/programma/CardTappa.tsx`, `src/schermate/programma/VistaTappa.tsx`, `src/schermate/programma/editor.css`, `src/schermate/programma/programma.css`, `src/schermate/oggi/CardAdesso.tsx`, `src/schermate/oggi/DuranteIlViaggio.tsx`
- Create: `src/servizi/osm.ts`, `src/schermate/programma/EditorOrari.tsx`
- Test: `src/model/orari.test.ts`, `src/servizi/osm.test.ts`

**Interfaces:**
- Consumes: `statoApertura`, `avvisoApertura`, `descriviOrari`, `ORDINE_SETTIMANA` (Task 4), `SETTIMANA` (`date.ts`), `normalizzaTesto` (Task 4), `copia` (Task 8), `Badge`.
- Produces (`orari.ts`): `orariPuliti(o: OrariTappa | undefined): OrariTappa | undefined` (toglie i campi vuoti; undefined se non resta niente).
- Produces (`osm.ts`): `URL_OVERPASS`, `interface OrarioOsm { nome: string; orari: string }`, `terminiRicerca(testi: string[]): string[]`, `queryOverpass(termini: string[], lat: number, lng: number): string`, `leggiOverpass(j: unknown, termini: string[]): OrarioOsm[]`, `cercaOrariOsm(testi: string[], lat: number, lng: number, prendi?: (url: string, corpo: string) => Promise<unknown>): Promise<OrarioOsm[]>` (una richiesta; lancia se la rete non va).
- Produces (ui): `EditorOrari({ orari?, testi: string[], luogo?, onCambia })`; `CardAdesso` accetta `avviso?: string | null`.

- [ ] **Step 1: Test di `orariPuliti` e del servizio OSM**

In `src/model/orari.test.ts` sostituire

```ts
import { avvisoApertura, descriviOrari, statoApertura } from './orari'
```

con

```ts
import { avvisoApertura, descriviOrari, orariPuliti, statoApertura } from './orari'
```

e aggiungere in fondo:

```ts
test('orariPuliti', () => {
  expect(orariPuliti(undefined)).toBeUndefined()
  expect(orariPuliti({ chiusoIl: [], apre: '', nota: '  ', fonte: 'manuale' })).toBeUndefined()
  expect(orariPuliti({ chiusoIl: [3, 1, 3], apre: '09:00', chiude: '', nota: ' verifica ', fonte: 'manuale' }))
    .toEqual({ chiusoIl: [1, 3], apre: '09:00', nota: 'verifica', fonte: 'manuale' })
})
```

Creare `src/servizi/osm.test.ts`:

```ts
import { expect, test, vi } from 'vitest'
import { cercaOrariOsm, leggiOverpass, queryOverpass, terminiRicerca, URL_OVERPASS } from './osm'

test('terminiRicerca: parole di almeno 4 lettere, senza accenti, senza nomi di città', () => {
  expect(terminiRicerca(["Kinkaku-ji (Padiglione d'Oro)", 'Kinkaku-ji Kyoto'])).toEqual(['kinkaku', 'padiglione'])
  expect(terminiRicerca(['Tempio Tenryu-ji', 'Tenryu-ji Arashiyama Kyoto'])).toEqual(['tempio', 'tenryu', 'arashiyama'])
  expect(terminiRicerca(['Tōdai-ji'])).toEqual(['todai'])
  expect(terminiRicerca(['東京', 'Tokyo Station'])).toEqual([])
})

test('queryOverpass: entro 300 m, per nome, solo con opening_hours', () => {
  const q = queryOverpass(['kinkaku', 'padiglione'], 35.0394, 135.7292)
  expect(q.startsWith('[out:json][timeout:20];')).toBe(true)
  expect(q).toContain('nwr(around:300,35.0394,135.7292)["name"~"kinkaku|padiglione",i]["opening_hours"];')
  expect(q).toContain('nwr(around:300,35.0394,135.7292)["name:en"~"kinkaku|padiglione",i]["opening_hours"];')
  expect(q.endsWith('out tags 20;')).toBe(true)
})

const risposta = {
  elements: [
    { type: 'node', tags: { name: '金閣寺 売店', 'name:en': 'Kinkaku-ji shop', opening_hours: 'Mo-Su 10:00-16:00' } },
    { type: 'way', tags: { name: '鹿苑寺', 'name:en': 'Kinkaku-ji Temple', opening_hours: 'Mo-Su 09:00-17:00' } },
    { type: 'way', tags: { name: '鹿苑寺', 'name:en': 'Kinkaku-ji Temple', opening_hours: 'Mo-Su 09:00-17:00' } },
    { type: 'node', tags: { name: 'senza orari' } },
  ],
}

test('leggiOverpass: prima i nomi che somigliano di più, senza doppioni, orari così come sono', () => {
  expect(leggiOverpass(risposta, ['kinkaku', 'temple'])).toEqual([
    { nome: 'Kinkaku-ji Temple', orari: 'Mo-Su 09:00-17:00' },
    { nome: 'Kinkaku-ji shop', orari: 'Mo-Su 10:00-16:00' },
  ])
  expect(leggiOverpass({}, ['x'])).toEqual([])
})

test('cercaOrariOsm: una richiesta sola, e nessuna se non c\'è un nome da cercare', async () => {
  const prendi = vi.fn().mockResolvedValue(risposta)
  expect(await cercaOrariOsm(['Kinkaku-ji Temple'], 35.0394, 135.7292, prendi)).toHaveLength(2)
  expect(prendi).toHaveBeenCalledTimes(1)
  const [url, corpo] = prendi.mock.calls[0] as [string, string]
  expect(url).toBe(URL_OVERPASS)
  expect(corpo.startsWith('data=')).toBe(true)
  expect(decodeURIComponent(corpo.slice(5))).toContain('"kinkaku|temple"')
  const mai = vi.fn()
  expect(await cercaOrariOsm(['東京'], 35, 139, mai)).toEqual([])
  expect(mai).not.toHaveBeenCalled()
})
```

Run: `npm test -- src/model/orari.test.ts src/servizi/osm.test.ts`
Expected: FAIL, `orariPuliti` non esportata e `./osm` non si risolve.

- [ ] **Step 2: Implementare `orariPuliti` in fondo a `src/model/orari.ts`**

```ts
/** Gli orari senza campi vuoti, giorni in ordine e senza doppioni; undefined se non resta niente da dire. */
export function orariPuliti(o: OrariTappa | undefined): OrariTappa | undefined {
  if (!o) return undefined
  const p: OrariTappa = { chiusoIl: [...new Set(o.chiusoIl)].sort((a, b) => a - b) }
  if (o.apre) p.apre = o.apre
  if (o.chiude) p.chiude = o.chiude
  const nota = o.nota?.trim()
  if (nota) p.nota = nota
  if (p.chiusoIl.length === 0 && !p.apre && !p.chiude && !p.nota) return undefined
  if (o.fonte) p.fonte = o.fonte
  return p
}
```

- [ ] **Step 3: Implementare `src/servizi/osm.ts`**

```ts
import { normalizzaTesto } from '../model/ricerca'

export const URL_OVERPASS = 'https://overpass-api.de/api/interpreter'

export interface OrarioOsm { nome: string; orari: string }

/** Parole che non distinguono un luogo da quelli intorno. */
const PAROLE_VUOTE = new Set([
  'tokyo', 'kyoto', 'osaka', 'nara', 'kanazawa', 'nikko', 'hakone', 'kobe', 'japan', 'giappone',
  'station', 'stazione', 'della', 'delle', 'degli', 'dello',
])

/** Le parole del nome da cercare: minuscole, senza accenti, di almeno 4 lettere, al massimo 6. */
export function terminiRicerca(testi: string[]): string[] {
  const visti = new Set<string>()
  for (const t of testi) {
    for (const p of normalizzaTesto(t).split(/[^a-z0-9]+/)) {
      if (p.length >= 4 && !PAROLE_VUOTE.has(p)) visti.add(p)
    }
  }
  return [...visti].slice(0, 6)
}

/** Overpass QL: luoghi con `opening_hours` entro 300 m il cui nome (anche in inglese o italiano) contiene uno dei termini. */
export function queryOverpass(termini: string[], lat: number, lng: number): string {
  const re = termini.join('|')
  const righe = ['name', 'name:en', 'name:it', 'name:ja-Latn'].map(k => `  nwr(around:300,${lat},${lng})["${k}"~"${re}",i]["opening_hours"];`)
  return `[out:json][timeout:20];\n(\n${righe.join('\n')}\n);\nout tags 20;`
}

type Elemento = { tags?: Record<string, string | undefined> }

/** I luoghi trovati, i nomi più simili prima; `opening_hours` resta com'è: la sintassi OSM non si interpreta. */
export function leggiOverpass(j: unknown, termini: string[]): OrarioOsm[] {
  const elementi = (j as { elements?: unknown } | null)?.elements
  if (!Array.isArray(elementi)) return []
  const visti = new Set<string>()
  return (elementi as Elemento[])
    .flatMap(e => {
      const t = e?.tags
      const orari = t?.opening_hours
      if (!t || typeof orari !== 'string') return []
      const nome = t['name:it'] || t['name:en'] || t.name || ''
      const testo = normalizzaTesto([t.name, t['name:en'], t['name:it'], t['name:ja-Latn']].filter(Boolean).join(' '))
      return [{ nome, orari, punti: termini.filter(x => testo.includes(x)).length }]
    })
    .sort((a, b) => b.punti - a.punti)
    .filter(x => {
      const k = `${x.nome}|${x.orari}`
      if (visti.has(k)) return false
      visti.add(k)
      return true
    })
    .slice(0, 5)
    .map(({ nome, orari }) => ({ nome, orari }))
}

const inviaQuery = async (url: string, corpo: string): Promise<unknown> => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

/** Una richiesta sola, al tocco del pulsante. Senza un nome da cercare non parte niente. */
export async function cercaOrariOsm(testi: string[], lat: number, lng: number, prendi: (url: string, corpo: string) => Promise<unknown> = inviaQuery): Promise<OrarioOsm[]> {
  const termini = terminiRicerca(testi)
  if (termini.length === 0) return []
  return leggiOverpass(await prendi(URL_OVERPASS, 'data=' + encodeURIComponent(queryOverpass(termini, lat, lng))), termini)
}
```

Run: `npm test -- src/model/orari.test.ts src/servizi/osm.test.ts`
Expected: PASS.

- [ ] **Step 4: L'editor degli orari — creare `src/schermate/programma/EditorOrari.tsx`**

```tsx
import { Copy, Search } from 'lucide-react'
import { useState } from 'react'
import { SETTIMANA } from '../../model/date'
import { ORDINE_SETTIMANA } from '../../model/orari'
import type { Luogo, OrariTappa } from '../../model/tipi'
import { cercaOrariOsm, type OrarioOsm } from '../../servizi/osm'
import { Campo } from '../../ui/componenti'
import { copia } from '../../ui/copia'

interface Props {
  orari?: OrariTappa
  /** Testi con cui cercare il nome su OSM (il titolo della tappa); si aggiungono nome e query del luogo. */
  testi: string[]
  luogo?: Luogo
  onCambia: (o: OrariTappa) => void
}

/** Giorni di chiusura, apertura, chiusura e nota. I campi vuoti li toglie il Salva della tappa (`orariPuliti`). */
export function EditorOrari({ orari, testi, luogo, onCambia }: Props) {
  const o: OrariTappa = orari ?? { chiusoIl: [] }
  const [stato, setStato] = useState<'fermo' | 'cerca' | 'errore'>('fermo')
  const [trovati, setTrovati] = useState<OrarioOsm[] | null>(null)
  const agg = (m: Partial<OrariTappa>) => onCambia({ ...o, ...m, fonte: m.fonte ?? 'manuale' })
  const alterna = (g: number) => agg({ chiusoIl: o.chiusoIl.includes(g) ? o.chiusoIl.filter(x => x !== g) : [...o.chiusoIl, g] })
  const lat = luogo?.lat
  const lng = luogo?.lng
  const cerca = async () => {
    if (stato === 'cerca' || lat == null || lng == null || !luogo) return
    setStato('cerca')
    try {
      setTrovati(await cercaOrariOsm([...testi, luogo.nome, luogo.query], lat, lng))
      setStato('fermo')
    } catch {
      setStato('errore')
    }
  }
  return (
    <fieldset className="orari">
      <legend className="etichetta-campo">Orari di apertura</legend>
      <div className="giorni-chiusi" role="group" aria-label="Giorni di chiusura">
        {ORDINE_SETTIMANA.map(g => (
          <button key={g} type="button" className="giorno-chiuso" aria-pressed={o.chiusoIl.includes(g)}
            aria-label={`Chiuso ${g === 0 ? 'la' : 'il'} ${SETTIMANA[g]}`} onClick={() => alterna(g)}>
            {SETTIMANA[g].slice(0, 3)}
          </button>
        ))}
      </div>
      <p className="testo-3">Tocca i giorni in cui è chiuso.</p>
      <div className="fila">
        <Campo etichetta="Apre"><input type="time" value={o.apre ?? ''} onChange={e => agg({ apre: e.target.value || undefined })} /></Campo>
        <Campo etichetta="Chiude"><input type="time" value={o.chiude ?? ''} onChange={e => agg({ chiude: e.target.value || undefined })} /></Campo>
      </div>
      <Campo etichetta="Nota sugli orari">
        <input value={o.nota ?? ''} placeholder="Molti banchi chiusi il mercoledì e i festivi" onChange={e => agg({ nota: e.target.value })} />
      </Campo>
      {lat != null && lng != null
        ? (
          <button type="button" className="pulsante" disabled={stato === 'cerca'} onClick={() => void cerca()}>
            <Search size={18} aria-hidden /> {stato === 'cerca' ? 'Cerco…' : 'Cerca orari su OpenStreetMap'}
          </button>
        )
        : <p className="testo-3">Per cercare gli orari su OpenStreetMap serve un luogo con la posizione.</p>}
      {stato === 'errore' && <p className="errore">OpenStreetMap non è disponibile adesso: riprova più tardi.</p>}
      {trovati && (trovati.length === 0
        ? <p className="testo-2">Niente orari con questo nome entro 300 m.</p>
        : (
          <div className="gruppo-corpo orari-osm">
            {trovati.map((t, i) => (
              <div key={i} className="orario-osm">
                <div><strong>{t.nome || 'Senza nome'}</strong><code>{t.orari}</code></div>
                <div className="fila">
                  <button type="button" className="pulsante piccolo" onClick={() => copia(t.orari)}><Copy size={16} aria-hidden /> Copia</button>
                  <button type="button" className="pulsante piccolo" onClick={() => agg({ nota: t.orari, fonte: 'osm' })}>Metti nella nota</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      {trovati && trovati.length > 0 && <p className="testo-3">Gli orari di OpenStreetMap sono mostrati così come sono: riportali nei campi qui sopra.</p>}
    </fieldset>
  )
}
```

In fondo a `src/schermate/programma/editor.css` aggiungere:

```css
.orari { border: 0; padding: 0; margin: 16px 0; min-width: 0; display: grid; gap: 8px; }
.orari legend { padding: 0; margin: 0 0 6px 4px; }
.giorni-chiusi { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.giorno-chiuso {
  min-height: 44px; padding: 0; border-radius: 10px; border: 0.5px solid var(--bordo); background: var(--superficie);
  font-size: 14px; font-weight: 500; cursor: pointer; text-transform: capitalize;
}
.giorno-chiuso[aria-pressed='true'] { background: var(--pericolo-sfondo); color: var(--pericolo); border-color: var(--pericolo); font-weight: 700; text-decoration: line-through; }
.orario-osm { padding: 10px 12px; display: grid; gap: 8px; }
.orario-osm + .orario-osm { border-top: 0.5px solid var(--bordo); }
.orario-osm code { display: block; font-size: 14px; overflow-wrap: anywhere; color: var(--testo-2); margin-top: 2px; }
```

- [ ] **Step 5: Gli orari nell'editor della tappa — `src/schermate/programma/EditorTappa.tsx`**

Dopo `import { CercaLuogo } from './CercaLuogo'` aggiungere

```tsx
import { EditorOrari } from './EditorOrari'
```

e dopo `import { MODI_SPOSTAMENTO, TIPI_TAPPA, … } from '../../model/tipi'` aggiungere

```tsx
import { orariPuliti } from '../../model/orari'
```

In `salva`, sostituire

```tsx
    if (pulita.durataMin === undefined) delete pulita.durataMin
    onSalva(pulita)
```

con

```tsx
    if (pulita.durataMin === undefined) delete pulita.durataMin
    const orari = orariPuliti(pulita.orari)
    if (orari) pulita.orari = orari
    else delete pulita.orari
    onSalva(pulita)
```

e sostituire

```tsx
      <CercaLuogo etichetta="Luogo" luogo={b.luogo} citta={citta} onCambia={luogo => agg({ luogo })} />
```

con

```tsx
      <CercaLuogo etichetta="Luogo" luogo={b.luogo} citta={citta} onCambia={luogo => agg({ luogo })} />
      <EditorOrari orari={b.orari} testi={[b.titolo]} luogo={b.luogo} onCambia={orari => agg({ orari })} />
```

- [ ] **Step 6: Il badge sulla card e nel dettaglio**

In `src/schermate/programma/CardTappa.tsx` sostituire `import { Check, Navigation, Ticket } from 'lucide-react'` con `import { Check, Clock, Navigation, Ticket } from 'lucide-react'`, aggiungere `import { avvisoApertura } from '../../model/orari'` dopo `import { aggiornaTappa } from '../../model/operazioni'`, aggiungere dopo `  const promemoria = tappa.biglietti ? promemoriaBiglietto(data, oggi) : null`

```tsx
  const apertura = avvisoApertura(tappa, data)
```

e dopo `            {promemoria === 'prenota-ora' && <Badge tono="avviso">Prenota oggi</Badge>}`

```tsx
            {apertura && <Badge tono="avviso"><Clock size={12} aria-hidden /> {apertura}</Badge>}
```

In `src/schermate/programma/VistaTappa.tsx` sostituire `import { Footprints, Info, MapPin, Navigation, Ticket } from 'lucide-react'` con `import { Clock, Footprints, Info, MapPin, Navigation, Ticket } from 'lucide-react'`, aggiungere `import { avvisoApertura, descriviOrari } from '../../model/orari'` dopo `import { aggiornaTappa } from '../../model/operazioni'`, aggiungere dopo `  const fonte = linkSicuro(tappa.evento?.fonte)`

```tsx
  const apertura = avvisoApertura(tappa, data)
```

e sostituire

```tsx
      {tappa.consiglio && <p className="consiglio">{tappa.consiglio}</p>}
      <div className="vista-stato">
```

con

```tsx
      {tappa.consiglio && <p className="consiglio">{tappa.consiglio}</p>}
      {tappa.orari && (
        <div className="vista-orari">
          <Clock size={18} aria-hidden />
          <div>
            <div>{descriviOrari(tappa.orari)} {apertura && <Badge tono="avviso">{apertura}</Badge>}</div>
            {tappa.orari.nota && <div className="testo-2">{tappa.orari.nota}</div>}
          </div>
        </div>
      )}
      <div className="vista-stato">
```

In fondo a `src/schermate/programma/programma.css` aggiungere:

```css
.vista-orari { display: flex; gap: 10px; align-items: flex-start; margin: 10px 0; font-size: 15px; }
.vista-orari > svg { color: var(--tinta-testo); flex-shrink: 0; margin-top: 2px; }
```

- [ ] **Step 7: L'avviso nella card Adesso/Dopo di Oggi**

In `src/schermate/oggi/CardAdesso.tsx` aggiungere `import { Badge } from '../../ui/componenti'` dopo `import { urlIndicazioni } from '../../servizi/mappe'`, sostituire

```tsx
interface Props { etichetta: string; tappa: Tappa; onApri: () => void; onFatto?: () => void; secondaria?: boolean }

export function CardAdesso({ etichetta, tappa, onApri, onFatto, secondaria }: Props) {
```

con

```tsx
interface Props { etichetta: string; tappa: Tappa; onApri: () => void; onFatto?: () => void; secondaria?: boolean; avviso?: string | null }

export function CardAdesso({ etichetta, tappa, onApri, onFatto, secondaria, avviso }: Props) {
```

e dopo la riga `<p className="testo-2">{[orario, tappa.luogo?.nome !== tappa.titolo ? tappa.luogo?.nome : ''].filter(Boolean).join(' · ')}</p>` aggiungere

```tsx
          {avviso && <p style={{ marginTop: 6 }}><Badge tono="avviso">{avviso}</Badge></p>}
```

In `src/schermate/oggi/DuranteIlViaggio.tsx` aggiungere `import { avvisoApertura } from '../../model/orari'` dopo `import { aggiornaTappa } from '../../model/operazioni'`, sostituire

```tsx
      {ora && <CardAdesso etichetta="Adesso" tappa={ora} onApri={() => setAperta(ora.id)} onFatto={() => fatta(ora.id)} />}
```

con

```tsx
      {ora && <CardAdesso etichetta="Adesso" tappa={ora} avviso={avvisoApertura(ora, data)} onApri={() => setAperta(ora.id)} onFatto={() => fatta(ora.id)} />}
```

e

```tsx
        <CardAdesso secondaria tappa={dopo} onApri={() => setAperta(dopo.id)}
```

con

```tsx
        <CardAdesso secondaria tappa={dopo} avviso={avvisoApertura(dopo, data)} onApri={() => setAperta(dopo.id)}
```

- [ ] **Step 8: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812, chiaro e scuro), con i dati di partenza (o dopo "Aggiungi prenotazioni e orari del 2027"):
- Programma G3 (mercoledì 11 agosto): avviso giallo "Tsukiji Outer Market: oggi è mercoledì e festivo…"; aprendo la tappa, "chiuso la domenica" e la nota "Molti banchi chiusi il mercoledì e i festivi. Verifica sul sito prima di andare.".
- Programma G6, "Museo del 21 secolo" (sabato): nessun badge; nel dettaglio "10:00–18:00 · chiuso il lunedì". Modifica → spostare l'ora alle 09:00: sulla card compare il badge giallo con l'orologio "Apre alle 10:00"; segnare chiuso il sabato: "Chiuso il sabato".
- Nell'editor i 7 giorni stanno in una riga sola a 375 px, ognuno toccabile (44 px); un giorno chiuso è barrato in rosso.
- "Cerca orari su OpenStreetMap" sul Kinkaku-ji (G8): **una** richiesta POST a `overpass-api.de` (DevTools → Network), poi i risultati con `opening_hours` grezzo, "Copia" (toast "Copiato") e "Metti nella nota". Offline: "OpenStreetMap non è disponibile adesso: riprova più tardi.". Tappa senza luogo: la frase al posto del pulsante.
- Salvare con tutti i campi degli orari vuoti: la tappa non ha più `orari` (il dettaglio non mostra la riga).
- `?oggi=2027-08-14T09:00#/oggi` (G6) con il museo spostato alle 09:30: la card Adesso/Dopo del museo mostra "Apre alle 10:00".

- [ ] **Step 9: Commit**

```bash
git add src/model/orari.ts src/model/orari.test.ts src/servizi/osm.ts src/servizi/osm.test.ts src/schermate/programma src/schermate/oggi/CardAdesso.tsx src/schermate/oggi/DuranteIlViaggio.tsx
git commit -m "Orari di apertura nelle tappe: giorni chiusi, apertura e chiusura, avvisi sulle card e ricerca su OpenStreetMap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Ricerca in Programma e Documenti

**Files:**
- Create: `src/schermate/ricerca/Ricerca.tsx`
- Modify: `src/schermate/programma/Programma.tsx`, `src/schermate/documenti/Documenti.tsx`

**Interfaces:**
- Consumes: `cerca` (Task 4), `descriviQuando` (Task 8), `cittaDi`, `formatoData`, `ICONA_TIPO`, `ICONA_PRENOTAZIONE`, `hrefDocumento`, `FoglioTappa({ giornoId, tappaId, onChiudi })` (fase 1, sola lettura senza `modificabile`), `Foglio`, `Gruppo`, `Riga`.
- Produces: `PulsanteRicerca()` — lente da mettere in una `BarraNav`, con il suo foglio di ricerca e il foglio della tappa trovata.

- [ ] **Step 1: Lente e foglio — creare `src/schermate/ricerca/Ricerca.tsx`**

```tsx
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatoData } from '../../model/date'
import { descriviQuando } from '../../model/prenotazioni'
import { cerca } from '../../model/ricerca'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Gruppo, Riga } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { ICONA_PRENOTAZIONE, ICONA_TIPO } from '../../ui/icone'
import { hrefDocumento } from '../../ui/rotta'
import { FoglioTappa } from '../programma/FoglioTappa'

interface Props { aperto: boolean; onChiudi: () => void; onTappa: (giornoId: string, tappaId: string) => void }

/** Cerca in tappe e prenotazioni; maiuscole e accenti non contano. I risultati aprono il dettaglio. */
function FoglioRicerca({ aperto, onChiudi, onTappa }: Props) {
  const viaggio = useViaggio(s => s.viaggio)
  const [testo, setTesto] = useState('')
  const r = useMemo(() => cerca(viaggio, testo), [viaggio, testo])
  const q = testo.trim()
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Cerca" pieno>
      <input type="search" className="campo-in" autoFocus value={testo} enterKeyHint="search" aria-label="Cerca nel viaggio"
        placeholder="Tappe, note, prenotazioni, codici" onChange={e => setTesto(e.target.value)} />
      {q.length < 2 && <p className="testo-3" style={{ margin: '12px 4px' }}>Almeno due lettere. Maiuscole e accenti non contano.</p>}
      {q.length >= 2 && r.totale === 0 && <p className="testo-2" style={{ margin: '16px 4px' }}>Niente per "{q}".</p>}
      {r.prenotazioni.length > 0 && (
        <Gruppo titolo="Prenotazioni">
          {r.prenotazioni.map(p => {
            const Icona = ICONA_PRENOTAZIONE[p.tipo]
            return (
              <Riga key={p.id} icona={<Icona size={20} />} titolo={p.titolo || 'Senza titolo'}
                sottotitolo={[descriviQuando(p), p.codice].filter(Boolean).join(' · ') || undefined}
                onClick={() => { onChiudi(); location.hash = hrefDocumento(p.id) }} />
            )
          })}
        </Gruppo>
      )}
      {r.giorni.map(g => (
        <Gruppo key={g.giorno.id} titolo={`G${g.indice} · ${formatoData(g.data, 'breve')} · ${cittaDi(viaggio, g.giorno).nome}`}>
          {g.tappe.map(t => {
            const Icona = ICONA_TIPO[t.tipo]
            return <Riga key={t.id} icona={<Icona size={20} />} titolo={t.titolo} sottotitolo={t.ora ?? undefined} onClick={() => onTappa(g.giorno.id, t.id)} />
          })}
        </Gruppo>
      ))}
    </Foglio>
  )
}

/** La lente della barra in alto. La tappa trovata si apre in sola lettura, qualunque giorno sia. */
export function PulsanteRicerca() {
  const [aperto, setAperto] = useState(false)
  const [tappa, setTappa] = useState<{ giornoId: string; tappaId: string } | null>(null)
  return (
    <>
      <button type="button" className="pulsante-icona" aria-label="Cerca" onClick={() => setAperto(true)}>
        <Search size={22} aria-hidden />
      </button>
      <FoglioRicerca aperto={aperto} onChiudi={() => setAperto(false)}
        onTappa={(giornoId, tappaId) => { setAperto(false); setTappa({ giornoId, tappaId }) }} />
      <FoglioTappa giornoId={tappa?.giornoId ?? null} tappaId={tappa?.tappaId ?? null} onChiudi={() => setTappa(null)} />
    </>
  )
}
```

- [ ] **Step 2: La lente nelle due barre**

In `src/schermate/programma/Programma.tsx` aggiungere l'import

```tsx
import { PulsanteRicerca } from '../ricerca/Ricerca'
```

dopo `import { Stanotte } from '../oggi/Stanotte'`, e sostituire

```tsx
      <BarraNav titolo={`G${i} · ${citta.nome}`} destra={pulsanteModifica} />
```

con

```tsx
      <BarraNav titolo={`G${i} · ${citta.nome}`} sinistra={<PulsanteRicerca />} destra={pulsanteModifica} />
```

In `src/schermate/documenti/Documenti.tsx` aggiungere l'import

```tsx
import { PulsanteRicerca } from '../ricerca/Ricerca'
```

dopo `import { FoglioPrenotazione } from './FoglioPrenotazione'`, e sostituire

```tsx
      <BarraNav titolo="Documenti" />
```

con

```tsx
      <BarraNav titolo="Documenti" destra={<PulsanteRicerca />} />
```

- [ ] **Step 3: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812, chiaro e scuro):
- Programma: lente in alto a sinistra (44 px), "Modifica" resta a destra, il titolo "G3 · Tokyo" non si sovrappone. Documenti: lente in alto a destra.
- Foglio "Cerca" con il campo già attivo. "todai" trova "Todai-ji (Grande Buddha)" sotto "G7 · dom 15 ago · Kyoto"; "TSUKIJI" trova la tappa del G3; "caffe" trova anche testi con "caffè".
- Un codice di conferma salvato in una prenotazione (es. `ABC123`): cercando "abc1" compare nel gruppo "Prenotazioni"; il tocco chiude il foglio e apre il dettaglio.
- Il tocco su una tappa chiude la ricerca e apre la tappa in sola lettura, anche se è di un altro giorno; chiusa, si resta sul giorno di prima.
- Una sola lettera: il suggerimento "Almeno due lettere…"; niente risultati: "Niente per …".

- [ ] **Step 4: Commit**

```bash
git add src/schermate/ricerca/Ricerca.tsx src/schermate/programma/Programma.tsx src/schermate/documenti/Documenti.tsx
git commit -m "Ricerca in tappe e prenotazioni dalla lente di Programma e Documenti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Comodità — scorri per segnare, schermo acceso, scorciatoie, spazio usato

**Files:**
- Modify: `src/schermate/programma/CardTappa.tsx` (riscritto intero), `src/schermate/programma/Timeline.tsx`, `src/schermate/programma/programma.css`, `src/ui/tema.css`, `src/ui/base.css`, `src/schermate/oggi/DuranteIlViaggio.tsx`, `src/schermate/impostazioni/Impostazioni.tsx`, `vite.config.ts`, `package.json`
- Create: `src/ui/SchermoAcceso.tsx`, `src/ui/SpazioUsato.tsx`, `scripts/icone-scorciatoie.ts`, `public/scorciatoia-oggi-96.png`, `public/scorciatoia-spesa-96.png` (generati)

**Interfaces:**
- Consumes: `useScorrimento`, `riduciMovimento` (Task 8), `avvisoApertura` (Task 4), `byteAllegati`, `formatoByte` (Task 5), `Gruppo`, `Riga`.
- Produces: `CardTappa` accetta `scorrevole?: boolean` (scorrendo a destra oltre 72 px alterna fatta/da fare); `InterruttoreSchermo()` (null dove la Wake Lock API non c'è); `SpazioUsato()`; manifest con `shortcuts` "Oggi" (`#/oggi`) e "Aggiungi spesa" (`#/spese/nuova`) e icone 96 px; script `npm run icone-scorciatoie`.

- [ ] **Step 1: Scorri per segnare — riscrivere `src/schermate/programma/CardTappa.tsx`**

```tsx
import { Check, Clock, Navigation, Ticket } from 'lucide-react'
import type { ReactNode } from 'react'
import { promemoriaBiglietto, type Promemoria } from '../../model/adesso'
import { formatoDurata, istanteTokyo } from '../../model/date'
import { aggiornaTappa } from '../../model/operazioni'
import { avvisoApertura } from '../../model/orari'
import type { Tappa } from '../../model/tipi'
import { hrefBiglietti, urlIndicazioni } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Badge } from '../../ui/componenti'
import { FotoLuogo } from '../../ui/FotoLuogo'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_AFFIDABILITA, ETICHETTA_TIPO, ICONA_TIPO } from '../../ui/icone'
import { riduciMovimento, useScorrimento } from '../../ui/scorrimento'

export function testoPromemoria(p: Promemoria): string {
  return { 'prenota-ora': 'La visita è domani: prenota adesso', oggi: 'La visita è oggi', futuro: 'Prenota per tempo', passato: '' }[p]
}

interface Props {
  tappa: Tappa
  giornoId: string
  data: string
  onApri: () => void
  maniglia?: ReactNode
  /** Scorrendo verso destra oltre 72 px si alterna fatta / da fare. Spento in modalità Modifica. */
  scorrevole?: boolean
}

export function CardTappa({ tappa, giornoId, data, onApri, maniglia, scorrevole = false }: Props) {
  const applica = useViaggio(s => s.applica)
  const oggi = istanteTokyo(useAdesso()).data
  const Icona = ICONA_TIPO[tappa.tipo]
  const fatta = tappa.stato === 'fatta'
  const promemoria = tappa.biglietti ? promemoriaBiglietto(data, oggi) : null
  const apertura = avvisoApertura(tappa, data)
  const alterna = () => applica(v => aggiornaTappa(v, giornoId, tappa.id, { stato: fatta ? 'da-fare' : 'fatta' }))
  const { gestori, dx, oltre } = useScorrimento({ versi: ['destra'], soglia: 72, attivo: scorrevole, onScatta: alterna })
  // Con "riduci animazioni" la card non si sposta: si vede solo l'etichetta e il bordo quando il gesto scatta.
  const sposta = dx !== 0 && !riduciMovimento()
  const card = (
    <article className={'card-tappa' + (fatta ? ' fatta' : '') + (tappa.stato === 'saltata' ? ' saltata' : '') + (oltre ? ' oltre' : '')}
      {...(scorrevole ? gestori : {})} style={sposta ? { transform: `translateX(${dx}px)` } : undefined}>
      <button type="button" className="card-tappa-apri" onClick={onApri}>
        {tappa.luogo && tappa.tipo !== 'spostamento' && <FotoLuogo query={tappa.luogo.query} override={tappa.foto} className="card-tappa-foto" />}
        <div className="card-tappa-testo">
          <div className="card-tappa-meta">
            <Icona size={14} aria-hidden /> {ETICHETTA_TIPO[tappa.tipo]}
            {tappa.durataMin ? ` · ${formatoDurata(tappa.durataMin)}` : ''}
            {tappa.evento && <Badge tono={tappa.evento.affidabilita === 'certa' ? 'tinta' : 'avviso'}>{ETICHETTA_AFFIDABILITA[tappa.evento.affidabilita]}</Badge>}
            {promemoria === 'prenota-ora' && <Badge tono="avviso">Prenota oggi</Badge>}
            {apertura && <Badge tono="avviso"><Clock size={12} aria-hidden /> {apertura}</Badge>}
          </div>
          <h3>{tappa.titolo}</h3>
          {tappa.descrizione && <p className="clamp-3">{tappa.descrizione}</p>}
          {tappa.consiglio && <p className="consiglio">{tappa.consiglio}</p>}
          {tappa.nota && <p className="nota-personale">{tappa.nota}</p>}
        </div>
      </button>
      <div className="card-tappa-azioni">
        {tappa.luogo && (
          <a className="pulsante piccolo" href={urlIndicazioni(tappa.luogo)} target="_blank" rel="noreferrer">
            <Navigation size={16} aria-hidden /> Vai
          </a>
        )}
        {tappa.biglietti && (
          <a className="pulsante piccolo" href={hrefBiglietti(tappa)} target="_blank" rel="noreferrer">
            <Ticket size={16} aria-hidden /> Biglietti
          </a>
        )}
        <button type="button" className={'pulsante piccolo' + (fatta ? ' pieno' : '')} aria-pressed={fatta} onClick={alterna}>
          <Check size={16} aria-hidden /> {fatta ? 'Fatta' : 'Fatto'}
        </button>
        {maniglia}
      </div>
    </article>
  )
  if (!scorrevole) return card
  return (
    <div className="card-tappa-scorri">
      <div className={'card-tappa-sotto' + (dx > 0 ? ' visibile' : '')} aria-hidden><Check size={20} /> {fatta ? 'Da fare' : 'Fatta'}</div>
      {card}
    </div>
  )
}
```

In `src/schermate/programma/Timeline.tsx` sostituire

```tsx
      {children ?? <CardTappa tappa={tappa} giornoId={giornoId} data={data} onApri={() => onApri(tappa.id)} />}
```

con

```tsx
      {children ?? <CardTappa tappa={tappa} giornoId={giornoId} data={data} onApri={() => onApri(tappa.id)} scorrevole />}
```

(La card in modalità Modifica è quella di `VoceOrdinabile`, con la maniglia e senza `scorrevole`: il gesto non c'è e non può partire dalla maniglia.)

In fondo a `src/schermate/programma/programma.css` aggiungere:

```css
.card-tappa-scorri { position: relative; border-radius: 16px; }
.card-tappa-scorri > .card-tappa { position: relative; touch-action: pan-y; }
.card-tappa-sotto {
  position: absolute; inset: 0; border-radius: 16px; display: flex; align-items: center; gap: 8px; padding-left: 20px;
  background: var(--successo); color: var(--su-successo); font-weight: 700; opacity: 0;
}
.card-tappa-sotto.visibile { opacity: 1; }
.card-tappa.oltre { box-shadow: 0 0 0 3px var(--successo); }
```

In `src/ui/tema.css`, nel blocco chiaro dopo `  --successo: #2e7d4f;` aggiungere `  --su-successo: #ffffff;`, e nel blocco scuro dopo `  --successo: #4cc38a;` aggiungere `  --su-successo: #111114;` (bianco su `#2e7d4f` ≈ 5,2:1; `#111114` su `#4cc38a` ≈ 9:1).

- [ ] **Step 2: Schermo sempre acceso — creare `src/ui/SchermoAcceso.tsx`**

```tsx
import { SunMedium } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Gruppo } from './componenti'

/** "Tieni acceso lo schermo" con la Wake Lock API; si riattiva quando l'app torna visibile. Dove l'API non c'è non compare. */
export function InterruttoreSchermo() {
  const disponibile = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [acceso, setAcceso] = useState(false)
  const sentinella = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!acceso || !disponibile) return
    let vivo = true
    const chiedi = async () => {
      if (sentinella.current && !sentinella.current.released) return
      try {
        const s = await navigator.wakeLock.request('screen')
        if (!vivo) { void s.release(); return }
        sentinella.current = s
      } catch {
        if (vivo && document.visibilityState === 'visible') {
          setAcceso(false)
          toast('Lo schermo non può restare acceso adesso.')
        }
      }
    }
    // Il sistema toglie il blocco quando l'app va in secondo piano: al ritorno lo si chiede di nuovo.
    const visibile = () => { if (document.visibilityState === 'visible') void chiedi() }
    void chiedi()
    document.addEventListener('visibilitychange', visibile)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', visibile)
      void sentinella.current?.release().catch(() => {})
      sentinella.current = null
    }
  }, [acceso, disponibile])
  if (!disponibile) return null
  return (
    <Gruppo piede="Finché Oggi resta aperta: comodo con il QR o la scheda del taxi in mano.">
      <label className="riga interruttore-riga">
        <span className="riga-icona" aria-hidden><SunMedium size={20} /></span>
        <span className="riga-testo">Tieni acceso lo schermo</span>
        <input type="checkbox" role="switch" checked={acceso} onChange={e => setAcceso(e.target.checked)} />
      </label>
    </Gruppo>
  )
}
```

In fondo a `src/ui/base.css` (prima del blocco `@media (prefers-reduced-motion: reduce)`) aggiungere:

```css
.interruttore-riga { cursor: pointer; }
.interruttore-riga input { width: 22px; height: 22px; accent-color: var(--tinta-forte); flex-shrink: 0; }
```

In `src/schermate/oggi/DuranteIlViaggio.tsx` aggiungere l'import

```tsx
import { InterruttoreSchermo } from '../../ui/SchermoAcceso'
```

dopo `import { hrefRotta } from '../../ui/rotta'`, e sostituire

```tsx
      <Stanotte indice={indice} />
```

con

```tsx
      <Stanotte indice={indice} />
      <InterruttoreSchermo />
```

- [ ] **Step 3: Spazio usato — creare `src/ui/SpazioUsato.tsx`**

```tsx
import { HardDrive } from 'lucide-react'
import { useEffect, useState } from 'react'
import { byteAllegati, formatoByte } from '../servizi/allegati'
import { useViaggio } from '../store/viaggio'
import { Riga } from './componenti'

/** Quanto pesano gli allegati e quanto occupa l'app in tutto (dati, allegati, mappe e foto in cache). */
export function SpazioUsato() {
  const allegati = useViaggio(s => byteAllegati(s.viaggio))
  const [stima, setStima] = useState<{ usato: number; quota?: number } | null>(null)
  useEffect(() => {
    let vivo = true
    navigator.storage?.estimate?.().then(s => { if (vivo && typeof s.usage === 'number') setStima({ usato: s.usage, quota: s.quota }) }, () => {})
    return () => { vivo = false }
  }, [])
  const tutto = stima ? `in tutto ${formatoByte(stima.usato)}${stima.quota ? ` su ${formatoByte(stima.quota)} disponibili` : ''}, con mappe e foto` : null
  return <Riga icona={<HardDrive size={20} />} titolo="Spazio usato" sottotitolo={[`Allegati ${formatoByte(allegati)}`, tutto].filter(Boolean).join(' · ')} />
}
```

In `src/schermate/impostazioni/Impostazioni.tsx` aggiungere l'import

```tsx
import { SpazioUsato } from '../../ui/SpazioUsato'
```

dopo `import { hrefRotta } from '../../ui/rotta'`, e sostituire

```tsx
        <Riga icona={<ListPlus size={20} />} titolo="Aggiungi prenotazioni e orari del 2027" sottotitolo="Solo quelli che mancano su questo telefono" onClick={aggiungiPartenza} />
```

con

```tsx
        <Riga icona={<ListPlus size={20} />} titolo="Aggiungi prenotazioni e orari del 2027" sottotitolo="Solo quelli che mancano su questo telefono" onClick={aggiungiPartenza} />
        <SpazioUsato />
```

- [ ] **Step 4: Icone delle scorciatoie**

```bash
npm install -D sharp@0.35.5
```

(È la versione che `@vite-pwa/assets-generator` ha già portato in `node_modules`: la si dichiara perché la usa uno script nostro.)

Creare `scripts/icone-scorciatoie.ts`:

```ts
import sharp from 'sharp'

// Due disegni semplici sul fondo Washi: un sole per "Oggi", un portafoglio col "+" per "Aggiungi spesa".
const SFONDO = '#F6F1E7'
const ROSSO = '#C8452C'
const INCHIOSTRO = '#1D1B18'
const ICONE: Record<string, string> = {
  'scorciatoia-oggi': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${SFONDO}"/><circle cx="48" cy="48" r="16" fill="${ROSSO}"/><path d="M48 14v10M48 72v10M14 48h10M72 48h10M24 24l7 7M65 65l7 7M24 72l7-7M65 31l7-7" stroke="${ROSSO}" stroke-width="6" stroke-linecap="round"/></svg>`,
  'scorciatoia-spesa': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${SFONDO}"/><rect x="14" y="26" width="56" height="42" rx="8" fill="none" stroke="${INCHIOSTRO}" stroke-width="6"/><circle cx="70" cy="66" r="17" fill="${ROSSO}"/><path d="M70 57v18M61 66h18" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/></svg>`,
}

for (const [nome, svg] of Object.entries(ICONE)) {
  const file = `public/${nome}-96.png`
  await sharp(Buffer.from(svg)).resize(96, 96).png().toFile(file)
  console.log(file)
}
```

In `package.json`, nella sezione `scripts`, dopo `"icone": "pwa-assets-generator"` aggiungere (con la virgola dopo la riga precedente):

```json
    "icone-scorciatoie": "tsx scripts/icone-scorciatoie.ts"
```

Run: `npm run icone-scorciatoie`
Expected: stampa `public/scorciatoia-oggi-96.png` e `public/scorciatoia-spesa-96.png`; i due file esistono.

- [ ] **Step 5: Scorciatoie nel manifest — `vite.config.ts`**

Sostituire

```ts
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
```

con

```ts
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Tenendo premuta l'icona (Android): Oggi, e una spesa nuova col foglio già aperto.
        shortcuts: [
          { name: 'Oggi', short_name: 'Oggi', url: '/jap-itinerario/#/oggi', icons: [{ src: 'scorciatoia-oggi-96.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Aggiungi spesa', short_name: 'Spesa', url: '/jap-itinerario/#/spese/nuova', icons: [{ src: 'scorciatoia-spesa-96.png', sizes: '96x96', type: 'image/png' }] },
        ],
      },
```

- [ ] **Step 6: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Run: `node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('dist/manifest.webmanifest','utf8')).shortcuts))"`
Expected: le due scorciatoie con `url` `/jap-itinerario/#/oggi` e `/jap-itinerario/#/spese/nuova`; `dist/scorciatoia-oggi-96.png` e `dist/scorciatoia-spesa-96.png` esistono.

Nella preview (375×812, chiaro e scuro; il gesto si prova con DevTools in modalità touch):
- Programma G8: trascinando una card verso destra la card segue il dito e dietro compare l'etichetta verde "Fatta"; oltre 72 px compare il bordo verde e, lasciando, la tappa diventa fatta (pulsante "Fatta" pieno); rifacendo il gesto torna da fare ("Da fare" sull'etichetta). Un gesto più verticale che orizzontale scorre la pagina e non segna niente; dopo il gesto non si apre il dettaglio.
- In modalità Modifica il gesto non fa niente e il riordino con la maniglia funziona come prima.
- Con "Riduci animazioni" del sistema (DevTools → Rendering → prefers-reduced-motion): la card non si sposta, ma il gesto oltre soglia mostra il bordo verde e segna la tappa.
- `?oggi=2027-08-16T10:15#/oggi` in Chrome: riga "Tieni acceso lo schermo" con interruttore; acceso, `navigator.wakeLock` è attivo (in console `document.visibilityState` e nessun errore); cambiando scheda e tornando resta acceso. In un browser senza Wake Lock la riga non c'è.
- Impostazioni → Dati: "Spazio usato · Allegati … · in tutto … su … disponibili, con mappe e foto".
- Il manifest (DevTools → Application → Manifest) mostra le due scorciatoie con le icone da 96 px.

- [ ] **Step 7: Commit**

```bash
git add src/schermate/programma/CardTappa.tsx src/schermate/programma/Timeline.tsx src/schermate/programma/programma.css src/ui/tema.css src/ui/base.css src/ui/SchermoAcceso.tsx src/ui/SpazioUsato.tsx src/schermate/oggi/DuranteIlViaggio.tsx src/schermate/impostazioni/Impostazioni.tsx scripts/icone-scorciatoie.ts public/scorciatoia-oggi-96.png public/scorciatoia-spesa-96.png vite.config.ts package.json package-lock.json
git commit -m "Comodità: scorri per segnare la tappa, schermo sempre acceso, scorciatoie dall'icona, spazio usato

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Verifica finale, guida di prova, README

**Files:**
- Create: `docs/PROVA-FASE-2.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: tutto quanto sopra.
- Produces: la guida di prova della fase 2 e il README aggiornato; nessun codice nuovo.

- [ ] **Step 1: Suite, typecheck e build da zero**

Run: `npm test && npm run build`
Expected: PASS, build riuscita, nessun avviso di TypeScript.

Run: `git grep -n "schermate/viaggio\|SchermataViaggio\|'viaggio'" -- src`
Expected: nessun risultato tranne `type Ambito = 'giorno' | 'viaggio'` e le sue opzioni in `src/schermate/mappa/Mappa.tsx` (l'ambito della mappa) e `Pick<StatoApp, 'viaggio' | 'sceltaV1'>` in `src/store/viaggio.ts` (il campo dello store): nessuno dei due è la rotta.

Run: `npm run genera-base && git status --porcelain src/data`
Expected: nessuna modifica (i dati di partenza sono già quelli dello script).

- [ ] **Step 2: Scrivere `docs/PROVA-FASE-2.md`**

```markdown
# Fase 2 — cosa è cambiato e come provarla

## Novità
- **Tab bar a cinque voci**, più grande e leggibile: Oggi · Programma · Mappa · Documenti · Spese. Le impostazioni (la vecchia scheda Viaggio) si aprono dall'ingranaggio in alto a sinistra di Oggi.
- **Tasto "+"** in basso a destra (non sulla Mappa): spesa, tappa, prenotazione.
- **Documenti**: voli, hotel, treni, biglietti e ristoranti, con codice copiabile con un tocco, foto del QR e PDF che restano offline, visualizzatore a tutto schermo su fondo bianco per lo scanner, scadenze "da prenotare entro" in rosso quando mancano 7 giorni. Partono già i voli, gli hotel (con check-in e check-out) e i biglietti delle tappe, tutti da prenotare.
- **Hotel e notti**: un hotel prenotato copre le sue notti in Oggi ("Stanotte") e nel Programma, con codice e indirizzo per il taxi. In Oggi la card "Prossimo: Volo fra 3 h" nelle 24 ore prima.
- **Spese**: tre tocchi per inserirne una, yen ed euro col cambio della BCE (o uno scritto a mano), totale e quota di ciascuno, budget di ogni giorno, contanti e carta a parte, **chi deve a chi** col numero minimo di rimborsi e "Segna come saldato".
- **Calendario**: "Aggiungi al calendario" (Documenti e Impostazioni) crea `giappone-2027.ics` con gli avvisi: 3 ore prima di voli e treni, 1 ora prima del resto, le scadenze per prenotare alle 9, il tax-free 4 ore prima del volo di ritorno. Gli avvisi li dà il calendario del telefono, anche ad app chiusa.
- **Orari di apertura** sulle tappe, con avvisi "Chiuso il mercoledì" / "Apre alle 10:00"; pre-compilati per i luoghi principali (da verificare sul sito) e cercabili su OpenStreetMap.
- **Ricerca** (lente in Programma e Documenti) in tappe, note e prenotazioni, senza badare a maiuscole e accenti.
- **Comodità**: scorri una tappa verso destra per segnarla fatta, "Tieni acceso lo schermo" in Oggi, scorciatoie tenendo premuta l'icona (Android), spazio usato in Impostazioni.
- **Backup** con gli allegati dentro: un backup della fase 1 resta importabile.

## Da provare sul telefono (iPhone e Android)
1. Aprire l'app dall'icona: si aggiorna da sola. Chi aveva già dati: Impostazioni → Dati → **Aggiungi prenotazioni e orari del 2027** (aggiunge solo quello che manca, si può annullare).
2. Documenti: aprire "Volo Roma → Tokyo", Modifica, scrivere il codice, segnarla prenotata, **Scatta foto** a un QR qualsiasi, Salva. Toccare il codice ("Copiato") e la foto (visualizzatore bianco, zoom). Modalità aereo: la foto si apre lo stesso.
3. Segnare prenotato "Kyoto Gion Hotel" col suo codice; aprire `…/?oggi=2027-08-16T10:15#/oggi`: in "Stanotte" ci sono la prenotazione, il codice e la scheda per il tassista.
4. Spese: "+" → Spesa, scrivere 1500, Salva. Altre due spese pagate da persone diverse, una in euro. Guardare "Chi deve a chi" e provare "Segna come saldato" e poi "Annulla". Scorrere una spesa verso sinistra per eliminarla.
5. Impostazioni → Promemoria → **Aggiungi al calendario**: aprire il file `.ics` col Calendario; controllare l'ora del volo di andata (12:30 ora italiana) e che gli avvisi ci siano.
6. Programma G3: avviso sul Tsukiji del mercoledì festivo. Programma G8: aprire il Kinkaku-ji, Modifica, **Cerca orari su OpenStreetMap**.
7. Programma: scorrere una tappa verso destra (diventa fatta), rifarlo (torna da fare).
8. Oggi durante il viaggio (`?oggi=…`): accendere "Tieni acceso lo schermo" e lasciare il telefono fermo: lo schermo non si spegne.
9. Android: tenere premuta l'icona dell'app → "Aggiungi spesa" apre il foglio della spesa.
10. Impostazioni → Salva o condividi un backup: il file contiene anche gli allegati; importarlo su un altro telefono e riaprire la prenotazione con la foto.

La prova di offline e installazione dal computer si fa in **Chrome con l'estensione Claude**: il browser integrato non registra il service worker.

## Cose da sapere
- **iPhone**: le scorciatoie dell'icona non esistono; la vibrazione dello scorrimento non c'è; "Tieni acceso lo schermo" compare solo dove Safari supporta la Wake Lock API.
- Su iPhone, condividere il backup dopo aver letto gli allegati può far cadere il menu di condivisione: in quel caso il file viene scaricato (si trova in File → Download).
- Gli orari pre-compilati e quelli di OpenStreetMap vanno verificati sul sito del luogo prima di andare.
- Il cambio di ogni spesa resta quello del momento in cui è stata scritta: i totali non cambiano col cambio dei giorni dopo.

## Rimasto da fare
- Fase 3: vicino a me, frasario, emergenze, checklist, guida pratica, meteo orario, diario, consigli dai reel.
- Fuori dal progetto (richiederebbero un server): import delle email, stato dei voli in tempo reale, notifiche push, sincronizzazione fra telefoni. Al loro posto: backup, `.ics` e link alle app delle compagnie.
- Da completare nell'app quando li sapete: codici e allegati delle prenotazioni, aeroporto (Haneda o Narita), l'hotel di Tokyo del 25–26 agosto, gli indirizzi in giapponese degli hotel, le date di prenotazione ("da prenotare entro").
```

- [ ] **Step 3: Aggiornare `README.md`**

Sostituire

```markdown
Per provare l'app "durante" il viaggio: `?oggi=2027-08-16T10:15` nell'indirizzo.
```

con

```markdown
Per provare l'app "durante" il viaggio: `?oggi=2027-08-16T10:15` nell'indirizzo.

Le icone delle scorciatoie (tenendo premuta l'icona su Android) si rigenerano con `npm run icone-scorciatoie`.

## Cosa fa

- **Oggi**: conto alla rovescia, adesso e dopo, meteo, avvisi (anche sulle chiusure), l'hotel della notte con la scheda per il tassista, la card "Prossimo" nelle 24 ore, lo schermo sempre acceso.
- **Programma**: tutto modificabile, orari di apertura (anche da OpenStreetMap), scorri per segnare una tappa fatta, ricerca.
- **Mappa**: del giorno o di tutto il viaggio, con le tappe vicine.
- **Documenti**: voli, hotel, treni e biglietti con codici copiabili, QR e PDF offline, scadenze per prenotare, promemoria sul calendario (`.ics`).
- **Spese**: inserimento in tre tocchi, yen ed euro col cambio della BCE, budget di ogni giorno, chi deve a chi.
- **Impostazioni** (ingranaggio in Oggi): viaggio, persone, tema, città, backup con gli allegati, spazio usato.

Tutto resta sul telefono: niente account e niente server. Servizi esterni senza chiave: OpenStreetMap, Open-Meteo, Wikipedia/Commons, Nominatim, Overpass, Frankfurter (BCE). Guide di prova: [fase 1](docs/PROVA-FASE-1.md), [fase 2](docs/PROVA-FASE-2.md).
```

- [ ] **Step 4: Prova completa nel browser**

Run: `npm run build && npx vite preview --port 4173` (in background), poi aprire `http://localhost:4173/jap-itinerario/`.

Il controllore, a 375×812 in chiaro e in scuro, ripercorre gli elenchi di controllo dei Task 7–14 su questa build e in più:
- nessun errore in console aprendo, una dopo l'altra, `#/oggi`, `#/programma/3`, `#/mappa`, `#/documenti`, `#/documenti/pr-volo-andata`, `#/spese`, `#/spese/nuova`, `#/impostazioni`, `#/viaggio`;
- il tasto "+" non c'è sulla Mappa e non copre i controlli dello zoom;
- in **Chrome con l'estensione Claude**: dopo il primo caricamento, DevTools → Network → Offline e ricarica: l'app si apre, i documenti con le foto si vedono, la spesa si salva col cambio salvato, "Cerca orari su OpenStreetMap" dice che non è disponibile, il calendario `.ics` si genera lo stesso;
- installata dal menu di Chrome, il manifest mostra le due scorciatoie.

- [ ] **Step 5: Commit**

```bash
git add docs/PROVA-FASE-2.md README.md
git commit -m "Guida di prova della fase 2 e README aggiornato

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Dopo la revisione finale la pubblicazione su `main` la decide Vito: **niente push** da questo piano.
