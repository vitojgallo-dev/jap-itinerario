# Fase 1 — Base, Oggi, Programma, Mappa, offline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il vecchio `index.html` con un'app Vite + React + TypeScript installabile e offline, con le schede Oggi, Programma (modificabile in tutto), Mappa e Viaggio (impostazioni e backup), partendo dal nuovo itinerario 2027.

**Architecture:** La logica sta in funzioni pure in `src/model/` e `src/servizi/`, coperte da Vitest; l'interfaccia in `src/ui/` e `src/schermate/` legge e scrive un unico store Zustand persistito in `localStorage`. L'itinerario di partenza è un JSON generato da uno script che legge il vecchio `index.html` (spostato in `legacy/`) con la stessa migrazione usata dall'app per i dati salvati dall'utente, poi applica la revisione 2027.

**Tech Stack:** Vite, React 19, TypeScript, Zustand, vaul (fogli dal basso), sonner (toast), lucide-react (icone), @dnd-kit (riordino), Leaflet + react-leaflet (mappe, tile CARTO), vite-plugin-pwa (offline), Vitest, tsx (script).

**Spec:** `docs/superpowers/specs/2026-09-30-app-viaggio-giappone-design.md`

## Global Constraints

- Tutta l'interfaccia e i nomi di dominio in **italiano** (`viaggio`, `giorno`, `tappa`, `citta`).
- Pubblicazione su `https://vitojgallo-dev.github.io/jap-itinerario/`: Vite `base: '/jap-itinerario/'`, routing solo via hash (`#/oggi`, `#/programma/7`, `#/mappa`, `#/viaggio`).
- Ora di riferimento sempre `Asia/Tokyo`. Le date sono stringhe `YYYY-MM-DD`; la data del giorno i è `dataPartenza + i`.
- `dataPartenza` di partenza: **`2027-08-08`** (G0, arrivo alle 14:00). 20 giorni, G0–G19, l'ultimo è il 27 agosto (volo ~20:00).
- Persone di partenza: 3.
- Tema chiaro **Washi** (sfondo `#F6F1E7`, testo `#1D1B18`, accento `#C8452C`) e tema scuro **Notte** (sfondo `#0E0F13`, card `#1A1C23`, accento `#FF5A5F`), automatici con `prefers-color-scheme`, forzabili. Il colore della città del giorno è la tinta dei controlli, con contrasto ≥ 4.5:1.
- Target touch ≥ 44 px; rispettare `prefers-reduced-motion`; nessuno scroll orizzontale della pagina a 375 px.
- Nessun servizio con chiave o account: Open-Meteo, Nominatim (una richiesta per ricerca, solo su pulsante), Wikipedia/Commons, tile CARTO, link Google Maps.
- Chiave dei dati vecchi: `localStorage["japan_itinerary_v1"]`, **mai cancellata**. Chiave nuova: `giappone-viaggio`.
- Nessun servizio esterno può bloccare l'app: in errore si mostra l'ultimo dato o niente.
- Git: lavorare sul ramo `nuova-app`; commit piccoli; messaggi in italiano, che terminano con la riga
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Non fare push** senza conferma dell'utente.

## Mappa dei file

```
.github/workflows/pubblica.yml     build + test + deploy su GitHub Pages
legacy/index-v1.html               la vecchia app, solo come sorgente dei dati
scripts/legacy.ts                  estrae DEFAULT_DATA & co. dal vecchio html
scripts/revisione-2027.ts          la revisione della sezione 5 dello spec
scripts/genera-base.ts             scrive src/data/itinerario-base.json e legacy-extra.json
public/icona.svg (+ PNG generati)  icone PWA
src/main.tsx, src/App.tsx
src/model/tipi.ts                  tipi del dominio
src/model/date.ts                  date, ore, fuso di Tokyo, formati italiani
src/model/adesso.ts                fase del viaggio, tappa adesso/dopo, promemoria biglietti
src/model/riepilogo.ts             biglietti da prenotare, statistiche, città di un giorno, backup
src/model/migrazioneV1.ts          dal formato v1 al modello nuovo
src/model/validazione.ts           controllo di un Viaggio sconosciuto (import, dati base)
src/model/operazioni.ts            modifiche pure: tappe, giorni, città, impostazioni
src/model/mappa.ts                 punti per la mappa, vicini
src/servizi/{mappe,foto,meteo,luoghi,backup,distanza}.ts
src/store/viaggio.ts               store Zustand persistito, annulla
src/store/avvio.ts                 dati v1 nel telefono, conversione
src/data/itinerario-base.json      GENERATO
src/data/legacy-extra.json         GENERATO
src/ui/                            tema, colore, componenti comuni, rotta, hook
src/schermate/oggi|programma|mappa|viaggio/
```

---

### Task 1: Progetto Vite, test, pubblicazione automatica

**Files:**
- Move: `index.html` → `legacy/index-v1.html`
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/model/prova.test.ts`, `.github/workflows/pubblica.yml`

**Interfaces:**
- Produces: `npm test` (Vitest, ambiente node, file `src/**/*.test.ts` e `scripts/**/*.test.ts`), `npm run build` (typecheck + build in `dist/`), `npm run genera-base` (`tsx scripts/genera-base.ts`, usato dal Task 6).

- [ ] **Step 1: Spostare la vecchia app**

```bash
cd G:/github/jap-itinerario
mkdir -p legacy
git mv index.html legacy/index-v1.html
```

- [ ] **Step 2: Scrivere `package.json`**

```json
{
  "name": "jap-itinerario",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "genera-base": "tsx scripts/genera-base.ts",
    "icone": "pwa-assets-generator"
  }
}
```

- [ ] **Step 3: Installare le dipendenze**

```bash
npm install react react-dom zustand vaul sonner lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities leaflet react-leaflet
npm install -D vite @vitejs/plugin-react typescript vitest tsx @types/react @types/react-dom @types/leaflet @types/node vite-plugin-pwa @vite-pwa/assets-generator
```

Se `npm install` segnala un conflitto di peer dependency fra `vite-plugin-pwa` e la versione di `vite` appena installata, installare la major di `vite` più recente supportata dal plugin (`npm install -D vite@<major>`) invece di usare `--force`.

- [ ] **Step 4: Scrivere `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

- [ ] **Step 5: Scrivere `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/jap-itinerario/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
```

- [ ] **Step 6: Scrivere `index.html`, `src/vite-env.d.ts`, `src/main.tsx`, `src/App.tsx`, `.gitignore`**

`index.html` (lo script inline imposta il tema prima del primo disegno, così non c'è il lampo bianco):

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#F6F1E7" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0E0F13" media="(prefers-color-scheme: dark)" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Giappone" />
    <meta name="description" content="Itinerario e compagno di viaggio per il Giappone, agosto 2027" />
    <title>Giappone 2027</title>
    <script>
      try {
        var s = JSON.parse(localStorage.getItem('giappone-viaggio') || '{}')
        var t = s && s.state && s.state.viaggio && s.state.viaggio.impostazioni && s.state.viaggio.impostazioni.tema
        var scuro = t === 'scuro' || (t !== 'chiaro' && matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.dataset.tema = scuro ? 'scuro' : 'chiaro'
      } catch (e) {}
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (provvisorio, sostituito nel Task 8):

```tsx
export default function App() {
  return <main>Giappone 2027</main>
}
```

`.gitignore`:

```
node_modules
dist
dev-dist
*.local
```

- [ ] **Step 7: Test di prova per verificare Vitest**

`src/model/prova.test.ts`:

```ts
import { expect, test } from 'vitest'

test('vitest gira', () => {
  expect(1 + 1).toBe(2)
})
```

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: nessun errore, `dist/index.html` creato, con i percorsi che iniziano per `/jap-itinerario/`.

- [ ] **Step 9: Workflow di pubblicazione**

`.github/workflows/pubblica.yml`:

```yaml
name: Pubblica
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 10: Eliminare il test di prova e fare commit**

```bash
rm src/model/prova.test.ts
git add -A
git commit -m "Progetto Vite + React, la vecchia app va in legacy/

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tipi e date

**Files:**
- Create: `src/model/tipi.ts`, `src/model/date.ts`
- Test: `src/model/date.test.ts`

**Interfaces:**
- Produces (tipi): `Id, Luogo, TipoTappa, StatoTappa, ModoSpostamento, Spostamento, InfoEvento, Tappa, Avviso, Suggerimento, OpzioneSpeciale, Speciale, Giorno, Clima, Citta, Persona, Tema, Impostazioni, Viaggio, VERSIONE_DATI, TIPI_TAPPA, STATI_TAPPA, MODI_SPOSTAMENTO`.
- Produces (date): `aggiungiGiorni(data: string, n: number): string`, `differenzaGiorni(da: string, a: string): number`, `dataGiorno(v: Viaggio, indice: number): string`, `istanteTokyo(d: Date): { data: string; minuti: number }`, `normalizzaOra(s: string): string | null`, `minutiDaOra(ora: string | null): number | null`, `formatoData(data: string, stile: 'breve' | 'lungo'): string`, `partiData(data: string): { settimana: string; numero: number }`, `formatoDurata(minuti: number): string`.

- [ ] **Step 1: Scrivere `src/model/tipi.ts`**

```ts
export type Id = string

export interface Luogo {
  nome: string
  query: string
  lat?: number
  lng?: number
  indirizzoJa?: string
}

export const TIPI_TAPPA = ['visita', 'cibo', 'evento', 'spostamento', 'hotel', 'libero'] as const
export type TipoTappa = (typeof TIPI_TAPPA)[number]

export const STATI_TAPPA = ['da-fare', 'fatta', 'saltata'] as const
export type StatoTappa = (typeof STATI_TAPPA)[number]

export const MODI_SPOSTAMENTO = ['piedi', 'mezzi', 'treno', 'taxi'] as const
export type ModoSpostamento = (typeof MODI_SPOSTAMENTO)[number]

export interface Spostamento {
  modo: ModoSpostamento
  minuti?: number
  nota?: string
}

export interface InfoEvento {
  nome: string
  nomeJa?: string
  affidabilita: 'certa' | 'probabile' | 'da-verificare'
  fonte?: string
}

export interface Tappa {
  id: Id
  ora: string | null
  durataMin?: number
  titolo: string
  descrizione: string
  consiglio: string
  tipo: TipoTappa
  luogo?: Luogo
  sera: boolean
  biglietti?: { link: string | null }
  spostamento?: Spostamento
  evento?: InfoEvento
  stato: StatoTappa
  nota: string
  foto?: string
}

export interface Avviso {
  testo: string
  livello: 'info' | 'attenzione'
}

export interface Suggerimento {
  tipo: 'cibo' | 'opzionale' | 'souvenir'
  nome: string
  descrizione: string
  luogo?: Luogo
}

export interface OpzioneSpeciale {
  livello: string
  nome: string
  descrizione: string
  link: string
}

export interface Speciale {
  titolo: string
  nota: string
  opzioni: OpzioneSpeciale[]
}

export interface Giorno {
  id: Id
  cittaId: Id
  titolo: string
  intro: string
  note: string
  alloggio: Luogo | null
  consigli: string[]
  avvisi: Avviso[]
  suggerimenti: Suggerimento[]
  speciale: Speciale | null
  tappe: Tappa[]
}

export interface Clima {
  max: number
  min: number
}

export interface Citta {
  id: Id
  nome: string
  kanji: string
  romaji: string
  colore: string
  lat: number
  lng: number
  intro: string
  clima: Clima
}

export interface Persona {
  id: Id
  nome: string
}

export type Tema = 'auto' | 'chiaro' | 'scuro'

export interface Impostazioni {
  tema: Tema
  ultimoBackup?: string
}

export const VERSIONE_DATI = 2

export interface Viaggio {
  versione: typeof VERSIONE_DATI
  titolo: string
  dataPartenza: string
  persone: Persona[]
  citta: Citta[]
  giorni: Giorno[]
  prenotazioni: unknown[]
  spese: unknown[]
  checklist: unknown[]
  impostazioni: Impostazioni
}
```

- [ ] **Step 2: Scrivere il test delle date**

`src/model/date.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import {
  aggiungiGiorni, differenzaGiorni, formatoData, formatoDurata, istanteTokyo,
  minutiDaOra, normalizzaOra, partiData,
} from './date'

describe('date', () => {
  test('aggiungiGiorni attraversa i mesi', () => {
    expect(aggiungiGiorni('2027-08-08', 0)).toBe('2027-08-08')
    expect(aggiungiGiorni('2027-08-08', 19)).toBe('2027-08-27')
    expect(aggiungiGiorni('2027-08-31', 1)).toBe('2027-09-01')
    expect(aggiungiGiorni('2027-08-01', -1)).toBe('2027-07-31')
  })

  test('differenzaGiorni', () => {
    expect(differenzaGiorni('2027-08-08', '2027-08-16')).toBe(8)
    expect(differenzaGiorni('2027-08-08', '2026-09-30')).toBe(-312)
  })

  test('istanteTokyo usa il fuso del Giappone', () => {
    expect(istanteTokyo(new Date('2027-08-07T18:00:00+02:00'))).toEqual({ data: '2027-08-08', minuti: 60 })
    expect(istanteTokyo(new Date('2027-08-16T10:15:00+09:00'))).toEqual({ data: '2027-08-16', minuti: 615 })
    expect(istanteTokyo(new Date('2027-08-16T00:05:00+09:00'))).toEqual({ data: '2027-08-16', minuti: 5 })
  })

  test('normalizzaOra', () => {
    expect(normalizzaOra('8:00')).toBe('08:00')
    expect(normalizzaOra('20:30')).toBe('20:30')
    expect(normalizzaOra('6:30 (Giorno dopo)')).toBe('06:30')
    expect(normalizzaOra('9.15')).toBe('09:15')
    expect(normalizzaOra('')).toBeNull()
    expect(normalizzaOra('25:00')).toBeNull()
    expect(normalizzaOra('mattina')).toBeNull()
  })

  test('minutiDaOra', () => {
    expect(minutiDaOra('08:30')).toBe(510)
    expect(minutiDaOra(null)).toBeNull()
  })

  test('formatoData in italiano', () => {
    expect(formatoData('2027-08-08', 'breve')).toBe('dom 8 ago')
    expect(formatoData('2027-08-16', 'lungo')).toBe('lunedì 16 agosto')
    expect(partiData('2027-08-27')).toEqual({ settimana: 'ven', numero: 27 })
  })

  test('formatoDurata', () => {
    expect(formatoDurata(25)).toBe('25 min')
    expect(formatoDurata(60)).toBe('1 h')
    expect(formatoDurata(135)).toBe('2 h 15')
  })
})
```

- [ ] **Step 3: Eseguire il test e vederlo fallire**

Run: `npm test -- src/model/date.test.ts`
Expected: FAIL, `Failed to resolve import "./date"`.

- [ ] **Step 4: Scrivere `src/model/date.ts`**

```ts
import type { Viaggio } from './tipi'

const GIORNO_MS = 86_400_000
const SETTIMANA = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function utc(data: string): number {
  const [a, m, g] = data.split('-').map(Number)
  return Date.UTC(a, m - 1, g)
}

/** Somma n giorni a una data "YYYY-MM-DD". */
export function aggiungiGiorni(data: string, n: number): string {
  return new Date(utc(data) + n * GIORNO_MS).toISOString().slice(0, 10)
}

/** Giorni da `da` ad `a` (positivo se `a` è dopo). */
export function differenzaGiorni(da: string, a: string): number {
  return Math.round((utc(a) - utc(da)) / GIORNO_MS)
}

/** La data del giorno in posizione `indice`. */
export function dataGiorno(v: Viaggio, indice: number): string {
  return aggiungiGiorni(v.dataPartenza, indice)
}

const formatoTokyo = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/** Data e minuti dalla mezzanotte, nel fuso di Tokyo. */
export function istanteTokyo(d: Date): { data: string; minuti: number } {
  const parti = formatoTokyo.formatToParts(d)
  const p = (tipo: string) => parti.find(x => x.type === tipo)!.value
  return { data: `${p('year')}-${p('month')}-${p('day')}`, minuti: Number(p('hour')) * 60 + Number(p('minute')) }
}

/** "8:00" → "08:00"; restituisce null se non c'è un'ora valida all'inizio. */
export function normalizzaOra(s: string): string | null {
  const m = /^\s*(\d{1,2})[:.](\d{2})/.exec(s)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

export function minutiDaOra(ora: string | null): number | null {
  if (!ora) return null
  const [h, m] = ora.split(':').map(Number)
  return h * 60 + m
}

function giornoSettimana(data: string): number {
  return new Date(utc(data)).getUTCDay()
}

export function formatoData(data: string, stile: 'breve' | 'lungo'): string {
  const [, m, g] = data.split('-').map(Number)
  const s = SETTIMANA[giornoSettimana(data)]
  const mese = MESI[m - 1]
  return stile === 'breve' ? `${s.slice(0, 3)} ${g} ${mese.slice(0, 3)}` : `${s} ${g} ${mese}`
}

export function partiData(data: string): { settimana: string; numero: number } {
  return { settimana: SETTIMANA[giornoSettimana(data)].slice(0, 3), numero: Number(data.slice(8, 10)) }
}

export function formatoDurata(minuti: number): string {
  if (minuti < 60) return `${minuti} min`
  const h = Math.floor(minuti / 60), m = minuti % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
```

- [ ] **Step 5: Eseguire il test e vederlo passare**

Run: `npm test -- src/model/date.test.ts`
Expected: PASS, 7 test.

- [ ] **Step 6: Commit**

```bash
git add src/model
git commit -m "Tipi del dominio e date nel fuso di Tokyo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Adesso e dopo, fase del viaggio, riepiloghi

**Files:**
- Create: `src/model/adesso.ts`, `src/model/riepilogo.ts`
- Test: `src/model/adesso.test.ts`, `src/model/riepilogo.test.ts`, `src/model/fixture.ts`

**Interfaces:**
- Consumes: tipi e date del Task 2.
- Produces: `type FaseViaggio = { fase: 'prima'; giorniMancanti: number } | { fase: 'durante'; indice: number } | { fase: 'dopo' }`, `faseViaggio(v: Viaggio, adesso: Date): FaseViaggio`, `interface AdessoDopo { adesso: Tappa | null; dopo: Tappa | null; minutiAlDopo: number | null }`, `tappeAdessoDopo(tappe: Tappa[], minuti: number): AdessoDopo`, `type Promemoria = 'prenota-ora' | 'oggi' | 'futuro' | 'passato'`, `promemoriaBiglietto(dataVisita: string, oggi: string): Promemoria`; `interface VoceBiglietto { indice: number; data: string; giorno: Giorno; tappa: Tappa }`, `bigliettiDaPrenotare(v: Viaggio): VoceBiglietto[]`, `statistiche(v: Viaggio): { giorni: number; citta: number; tappe: number; fatte: number }`, `backupDaFare(ultimo: string | undefined, adesso: Date, giorni?: number): boolean`, `cittaDi(v: Viaggio, g: Giorno): Citta`, `CITTA_SCONOSCIUTA: Citta`. Fixture di test: `tappaDiProva(p: Partial<Tappa> & { id: string }): Tappa`, `giornoDiProva(p: Partial<Giorno> & { id: string }): Giorno`, `viaggioDiProva(p?: Partial<Viaggio>): Viaggio`.

- [ ] **Step 1: Scrivere le fixture di test**

`src/model/fixture.ts`:

```ts
import type { Citta, Giorno, Tappa, Viaggio } from './tipi'

export function tappaDiProva(p: Partial<Tappa> & { id: string }): Tappa {
  return { ora: null, titolo: p.id, descrizione: '', consiglio: '', tipo: 'visita', sera: false, stato: 'da-fare', nota: '', ...p }
}

export function giornoDiProva(p: Partial<Giorno> & { id: string }): Giorno {
  return { cittaId: 'tokyo', titolo: p.id, intro: '', note: '', alloggio: null, consigli: [], avvisi: [], suggerimenti: [], speciale: null, tappe: [], ...p }
}

export const cittaDiProva: Citta[] = [
  { id: 'tokyo', nome: 'Tokyo', kanji: '東京', romaji: 'Tōkyō', colore: '#E4572E', lat: 35.68, lng: 139.65, intro: '', clima: { max: 31, min: 24 } },
  { id: 'kyoto', nome: 'Kyoto', kanji: '京都', romaji: 'Kyōto', colore: '#3A6EA5', lat: 35.01, lng: 135.77, intro: '', clima: { max: 34, min: 24 } },
]

export function viaggioDiProva(p: Partial<Viaggio> = {}): Viaggio {
  return {
    versione: 2, titolo: 'Prova', dataPartenza: '2027-08-08',
    persone: [{ id: 'p1', nome: 'Vito' }], citta: cittaDiProva,
    giorni: [giornoDiProva({ id: 'g0' }), giornoDiProva({ id: 'g1' }), giornoDiProva({ id: 'g2', cittaId: 'kyoto' })],
    prenotazioni: [], spese: [], checklist: [], impostazioni: { tema: 'auto' },
    ...p,
  }
}
```

- [ ] **Step 2: Scrivere i test**

`src/model/adesso.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { faseViaggio, promemoriaBiglietto, tappeAdessoDopo } from './adesso'
import { tappaDiProva as t, viaggioDiProva } from './fixture'

describe('faseViaggio', () => {
  const v = viaggioDiProva() // 3 giorni dall'8 al 10 agosto 2027
  test('prima della partenza conta i giorni in ora di Tokyo', () => {
    expect(faseViaggio(v, new Date('2027-08-07T23:30:00+09:00'))).toEqual({ fase: 'prima', giorniMancanti: 1 })
    expect(faseViaggio(v, new Date('2026-09-30T12:00:00+09:00'))).toEqual({ fase: 'prima', giorniMancanti: 312 })
  })
  test('durante: indice del giorno', () => {
    expect(faseViaggio(v, new Date('2027-08-07T18:00:00+02:00'))).toEqual({ fase: 'durante', indice: 0 })
    expect(faseViaggio(v, new Date('2027-08-10T23:59:00+09:00'))).toEqual({ fase: 'durante', indice: 2 })
  })
  test('dopo', () => {
    expect(faseViaggio(v, new Date('2027-08-11T00:00:00+09:00'))).toEqual({ fase: 'dopo' })
  })
})

describe('tappeAdessoDopo', () => {
  const tappe = [
    t({ id: 'a', ora: '09:00' }),
    t({ id: 'b', ora: '10:30' }),
    t({ id: 'c', ora: '12:00', stato: 'saltata' }),
    t({ id: 'd', ora: '13:00' }),
    t({ id: 'x', ora: null }),
  ]
  test('prima della prima tappa', () => {
    const r = tappeAdessoDopo(tappe, 8 * 60)
    expect(r.adesso).toBeNull()
    expect(r.dopo?.id).toBe('a')
    expect(r.minutiAlDopo).toBe(60)
  })
  test('in mezzo, ignorando le saltate', () => {
    const r = tappeAdessoDopo(tappe, 12 * 60 + 10)
    expect(r.adesso?.id).toBe('b')
    expect(r.dopo?.id).toBe('d')
    expect(r.minutiAlDopo).toBe(50)
  })
  test('la tappa corrente segnata fatta non è più "adesso"', () => {
    const fatte = tappe.map(x => (x.id === 'b' ? { ...x, stato: 'fatta' as const } : x))
    const r = tappeAdessoDopo(fatte, 11 * 60)
    expect(r.adesso).toBeNull()
    expect(r.dopo?.id).toBe('d')
  })
  test('le tappe dopo già fatte vengono saltate', () => {
    const fatte = tappe.map(x => (x.id === 'd' ? { ...x, stato: 'fatta' as const } : x))
    expect(tappeAdessoDopo(fatte, 11 * 60).dopo).toBeNull()
  })
  test('dopo l\'ultima', () => {
    const r = tappeAdessoDopo(tappe, 22 * 60)
    expect(r.adesso?.id).toBe('d')
    expect(r.dopo).toBeNull()
    expect(r.minutiAlDopo).toBeNull()
  })
  test('giorno vuoto', () => {
    expect(tappeAdessoDopo([], 600)).toEqual({ adesso: null, dopo: null, minutiAlDopo: null })
  })
})

test('promemoriaBiglietto', () => {
  expect(promemoriaBiglietto('2027-08-16', '2027-08-15')).toBe('prenota-ora')
  expect(promemoriaBiglietto('2027-08-16', '2027-08-16')).toBe('oggi')
  expect(promemoriaBiglietto('2027-08-16', '2027-08-01')).toBe('futuro')
  expect(promemoriaBiglietto('2027-08-16', '2027-08-17')).toBe('passato')
})
```

`src/model/riepilogo.test.ts`:

```ts
import { expect, test } from 'vitest'
import { backupDaFare, bigliettiDaPrenotare, cittaDi, statistiche } from './riepilogo'
import { giornoDiProva, tappaDiProva, viaggioDiProva } from './fixture'

const v = viaggioDiProva({
  giorni: [
    giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', biglietti: { link: null } }), tappaDiProva({ id: 'b', stato: 'fatta' })] }),
    giornoDiProva({ id: 'g1', cittaId: 'kyoto', tappe: [tappaDiProva({ id: 'c', biglietti: { link: 'https://x' }, stato: 'saltata' }), tappaDiProva({ id: 'd', biglietti: { link: 'https://y' } })] }),
  ],
})

test('bigliettiDaPrenotare esclude le saltate e porta la data', () => {
  const r = bigliettiDaPrenotare(v)
  expect(r.map(x => [x.tappa.id, x.data, x.indice])).toEqual([['a', '2027-08-08', 0], ['d', '2027-08-09', 1]])
})

test('statistiche', () => {
  expect(statistiche(v)).toEqual({ giorni: 2, citta: 2, tappe: 4, fatte: 1 })
})

test('backupDaFare', () => {
  const adesso = new Date('2027-08-10T12:00:00Z')
  expect(backupDaFare(undefined, adesso)).toBe(true)
  expect(backupDaFare('2027-08-09T12:00:00Z', adesso)).toBe(false)
  expect(backupDaFare('2027-08-06T12:00:00Z', adesso)).toBe(true)
})

test('cittaDi con città mancante restituisce un segnaposto', () => {
  expect(cittaDi(v, v.giorni[1]).nome).toBe('Kyoto')
  expect(cittaDi(v, giornoDiProva({ id: 'z', cittaId: 'boh' })).nome).toBe('Senza città')
})
```

- [ ] **Step 3: Eseguire i test e vederli fallire**

Run: `npm test -- src/model/adesso.test.ts src/model/riepilogo.test.ts`
Expected: FAIL, import non risolti.

- [ ] **Step 4: Scrivere `src/model/adesso.ts`**

```ts
import { differenzaGiorni, istanteTokyo, minutiDaOra } from './date'
import type { Tappa, Viaggio } from './tipi'

export type FaseViaggio =
  | { fase: 'prima'; giorniMancanti: number }
  | { fase: 'durante'; indice: number }
  | { fase: 'dopo' }

/** In che momento del viaggio siamo, contando i giorni nel fuso di Tokyo. */
export function faseViaggio(v: Viaggio, adesso: Date): FaseViaggio {
  const diff = differenzaGiorni(v.dataPartenza, istanteTokyo(adesso).data)
  if (diff < 0) return { fase: 'prima', giorniMancanti: -diff }
  if (diff < v.giorni.length) return { fase: 'durante', indice: diff }
  return { fase: 'dopo' }
}

export interface AdessoDopo {
  adesso: Tappa | null
  dopo: Tappa | null
  minutiAlDopo: number | null
}

/**
 * "Adesso" è l'ultima tappa già iniziata, se non è stata segnata fatta;
 * "dopo" è la prima tappa da fare che inizia più tardi. Le saltate e le
 * tappe senza ora non contano.
 */
export function tappeAdessoDopo(tappe: Tappa[], minuti: number): AdessoDopo {
  const ordinate = tappe
    .filter(t => t.ora !== null && t.stato !== 'saltata')
    .map(t => ({ t, m: minutiDaOra(t.ora)! }))
    .sort((a, b) => a.m - b.m)
  let corrente = -1
  ordinate.forEach((x, i) => { if (x.m <= minuti) corrente = i })
  const adesso = corrente >= 0 && ordinate[corrente].t.stato === 'da-fare' ? ordinate[corrente].t : null
  const prossima = ordinate.slice(corrente + 1).find(x => x.t.stato === 'da-fare')
  return { adesso, dopo: prossima?.t ?? null, minutiAlDopo: prossima ? prossima.m - minuti : null }
}

export type Promemoria = 'prenota-ora' | 'oggi' | 'futuro' | 'passato'

/** Il giorno prima di una visita con biglietto è quello in cui prenotare. */
export function promemoriaBiglietto(dataVisita: string, oggi: string): Promemoria {
  const d = differenzaGiorni(oggi, dataVisita)
  if (d === 1) return 'prenota-ora'
  if (d === 0) return 'oggi'
  return d > 1 ? 'futuro' : 'passato'
}
```

- [ ] **Step 5: Scrivere `src/model/riepilogo.ts`**

```ts
import { dataGiorno } from './date'
import type { Citta, Giorno, Tappa, Viaggio } from './tipi'

export interface VoceBiglietto {
  indice: number
  data: string
  giorno: Giorno
  tappa: Tappa
}

/** Tutte le tappe che richiedono un biglietto, in ordine di viaggio. */
export function bigliettiDaPrenotare(v: Viaggio): VoceBiglietto[] {
  return v.giorni.flatMap((giorno, indice) =>
    giorno.tappe
      .filter(t => t.biglietti && t.stato !== 'saltata')
      .map(tappa => ({ indice, data: dataGiorno(v, indice), giorno, tappa })),
  )
}

export function statistiche(v: Viaggio) {
  const tappe = v.giorni.flatMap(g => g.tappe)
  return {
    giorni: v.giorni.length,
    citta: new Set(v.giorni.map(g => g.cittaId)).size,
    tappe: tappe.length,
    fatte: tappe.filter(t => t.stato === 'fatta').length,
  }
}

/** Vero se non c'è un backup o l'ultimo ha più di `giorni` giorni. */
export function backupDaFare(ultimo: string | undefined, adesso: Date, giorni = 3): boolean {
  if (!ultimo) return true
  return adesso.getTime() - new Date(ultimo).getTime() > giorni * 86_400_000
}

export const CITTA_SCONOSCIUTA: Citta = {
  id: '', nome: 'Senza città', kanji: '', romaji: '', colore: '#8E8E93',
  lat: 36.2, lng: 138.2, intro: '', clima: { max: 30, min: 22 },
}

export function cittaDi(v: Viaggio, g: Giorno): Citta {
  return v.citta.find(c => c.id === g.cittaId) ?? CITTA_SCONOSCIUTA
}
```

- [ ] **Step 6: Eseguire i test e vederli passare**

Run: `npm test`
Expected: PASS su tutti i file.

- [ ] **Step 7: Commit**

```bash
git add src/model
git commit -m "Fase del viaggio, tappa adesso e dopo, riepiloghi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Migrazione dal formato v1

**Files:**
- Create: `scripts/legacy.ts`, `src/model/migrazioneV1.ts`, `src/model/validazione.ts`
- Test: `src/model/migrazioneV1.test.ts`, `src/model/validazione.test.ts`

**Interfaces:**
- Consumes: tipi, `normalizzaOra`.
- Produces: `interface V1Stop, V1Voce, V1Day, V1City, V1Data, V1Extra` (formato della vecchia app), `migraV1(v1: V1Data, extra: V1Extra, opzioni: { dataPartenza: string }): Viaggio`, `tipoDaTitolo(titolo: string): TipoTappa`, `pulisciIntro(s: string): string`, `CLIMA_AGOSTO: Record<string, Clima>`; `leggiLegacy(html: string): { dati: V1Data; extra: V1Extra }`; `validaViaggio(x: unknown): { ok: true; viaggio: Viaggio } | { ok: false; errori: string[] }`.

Il formato v1 (letto dal vecchio `index.html`): `{ title, tripStart?, cities: [{ city: "TOKYO", label, dayrange, base, intro, phase?, days: [{ number, title, intro, notes: string[], foods|optional|souvenir: [{ name, desc, maps }], stops: [{ time, title, evening, desc, maps, tip, move: { walk?, transit? } | null, foods: [], photo?, booking? }] }] }] }`. Le costanti accanto: `PLACE_COORDS` (query → [lat, lng]), `BOOKING_LINKS` (query → url | null), `SPECIAL_DINING` (numero giorno → { kind, city, note, options: [{ tier, name, desc, url }] }), `CITY_META` (CITTÀ → { color, kanji, romaji, lat, lng }).

- [ ] **Step 1: Scrivere `scripts/legacy.ts`**

```ts
import type { V1Data, V1Extra } from '../src/model/migrazioneV1'

/** Valuta il letterale JS assegnato a `const NOME = ...;` nel vecchio html. */
function estrai<T>(html: string, nome: string): T {
  const inizio = html.indexOf(`const ${nome} = `)
  if (inizio < 0) throw new Error(`${nome} non trovato nel vecchio index.html`)
  let i = html.indexOf('{', inizio)
  let profondita = 0, inStringa: string | null = null
  for (let j = i; j < html.length; j++) {
    const c = html[j]
    if (inStringa) {
      if (c === '\\') { j++; continue }
      if (c === inStringa) inStringa = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') inStringa = c
    else if (c === '{') profondita++
    else if (c === '}' && --profondita === 0) {
      return new Function(`return (${html.slice(i, j + 1)})`)() as T
    }
  }
  throw new Error(`${nome}: letterale non chiuso`)
}

export function leggiLegacy(html: string): { dati: V1Data; extra: V1Extra } {
  return {
    dati: estrai<V1Data>(html, 'DEFAULT_DATA'),
    extra: {
      coordinate: estrai(html, 'PLACE_COORDS'),
      linkBiglietti: estrai(html, 'BOOKING_LINKS'),
      ceneSpeciali: estrai(html, 'SPECIAL_DINING'),
      metaCitta: estrai(html, 'CITY_META'),
    },
  }
}
```

- [ ] **Step 2: Scrivere il test della migrazione**

`src/model/migrazioneV1.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { leggiLegacy } from '../../scripts/legacy'
import { migraV1, pulisciIntro, tipoDaTitolo } from './migrazioneV1'
import { validaViaggio } from './validazione'

const html = readFileSync(new URL('../../legacy/index-v1.html', import.meta.url), 'utf8')
const { dati, extra } = leggiLegacy(html)
const v = migraV1(dati, extra, { dataPartenza: '2027-08-09' })

describe('migraV1 sui dati veri della vecchia app', () => {
  test('è un viaggio valido', () => {
    const r = validaViaggio(v)
    expect(r.ok ? [] : r.errori).toEqual([])
  })
  test('città uniche, giorni in ordine', () => {
    expect(v.citta.map(c => c.id)).toEqual(['tokyo', 'nikko', 'kanazawa', 'kyoto', 'koyasan', 'osaka', 'hiroshima', 'hakone'])
    expect(v.giorni.map(g => g.id)).toEqual(Array.from({ length: 18 }, (_, i) => `g${i + 1}`))
    expect(v.giorni[16].cittaId).toBe('tokyo')
  })
  test('tappe con ora, luogo e coordinate', () => {
    expect(v.giorni.flatMap(g => g.tappe)).toHaveLength(115)
    const prima = v.giorni[0].tappe[0]
    expect(prima.ora).toBe('08:00')
    expect(prima.luogo).toMatchObject({ query: 'Asakusa View Hotel Tokyo', lat: 35.7146 })
    expect(prima.spostamento?.modo).toBe('piedi')
  })
  test('biglietti', () => {
    const tutte = v.giorni.flatMap(g => g.tappe)
    expect(tutte.find(t => t.luogo?.query === 'Tokyo Skytree')?.biglietti).toEqual({ link: 'https://www.tokyo-skytree.jp/' })
    expect(tutte.find(t => t.luogo?.query === 'Nikko Toshogu shrine')?.biglietti).toEqual({ link: null })
  })
  test('alloggi, consigli, suggerimenti, cene speciali, intro', () => {
    expect(v.giorni[0].alloggio).toMatchObject({ nome: 'Asakusa View Hotel', lat: 35.7146 })
    expect(v.giorni[16].alloggio).toBeNull()
    expect(v.giorni[3].consigli).toHaveLength(3)
    expect(v.giorni.flatMap(g => g.suggerimenti)).toHaveLength(101)
    expect(v.giorni[2].speciale?.opzioni).toHaveLength(3)
    expect(v.citta[0].intro).not.toContain('{.underline}')
    expect(v.giorni[16].intro).toMatch(/^Rientro nella capitale/)
  })
})

test('tipoDaTitolo', () => {
  expect(tipoDaTitolo('Pranzo a Solamachi')).toBe('cibo')
  expect(tipoDaTitolo('Colazione in hotel + partenza')).toBe('cibo')
  expect(tipoDaTitolo('Partenza per Nara')).toBe('spostamento')
  expect(tipoDaTitolo('Arrivo e check-in al monastero')).toBe('spostamento')
  expect(tipoDaTitolo('Senso-ji')).toBe('visita')
})

test('pulisciIntro toglie il link markdown rotto', () => {
  expect(pulisciIntro('Base: X. Bello. 📍 [[X]{.underline}](https://maps)')).toBe('Base: X. Bello.')
})
```

- [ ] **Step 3: Scrivere il test della validazione**

`src/model/validazione.test.ts`:

```ts
import { expect, test } from 'vitest'
import { giornoDiProva, tappaDiProva, viaggioDiProva } from './fixture'
import { validaViaggio } from './validazione'

test('accetta un viaggio corretto', () => {
  expect(validaViaggio(viaggioDiProva()).ok).toBe(true)
})

test('rifiuta cose che non sono un viaggio', () => {
  expect(validaViaggio(null).ok).toBe(false)
  expect(validaViaggio({ cities: [] }).ok).toBe(false)
  expect(validaViaggio({ ...viaggioDiProva(), versione: 3 }).ok).toBe(false)
})

test('elenca gli errori interni', () => {
  const v = viaggioDiProva({
    dataPartenza: '8 agosto',
    giorni: [
      giornoDiProva({ id: 'g0', cittaId: 'marte', tappe: [tappaDiProva({ id: 'a', ora: '8:00' })] }),
      giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', stato: 'boh' as never, tipo: 'x' as never })] }),
    ],
  })
  const r = validaViaggio(v)
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.errori).toEqual(expect.arrayContaining([
      'dataPartenza non valida: 8 agosto',
      'giorno g0: città "marte" inesistente',
      'id giorno duplicato: g0',
      'tappa a: ora non valida "8:00"',
      'id tappa duplicato: a',
      'tappa a: stato non valido "boh"',
      'tappa a: tipo non valido "x"',
    ]))
  }
})
```

- [ ] **Step 4: Eseguire i test e vederli fallire**

Run: `npm test -- src/model/migrazioneV1.test.ts src/model/validazione.test.ts`
Expected: FAIL, import non risolti.

- [ ] **Step 5: Scrivere `src/model/migrazioneV1.ts`**

```ts
import { normalizzaOra } from './date'
import type { Citta, Clima, Giorno, Luogo, Suggerimento, Tappa, TipoTappa, Viaggio } from './tipi'
import { VERSIONE_DATI } from './tipi'

export interface V1Voce { name: string; desc: string; maps: string }
export interface V1Stop {
  time: string; title: string; evening: boolean; desc: string; maps: string; tip: string
  move: { walk?: { origin: string; destination: string }; transit?: { origin: string; destination: string } } | null
  foods?: unknown[]; photo?: string; booking?: string
}
export interface V1Day {
  number: number; title: string; stops: V1Stop[]; intro?: string; notes?: string[]
  foods?: V1Voce[]; optional?: V1Voce[]; souvenir?: V1Voce[]
}
export interface V1City { city: string; label?: string; dayrange?: string; base: string; intro: string; phase?: number; days: V1Day[] }
export interface V1Data { title: string; cities: V1City[]; tripStart?: string }
export interface V1Extra {
  coordinate: Record<string, [number, number]>
  linkBiglietti: Record<string, string | null>
  ceneSpeciali: Record<string, { kind: string; city: string; note: string; options: { tier: string; name: string; desc: string; url: string }[] }>
  metaCitta: Record<string, { color: string; kanji: string; romaji: string; lat: number; lng: number }>
}

/** Medie di agosto (°C), mostrate finché la previsione non è disponibile. */
export const CLIMA_AGOSTO: Record<string, Clima> = {
  tokyo: { max: 31, min: 24 }, nikko: { max: 27, min: 19 }, kanazawa: { max: 31, min: 24 },
  kyoto: { max: 34, min: 24 }, koyasan: { max: 26, min: 18 }, osaka: { max: 33, min: 25 },
  hiroshima: { max: 32, min: 24 }, hakone: { max: 27, min: 20 },
}

/** Query con coordinate note per l'hotel di ogni città. */
const QUERY_ALLOGGIO: Record<string, string> = {
  TOKYO: 'Asakusa View Hotel Tokyo', NIKKO: 'Nikko Hoshinoyado ryokan', KANAZAWA: 'Hotel Kanazawa station',
  KYOTO: 'Kyoto Gion Hotel', OSAKA: 'Hotel Forza Osaka Namba Dotonbori', HAKONE: 'Hakone-Yumoto Station',
}

export function tipoDaTitolo(titolo: string): TipoTappa {
  if (/\b(colazione|pranzo|cena)\b/i.test(titolo)) return 'cibo'
  if (/\b(partenza|rientro|arrivo|treno)\b/i.test(titolo)) return 'spostamento'
  if (/check-in/i.test(titolo)) return 'hotel'
  return 'visita'
}

export function pulisciIntro(s: string): string {
  return s.replace(/\s*📍\s*\[\[[^\]]*\]\{\.underline\}\]\([^)]*\)/g, '').trim()
}

function nomeCitta(chiave: string): string {
  return chiave.charAt(0) + chiave.slice(1).toLowerCase()
}

export function migraV1(v1: V1Data, extra: V1Extra, opzioni: { dataPartenza: string }): Viaggio {
  const luogo = (nome: string, query: string): Luogo => {
    const c = extra.coordinate[query]
    return c ? { nome, query, lat: c[0], lng: c[1] } : { nome, query }
  }
  const suggerimenti = (d: V1Day): Suggerimento[] =>
    (['foods', 'optional', 'souvenir'] as const).flatMap(k =>
      (d[k] ?? []).map(x => ({
        tipo: k === 'foods' ? 'cibo' as const : k === 'optional' ? 'opzionale' as const : 'souvenir' as const,
        nome: x.name, descrizione: x.desc, luogo: x.maps ? luogo(x.name, x.maps) : undefined,
      })),
    )

  const citta: Citta[] = []
  const giorni: Giorno[] = []
  for (const c of v1.cities) {
    const id = c.city.toLowerCase()
    const primoBlocco = !citta.some(x => x.id === id)
    if (primoBlocco) {
      const m = extra.metaCitta[c.city]
      citta.push({
        id, nome: nomeCitta(c.city), kanji: m?.kanji ?? '', romaji: m?.romaji ?? nomeCitta(c.city),
        colore: m?.color ?? '#8E8E93', lat: m?.lat ?? 36.2, lng: m?.lng ?? 138.2,
        intro: pulisciIntro(c.intro), clima: CLIMA_AGOSTO[id] ?? { max: 31, min: 24 },
      })
    }
    const nomeBase = c.base.split(',')[0].trim()
    const alloggio = nomeBase ? luogo(nomeBase, QUERY_ALLOGGIO[c.city] ?? `${nomeBase} ${nomeCitta(c.city)}`) : null
    c.days.forEach((d, i) => {
      const tappe: Tappa[] = d.stops.map((s, si) => {
        const bigliettoNoto = s.maps in extra.linkBiglietti
        const t: Tappa = {
          id: `t${d.number}-${si}`,
          ora: normalizzaOra(s.time),
          titolo: s.title,
          descrizione: s.desc ?? '',
          consiglio: s.tip ?? '',
          tipo: tipoDaTitolo(s.title),
          sera: !!s.evening,
          stato: 'da-fare',
          nota: '',
        }
        if (s.maps) t.luogo = luogo(s.title, s.maps)
        if (s.booking) t.biglietti = { link: s.booking }
        else if (bigliettoNoto) t.biglietti = { link: extra.linkBiglietti[s.maps] }
        if (s.move?.walk) t.spostamento = { modo: 'piedi' }
        else if (s.move?.transit) t.spostamento = { modo: 'mezzi' }
        if (s.photo) t.foto = s.photo
        return t
      })
      const speciale = extra.ceneSpeciali[String(d.number)]
      giorni.push({
        id: `g${d.number}`,
        cittaId: id,
        titolo: d.title,
        intro: d.intro || (!primoBlocco && i === 0 ? pulisciIntro(c.intro) : ''),
        note: '',
        alloggio: alloggio ? { ...alloggio } : null,
        consigli: d.notes ?? [],
        avvisi: [],
        suggerimenti: suggerimenti(d),
        speciale: speciale
          ? { titolo: speciale.kind, nota: speciale.note, opzioni: speciale.options.map(o => ({ livello: o.tier, nome: o.name, descrizione: o.desc, link: o.url })) }
          : null,
        tappe,
      })
    })
  }

  return {
    versione: VERSIONE_DATI,
    titolo: v1.title,
    dataPartenza: opzioni.dataPartenza,
    persone: [{ id: 'p1', nome: 'Vito' }, { id: 'p2', nome: 'Persona 2' }, { id: 'p3', nome: 'Persona 3' }],
    citta,
    giorni,
    prenotazioni: [],
    spese: [],
    checklist: [],
    impostazioni: { tema: 'auto' },
  }
}
```

- [ ] **Step 6: Scrivere `src/model/validazione.ts`**

```ts
import { MODI_SPOSTAMENTO, STATI_TAPPA, TIPI_TAPPA, VERSIONE_DATI, type Viaggio } from './tipi'

type Esito = { ok: true; viaggio: Viaggio } | { ok: false; errori: string[] }

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/
const DATA = /^\d{4}-\d{2}-\d{2}$/
const oggetto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Controlla un Viaggio arrivato da fuori (file importato, dati base). */
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
  if (typeof x.titolo !== 'string') errori.push('titolo mancante')
  if (typeof x.dataPartenza !== 'string' || !DATA.test(x.dataPartenza)) errori.push(`dataPartenza non valida: ${String(x.dataPartenza)}`)

  const citta = new Set<string>()
  for (const c of x.citta as Record<string, unknown>[]) {
    if (!oggetto(c) || typeof c.id !== 'string') { errori.push('città senza id'); continue }
    if (citta.has(c.id)) errori.push(`id città duplicato: ${c.id}`)
    citta.add(c.id)
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') errori.push(`città ${c.id}: coordinate mancanti`)
  }
  const idGiorni = new Set<string>()
  const idTappe = new Set<string>()
  for (const g of x.giorni as Record<string, unknown>[]) {
    if (!oggetto(g) || typeof g.id !== 'string') { errori.push('giorno senza id'); continue }
    if (idGiorni.has(g.id)) errori.push(`id giorno duplicato: ${g.id}`)
    idGiorni.add(g.id)
    if (!citta.has(g.cittaId as string)) errori.push(`giorno ${g.id}: città "${String(g.cittaId)}" inesistente`)
    for (const k of ['consigli', 'avvisi', 'suggerimenti', 'tappe'] as const) {
      if (!Array.isArray(g[k])) errori.push(`giorno ${g.id}: ${k} deve essere un elenco`)
    }
    for (const t of (Array.isArray(g.tappe) ? g.tappe : []) as Record<string, unknown>[]) {
      if (!oggetto(t) || typeof t.id !== 'string') { errori.push(`giorno ${g.id}: tappa senza id`); continue }
      if (idTappe.has(t.id)) errori.push(`id tappa duplicato: ${t.id}`)
      idTappe.add(t.id)
      if (t.ora !== null && (typeof t.ora !== 'string' || !ORA.test(t.ora))) errori.push(`tappa ${t.id}: ora non valida "${String(t.ora)}"`)
      if (!STATI_TAPPA.includes(t.stato as never)) errori.push(`tappa ${t.id}: stato non valido "${String(t.stato)}"`)
      if (!TIPI_TAPPA.includes(t.tipo as never)) errori.push(`tappa ${t.id}: tipo non valido "${String(t.tipo)}"`)
      if (typeof t.titolo !== 'string') errori.push(`tappa ${t.id}: titolo mancante`)
      if (oggetto(t.spostamento) && !MODI_SPOSTAMENTO.includes(t.spostamento.modo as never)) errori.push(`tappa ${t.id}: spostamento non valido`)
    }
  }
  return errori.length ? { ok: false, errori } : { ok: true, viaggio: x as unknown as Viaggio }
}
```

- [ ] **Step 7: Eseguire i test e vederli passare**

Run: `npm test`
Expected: PASS. Se il conteggio di tappe (115) o suggerimenti (101) non torna, stampare `leggiLegacy(html).dati` e controllare il vecchio file prima di cambiare i numeri: sono stati contati sul file reale durante la progettazione.

- [ ] **Step 8: Commit**

```bash
git add scripts src/model
git commit -m "Migrazione dal formato della vecchia app e validazione

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Operazioni di modifica

**Files:**
- Create: `src/model/id.ts`, `src/model/operazioni.ts`
- Test: `src/model/operazioni.test.ts`

**Interfaces:**
- Consumes: tipi, fixture.
- Produces: `nuovoId(prefisso: string): string`; `nuovaTappa(p: Partial<Tappa> & { titolo: string }): Tappa`, `nuovoGiorno(cittaId: string): Giorno`, `ordinaPerOra(tappe: Tappa[]): Tappa[]`, `aggiornaTappa(v, giornoId, tappaId, modifiche: Partial<Omit<Tappa, 'id'>>): Viaggio`, `aggiungiTappa(v, giornoId, tappa: Tappa): Viaggio`, `eliminaTappa(v, giornoId, tappaId): Viaggio`, `spostaTappa(v, giornoId, da: number, a: number): Viaggio`, `aggiornaGiorno(v, giornoId, modifiche: Partial<Omit<Giorno, 'id' | 'tappe'>>): Viaggio`, `aggiornaAlloggio(v, nome: string, modifiche: Partial<Luogo>): Viaggio`, `aggiungiGiorno(v, dopoIndice: number, cittaId: string): Viaggio`, `duplicaGiorno(v, giornoId): Viaggio`, `eliminaGiorno(v, giornoId): Viaggio`, `spostaGiorno(v, da: number, a: number): Viaggio`, `aggiungiCitta(v, c: Omit<Citta, 'id'>): { viaggio: Viaggio; id: string }`, `aggiornaCitta(v, cittaId, modifiche: Partial<Omit<Citta, 'id'>>): Viaggio`, `eliminaCitta(v, cittaId): Viaggio` (lancia `Error` se qualche giorno la usa), `aggiornaViaggio(v, modifiche: Partial<Pick<Viaggio, 'titolo' | 'dataPartenza'>>): Viaggio`, `aggiornaPersona(v, id, nome): Viaggio`, `aggiornaImpostazioni(v, modifiche: Partial<Impostazioni>): Viaggio`. Tutte restituiscono un **nuovo** oggetto e non toccano l'argomento.

- [ ] **Step 1: Scrivere il test**

`src/model/operazioni.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { giornoDiProva, tappaDiProva as t, viaggioDiProva } from './fixture'
import * as op from './operazioni'

const base = () => viaggioDiProva({
  giorni: [
    giornoDiProva({ id: 'g0', alloggio: { nome: 'Hotel A', query: 'Hotel A' }, tappe: [t({ id: 'a', ora: '09:00' }), t({ id: 'b', ora: '12:00' })] }),
    giornoDiProva({ id: 'g1', alloggio: { nome: 'Hotel A', query: 'Hotel A' }, tappe: [t({ id: 'c', ora: '10:00', stato: 'fatta', nota: 'bello' })] }),
    giornoDiProva({ id: 'g2', cittaId: 'kyoto' }),
  ],
})

describe('tappe', () => {
  test('aggiornaTappa non muta l\'originale e riordina se cambia l\'ora', () => {
    const v = base()
    const n = op.aggiornaTappa(v, 'g0', 'a', { ora: '13:00', titolo: 'A2' })
    expect(v.giorni[0].tappe[0].titolo).toBe('a')
    expect(n.giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
    expect(n.giorni[0].tappe[1].titolo).toBe('A2')
  })
  test('aggiornaTappa senza ora non riordina', () => {
    const v = op.spostaTappa(base(), 'g0', 0, 1)
    expect(op.aggiornaTappa(v, 'g0', 'a', { nota: 'x' }).giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
  })
  test('aggiungiTappa la mette al posto giusto per ora', () => {
    const n = op.aggiungiTappa(base(), 'g0', t({ id: 'n', ora: '10:30' }))
    expect(n.giorni[0].tappe.map(x => x.id)).toEqual(['a', 'n', 'b'])
    const senzaOra = op.aggiungiTappa(base(), 'g0', t({ id: 'm' }))
    expect(senzaOra.giorni[0].tappe.map(x => x.id)).toEqual(['a', 'b', 'm'])
  })
  test('eliminaTappa e spostaTappa', () => {
    expect(op.eliminaTappa(base(), 'g0', 'a').giorni[0].tappe.map(x => x.id)).toEqual(['b'])
    expect(op.spostaTappa(base(), 'g0', 1, 0).giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
  })
  test('id sconosciuti lanciano un errore', () => {
    expect(() => op.aggiornaTappa(base(), 'g9', 'a', {})).toThrow('giorno g9')
    expect(() => op.aggiornaTappa(base(), 'g0', 'z', {})).toThrow('tappa z')
  })
  test('nuovaTappa ha valori di partenza', () => {
    const n = op.nuovaTappa({ titolo: 'X' })
    expect(n).toMatchObject({ titolo: 'X', ora: null, tipo: 'visita', stato: 'da-fare', nota: '', descrizione: '', consiglio: '', sera: false })
    expect(n.id).toMatch(/^t-/)
  })
})

describe('giorni', () => {
  test('aggiungiGiorno dopo un indice', () => {
    const n = op.aggiungiGiorno(base(), 0, 'kyoto')
    expect(n.giorni).toHaveLength(4)
    expect(n.giorni[1]).toMatchObject({ cittaId: 'kyoto', tappe: [], titolo: 'Nuovo giorno' })
  })
  test('duplicaGiorno cambia gli id e azzera stati e note', () => {
    const n = op.duplicaGiorno(base(), 'g1')
    expect(n.giorni).toHaveLength(4)
    const copia = n.giorni[2]
    expect(copia.id).not.toBe('g1')
    expect(copia.tappe[0].id).not.toBe('c')
    expect(copia.tappe[0]).toMatchObject({ stato: 'da-fare', nota: '' })
  })
  test('eliminaGiorno, spostaGiorno, aggiornaGiorno', () => {
    expect(op.eliminaGiorno(base(), 'g1').giorni.map(g => g.id)).toEqual(['g0', 'g2'])
    expect(op.spostaGiorno(base(), 2, 0).giorni.map(g => g.id)).toEqual(['g2', 'g0', 'g1'])
    expect(op.aggiornaGiorno(base(), 'g2', { cittaId: 'tokyo', titolo: 'T' }).giorni[2]).toMatchObject({ cittaId: 'tokyo', titolo: 'T' })
  })
  test('aggiornaAlloggio cambia tutti i giorni con lo stesso hotel', () => {
    const n = op.aggiornaAlloggio(base(), 'Hotel A', { indirizzoJa: '東京都台東区' })
    expect(n.giorni.slice(0, 2).map(g => g.alloggio?.indirizzoJa)).toEqual(['東京都台東区', '東京都台東区'])
    expect(n.giorni[2].alloggio).toBeNull()
  })
})

describe('città, viaggio, impostazioni', () => {
  test('aggiungiCitta, aggiornaCitta, eliminaCitta', () => {
    const { viaggio, id } = op.aggiungiCitta(base(), { nome: 'Nara', kanji: '奈良', romaji: 'Nara', colore: '#123456', lat: 34.68, lng: 135.8, intro: '', clima: { max: 33, min: 23 } })
    expect(viaggio.citta.find(c => c.id === id)?.nome).toBe('Nara')
    expect(op.aggiornaCitta(viaggio, id, { colore: '#000000' }).citta.find(c => c.id === id)?.colore).toBe('#000000')
    expect(op.eliminaCitta(viaggio, id).citta.some(c => c.id === id)).toBe(false)
    expect(() => op.eliminaCitta(viaggio, 'kyoto')).toThrow('usata')
  })
  test('aggiornaViaggio, aggiornaPersona, aggiornaImpostazioni', () => {
    const n = op.aggiornaImpostazioni(op.aggiornaPersona(op.aggiornaViaggio(base(), { dataPartenza: '2027-08-09' }), 'p1', 'V'), { tema: 'scuro' })
    expect(n.dataPartenza).toBe('2027-08-09')
    expect(n.persone[0].nome).toBe('V')
    expect(n.impostazioni.tema).toBe('scuro')
  })
})
```

- [ ] **Step 2: Eseguire il test e vederlo fallire**

Run: `npm test -- src/model/operazioni.test.ts`
Expected: FAIL, import non risolti.

- [ ] **Step 3: Scrivere `src/model/id.ts`**

```ts
/** Id breve e casuale, con un prefisso leggibile ("t-3f9a1c2b"). */
export function nuovoId(prefisso: string): string {
  return `${prefisso}-${crypto.randomUUID().slice(0, 8)}`
}
```

- [ ] **Step 4: Scrivere `src/model/operazioni.ts`**

```ts
import { minutiDaOra } from './date'
import { nuovoId } from './id'
import type { Citta, Giorno, Impostazioni, Luogo, Tappa, Viaggio } from './tipi'

export function nuovaTappa(p: Partial<Tappa> & { titolo: string }): Tappa {
  return { id: nuovoId('t'), ora: null, descrizione: '', consiglio: '', tipo: 'visita', sera: false, stato: 'da-fare', nota: '', ...p }
}

export function nuovoGiorno(cittaId: string): Giorno {
  return { id: nuovoId('g'), cittaId, titolo: 'Nuovo giorno', intro: '', note: '', alloggio: null, consigli: [], avvisi: [], suggerimenti: [], speciale: null, tappe: [] }
}

/** Ordina per ora; le tappe senza ora restano dopo quella che le precede. */
export function ordinaPerOra(tappe: Tappa[]): Tappa[] {
  let ultima = -1
  const chiavi = tappe.map((t, i) => {
    const m = minutiDaOra(t.ora)
    if (m !== null) ultima = m
    return { t, m: m ?? ultima, i }
  })
  return chiavi.sort((a, b) => a.m - b.m || a.i - b.i).map(x => x.t)
}

function sposta<T>(elenco: T[], da: number, a: number): T[] {
  const n = [...elenco]
  const [x] = n.splice(da, 1)
  n.splice(a, 0, x)
  return n
}

function conGiorno(v: Viaggio, giornoId: string, fn: (g: Giorno) => Giorno): Viaggio {
  if (!v.giorni.some(g => g.id === giornoId)) throw new Error(`giorno ${giornoId} inesistente`)
  return { ...v, giorni: v.giorni.map(g => (g.id === giornoId ? fn(g) : g)) }
}

export function aggiornaTappa(v: Viaggio, giornoId: string, tappaId: string, modifiche: Partial<Omit<Tappa, 'id'>>): Viaggio {
  return conGiorno(v, giornoId, g => {
    if (!g.tappe.some(t => t.id === tappaId)) throw new Error(`tappa ${tappaId} inesistente in ${giornoId}`)
    const tappe = g.tappe.map(t => (t.id === tappaId ? { ...t, ...modifiche } : t))
    return { ...g, tappe: 'ora' in modifiche ? ordinaPerOra(tappe) : tappe }
  })
}

export function aggiungiTappa(v: Viaggio, giornoId: string, tappa: Tappa): Viaggio {
  return conGiorno(v, giornoId, g => {
    const m = minutiDaOra(tappa.ora)
    if (m === null) return { ...g, tappe: [...g.tappe, tappa] }
    const dopo = g.tappe.findIndex(t => { const x = minutiDaOra(t.ora); return x !== null && x > m })
    const tappe = [...g.tappe]
    tappe.splice(dopo < 0 ? tappe.length : dopo, 0, tappa)
    return { ...g, tappe }
  })
}

export function eliminaTappa(v: Viaggio, giornoId: string, tappaId: string): Viaggio {
  return conGiorno(v, giornoId, g => ({ ...g, tappe: g.tappe.filter(t => t.id !== tappaId) }))
}

export function spostaTappa(v: Viaggio, giornoId: string, da: number, a: number): Viaggio {
  return conGiorno(v, giornoId, g => ({ ...g, tappe: sposta(g.tappe, da, a) }))
}

export function aggiornaGiorno(v: Viaggio, giornoId: string, modifiche: Partial<Omit<Giorno, 'id' | 'tappe'>>): Viaggio {
  return conGiorno(v, giornoId, g => ({ ...g, ...modifiche }))
}

/** Aggiorna l'hotel in tutti i giorni che lo condividono. */
export function aggiornaAlloggio(v: Viaggio, nome: string, modifiche: Partial<Luogo>): Viaggio {
  return { ...v, giorni: v.giorni.map(g => (g.alloggio?.nome === nome ? { ...g, alloggio: { ...g.alloggio, ...modifiche } } : g)) }
}

export function aggiungiGiorno(v: Viaggio, dopoIndice: number, cittaId: string): Viaggio {
  const giorni = [...v.giorni]
  giorni.splice(dopoIndice + 1, 0, nuovoGiorno(cittaId))
  return { ...v, giorni }
}

export function duplicaGiorno(v: Viaggio, giornoId: string): Viaggio {
  const i = v.giorni.findIndex(g => g.id === giornoId)
  if (i < 0) throw new Error(`giorno ${giornoId} inesistente`)
  const g = structuredClone(v.giorni[i])
  const copia: Giorno = { ...g, id: nuovoId('g'), note: '', tappe: g.tappe.map(t => ({ ...t, id: nuovoId('t'), stato: 'da-fare', nota: '' })) }
  const giorni = [...v.giorni]
  giorni.splice(i + 1, 0, copia)
  return { ...v, giorni }
}

export function eliminaGiorno(v: Viaggio, giornoId: string): Viaggio {
  return { ...v, giorni: v.giorni.filter(g => g.id !== giornoId) }
}

export function spostaGiorno(v: Viaggio, da: number, a: number): Viaggio {
  return { ...v, giorni: sposta(v.giorni, da, a) }
}

export function aggiungiCitta(v: Viaggio, c: Omit<Citta, 'id'>): { viaggio: Viaggio; id: string } {
  const id = nuovoId('c')
  return { viaggio: { ...v, citta: [...v.citta, { ...c, id }] }, id }
}

export function aggiornaCitta(v: Viaggio, cittaId: string, modifiche: Partial<Omit<Citta, 'id'>>): Viaggio {
  return { ...v, citta: v.citta.map(c => (c.id === cittaId ? { ...c, ...modifiche } : c)) }
}

export function eliminaCitta(v: Viaggio, cittaId: string): Viaggio {
  if (v.giorni.some(g => g.cittaId === cittaId)) throw new Error('città usata da almeno un giorno')
  return { ...v, citta: v.citta.filter(c => c.id !== cittaId) }
}

export function aggiornaViaggio(v: Viaggio, modifiche: Partial<Pick<Viaggio, 'titolo' | 'dataPartenza'>>): Viaggio {
  return { ...v, ...modifiche }
}

export function aggiornaPersona(v: Viaggio, id: string, nome: string): Viaggio {
  return { ...v, persone: v.persone.map(p => (p.id === id ? { ...p, nome } : p)) }
}

export function aggiornaImpostazioni(v: Viaggio, modifiche: Partial<Impostazioni>): Viaggio {
  return { ...v, impostazioni: { ...v.impostazioni, ...modifiche } }
}
```

- [ ] **Step 5: Eseguire il test e vederlo passare**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/model
git commit -m "Operazioni pure per modificare tappe, giorni e città

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Itinerario 2027 di partenza

**Files:**
- Create: `scripts/revisione-2027.ts`, `scripts/genera-base.ts`
- Generate: `src/data/itinerario-base.json`, `src/data/legacy-extra.json`
- Test: `src/data/itinerario-base.test.ts`

**Interfaces:**
- Consumes: `leggiLegacy`, `migraV1`, `validaViaggio`, `dataGiorno`, `minutiDaOra`.
- Produces: `revisione2027(v: Viaggio): Viaggio`; i due JSON importati dallo store (Task 7): `itinerario-base.json` è un `Viaggio`, `legacy-extra.json` è un `V1Extra`.

La revisione applica la sezione 5 dello spec. Si riferisce alle tappe vecchie **per titolo esatto** e si ferma se non le trova.

- [ ] **Step 1: Scrivere il test**

`src/data/itinerario-base.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Scrivere `scripts/revisione-2027.ts`**

```ts
import { minutiDaOra } from '../src/model/date'
import type { Avviso, Giorno, InfoEvento, Luogo, Tappa, TipoTappa, Viaggio } from '../src/model/tipi'

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
  const nara: Giorno = {
    id: 'g-nara', cittaId: 'kyoto', titolo: 'Verso Kyoto, sera di lanterne a Nara',
    intro: 'Il 15 agosto è la sera più bella di Nara: 3.000 lanterne accese al Kasuga Taisha, lumini al Tōdai-ji e il falò Daimonji sul monte alle 20:00.',
    note: '', alloggio: structuredClone(hotelKyoto),
    consigli: [], suggerimenti: g10.suggerimenti, speciale: null,
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
      { ...tappa(g10, 'Parco di Nara + cervi'), ora: '13:00' },
      { ...tappa(g10, 'Todai-ji (Grande Buddha)'), ora: '13:45' },
      { ...tappa(g10, 'Giardino Isuien'), ora: '15:15' },
      { ...tappa(g10, 'Naramachi (centro storico)'), ora: '16:15' },
      { ...cena, ora: '18:00', titolo: 'Cena a Nara', sera: true, descrizione: 'Cena presto a Naramachi o vicino alla stazione Kintetsu, poi di nuovo nel parco per le lanterne.' },
      {
        ...kasuga, ora: '19:00', sera: true, tipo: 'evento', titolo: 'Kasuga Chūgen Mantōrō',
        descrizione: 'Le 3.000 lanterne di pietra e bronzo del santuario accese tutte insieme, solo il 14 e il 15 agosto.',
        consiglio: "Il corridoio interno costa circa 700 ¥ e c'è coda: arrivate entro le 19.",
        ...evento({ nome: 'Kasuga Chūgen Mantōrō', nomeJa: '中元万燈籠', affidabilita: 'certa', fonte: FONTI.nara }),
      },
      nuova('t-nara-4', '20:00', 'Falò Daimonji e lanterne del Tōdai-ji', 'evento',
        'Il falò a forma di 大 si accende sul monte Takamado: si vede bene dal prato di Tobihino. Intanto il Tōdai-ji è illuminato dai lumini del Mantō Kuyōe.',
        L('Prato di Tobihino', 'Tobihino Nara Park', 34.6845, 135.8440),
        evento({ nome: 'Nara Daimonji Okuribi', nomeJa: '奈良大文字送り火', affidabilita: 'certa', fonte: FONTI.nara })),
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
  g8.tappe = [
    tappa(g8, 'Partenza'),
    tappa(g8, "Kinkaku-ji (Padiglione d'Oro)"),
    nuova('t-okuribi-1', '11:30', 'Pausa nelle ore calde', 'libero', 'A Kyoto a metà agosto si superano i 35°: pranzo e riposo in hotel, la giornata vera è stasera.'),
    { ...tappa(g8, 'Tempio Tenryu-ji'), ora: '15:30', consiglio: 'Il giardino chiude alle 17:00.' },
    { ...tappa(g8, 'Foresta di bambu di Arashiyama'), ora: '16:30', consiglio: 'Verso sera meno gente e meno caldo.' },
    nuova('t-okuribi-2', '17:30', 'Cena ad Arashiyama', 'cibo', 'Tofu, yudofu e soba lungo il fiume; mangiate presto per prendere posto sulla riva.', { ...togetsukyo, nome: 'Arashiyama', query: 'Arashiyama Kyoto' }),
    nuova('t-okuribi-3', '19:00', 'Lanterne sul fiume', 'evento',
      "Migliaia di lanterne affidate alla corrente del Katsura per accompagnare gli spiriti dell'Obon. La lanterna si può comprare dalle 12.",
      togetsukyo, evento({ nome: 'Arashiyama Tōrō Nagashi', nomeJa: '嵐山灯籠流し', affidabilita: 'certa', fonte: FONTI.arashiyama })),
    nuova('t-okuribi-4', '20:20', 'Falò a forma di torii', 'evento',
      "L'ultimo dei cinque falò dell'Okuribi, sul monte Mandara, proprio sopra il fiume: il momento più bello della serata.",
      structuredClone(togetsukyo), evento({ nome: 'Gozan no Okuribi', nomeJa: '五山送り火', affidabilita: 'certa', fonte: FONTI.okuribi })),
    nuova('t-okuribi-5', '21:00', 'Rientro in hotel', 'spostamento', 'Randen o JR Sagano Line; aspettatevi code alle stazioni.', structuredClone(hotelKyoto), { spostamento: { modo: 'treno', minuti: 50 } }),
  ]

  // G11 — Kurama e Kibune
  const kurama: Giorno = {
    id: 'g-kurama', cittaId: 'kyoto', titolo: 'Kurama e Kibune, in montagna sopra Kyoto',
    intro: "Un'ora di treno e dieci gradi in meno: il tempio di Kurama fra i cedri, il sentiero nel bosco e il pranzo sulle piattaforme sopra il torrente.",
    note: '', alloggio: structuredClone(hotelKyoto), consigli: g10.consigli, suggerimenti: [], speciale: null,
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

  // Avvisi sui giorni che restano
  g(2).avvisi = [info('Fuochi di Jingū Gaien: data 2027 da verificare, di solito fra il 7 e il 21 agosto.')]
  g(3).avvisi = [info('Festa nazionale (Yama no Hi): più gente nei luoghi famosi.')]
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

- [ ] **Step 3: Scrivere `scripts/genera-base.ts`**

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { migraV1 } from '../src/model/migrazioneV1'
import { validaViaggio } from '../src/model/validazione'
import { leggiLegacy } from './legacy'
import { revisione2027 } from './revisione-2027'

const html = readFileSync(new URL('../legacy/index-v1.html', import.meta.url), 'utf8')
const { dati, extra } = leggiLegacy(html)
const viaggio = revisione2027(migraV1(dati, extra, { dataPartenza: '2027-08-09' }))
const esito = validaViaggio(viaggio)
if (!esito.ok) {
  console.error('Itinerario non valido:\n' + esito.errori.join('\n'))
  process.exit(1)
}
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../src/data/itinerario-base.json', import.meta.url), JSON.stringify(viaggio, null, 1) + '\n')
writeFileSync(new URL('../src/data/legacy-extra.json', import.meta.url), JSON.stringify(extra, null, 1) + '\n')
console.log(`Itinerario: ${viaggio.giorni.length} giorni, ${viaggio.giorni.flatMap(g => g.tappe).length} tappe`)
```

- [ ] **Step 4: Generare i dati**

Run: `npm run genera-base`
Expected: `Itinerario: 20 giorni, … tappe`. Se lo script si ferma con `tappa "…" non trovata`, aprire `legacy/index-v1.html`, cercare il titolo reale di quel giorno e correggere la stringa in `scripts/revisione-2027.ts` (non inventare tappe).

- [ ] **Step 5: Eseguire i test**

Run: `npm test`
Expected: PASS, compreso `itinerario-base.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add scripts src/data
git commit -m "Itinerario 2027: arrivo e partenza, sere di Nara e Arashiyama, Kurama, Himeji; via Hiroshima e Koyasan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Store, dati del telefono, backup

**Files:**
- Create: `src/store/avvio.ts`, `src/store/viaggio.ts`, `src/servizi/backup.ts`
- Test: `src/store/avvio.test.ts`, `src/servizi/backup.test.ts`

**Interfaces:**
- Consumes: `migraV1`, `V1Data`, `V1Extra`, `validaViaggio`, `istanteTokyo`, i JSON del Task 6.
- Produces:
  - `CHIAVE_V1 = 'japan_itinerary_v1'`, `leggiV1(storage: Pick<Storage, 'getItem'>): V1Data | null`, `viaggioDaV1(v1: V1Data): Viaggio`, `viaggioBase(): Viaggio`.
  - `useViaggio` (Zustand, chiave `giappone-viaggio`) con stato `{ viaggio: Viaggio; sceltaV1: 'da-chiedere' | 'fatta'; modifica: boolean; precedente: Viaggio | null }` e azioni `applica(fn: (v: Viaggio) => Viaggio): void`, `applicaAnnullabile(fn, messaggio: string): void` (mostra un toast con "Annulla"), `annulla(): void`, `sostituisci(v: Viaggio): void`, `setModifica(on: boolean): void`, `setSceltaV1(s): void`.
  - `TIPO_FILE = 'viaggio-giappone'`, `interface FileBackup { tipo: typeof TIPO_FILE; creato: string; viaggio: Viaggio }`, `creaBackup(v: Viaggio, adesso: Date): FileBackup`, `leggiBackup(testo: string): { ok: true; viaggio: Viaggio } | { ok: false; errore: string }`, `nomeFileBackup(adesso: Date): string`, `condividiOScarica(b: FileBackup, adesso?: Date): Promise<'condiviso' | 'scaricato' | 'annullato'>`.

- [ ] **Step 1: Scrivere i test**

`src/store/avvio.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { leggiLegacy } from '../../scripts/legacy'
import { CHIAVE_V1, leggiV1, viaggioBase, viaggioDaV1 } from './avvio'

const memoria = (valori: Record<string, string>) => ({ getItem: (k: string) => valori[k] ?? null })

test('leggiV1 riconosce solo dati v1 validi', () => {
  expect(leggiV1(memoria({}))).toBeNull()
  expect(leggiV1(memoria({ [CHIAVE_V1]: 'non json' }))).toBeNull()
  expect(leggiV1(memoria({ [CHIAVE_V1]: '{"altro":1}' }))).toBeNull()
  expect(leggiV1(memoria({ [CHIAVE_V1]: '{"title":"x","cities":[]}' }))).toEqual({ title: 'x', cities: [] })
})

test('viaggioDaV1 usa la data di partenza salvata, o il 9 agosto 2027', () => {
  const html = readFileSync(new URL('../../legacy/index-v1.html', import.meta.url), 'utf8')
  const { dati } = leggiLegacy(html)
  expect(viaggioDaV1(dati).dataPartenza).toBe('2027-08-09')
  expect(viaggioDaV1({ ...dati, tripStart: '2027-08-10' }).dataPartenza).toBe('2027-08-10')
  expect(viaggioDaV1(dati).giorni).toHaveLength(18)
})

test('viaggioBase restituisce una copia nuova ogni volta', () => {
  const a = viaggioBase()
  a.titolo = 'cambiato'
  expect(viaggioBase().titolo).toBe('Giappone — agosto 2027')
})
```

`src/servizi/backup.test.ts`:

```ts
import { expect, test } from 'vitest'
import { viaggioDiProva } from '../model/fixture'
import { creaBackup, leggiBackup, nomeFileBackup } from './backup'

const adesso = new Date('2027-08-10T12:00:00+09:00')

test('andata e ritorno', () => {
  const v = viaggioDiProva()
  expect(leggiBackup(JSON.stringify(creaBackup(v, adesso)))).toEqual({ ok: true, viaggio: v })
})

test('errori chiari', () => {
  expect(leggiBackup('{')).toEqual({ ok: false, errore: 'Il file non è un JSON leggibile.' })
  expect(leggiBackup('{"tipo":"altro"}')).toEqual({ ok: false, errore: "Il file non è un backup di quest'app." })
  const r = leggiBackup(JSON.stringify({ tipo: 'viaggio-giappone', creato: 'x', viaggio: { versione: 2 } }))
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.errore).toMatch(/^Il backup contiene errori: /)
})

test('nomeFileBackup usa la data di Tokyo', () => {
  expect(nomeFileBackup(adesso)).toBe('giappone-backup-2027-08-10.json')
})
```

- [ ] **Step 2: Eseguire i test e vederli fallire**

Run: `npm test -- src/store src/servizi`
Expected: FAIL, import non risolti.

- [ ] **Step 3: Scrivere `src/store/avvio.ts`**

```ts
import base from '../data/itinerario-base.json'
import extra from '../data/legacy-extra.json'
import { migraV1, type V1Data, type V1Extra } from '../model/migrazioneV1'
import type { Viaggio } from '../model/tipi'

export const CHIAVE_V1 = 'japan_itinerary_v1'

/** I dati salvati dalla vecchia app su questo telefono, se ci sono. */
export function leggiV1(storage: Pick<Storage, 'getItem'>): V1Data | null {
  const raw = storage.getItem(CHIAVE_V1)
  if (!raw) return null
  try {
    const d = JSON.parse(raw)
    return d && typeof d === 'object' && Array.isArray(d.cities) ? (d as V1Data) : null
  } catch {
    return null
  }
}

export function viaggioDaV1(v1: V1Data): Viaggio {
  return migraV1(v1, extra as unknown as V1Extra, { dataPartenza: v1.tripStart || '2027-08-09' })
}

export function viaggioBase(): Viaggio {
  return structuredClone(base as unknown as Viaggio)
}
```

- [ ] **Step 4: Scrivere `src/store/viaggio.ts`**

```ts
import { toast } from 'sonner'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Viaggio } from '../model/tipi'
import { leggiV1, viaggioBase } from './avvio'

type SceltaV1 = 'da-chiedere' | 'fatta'

interface StatoApp {
  viaggio: Viaggio
  sceltaV1: SceltaV1
  modifica: boolean
  precedente: Viaggio | null
  applica: (fn: (v: Viaggio) => Viaggio) => void
  applicaAnnullabile: (fn: (v: Viaggio) => Viaggio, messaggio: string) => void
  annulla: () => void
  sostituisci: (v: Viaggio) => void
  setModifica: (on: boolean) => void
  setSceltaV1: (s: SceltaV1) => void
}

function sceltaIniziale(): SceltaV1 {
  try {
    return leggiV1(localStorage) ? 'da-chiedere' : 'fatta'
  } catch {
    return 'fatta'
  }
}

export const useViaggio = create<StatoApp>()(
  persist(
    (set, get) => ({
      viaggio: viaggioBase(),
      sceltaV1: sceltaIniziale(),
      modifica: false,
      precedente: null,
      applica: fn => set({ viaggio: fn(get().viaggio) }),
      applicaAnnullabile: (fn, messaggio) => {
        const prima = get().viaggio
        set({ viaggio: fn(prima), precedente: prima })
        toast(messaggio, { action: { label: 'Annulla', onClick: () => get().annulla() }, duration: 6000 })
      },
      annulla: () => {
        const p = get().precedente
        if (p) set({ viaggio: p, precedente: null })
      },
      sostituisci: viaggio => set({ viaggio, precedente: null }),
      setModifica: modifica => set({ modifica }),
      setSceltaV1: sceltaV1 => set({ sceltaV1 }),
    }),
    {
      name: 'giappone-viaggio',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ viaggio: s.viaggio, sceltaV1: s.sceltaV1 }),
    },
  ),
)
```

- [ ] **Step 5: Scrivere `src/servizi/backup.ts`**

```ts
import { istanteTokyo } from '../model/date'
import type { Viaggio } from '../model/tipi'
import { validaViaggio } from '../model/validazione'

export const TIPO_FILE = 'viaggio-giappone'

export interface FileBackup {
  tipo: typeof TIPO_FILE
  creato: string
  viaggio: Viaggio
}

export function creaBackup(v: Viaggio, adesso: Date): FileBackup {
  return { tipo: TIPO_FILE, creato: adesso.toISOString(), viaggio: v }
}

export function leggiBackup(testo: string): { ok: true; viaggio: Viaggio } | { ok: false; errore: string } {
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
  return { ok: true, viaggio: esito.viaggio }
}

export function nomeFileBackup(adesso: Date): string {
  return `giappone-backup-${istanteTokyo(adesso).data}.json`
}

/** Sul telefono apre il menu di condivisione (WhatsApp, File…); altrove scarica il file. */
export async function condividiOScarica(b: FileBackup, adesso = new Date()): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  const nome = nomeFileBackup(adesso)
  const file = new File([JSON.stringify(b)], nome, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Itinerario Giappone' })
      return 'condiviso'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'annullato'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'scaricato'
}
```

- [ ] **Step 6: Eseguire i test e vederli passare**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store src/servizi
git commit -m "Store persistito con annulla, recupero dei dati vecchi, backup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Servizi esterni (mappe, foto, meteo, luoghi, distanze)

**Files:**
- Create: `src/servizi/mappe.ts`, `src/servizi/foto.ts`, `src/servizi/meteo.ts`, `src/servizi/luoghi.ts`, `src/servizi/distanza.ts`
- Test: `src/servizi/mappe.test.ts`, `src/servizi/foto.test.ts`, `src/servizi/meteo.test.ts`, `src/servizi/luoghi.test.ts`, `src/servizi/distanza.test.ts`

**Interfaces:**
- Consumes: `Luogo`, `ModoSpostamento`, `differenzaGiorni`.
- Produces:
  - mappe: `type ModoGoogle = 'transit' | 'walking' | 'driving'`, `urlIndicazioni(a: Luogo, modo?: ModoGoogle): string`, `urlPercorso(da: Luogo, a: Luogo, modo: ModoGoogle): string`, `urlCerca(l: Luogo): string`, `urlCercaBiglietti(titolo: string): string`, `modoGoogle(m: ModoSpostamento): ModoGoogle`.
  - foto: `urlWikipedia(q)`, `urlCommons(q)`, `leggiWikipedia(j: unknown): string | null`, `leggiCommons(j: unknown): string | null`, `cercaFoto(query: string): Promise<string | null>`.
  - meteo: `interface MeteoGiorno { data: string; codice: number; max: number; min: number; pioggia: number | null }`, `type IconaMeteo`, `urlMeteo(lat, lng, data)`, `leggiMeteo(j: unknown): MeteoGiorno | null`, `descriviCodice(c: number): { etichetta: string; icona: IconaMeteo }`, `GIORNI_PREVISIONE = 15`, `previsioneDisponibile(data, oggi): boolean`, `interface DipendenzeMeteo { prendi(url: string): Promise<unknown>; storage: Pick<Storage, 'getItem' | 'setItem'>; ora: number }`, `meteoDelGiorno(lat, lng, data, oggi, dip?): Promise<{ meteo: MeteoGiorno; salvato: number } | null>`.
  - luoghi: `interface RisultatoLuogo { nome: string; indirizzo: string; lat: number; lng: number }`, `urlNominatim(q)`, `leggiNominatim(j: unknown): RisultatoLuogo[]`, `cercaLuoghi(q: string): Promise<RisultatoLuogo[]>`.
  - distanza: `distanzaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number`, `formatoDistanza(km: number): string`.

- [ ] **Step 1: Scrivere i test**

`src/servizi/mappe.test.ts`:

```ts
import { expect, test } from 'vitest'
import { modoGoogle, urlCerca, urlCercaBiglietti, urlIndicazioni, urlPercorso } from './mappe'

const sensoji = { nome: 'Senso-ji', query: 'Senso-ji Temple Asakusa', lat: 35.7148, lng: 139.7967 }

test('le indicazioni usano il nome, che Google risolve meglio delle coordinate', () => {
  expect(urlIndicazioni(sensoji)).toBe('https://www.google.com/maps/dir/?api=1&destination=Senso-ji%20Temple%20Asakusa&travelmode=transit')
  expect(urlIndicazioni({ nome: 'X', query: '', lat: 1, lng: 2 }, 'walking')).toBe('https://www.google.com/maps/dir/?api=1&destination=1%2C2&travelmode=walking')
  expect(urlIndicazioni({ nome: 'Solo nome', query: '' })).toContain('destination=Solo%20nome')
})

test('percorso, ricerca, biglietti, modi', () => {
  expect(urlPercorso(sensoji, { nome: 'S', query: 'Tokyo Skytree' }, 'walking'))
    .toBe('https://www.google.com/maps/dir/?api=1&origin=Senso-ji%20Temple%20Asakusa&destination=Tokyo%20Skytree&travelmode=walking')
  expect(urlCerca(sensoji)).toBe('https://www.google.com/maps/search/?api=1&query=Senso-ji%20Temple%20Asakusa')
  expect(urlCercaBiglietti('Shibuya Sky')).toBe('https://www.google.com/search?q=Shibuya%20Sky%20biglietti%20prenotazione%20tickets')
  expect([modoGoogle('piedi'), modoGoogle('mezzi'), modoGoogle('treno'), modoGoogle('taxi')]).toEqual(['walking', 'transit', 'transit', 'driving'])
})
```

`src/servizi/foto.test.ts`:

```ts
import { expect, test } from 'vitest'
import { leggiCommons, leggiWikipedia, urlWikipedia } from './foto'

test('legge la miniatura di Wikipedia', () => {
  expect(leggiWikipedia({ query: { pages: { '1': { thumbnail: { source: 'https://upload.wikimedia.org/a.jpg' } } } } })).toBe('https://upload.wikimedia.org/a.jpg')
  expect(leggiWikipedia({ query: { pages: { '1': {} } } })).toBeNull()
  expect(leggiWikipedia({})).toBeNull()
})

test('legge la miniatura di Commons', () => {
  expect(leggiCommons({ query: { pages: { '9': { imageinfo: [{ thumburl: 'https://upload.wikimedia.org/b.jpg' }] } } } })).toBe('https://upload.wikimedia.org/b.jpg')
  expect(leggiCommons(null)).toBeNull()
})

test('url di ricerca', () => {
  expect(urlWikipedia('Tokyo Skytree')).toContain('gsrsearch=Tokyo%20Skytree')
  expect(urlWikipedia('Tokyo Skytree')).toContain('origin=*')
})
```

`src/servizi/meteo.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest'
import { descriviCodice, leggiMeteo, meteoDelGiorno, previsioneDisponibile, urlMeteo } from './meteo'

const risposta = {
  daily: { time: ['2027-08-16'], weather_code: [2], temperature_2m_max: [34.6], temperature_2m_min: [24.2], precipitation_probability_max: [10] },
}

test('leggiMeteo', () => {
  expect(leggiMeteo(risposta)).toEqual({ data: '2027-08-16', codice: 2, max: 35, min: 24, pioggia: 10 })
  expect(leggiMeteo({ daily: { time: [] } })).toBeNull()
  expect(leggiMeteo({})).toBeNull()
})

test('descriviCodice', () => {
  expect(descriviCodice(0)).toEqual({ etichetta: 'Sereno', icona: 'sereno' })
  expect(descriviCodice(2).icona).toBe('poco-nuvoloso')
  expect(descriviCodice(63).icona).toBe('pioggia')
  expect(descriviCodice(81).etichetta).toBe('Rovesci')
  expect(descriviCodice(95).icona).toBe('temporale')
})

test('previsioneDisponibile: da oggi a 15 giorni', () => {
  expect(previsioneDisponibile('2027-08-16', '2027-08-16')).toBe(true)
  expect(previsioneDisponibile('2027-08-31', '2027-08-16')).toBe(true)
  expect(previsioneDisponibile('2027-09-01', '2027-08-16')).toBe(false)
  expect(previsioneDisponibile('2027-08-15', '2027-08-16')).toBe(false)
})

test('urlMeteo chiede i dati giornalieri in ora di Tokyo', () => {
  expect(urlMeteo(35.01, 135.77, '2027-08-16')).toBe(
    'https://api.open-meteo.com/v1/forecast?latitude=35.01&longitude=135.77&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&start_date=2027-08-16&end_date=2027-08-16',
  )
})

describe('meteoDelGiorno', () => {
  const memoria = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
  }
  const ORA = Date.parse('2027-08-16T08:00:00+09:00')

  test('scarica e salva', async () => {
    const storage = memoria()
    const prendi = vi.fn().mockResolvedValue(risposta)
    const r = await meteoDelGiorno(35.01, 135.77, '2027-08-16', '2027-08-16', { prendi, storage, ora: ORA })
    expect(r).toEqual({ meteo: expect.objectContaining({ max: 35 }), salvato: ORA })
    const di = await meteoDelGiorno(35.01, 135.77, '2027-08-16', '2027-08-16', { prendi, storage, ora: ORA + 60_000 })
    expect(di?.salvato).toBe(ORA)
    expect(prendi).toHaveBeenCalledTimes(1)
  })
  test('offline: restituisce il dato vecchio', async () => {
    const storage = memoria()
    await meteoDelGiorno(35.01, 135.77, '2027-08-16', '2027-08-16', { prendi: async () => risposta, storage, ora: ORA })
    const r = await meteoDelGiorno(35.01, 135.77, '2027-08-16', '2027-08-16', { prendi: () => Promise.reject(new Error('offline')), storage, ora: ORA + 5 * 3_600_000 })
    expect(r?.salvato).toBe(ORA)
  })
  test('troppo lontano: niente richiesta', async () => {
    const prendi = vi.fn()
    expect(await meteoDelGiorno(35, 135, '2027-08-16', '2026-09-30', { prendi, storage: memoria(), ora: ORA })).toBeNull()
    expect(prendi).not.toHaveBeenCalled()
  })
})
```

`src/servizi/luoghi.test.ts`:

```ts
import { expect, test } from 'vitest'
import { leggiNominatim, urlNominatim } from './luoghi'

test('leggiNominatim', () => {
  const j = [
    { name: 'Kinkaku-ji', display_name: 'Kinkaku-ji, Kita, Kyoto, Giappone', lat: '35.0394', lon: '135.7292' },
    { name: '', display_name: 'Via senza nome, Osaka', lat: '34.7', lon: '135.5' },
    { name: 'rotto', display_name: 'x', lat: 'boh', lon: '1' },
  ]
  expect(leggiNominatim(j)).toEqual([
    { nome: 'Kinkaku-ji', indirizzo: 'Kinkaku-ji, Kita, Kyoto, Giappone', lat: 35.0394, lng: 135.7292 },
    { nome: 'Via senza nome', indirizzo: 'Via senza nome, Osaka', lat: 34.7, lng: 135.5 },
  ])
  expect(leggiNominatim({ errore: 1 })).toEqual([])
})

test('urlNominatim cerca solo in Giappone', () => {
  expect(urlNominatim('Kinkaku-ji')).toBe('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=jp&accept-language=it,en&q=Kinkaku-ji')
})
```

`src/servizi/distanza.test.ts`:

```ts
import { expect, test } from 'vitest'
import { distanzaKm, formatoDistanza } from './distanza'

test('distanzaKm fra le stazioni di Tokyo e Kyoto, in linea d\'aria', () => {
  const d = distanzaKm({ lat: 35.6812, lng: 139.7671 }, { lat: 34.9858, lng: 135.7588 })
  expect(d).toBeGreaterThan(360)
  expect(d).toBeLessThan(380)
  expect(distanzaKm({ lat: 35, lng: 135 }, { lat: 35, lng: 135 })).toBe(0)
})

test('formatoDistanza', () => {
  expect(formatoDistanza(0.234)).toBe('230 m')
  expect(formatoDistanza(2.345)).toBe('2,3 km')
  expect(formatoDistanza(12.6)).toBe('13 km')
})
```

- [ ] **Step 2: Eseguire i test e vederli fallire**

Run: `npm test -- src/servizi`
Expected: FAIL, import non risolti (tranne `backup.test.ts`, che passa).

- [ ] **Step 3: Scrivere `src/servizi/mappe.ts`**

```ts
import type { Luogo, ModoSpostamento } from '../model/tipi'

const BASE = 'https://www.google.com/maps'
export type ModoGoogle = 'transit' | 'walking' | 'driving'

function destinazione(l: Luogo): string {
  if (l.query) return l.query
  if (l.lat != null && l.lng != null) return `${l.lat},${l.lng}`
  return l.nome
}

export function urlIndicazioni(a: Luogo, modo: ModoGoogle = 'transit'): string {
  return `${BASE}/dir/?api=1&destination=${encodeURIComponent(destinazione(a))}&travelmode=${modo}`
}

export function urlPercorso(da: Luogo, a: Luogo, modo: ModoGoogle): string {
  return `${BASE}/dir/?api=1&origin=${encodeURIComponent(destinazione(da))}&destination=${encodeURIComponent(destinazione(a))}&travelmode=${modo}`
}

export function urlCerca(l: Luogo): string {
  return `${BASE}/search/?api=1&query=${encodeURIComponent(destinazione(l))}`
}

export function urlCercaBiglietti(titolo: string): string {
  return 'https://www.google.com/search?q=' + encodeURIComponent(`${titolo} biglietti prenotazione tickets`)
}

export function modoGoogle(m: ModoSpostamento): ModoGoogle {
  return m === 'piedi' ? 'walking' : m === 'taxi' ? 'driving' : 'transit'
}
```

- [ ] **Step 4: Scrivere `src/servizi/foto.ts`**

```ts
const CHIAVE = 'giappone-foto-v1'
let cache: Record<string, string | null> | null = null
const inCorso = new Map<string, Promise<string | null>>()

type Pagine = { query?: { pages?: Record<string, { thumbnail?: { source?: string }; imageinfo?: { thumburl?: string }[] }> } }

export function urlWikipedia(q: string): string {
  return 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=800&generator=search&gsrlimit=1&gsrsearch=' + encodeURIComponent(q)
}

export function urlCommons(q: string): string {
  return 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&gsrsearch=' + encodeURIComponent(q)
}

export function leggiWikipedia(j: unknown): string | null {
  const pagine = (j as Pagine | null)?.query?.pages
  for (const k in pagine ?? {}) { const u = pagine![k].thumbnail?.source; if (u) return u }
  return null
}

export function leggiCommons(j: unknown): string | null {
  const pagine = (j as Pagine | null)?.query?.pages
  for (const k in pagine ?? {}) { const u = pagine![k].imageinfo?.[0]?.thumburl; if (u) return u }
  return null
}

function leggiCache(): Record<string, string | null> {
  if (!cache) {
    try { cache = JSON.parse(localStorage.getItem(CHIAVE) || '{}') } catch { cache = {} }
  }
  return cache!
}

async function prendi(url: string, leggi: (j: unknown) => string | null): Promise<string | null> {
  try {
    const r = await fetch(url)
    return r.ok ? leggi(await r.json()) : null
  } catch {
    return null
  }
}

/** Foto del luogo da Wikipedia, poi da Commons. Ricorda anche i "non trovato", ma solo se si era online. */
export function cercaFoto(query: string): Promise<string | null> {
  const c = leggiCache()
  if (query in c) return Promise.resolve(c[query])
  const gia = inCorso.get(query)
  if (gia) return gia
  const p = (async () => {
    const u = (await prendi(urlWikipedia(query), leggiWikipedia)) ?? (await prendi(urlCommons(query), leggiCommons))
    if (u || navigator.onLine) {
      c[query] = u
      try { localStorage.setItem(CHIAVE, JSON.stringify(c)) } catch { /* memoria piena: pazienza */ }
    }
    inCorso.delete(query)
    return u
  })()
  inCorso.set(query, p)
  return p
}
```

- [ ] **Step 5: Scrivere `src/servizi/meteo.ts`**

```ts
import { differenzaGiorni } from '../model/date'

export interface MeteoGiorno { data: string; codice: number; max: number; min: number; pioggia: number | null }
export type IconaMeteo = 'sereno' | 'poco-nuvoloso' | 'nuvoloso' | 'nebbia' | 'pioggia' | 'neve' | 'temporale'
export const GIORNI_PREVISIONE = 15

export function urlMeteo(lat: number, lng: number, data: string): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&start_date=${data}&end_date=${data}`
}

type Risposta = { daily?: { time?: string[]; weather_code?: unknown[]; temperature_2m_max?: unknown[]; temperature_2m_min?: unknown[]; precipitation_probability_max?: unknown[] } }

export function leggiMeteo(j: unknown): MeteoGiorno | null {
  const d = (j as Risposta | null)?.daily
  if (!d?.time?.length) return null
  const n = (x: unknown) => (typeof x === 'number' ? x : null)
  const max = n(d.temperature_2m_max?.[0]), min = n(d.temperature_2m_min?.[0]), codice = n(d.weather_code?.[0])
  if (max === null || min === null || codice === null) return null
  return { data: d.time[0], codice, max: Math.round(max), min: Math.round(min), pioggia: n(d.precipitation_probability_max?.[0]) }
}

export function descriviCodice(c: number): { etichetta: string; icona: IconaMeteo } {
  if (c === 0) return { etichetta: 'Sereno', icona: 'sereno' }
  if (c <= 2) return { etichetta: 'Poco nuvoloso', icona: 'poco-nuvoloso' }
  if (c === 3) return { etichetta: 'Nuvoloso', icona: 'nuvoloso' }
  if (c === 45 || c === 48) return { etichetta: 'Nebbia', icona: 'nebbia' }
  if (c >= 80 && c <= 82) return { etichetta: 'Rovesci', icona: 'pioggia' }
  if (c >= 51 && c <= 67) return { etichetta: 'Pioggia', icona: 'pioggia' }
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { etichetta: 'Neve', icona: 'neve' }
  if (c >= 95) return { etichetta: 'Temporale', icona: 'temporale' }
  return { etichetta: 'Variabile', icona: 'nuvoloso' }
}

export function previsioneDisponibile(data: string, oggi: string): boolean {
  const d = differenzaGiorni(oggi, data)
  return d >= 0 && d <= GIORNI_PREVISIONE
}

export interface DipendenzeMeteo {
  prendi: (url: string) => Promise<unknown>
  storage: Pick<Storage, 'getItem' | 'setItem'>
  ora: number
}

const predefinite = (): DipendenzeMeteo => ({
  prendi: async url => { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return r.json() },
  storage: localStorage,
  ora: Date.now(),
})

const VALIDITA_MS = 3 * 3_600_000

/** Previsione del giorno, dalla cache se ha meno di 3 ore; se la rete manca, l'ultima salvata. */
export async function meteoDelGiorno(lat: number, lng: number, data: string, oggi: string, dip: DipendenzeMeteo = predefinite()): Promise<{ meteo: MeteoGiorno; salvato: number } | null> {
  if (!previsioneDisponibile(data, oggi)) return null
  const chiave = `giappone-meteo:${lat.toFixed(2)},${lng.toFixed(2)}:${data}`
  let inCache: { meteo: MeteoGiorno; salvato: number } | null = null
  try { inCache = JSON.parse(dip.storage.getItem(chiave) || 'null') } catch { inCache = null }
  if (inCache && dip.ora - inCache.salvato < VALIDITA_MS) return inCache
  try {
    const meteo = leggiMeteo(await dip.prendi(urlMeteo(lat, lng, data)))
    if (meteo) {
      const nuovo = { meteo, salvato: dip.ora }
      try { dip.storage.setItem(chiave, JSON.stringify(nuovo)) } catch { /* memoria piena */ }
      return nuovo
    }
  } catch { /* offline o servizio giù */ }
  return inCache
}
```

- [ ] **Step 6: Scrivere `src/servizi/luoghi.ts`**

```ts
export interface RisultatoLuogo { nome: string; indirizzo: string; lat: number; lng: number }

export function urlNominatim(q: string): string {
  return 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=jp&accept-language=it,en&q=' + encodeURIComponent(q)
}

export function leggiNominatim(j: unknown): RisultatoLuogo[] {
  if (!Array.isArray(j)) return []
  return j.flatMap((r: { name?: string; display_name?: string; lat?: string; lon?: string }) => {
    const lat = Number(r.lat), lng = Number(r.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
    const indirizzo = String(r.display_name ?? '')
    return [{ nome: r.name || indirizzo.split(',')[0].trim(), indirizzo, lat, lng }]
  })
}

/** Una sola richiesta per ricerca, solo quando si preme "Cerca" (policy di Nominatim). */
export async function cercaLuoghi(q: string): Promise<RisultatoLuogo[]> {
  const r = await fetch(urlNominatim(q), { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('ricerca non disponibile')
  return leggiNominatim(await r.json())
}
```

- [ ] **Step 7: Scrivere `src/servizi/distanza.ts`**

```ts
type Punto = { lat: number; lng: number }

export function distanzaKm(a: Punto, b: Punto): number {
  const r = (x: number) => (x * Math.PI) / 180
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export function formatoDistanza(km: number): string {
  if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}
```

- [ ] **Step 8: Eseguire i test e vederli passare**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/servizi
git commit -m "Servizi: link a Google Maps, foto, meteo con cache, ricerca luoghi, distanze

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Fondamenta dell'interfaccia (temi, tinta, componenti, navigazione)

**Files:**
- Create: `src/ui/colore.ts`, `src/ui/rotta.ts`, `src/ui/hook.ts`, `src/ui/icone.ts`, `src/ui/tema.css`, `src/ui/base.css`, `src/ui/componenti.tsx`, `src/ui/Foglio.tsx`, `src/ui/FotoLuogo.tsx`, `src/ui/TabBar.tsx`
- Create (provvisori, riscritti nei task 10–14): `src/schermate/oggi/Oggi.tsx`, `src/schermate/programma/Programma.tsx`, `src/schermate/mappa/Mappa.tsx`, `src/schermate/viaggio/SchermataViaggio.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/ui/colore.test.ts`, `src/ui/rotta.test.ts`

**Interfaces:**
- Consumes: store, `faseViaggio`, `cittaDi`, `cercaFoto`, tipi.
- Produces:
  - colore: `contrasto(a: string, b: string): number`, `interface Tinta { forte: string; suForte: string; testo: string; tenue: string }`, `calcolaTinta(hex: string, tema: 'chiaro' | 'scuro'): Tinta`, `testoSu(hex: string): '#FFFFFF' | '#111114'`, `SFONDO`.
  - rotta: `type Schermata = 'oggi' | 'programma' | 'mappa' | 'viaggio'`, `interface Rotta { schermata: Schermata; indice: number | null }`, `leggiRotta(hash: string): Rotta`, `hrefRotta(s: Schermata, indice?: number | null): string`, `vai(s, indice?)`, `useRotta(): Rotta`, `leggiOverride(search: string): Date | null`.
  - hook: `useAdesso(intervalloMs?): Date` (rispetta `?oggi=2027-08-16T10:15` per le prove), `useTemaRisolto(scelta: Tema): 'chiaro' | 'scuro'`, `useInstallazione(): { installata: boolean; ios: boolean; puoInstallare: boolean; installa(): Promise<void> }`.
  - icone: `ICONA_TIPO`, `ETICHETTA_TIPO`, `ICONA_MODO`, `ETICHETTA_MODO`, `ETICHETTA_AFFIDABILITA`.
  - componenti: `BarraNav({ titolo, sinistra?, destra? })`, `TitoloGrande({ children, sopra?, sotto? })`, `Gruppo({ titolo?, piede?, children })`, `Riga({ icona?, titolo, sottotitolo?, destra?, onClick?, href?, pericolo? })`, `Segmentato<T>({ valore, opzioni, onCambia, etichetta })`, `Badge({ tono?: 'tinta' | 'avviso' | 'neutro', children })`, `Vuoto({ titolo, testo?, azione? })`, `Campo({ etichetta, children })`.
  - `Foglio({ aperto, onChiudi, titolo, children, pieno?, azioneDestra? })`, `FotoLuogo({ query?, override?, className?, alt? })`, `TabBar({ attiva })`.
  - Schermate: `Oggi()`, `Programma({ indice }: { indice: number | null })`, `Mappa({ indice }: { indice: number | null })`, `SchermataViaggio()`.

- [ ] **Step 1: Scrivere i test**

`src/ui/colore.test.ts`:

```ts
import { expect, test } from 'vitest'
import base from '../data/itinerario-base.json'
import { SFONDO, calcolaTinta, contrasto, testoSu } from './colore'

test('contrasto WCAG', () => {
  expect(contrasto('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
  expect(contrasto('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
})

const colori = [...base.citta.map(c => c.colore), '#F4A259', '#FFD166', '#4A7C99', '#8E8E93']

test.each(colori)('la tinta %s è leggibile in entrambi i temi', hex => {
  for (const tema of ['chiaro', 'scuro'] as const) {
    const t = calcolaTinta(hex, tema)
    expect(contrasto(t.forte, t.suForte)).toBeGreaterThanOrEqual(4.5)
    expect(contrasto(t.testo, SFONDO[tema])).toBeGreaterThanOrEqual(4.5)
  }
})

test('testoSu sceglie bianco o quasi nero', () => {
  expect(testoSu('#1D3557')).toBe('#FFFFFF')
  expect(testoSu('#FFD166')).toBe('#111114')
})
```

`src/ui/rotta.test.ts`:

```ts
import { expect, test } from 'vitest'
import { hrefRotta, leggiOverride, leggiRotta } from './rotta'

test('leggiRotta', () => {
  expect(leggiRotta('')).toEqual({ schermata: 'oggi', indice: null })
  expect(leggiRotta('#/programma/7')).toEqual({ schermata: 'programma', indice: 7 })
  expect(leggiRotta('#/mappa')).toEqual({ schermata: 'mappa', indice: null })
  expect(leggiRotta('#/boh/x')).toEqual({ schermata: 'oggi', indice: null })
})

test('hrefRotta', () => {
  expect(hrefRotta('programma', 3)).toBe('#/programma/3')
  expect(hrefRotta('viaggio')).toBe('#/viaggio')
})

test('leggiOverride per provare l\'app "durante" il viaggio', () => {
  expect(leggiOverride('?oggi=2027-08-16T10:15')?.toISOString()).toBe('2027-08-16T01:15:00.000Z')
  expect(leggiOverride('?oggi=2027-08-16')?.toISOString()).toBe('2027-08-16T00:00:00.000Z')
  expect(leggiOverride('')).toBeNull()
  expect(leggiOverride('?oggi=boh')).toBeNull()
})
```

- [ ] **Step 2: Eseguire i test e vederli fallire**

Run: `npm test -- src/ui`
Expected: FAIL, import non risolti.

- [ ] **Step 3: Scrivere `src/ui/colore.ts`**

```ts
export const SFONDO = { chiaro: '#F6F1E7', scuro: '#0E0F13' } as const

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function esadecimale(c: number[]): string {
  return '#' + c.map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function luminanza(hex: string): number {
  const [r, g, b] = rgb(hex).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrasto(a: string, b: string): number {
  const [l1, l2] = [luminanza(a), luminanza(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

function mescola(a: string, b: string, t: number): string {
  const A = rgb(a), B = rgb(b)
  return esadecimale(A.map((x, i) => x + (B[i] - x) * t))
}

/** Mescola `colore` verso `verso` a passi del 5% finché il contrasto con `contro` basta. */
function finoAContrasto(colore: string, verso: string, contro: string, minimo = 4.5): string {
  for (let i = 0; i <= 20; i++) {
    const c = mescola(colore, verso, i / 20)
    if (contrasto(c, contro) >= minimo) return c
  }
  return verso
}

export function testoSu(hex: string): '#FFFFFF' | '#111114' {
  return contrasto(hex, '#FFFFFF') >= contrasto(hex, '#111114') ? '#FFFFFF' : '#111114'
}

export interface Tinta { forte: string; suForte: string; testo: string; tenue: string }

/** Varianti leggibili del colore della città per il tema attivo. */
export function calcolaTinta(hex: string, tema: 'chiaro' | 'scuro'): Tinta {
  if (tema === 'chiaro') {
    return {
      forte: finoAContrasto(hex, '#000000', '#FFFFFF'),
      suForte: '#FFFFFF',
      testo: finoAContrasto(hex, '#000000', SFONDO.chiaro),
      tenue: mescola(hex, '#FFFFFF', 0.86),
    }
  }
  const suForte = testoSu(hex)
  return {
    forte: finoAContrasto(hex, suForte === '#FFFFFF' ? '#000000' : '#FFFFFF', suForte),
    suForte,
    testo: finoAContrasto(hex, '#FFFFFF', SFONDO.scuro),
    tenue: mescola(hex, SFONDO.scuro, 0.8),
  }
}
```

- [ ] **Step 4: Scrivere `src/ui/rotta.ts`**

```ts
import { useSyncExternalStore } from 'react'

export type Schermata = 'oggi' | 'programma' | 'mappa' | 'viaggio'
export interface Rotta { schermata: Schermata; indice: number | null }
const SCHERMATE: Schermata[] = ['oggi', 'programma', 'mappa', 'viaggio']

export function leggiRotta(hash: string): Rotta {
  const [, s, i] = hash.replace(/^#/, '').split('/')
  const schermata = SCHERMATE.find(x => x === s) ?? 'oggi'
  return { schermata, indice: schermata !== 'oggi' && i !== undefined && /^\d+$/.test(i) ? Number(i) : null }
}

export function hrefRotta(s: Schermata, indice?: number | null): string {
  return `#/${s}${indice != null ? `/${indice}` : ''}`
}

export function vai(s: Schermata, indice?: number | null): void {
  location.hash = hrefRotta(s, indice)
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

- [ ] **Step 5: Eseguire i test e vederli passare**

Run: `npm test -- src/ui`
Expected: PASS. Se una tinta non passa, non abbassare la soglia: correggere `calcolaTinta`.

- [ ] **Step 6: Scrivere `src/ui/hook.ts` e `src/ui/icone.ts`**

`src/ui/hook.ts`:

```ts
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { Tema } from '../model/tipi'
import { leggiOverride } from './rotta'

/** L'ora attuale, aggiornata ogni `intervalloMs`; con `?oggi=` resta fissa su quel momento. */
export function useAdesso(intervalloMs = 30_000): Date {
  const override = useMemo(() => leggiOverride(location.search), [])
  const [adesso, setAdesso] = useState(() => new Date())
  useEffect(() => {
    if (override) return
    const id = setInterval(() => setAdesso(new Date()), intervalloMs)
    return () => clearInterval(id)
  }, [override, intervalloMs])
  return override ?? adesso
}

const QUERY_SCURO = '(prefers-color-scheme: dark)'
function iscriviScuro(cb: () => void) {
  const m = matchMedia(QUERY_SCURO)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

export function useTemaRisolto(scelta: Tema): 'chiaro' | 'scuro' {
  const scuro = useSyncExternalStore(iscriviScuro, () => matchMedia(QUERY_SCURO).matches)
  return scelta === 'auto' ? (scuro ? 'scuro' : 'chiaro') : scelta
}

interface EventoInstallazione extends Event { prompt(): Promise<void> }

export function useInstallazione() {
  const [evento, setEvento] = useState<EventoInstallazione | null>(null)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstallazione) }
    addEventListener('beforeinstallprompt', h)
    return () => removeEventListener('beforeinstallprompt', h)
  }, [])
  const installata = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return {
    installata,
    ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
    puoInstallare: evento !== null,
    installa: async () => { if (evento) { await evento.prompt(); setEvento(null) } },
  }
}
```

`src/ui/icone.ts`:

```ts
import { BedDouble, Car, Coffee, Footprints, Landmark, PartyPopper, Train, TramFront, Utensils, type LucideIcon } from 'lucide-react'
import type { InfoEvento, ModoSpostamento, TipoTappa } from '../model/tipi'

export const ICONA_TIPO: Record<TipoTappa, LucideIcon> = { visita: Landmark, cibo: Utensils, evento: PartyPopper, spostamento: Train, hotel: BedDouble, libero: Coffee }
export const ETICHETTA_TIPO: Record<TipoTappa, string> = { visita: 'Visita', cibo: 'Cibo', evento: 'Evento', spostamento: 'Spostamento', hotel: 'Hotel', libero: 'Tempo libero' }
export const ICONA_MODO: Record<ModoSpostamento, LucideIcon> = { piedi: Footprints, mezzi: TramFront, treno: Train, taxi: Car }
export const ETICHETTA_MODO: Record<ModoSpostamento, string> = { piedi: 'A piedi', mezzi: 'Coi mezzi', treno: 'In treno', taxi: 'In taxi' }
export const ETICHETTA_AFFIDABILITA: Record<InfoEvento['affidabilita'], string> = { certa: 'Data certa', probabile: 'Data probabile', 'da-verificare': 'Da verificare' }
```

- [ ] **Step 7: Scrivere `src/ui/tema.css`**

```css
:root,
:root[data-tema='chiaro'] {
  color-scheme: light;
  --sfondo: #f6f1e7;
  --superficie: #fffdf8;
  --superficie-2: #efe8da;
  --riempimento: rgba(60, 40, 10, 0.07);
  --testo: #1d1b18;
  --testo-2: #6b6254;
  --testo-3: #857a67;
  --bordo: rgba(60, 40, 10, 0.13);
  --barra: rgba(251, 248, 242, 0.82);
  --ombra: 0 1px 2px rgba(60, 40, 10, 0.05), 0 6px 18px rgba(60, 40, 10, 0.06);
  --pericolo: #b3261e;
  --successo: #2e7d4f;
  --avviso-sfondo: #fbebd0;
  --avviso-testo: #6e4200;
  --tinta: #c8452c;
  --tinta-forte: #b33b24;
  --su-tinta: #ffffff;
  --tinta-testo: #a93822;
  --tinta-tenue: #f8e3dd;
  --font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP', system-ui, sans-serif;
  --font-kanji: 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif;
}

:root[data-tema='scuro'] {
  color-scheme: dark;
  --sfondo: #0e0f13;
  --superficie: #1a1c23;
  --superficie-2: #24262f;
  --riempimento: rgba(255, 255, 255, 0.08);
  --testo: #f2f2f5;
  --testo-2: #a3a6b1;
  --testo-3: #8b8e99;
  --bordo: rgba(255, 255, 255, 0.09);
  --barra: rgba(22, 23, 29, 0.8);
  --ombra: none;
  --pericolo: #ff6b6b;
  --successo: #4cc38a;
  --avviso-sfondo: #3a2a10;
  --avviso-testo: #ffcf7a;
  --tinta: #ff5a5f;
  --tinta-forte: #ff5a5f;
  --su-tinta: #111114;
  --tinta-testo: #ff7d81;
  --tinta-tenue: #3a1c20;
}
```

- [ ] **Step 8: Scrivere `src/ui/base.css`**

```css
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100dvh; background: var(--sfondo); color: var(--testo);
  font: 17px/1.45 var(--font); -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
}
a { color: var(--tinta-testo); }
button, input, select, textarea { font: inherit; color: inherit; }
h1, h2, h3, h4, p, ol, ul { margin: 0; }
img { max-width: 100%; }
:focus-visible { outline: 2px solid var(--tinta-testo); outline-offset: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.schermata { max-width: 720px; margin: 0 auto; padding: 0 16px calc(100px + env(safe-area-inset-bottom)); }
.testo-2 { color: var(--testo-2); font-size: 15px; }
.testo-3 { color: var(--testo-3); font-size: 13px; }
.kanji { font-family: var(--font-kanji); font-weight: 600; }

.barra-nav {
  position: sticky; top: 0; z-index: 30; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  min-height: calc(44px + env(safe-area-inset-top)); margin: 0 -16px; padding: env(safe-area-inset-top) 12px 0;
  background: var(--barra); -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 0.5px solid var(--bordo);
}
.barra-nav-titolo { font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60vw; }
.barra-nav-lato { display: flex; gap: 4px; align-items: center; }
.barra-nav-lato.destra { justify-content: flex-end; }

.titolo-grande { margin: 14px 0 18px; }
.titolo-grande h1 { font-size: 34px; line-height: 1.1; font-weight: 700; letter-spacing: -0.02em; }
.titolo-grande .sopra { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--tinta-testo); margin-bottom: 4px; }
.titolo-grande .sotto { color: var(--testo-2); margin-top: 6px; }

.pulsante {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 16px;
  border-radius: 12px; border: 0; background: var(--riempimento); color: var(--testo); font-weight: 600; font-size: 16px;
  text-decoration: none; cursor: pointer; transition: transform 0.12s ease, background-color 0.2s ease; white-space: nowrap;
}
.pulsante:active { transform: scale(0.97); }
.pulsante.primario, .pulsante.pieno { background: var(--tinta-forte); color: var(--su-tinta); }
.pulsante.piccolo { min-height: 36px; padding: 0 12px; font-size: 15px; border-radius: 10px; }
.pulsante.pericolo { color: var(--pericolo); }
.pulsante.largo { width: 100%; }
.pulsante-testo { background: none; border: 0; color: var(--tinta-testo); font-weight: 600; padding: 0 8px; min-height: 44px; cursor: pointer; font-size: 17px; }
.pulsante-icona { background: none; border: 0; color: var(--tinta-testo); min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 12px; }

.card { background: var(--superficie); border-radius: 16px; padding: 16px; box-shadow: var(--ombra); border: 0.5px solid var(--bordo); }
.vuoto { text-align: center; color: var(--testo-2); padding: 32px 16px; display: grid; gap: 8px; justify-items: center; }
.vuoto strong { color: var(--testo); font-size: 19px; }

.gruppo { margin: 26px 0; }
.gruppo-titolo { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--testo-2); font-weight: 500; margin: 0 16px 7px; }
.gruppo-corpo { background: var(--superficie); border-radius: 14px; overflow: hidden; border: 0.5px solid var(--bordo); }
.gruppo-piede { font-size: 13px; color: var(--testo-2); margin: 7px 16px 0; }
.riga {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 50px; padding: 11px 16px;
  background: none; border: 0; text-align: left; color: var(--testo); text-decoration: none; font-size: 17px;
}
button.riga, a.riga { cursor: pointer; }
button.riga:active, a.riga:active { background: var(--riempimento); }
.riga + .riga { border-top: 0.5px solid var(--bordo); }
.riga-icona { color: var(--tinta-testo); display: flex; flex-shrink: 0; }
.riga-testo { flex: 1; min-width: 0; }
.riga-sotto { font-size: 14px; color: var(--testo-2); margin-top: 1px; }
.riga-destra { color: var(--testo-3); font-size: 15px; display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.riga.pericolo, .riga.pericolo .riga-icona { color: var(--pericolo); }

.badge { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--tinta-tenue); color: var(--tinta-testo); white-space: nowrap; }
.badge.avviso { background: var(--avviso-sfondo); color: var(--avviso-testo); }
.badge.neutro { background: var(--riempimento); color: var(--testo-2); }

.segmentato { display: flex; background: var(--riempimento); border-radius: 10px; padding: 2px; gap: 2px; }
.segmentato button { flex: 1; min-height: 34px; border: 0; background: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.segmentato button[aria-checked='true'] { background: var(--superficie); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14); font-weight: 600; }

.campo { display: block; margin: 12px 0; }
.campo > span { display: block; font-size: 13px; color: var(--testo-2); margin: 0 0 5px 4px; }
.campo input, .campo textarea, .campo select, .campo-in {
  width: 100%; font-size: 17px; color: var(--testo); background: var(--superficie); border: 0.5px solid var(--bordo);
  border-radius: 12px; padding: 11px 14px; min-height: 44px;
}
.campo textarea { min-height: 90px; resize: vertical; }
.fila { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.fila > .campo { flex: 1; min-width: 120px; }

.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; justify-content: space-around;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); background: var(--barra);
  -webkit-backdrop-filter: saturate(180%) blur(20px); backdrop-filter: saturate(180%) blur(20px); border-top: 0.5px solid var(--bordo);
}
.tabbar a { flex: 1; max-width: 120px; min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: var(--testo-3); text-decoration: none; font-size: 11px; font-weight: 500; }
.tabbar a[aria-current='page'] { color: var(--tinta-testo); }

.foglio-velo { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 50; }
.foglio {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 51; max-height: 94dvh; display: flex; flex-direction: column;
  background: var(--sfondo); border-radius: 16px 16px 0 0; outline: none; max-width: 720px; margin: 0 auto;
}
.foglio.pieno { height: 94dvh; }
.foglio-maniglia { width: 36px; height: 5px; border-radius: 3px; background: var(--testo-3); opacity: 0.45; margin: 8px auto 2px; flex-shrink: 0; }
.foglio-testa { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 8px; min-height: 44px; }
.foglio-titolo { font-size: 17px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.foglio-corpo { overflow-y: auto; padding: 4px 16px calc(28px + env(safe-area-inset-bottom)); }

.foto { background: var(--superficie-2); display: flex; align-items: center; justify-content: center; color: var(--testo-3); overflow: hidden; }
.foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
.foto-attesa { animation: luccica 1.4s ease-in-out infinite; }
@keyframes luccica { 50% { opacity: 0.55; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 9: Scrivere i componenti comuni**

`src/ui/componenti.tsx`:

```tsx
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function BarraNav({ titolo, sinistra, destra }: { titolo: ReactNode; sinistra?: ReactNode; destra?: ReactNode }) {
  return (
    <header className="barra-nav">
      <div className="barra-nav-lato">{sinistra}</div>
      <div className="barra-nav-titolo">{titolo}</div>
      <div className="barra-nav-lato destra">{destra}</div>
    </header>
  )
}

export function TitoloGrande({ children, sopra, sotto }: { children: ReactNode; sopra?: ReactNode; sotto?: ReactNode }) {
  return (
    <div className="titolo-grande">
      {sopra && <div className="sopra">{sopra}</div>}
      <h1>{children}</h1>
      {sotto && <p className="sotto">{sotto}</p>}
    </div>
  )
}

export function Gruppo({ titolo, piede, children }: { titolo?: ReactNode; piede?: ReactNode; children: ReactNode }) {
  return (
    <section className="gruppo">
      {titolo && <h2 className="gruppo-titolo">{titolo}</h2>}
      <div className="gruppo-corpo">{children}</div>
      {piede && <p className="gruppo-piede">{piede}</p>}
    </section>
  )
}

interface PropsRiga {
  icona?: ReactNode
  titolo: ReactNode
  sottotitolo?: ReactNode
  destra?: ReactNode
  onClick?: () => void
  href?: string
  pericolo?: boolean
}

export function Riga({ icona, titolo, sottotitolo, destra, onClick, href, pericolo }: PropsRiga) {
  const classe = 'riga' + (pericolo ? ' pericolo' : '')
  const freccia = (onClick || href) && destra === undefined ? <ChevronRight size={18} aria-hidden /> : destra
  const corpo = (
    <>
      {icona && <span className="riga-icona" aria-hidden>{icona}</span>}
      <span className="riga-testo">
        <span>{titolo}</span>
        {sottotitolo && <span className="riga-sotto" style={{ display: 'block' }}>{sottotitolo}</span>}
      </span>
      {freccia && <span className="riga-destra">{freccia}</span>}
    </>
  )
  if (href) return <a className={classe} href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{corpo}</a>
  if (onClick) return <button type="button" className={classe} onClick={onClick}>{corpo}</button>
  return <div className={classe}>{corpo}</div>
}

export function Segmentato<T extends string>({ valore, opzioni, onCambia, etichetta }: {
  valore: T
  opzioni: { valore: T; etichetta: string }[]
  onCambia: (v: T) => void
  etichetta: string
}) {
  return (
    <div className="segmentato" role="radiogroup" aria-label={etichetta}>
      {opzioni.map(o => (
        <button key={o.valore} type="button" role="radio" aria-checked={o.valore === valore} onClick={() => onCambia(o.valore)}>
          {o.etichetta}
        </button>
      ))}
    </div>
  )
}

export function Badge({ tono = 'tinta', children }: { tono?: 'tinta' | 'avviso' | 'neutro'; children: ReactNode }) {
  return <span className={'badge' + (tono === 'tinta' ? '' : ` ${tono}`)}>{children}</span>
}

export function Vuoto({ titolo, testo, azione }: { titolo: string; testo?: string; azione?: ReactNode }) {
  return (
    <div className="card vuoto">
      <strong>{titolo}</strong>
      {testo && <p>{testo}</p>}
      {azione}
    </div>
  )
}

export function Campo({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{etichetta}</span>
      {children}
    </label>
  )
}
```

`src/ui/Foglio.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Drawer } from 'vaul'

interface Props {
  aperto: boolean
  onChiudi: () => void
  titolo: string
  children: ReactNode
  pieno?: boolean
  azioneDestra?: ReactNode
}

/** Pannello che sale dal basso, trascinabile per chiuderlo. */
export function Foglio({ aperto, onChiudi, titolo, children, pieno, azioneDestra }: Props) {
  return (
    <Drawer.Root open={aperto} onOpenChange={o => { if (!o) onChiudi() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="foglio-velo" />
        <Drawer.Content className={'foglio' + (pieno ? ' pieno' : '')} aria-describedby={undefined}>
          <div className="foglio-maniglia" aria-hidden />
          <div className="foglio-testa">
            <button type="button" className="pulsante-testo" onClick={onChiudi} style={{ justifySelf: 'start' }}>Chiudi</button>
            <Drawer.Title className="foglio-titolo">{titolo}</Drawer.Title>
            <div style={{ justifySelf: 'end' }}>{azioneDestra}</div>
          </div>
          <div className="foglio-corpo">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

`src/ui/FotoLuogo.tsx`:

```tsx
import { MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cercaFoto } from '../servizi/foto'

/** Foto del luogo, cercata solo quando la card sta per entrare nello schermo. */
export function FotoLuogo({ query, override, className = '', alt = '' }: { query?: string; override?: string; className?: string; alt?: string }) {
  const rif = useRef<HTMLDivElement>(null)
  const [visibile, setVisibile] = useState(false)
  const [url, setUrl] = useState<string | null | undefined>(override || undefined)

  useEffect(() => {
    const el = rif.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisibile(true); io.disconnect() } }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (override) { setUrl(override); return }
    if (!visibile) return
    if (!query) { setUrl(null); return }
    let vivo = true
    cercaFoto(query).then(u => { if (vivo) setUrl(u) })
    return () => { vivo = false }
  }, [visibile, query, override])

  return (
    <div ref={rif} className={`foto ${className}${url === undefined ? ' foto-attesa' : ''}`}>
      {url ? <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setUrl(null)} /> : url === null ? <MapPin size={28} aria-hidden /> : null}
    </div>
  )
}
```

`src/ui/TabBar.tsx`:

```tsx
import { CalendarDays, Map as IconaMappa, Sun, Ticket } from 'lucide-react'
import { hrefRotta, type Schermata } from './rotta'

const VOCI = [
  { s: 'oggi', etichetta: 'Oggi', Icona: Sun },
  { s: 'programma', etichetta: 'Programma', Icona: CalendarDays },
  { s: 'mappa', etichetta: 'Mappa', Icona: IconaMappa },
  { s: 'viaggio', etichetta: 'Viaggio', Icona: Ticket },
] as const

export function TabBar({ attiva }: { attiva: Schermata }) {
  return (
    <nav className="tabbar" aria-label="Sezioni">
      {VOCI.map(({ s, etichetta, Icona }) => (
        <a key={s} href={hrefRotta(s)} aria-current={s === attiva ? 'page' : undefined}>
          <Icona size={24} strokeWidth={s === attiva ? 2.2 : 1.8} aria-hidden />
          <span>{etichetta}</span>
        </a>
      ))}
    </nav>
  )
}
```

- [ ] **Step 10: Schermate provvisorie, `App.tsx` e `main.tsx`**

Ognuna delle quattro schermate provvisorie ha questa forma (cambiare titolo e nome del componente; `Programma` e `Mappa` ricevono `{ indice }: { indice: number | null }` e lo mostrano):

`src/schermate/oggi/Oggi.tsx`:

```tsx
import { BarraNav, TitoloGrande } from '../../ui/componenti'

export default function Oggi() {
  return (
    <div className="schermata">
      <BarraNav titolo="Oggi" />
      <TitoloGrande>Oggi</TitoloGrande>
    </div>
  )
}
```

`src/schermate/programma/Programma.tsx`:

```tsx
import { BarraNav, TitoloGrande } from '../../ui/componenti'

export default function Programma({ indice }: { indice: number | null }) {
  return (
    <div className="schermata">
      <BarraNav titolo="Programma" />
      <TitoloGrande>Giorno {indice ?? 0}</TitoloGrande>
    </div>
  )
}
```

`src/schermate/mappa/Mappa.tsx`:

```tsx
import { BarraNav, TitoloGrande } from '../../ui/componenti'

export default function Mappa({ indice }: { indice: number | null }) {
  return (
    <div className="schermata">
      <BarraNav titolo="Mappa" />
      <TitoloGrande>Mappa {indice ?? ''}</TitoloGrande>
    </div>
  )
}
```

`src/schermate/viaggio/SchermataViaggio.tsx`:

```tsx
import { BarraNav, TitoloGrande } from '../../ui/componenti'

export default function SchermataViaggio() {
  return (
    <div className="schermata">
      <BarraNav titolo="Viaggio" />
      <TitoloGrande>Viaggio</TitoloGrande>
    </div>
  )
}
```

`src/App.tsx`:

```tsx
import { useLayoutEffect } from 'react'
import { Toaster } from 'sonner'
import { faseViaggio } from './model/adesso'
import { cittaDi } from './model/riepilogo'
import Mappa from './schermate/mappa/Mappa'
import Oggi from './schermate/oggi/Oggi'
import Programma from './schermate/programma/Programma'
import SchermataViaggio from './schermate/viaggio/SchermataViaggio'
import { useViaggio } from './store/viaggio'
import { calcolaTinta } from './ui/colore'
import { useAdesso, useTemaRisolto } from './ui/hook'
import { useRotta } from './ui/rotta'
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
  const colore = giorno ? cittaDi(viaggio, giorno).colore : '#C8452C'

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
      {rotta.schermata === 'viaggio' && <SchermataViaggio />}
      <TabBar attiva={rotta.schermata} />
      <Toaster position="top-center" theme={tema === 'scuro' ? 'dark' : 'light'} offset="calc(12px + env(safe-area-inset-top))" />
    </>
  )
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './ui/tema.css'
import './ui/base.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 11: Verificare test, build e aspetto**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Poi avviare il server di sviluppo con la preview del browser (configurazione `.claude/launch.json` nel repo: `{ "version": "0.0.1", "configurations": [{ "name": "app", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev", "--", "--port", "5173"], "port": 5173, "url": "http://localhost:5173" }] }`), aprire `http://localhost:5173/jap-itinerario/`, viewport mobile 375×812, e verificare: la tab bar in basso cambia schermata, la voce attiva prende il colore della città, il tema scuro (colorScheme `dark`) cambia sfondo e barre.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Temi Washi e Notte, tinta della città, componenti in stile iOS, navigazione

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Programma (lettura)

**Files:**
- Create: `src/ui/Avvisi.tsx`, `src/ui/avvisi.css`, `src/schermate/programma/StrisciaGiorni.tsx`, `src/schermate/programma/CardTappa.tsx`, `src/schermate/programma/Timeline.tsx`, `src/schermate/programma/VistaTappa.tsx`, `src/schermate/programma/FoglioTappa.tsx`, `src/schermate/programma/ExtraGiorno.tsx`, `src/schermate/programma/programma.css`
- Modify: `src/schermate/programma/Programma.tsx` (riscritto)

**Interfaces:**
- Consumes: store, `faseViaggio`, `promemoriaBiglietto`, `dataGiorno`, `formatoData`, `partiData`, `formatoDurata`, `istanteTokyo`, `cittaDi`, `aggiornaTappa`, `aggiornaGiorno`, servizi mappe, componenti UI.
- Produces: `Avvisi({ avvisi })`; `StrisciaGiorni({ viaggio, attivo, oggi })`; `CardTappa({ tappa, giornoId, data, onApri, maniglia? })`; `Segmento({ da, a })`; `Timeline({ giorno, data, onApri, modifica })` (in questo task `modifica` è ignorato); `VistaTappa({ giorno, tappa, data })`; `FoglioTappa({ giornoId, tappaId, onChiudi })`; `ExtraGiorno({ giorno })`; `testoPromemoria(p: Promemoria): string`.

- [ ] **Step 1: Scrivere `src/ui/Avvisi.tsx` e `src/ui/avvisi.css`**

```tsx
import { Info, TriangleAlert } from 'lucide-react'
import type { Avviso } from '../model/tipi'
import './avvisi.css'

export function Avvisi({ avvisi }: { avvisi: Avviso[] }) {
  if (avvisi.length === 0) return null
  return (
    <ul className="avvisi">
      {avvisi.map((a, i) => (
        <li key={i} className={`avviso ${a.livello}`}>
          {a.livello === 'attenzione' ? <TriangleAlert size={18} aria-hidden /> : <Info size={18} aria-hidden />}
          <span>{a.testo}</span>
        </li>
      ))}
    </ul>
  )
}
```

```css
.avvisi { list-style: none; padding: 0; margin: 12px 0; display: grid; gap: 8px; }
.avviso { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 14px; font-size: 15px; background: var(--tinta-tenue); color: var(--testo); }
.avviso svg { flex-shrink: 0; margin-top: 2px; color: var(--tinta-testo); }
.avviso.attenzione { background: var(--avviso-sfondo); color: var(--avviso-testo); }
.avviso.attenzione svg { color: var(--avviso-testo); }
```

- [ ] **Step 2: Scrivere `src/schermate/programma/programma.css`**

```css
.striscia { display: flex; gap: 8px; overflow-x: auto; margin: 0 -16px; padding: 10px 16px; scrollbar-width: none; scroll-snap-type: x proximity; }
.striscia::-webkit-scrollbar { display: none; }
.chip-giorno {
  flex-shrink: 0; scroll-snap-align: center; min-width: 54px; padding: 6px 6px 8px; border-radius: 12px; background: var(--superficie);
  border: 0.5px solid var(--bordo); box-shadow: inset 0 -3px 0 var(--c); text-align: center; color: var(--testo); text-decoration: none; display: grid; gap: 1px;
}
.chip-giorno b { font-size: 18px; line-height: 1.1; }
.chip-giorno small { font-size: 11px; color: var(--testo-2); text-transform: uppercase; letter-spacing: 0.03em; }
.chip-giorno[aria-current='page'] { background: var(--tinta-forte); color: var(--su-tinta); box-shadow: none; border-color: transparent; }
.chip-giorno[aria-current='page'] small { color: inherit; opacity: 0.85; }
.chip-giorno.oggi:not([aria-current='page']) { outline: 2px solid var(--tinta-testo); outline-offset: -2px; }

.timeline { list-style: none; margin: 18px 0; padding: 0; }
.voce-timeline { display: grid; grid-template-columns: 48px minmax(0, 1fr); column-gap: 10px; }
.voce-ora { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--tinta-testo); text-align: right; padding-top: 14px; }
.voce-ora.sera { color: var(--testo-2); }
.segmento { grid-column: 2; display: flex; align-items: center; gap: 8px; color: var(--testo-2); font-size: 14px; margin: 2px 0 2px 18px; padding: 8px 0 8px 16px; border-left: 2px dotted var(--bordo); }
.segmento a { margin-left: auto; font-weight: 600; text-decoration: none; min-height: 36px; display: inline-flex; align-items: center; }

.card-tappa { background: var(--superficie); border-radius: 16px; border: 0.5px solid var(--bordo); box-shadow: var(--ombra); overflow: hidden; }
.card-tappa.fatta { opacity: 0.62; }
.card-tappa.saltata { opacity: 0.45; }
.card-tappa.saltata h3 { text-decoration: line-through; }
.card-tappa-apri { display: block; width: 100%; padding: 0; border: 0; background: none; text-align: left; cursor: pointer; }
.card-tappa-foto { height: 148px; }
.card-tappa-testo { padding: 12px 14px 2px; }
.card-tappa-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; color: var(--testo-2); margin-bottom: 4px; }
.card-tappa h3 { font-size: 19px; font-weight: 600; line-height: 1.25; }
.card-tappa p { font-size: 15px; color: var(--testo-2); margin-top: 4px; }
.clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.consiglio { background: var(--tinta-tenue); color: var(--testo) !important; border-radius: 10px; padding: 8px 10px; font-size: 15px; }
.nota-personale { font-style: italic; }
.card-tappa-azioni { display: flex; gap: 8px; padding: 10px 14px 14px; flex-wrap: wrap; align-items: center; }
.maniglia { margin-left: auto; touch-action: none; cursor: grab; background: none; border: 0; color: var(--testo-3); min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }

.vista-foto { height: 220px; border-radius: 16px; margin-bottom: 14px; }
.vista-meta { font-size: 14px; color: var(--testo-2); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.vista-titolo { font-size: 26px; line-height: 1.15; font-weight: 700; margin: 4px 0 10px; }
.vista-testo { margin: 10px 0; }
.vista-stato { margin: 16px 0 4px; }
.nota-giorno { min-height: 90px; border: 0; border-radius: 0; background: none; resize: vertical; width: 100%; }
.giorno-nav { display: flex; justify-content: space-between; gap: 12px; margin: 26px 0 8px; }
```

- [ ] **Step 3: Scrivere `src/schermate/programma/StrisciaGiorni.tsx`**

```tsx
import { useEffect, useRef, type CSSProperties } from 'react'
import { dataGiorno, formatoData, partiData } from '../../model/date'
import { cittaDi } from '../../model/riepilogo'
import type { Viaggio } from '../../model/tipi'
import { hrefRotta } from '../../ui/rotta'

export function StrisciaGiorni({ viaggio, attivo, oggi }: { viaggio: Viaggio; attivo: number; oggi: number | null }) {
  const rif = useRef<HTMLElement>(null)
  useEffect(() => {
    const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches
    rif.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: riduci ? 'auto' : 'smooth' })
  }, [attivo])
  return (
    <nav className="striscia" ref={rif} aria-label="Giorni del viaggio">
      {viaggio.giorni.map((g, i) => {
        const data = dataGiorno(viaggio, i)
        const { settimana, numero } = partiData(data)
        const citta = cittaDi(viaggio, g)
        return (
          <a key={g.id} href={hrefRotta('programma', i)} className={'chip-giorno' + (i === oggi ? ' oggi' : '')}
            aria-current={i === attivo ? 'page' : undefined} style={{ '--c': citta.colore } as CSSProperties}
            aria-label={`Giorno ${i}, ${formatoData(data, 'lungo')}, ${citta.nome}`}>
            <small>{settimana}</small>
            <b>{numero}</b>
            <small>G{i}</small>
          </a>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Scrivere `src/schermate/programma/CardTappa.tsx`**

```tsx
import { Check, Navigation, Ticket } from 'lucide-react'
import type { ReactNode } from 'react'
import { promemoriaBiglietto, type Promemoria } from '../../model/adesso'
import { formatoDurata, istanteTokyo } from '../../model/date'
import { aggiornaTappa } from '../../model/operazioni'
import type { Tappa } from '../../model/tipi'
import { urlCercaBiglietti, urlIndicazioni } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Badge } from '../../ui/componenti'
import { FotoLuogo } from '../../ui/FotoLuogo'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_AFFIDABILITA, ETICHETTA_TIPO, ICONA_TIPO } from '../../ui/icone'

export function testoPromemoria(p: Promemoria): string {
  return { 'prenota-ora': 'La visita è domani: prenota adesso', oggi: 'La visita è oggi', futuro: 'Prenota per tempo', passato: '' }[p]
}

interface Props { tappa: Tappa; giornoId: string; data: string; onApri: () => void; maniglia?: ReactNode }

export function CardTappa({ tappa, giornoId, data, onApri, maniglia }: Props) {
  const applica = useViaggio(s => s.applica)
  const oggi = istanteTokyo(useAdesso()).data
  const Icona = ICONA_TIPO[tappa.tipo]
  const fatta = tappa.stato === 'fatta'
  const promemoria = tappa.biglietti ? promemoriaBiglietto(data, oggi) : null
  return (
    <article className={'card-tappa' + (fatta ? ' fatta' : '') + (tappa.stato === 'saltata' ? ' saltata' : '')}>
      <button type="button" className="card-tappa-apri" onClick={onApri}>
        {tappa.luogo && tappa.tipo !== 'spostamento' && <FotoLuogo query={tappa.luogo.query} override={tappa.foto} className="card-tappa-foto" />}
        <div className="card-tappa-testo">
          <div className="card-tappa-meta">
            <Icona size={14} aria-hidden /> {ETICHETTA_TIPO[tappa.tipo]}
            {tappa.durataMin ? ` · ${formatoDurata(tappa.durataMin)}` : ''}
            {tappa.evento && <Badge tono={tappa.evento.affidabilita === 'certa' ? 'tinta' : 'avviso'}>{ETICHETTA_AFFIDABILITA[tappa.evento.affidabilita]}</Badge>}
            {promemoria === 'prenota-ora' && <Badge tono="avviso">Prenota oggi</Badge>}
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
          <a className="pulsante piccolo" href={tappa.biglietti.link ?? urlCercaBiglietti(tappa.titolo)} target="_blank" rel="noreferrer">
            <Ticket size={16} aria-hidden /> Biglietti
          </a>
        )}
        <button type="button" className={'pulsante piccolo' + (fatta ? ' pieno' : '')} aria-pressed={fatta}
          onClick={() => applica(v => aggiornaTappa(v, giornoId, tappa.id, { stato: fatta ? 'da-fare' : 'fatta' }))}>
          <Check size={16} aria-hidden /> {fatta ? 'Fatta' : 'Fatto'}
        </button>
        {maniglia}
      </div>
    </article>
  )
}
```

- [ ] **Step 5: Scrivere `src/schermate/programma/Timeline.tsx`**

```tsx
import type { ReactNode } from 'react'
import { formatoDurata } from '../../model/date'
import type { Giorno, Tappa } from '../../model/tipi'
import { modoGoogle, urlPercorso } from '../../servizi/mappe'
import { Vuoto } from '../../ui/componenti'
import { ETICHETTA_MODO, ICONA_MODO } from '../../ui/icone'
import { CardTappa } from './CardTappa'

export function Segmento({ da, a }: { da: Tappa; a: Tappa | undefined }) {
  if (!da.spostamento || !a) return null
  const Icona = ICONA_MODO[da.spostamento.modo]
  const durata = da.spostamento.minuti ? ` · ${formatoDurata(da.spostamento.minuti)}` : ''
  return (
    <div className="segmento">
      <Icona size={16} aria-hidden />
      <span>{ETICHETTA_MODO[da.spostamento.modo]}{durata}</span>
      {da.luogo && a.luogo && (
        <a href={urlPercorso(da.luogo, a.luogo, modoGoogle(da.spostamento.modo))} target="_blank" rel="noreferrer">Percorso</a>
      )}
    </div>
  )
}

export function VoceTimeline({ tappa, successiva, giornoId, data, onApri, children }: {
  tappa: Tappa; successiva?: Tappa; giornoId: string; data: string; onApri: (id: string) => void; children?: ReactNode
}) {
  return (
    <>
      <div className={'voce-ora' + (tappa.sera ? ' sera' : '')}>{tappa.ora ?? ''}</div>
      {children ?? <CardTappa tappa={tappa} giornoId={giornoId} data={data} onApri={() => onApri(tappa.id)} />}
      <Segmento da={tappa} a={successiva} />
    </>
  )
}

interface Props { giorno: Giorno; data: string; onApri: (id: string) => void; modifica: boolean }

export function Timeline({ giorno, data, onApri }: Props) {
  if (giorno.tappe.length === 0) return <Vuoto titolo="Giornata libera" testo="Nessuna tappa in programma." />
  return (
    <ol className="timeline">
      {giorno.tappe.map((t, i) => (
        <li key={t.id} className="voce-timeline">
          <VoceTimeline tappa={t} successiva={giorno.tappe[i + 1]} giornoId={giorno.id} data={data} onApri={onApri} />
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 6: Scrivere `src/schermate/programma/VistaTappa.tsx` e `FoglioTappa.tsx`**

`VistaTappa.tsx`:

```tsx
import { Footprints, Info, MapPin, Navigation, Ticket } from 'lucide-react'
import { promemoriaBiglietto } from '../../model/adesso'
import { formatoDurata, istanteTokyo } from '../../model/date'
import { aggiornaTappa } from '../../model/operazioni'
import type { Giorno, StatoTappa, Tappa } from '../../model/tipi'
import { urlCerca, urlCercaBiglietti, urlIndicazioni } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Badge, Campo, Gruppo, Riga, Segmentato } from '../../ui/componenti'
import { FotoLuogo } from '../../ui/FotoLuogo'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_AFFIDABILITA, ETICHETTA_TIPO } from '../../ui/icone'
import { testoPromemoria } from './CardTappa'

const STATI: { valore: StatoTappa; etichetta: string }[] = [
  { valore: 'da-fare', etichetta: 'Da fare' },
  { valore: 'fatta', etichetta: 'Fatta' },
  { valore: 'saltata', etichetta: 'Saltata' },
]

export function VistaTappa({ giorno, tappa, data }: { giorno: Giorno; tappa: Tappa; data: string }) {
  const applica = useViaggio(s => s.applica)
  const oggi = istanteTokyo(useAdesso()).data
  const agg = (m: Partial<Tappa>) => applica(v => aggiornaTappa(v, giorno.id, tappa.id, m))
  const l = tappa.luogo
  const righe = [
    l && <Riga key="mezzi" icona={<Navigation size={20} />} titolo="Indicazioni coi mezzi" href={urlIndicazioni(l, 'transit')} />,
    l && <Riga key="piedi" icona={<Footprints size={20} />} titolo="Indicazioni a piedi" href={urlIndicazioni(l, 'walking')} />,
    l && <Riga key="maps" icona={<MapPin size={20} />} titolo="Apri in Google Maps" sottotitolo={l.query} href={urlCerca(l)} />,
    tappa.biglietti && (
      <Riga key="biglietti" icona={<Ticket size={20} />} titolo={tappa.biglietti.link ? 'Sito dei biglietti' : 'Cerca i biglietti'}
        sottotitolo={testoPromemoria(promemoriaBiglietto(data, oggi)) || undefined}
        href={tappa.biglietti.link ?? urlCercaBiglietti(tappa.titolo)} />
    ),
    tappa.evento?.fonte && <Riga key="fonte" icona={<Info size={20} />} titolo="Fonte dell'evento" href={tappa.evento.fonte} />,
  ].filter(Boolean)

  return (
    <>
      {l && tappa.tipo !== 'spostamento' && <FotoLuogo query={l.query} override={tappa.foto} className="vista-foto" alt={tappa.titolo} />}
      <div className="vista-meta">
        {tappa.ora && <strong>{tappa.ora}</strong>}
        {tappa.durataMin ? <span>· {formatoDurata(tappa.durataMin)}</span> : null}
        <span>· {ETICHETTA_TIPO[tappa.tipo]}</span>
      </div>
      <h2 className="vista-titolo">{tappa.titolo}</h2>
      {tappa.evento && (
        <p className="fila">
          <Badge tono={tappa.evento.affidabilita === 'certa' ? 'tinta' : 'avviso'}>{ETICHETTA_AFFIDABILITA[tappa.evento.affidabilita]}</Badge>
          {tappa.evento.nomeJa && <span className="kanji" lang="ja">{tappa.evento.nomeJa}</span>}
        </p>
      )}
      {tappa.descrizione && <p className="vista-testo">{tappa.descrizione}</p>}
      {tappa.consiglio && <p className="consiglio">{tappa.consiglio}</p>}
      <div className="vista-stato">
        <Segmentato etichetta="Stato della tappa" valore={tappa.stato} opzioni={STATI} onCambia={stato => agg({ stato })} />
      </div>
      <Campo etichetta="La tua nota">
        <textarea value={tappa.nota} onChange={e => agg({ nota: e.target.value })} placeholder="Com'era, cosa ricordare…" />
      </Campo>
      {righe.length > 0 && <Gruppo>{righe}</Gruppo>}
    </>
  )
}
```

`FoglioTappa.tsx`:

```tsx
import { dataGiorno } from '../../model/date'
import { useViaggio } from '../../store/viaggio'
import { Foglio } from '../../ui/Foglio'
import { VistaTappa } from './VistaTappa'

export function FoglioTappa({ giornoId, tappaId, onChiudi }: { giornoId: string | null; tappaId: string | null; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const indice = viaggio.giorni.findIndex(g => g.id === giornoId)
  const giorno = viaggio.giorni[indice]
  const tappa = giorno?.tappe.find(t => t.id === tappaId)
  return (
    <Foglio aperto={!!tappa} onChiudi={onChiudi} titolo={tappa?.titolo || 'Tappa'}>
      {tappa && giorno && <VistaTappa giorno={giorno} tappa={tappa} data={dataGiorno(viaggio, indice)} />}
    </Foglio>
  )
}
```

- [ ] **Step 7: Scrivere `src/schermate/programma/ExtraGiorno.tsx`**

```tsx
import { Lightbulb } from 'lucide-react'
import { aggiornaGiorno } from '../../model/operazioni'
import type { Giorno, Suggerimento } from '../../model/tipi'
import { urlCerca } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Gruppo, Riga } from '../../ui/componenti'

const SEZIONI: [Suggerimento['tipo'], string][] = [['cibo', 'Da assaggiare'], ['opzionale', 'Se avanza tempo'], ['souvenir', 'Souvenir']]

export function ExtraGiorno({ giorno }: { giorno: Giorno }) {
  const applica = useViaggio(s => s.applica)
  return (
    <>
      {giorno.speciale && (
        <Gruppo titolo={giorno.speciale.titolo} piede={giorno.speciale.nota}>
          {giorno.speciale.opzioni.map((o, i) => <Riga key={i} titolo={o.nome} sottotitolo={`${o.livello} · ${o.descrizione}`} href={o.link} />)}
        </Gruppo>
      )}
      {SEZIONI.map(([tipo, titolo]) => {
        const voci = giorno.suggerimenti.filter(s => s.tipo === tipo)
        if (voci.length === 0) return null
        return (
          <Gruppo key={tipo} titolo={titolo}>
            {voci.map((s, i) => <Riga key={i} titolo={s.nome} sottotitolo={s.descrizione} href={s.luogo ? urlCerca(s.luogo) : undefined} />)}
          </Gruppo>
        )
      })}
      {giorno.consigli.length > 0 && (
        <Gruppo titolo="Consigli">
          {giorno.consigli.map((c, i) => <Riga key={i} icona={<Lightbulb size={18} />} titolo={<span style={{ fontSize: 15 }}>{c}</span>} />)}
        </Gruppo>
      )}
      <Gruppo titolo="Note del giorno">
        <textarea className="campo-in nota-giorno" value={giorno.note} aria-label="Note del giorno" placeholder="Appunti, orari da ricordare, idee…"
          onChange={e => applica(v => aggiornaGiorno(v, giorno.id, { note: e.target.value }))} />
      </Gruppo>
    </>
  )
}
```

- [ ] **Step 8: Riscrivere `src/schermate/programma/Programma.tsx`**

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { faseViaggio } from '../../model/adesso'
import { dataGiorno, formatoData } from '../../model/date'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Avvisi } from '../../ui/Avvisi'
import { BarraNav, TitoloGrande, Vuoto } from '../../ui/componenti'
import { useAdesso } from '../../ui/hook'
import { hrefRotta } from '../../ui/rotta'
import { ExtraGiorno } from './ExtraGiorno'
import { FoglioTappa } from './FoglioTappa'
import { StrisciaGiorni } from './StrisciaGiorni'
import { Timeline } from './Timeline'
import './programma.css'

export default function Programma({ indice }: { indice: number | null }) {
  const viaggio = useViaggio(s => s.viaggio)
  const modifica = useViaggio(s => s.modifica)
  const fase = faseViaggio(viaggio, useAdesso())
  const [aperta, setAperta] = useState<string | null>(null)
  const n = viaggio.giorni.length
  const i = Math.min(Math.max(indice ?? (fase.fase === 'durante' ? fase.indice : 0), 0), Math.max(n - 1, 0))
  useEffect(() => { scrollTo({ top: 0 }) }, [i])

  if (n === 0) {
    return (
      <div className="schermata">
        <BarraNav titolo="Programma" />
        <TitoloGrande>Programma</TitoloGrande>
        <Vuoto titolo="Nessun giorno" testo="Il viaggio non ha ancora giorni." />
      </div>
    )
  }

  const giorno = viaggio.giorni[i]
  const citta = cittaDi(viaggio, giorno)
  const data = dataGiorno(viaggio, i)
  return (
    <div className="schermata">
      <BarraNav titolo={`G${i} · ${citta.nome}`} />
      <StrisciaGiorni viaggio={viaggio} attivo={i} oggi={fase.fase === 'durante' ? fase.indice : null} />
      <TitoloGrande sopra={`${formatoData(data, 'lungo')} · ${citta.nome} ${citta.kanji}`} sotto={giorno.intro || undefined}>
        {giorno.titolo}
      </TitoloGrande>
      <Avvisi avvisi={giorno.avvisi} />
      <Timeline giorno={giorno} data={data} onApri={setAperta} modifica={modifica} />
      <ExtraGiorno giorno={giorno} />
      <nav className="giorno-nav" aria-label="Giorno precedente e successivo">
        {i > 0 ? <a className="pulsante" href={hrefRotta('programma', i - 1)}><ChevronLeft size={18} aria-hidden /> G{i - 1}</a> : <span />}
        {i < n - 1 && <a className="pulsante" href={hrefRotta('programma', i + 1)}>G{i + 1} <ChevronRight size={18} aria-hidden /></a>}
      </nav>
      <FoglioTappa giornoId={giorno.id} tappaId={aperta} onChiudi={() => setAperta(null)} />
    </div>
  )
}
```

- [ ] **Step 9: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812), su `#/programma/8`: la striscia centra G8, il titolo dice "lunedì 16 agosto · Kyoto 京都", gli avvisi dell'Okuribi sono visibili, le card mostrano foto, orari, "Lanterne sul fiume" ha il badge "Data certa", fra le card c'è il segmento "In treno · 50 min" dove previsto. Tocco su una card: il foglio sale dal basso; "Fatta" nel segmentato scolora la card; la nota scritta resta dopo il ricaricamento della pagina. Ripetere in tema scuro.

- [ ] **Step 10: Commit**

```bash
git add src
git commit -m "Programma: striscia dei giorni, timeline con spostamenti, dettaglio della tappa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Modificare tutto (tappe, giorni) dal Programma

**Files:**
- Modify: `src/model/operazioni.ts` (aggiunge `sostituisciTappa`), `src/model/operazioni.test.ts`
- Create: `src/schermate/programma/CercaLuogo.tsx`, `src/schermate/programma/EditorTappa.tsx`, `src/schermate/programma/EditorGiorno.tsx`, `src/schermate/programma/editor.css`
- Modify: `src/schermate/programma/Timeline.tsx`, `src/schermate/programma/FoglioTappa.tsx`, `src/schermate/programma/Programma.tsx`

**Interfaces:**
- Consumes: `cercaLuoghi`, operazioni del Task 5, `vai`.
- Produces: `sostituisciTappa(v, giornoId, tappa: Tappa): Viaggio` (sostituisce l'intera tappa, così i campi tolti spariscono davvero, e riordina per ora); `CercaLuogo({ etichetta, luogo, citta, onCambia })`; `EditorTappa({ iniziale, citta, onSalva, onElimina? })`; `EditorGiorno({ indice })`; `Timeline` ordina per trascinamento quando `modifica` è vero; `FoglioTappa` mostra `EditorTappa` quando `modifica` è vero; `FoglioNuovaTappa({ giornoId, aperto, onChiudi })`.

- [ ] **Step 1: Test di `sostituisciTappa`**

Aggiungere in fondo a `src/model/operazioni.test.ts`:

```ts
describe('sostituisciTappa', () => {
  test('toglie davvero i campi eliminati e riordina', () => {
    const v = op.aggiornaTappa(base(), 'g0', 'a', { evento: { nome: 'E', affidabilita: 'certa' } })
    const senzaEvento = { ...v.giorni[0].tappe[0], ora: '15:00' }
    delete senzaEvento.evento
    const n = op.sostituisciTappa(v, 'g0', senzaEvento)
    expect(n.giorni[0].tappe.map(x => x.id)).toEqual(['b', 'a'])
    expect('evento' in n.giorni[0].tappe[1]).toBe(false)
  })
})
```

Run: `npm test -- src/model/operazioni.test.ts`
Expected: FAIL, `op.sostituisciTappa is not a function`.

- [ ] **Step 2: Implementare `sostituisciTappa`**

Aggiungere a `src/model/operazioni.ts`, sotto `aggiornaTappa`:

```ts
/** Sostituisce l'intera tappa (i campi assenti vengono tolti) e riordina per ora. */
export function sostituisciTappa(v: Viaggio, giornoId: string, tappa: Tappa): Viaggio {
  return conGiorno(v, giornoId, g => {
    if (!g.tappe.some(t => t.id === tappa.id)) throw new Error(`tappa ${tappa.id} inesistente in ${giornoId}`)
    return { ...g, tappe: ordinaPerOra(g.tappe.map(t => (t.id === tappa.id ? tappa : t))) }
  })
}
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Scrivere `src/schermate/programma/editor.css`**

```css
.editor { padding-bottom: 8px; }
.editor-azioni { display: grid; gap: 10px; margin-top: 20px; }
.errore { color: var(--pericolo); font-size: 14px; margin: -6px 0 8px 4px; }
.interruttore { display: flex; align-items: center; gap: 10px; min-height: 44px; margin: 6px 4px; }
.interruttore input { width: 22px; height: 22px; accent-color: var(--tinta-forte); }
.cerca-luogo { margin: 12px 0; display: grid; gap: 8px; }
.etichetta-campo { font-size: 13px; color: var(--testo-2); margin-left: 4px; }
.luogo-scelto { display: flex; gap: 10px; align-items: center; padding: 10px 12px; background: var(--superficie); border-radius: 12px; border: 0.5px solid var(--bordo); }
.luogo-scelto > div { flex: 1; min-width: 0; }
.risultati { max-height: 280px; overflow-y: auto; }
.editor-giorno { margin: 8px 0 16px; }
.editor-giorno-azioni { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.aggiungi-tappa { margin: 4px 0 8px; }
```

- [ ] **Step 4: Scrivere `src/schermate/programma/CercaLuogo.tsx`**

```tsx
import { MapPin } from 'lucide-react'
import { useState } from 'react'
import type { Citta, Luogo } from '../../model/tipi'
import { cercaLuoghi, type RisultatoLuogo } from '../../servizi/luoghi'
import { Riga } from '../../ui/componenti'

interface Props { etichetta: string; luogo?: Luogo | null; citta: Citta; onCambia: (l: Luogo | undefined) => void }

export function CercaLuogo({ etichetta, luogo, citta, onCambia }: Props) {
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState<'fermo' | 'cerca' | 'errore'>('fermo')
  const [risultati, setRisultati] = useState<RisultatoLuogo[] | null>(null)
  const q = testo.trim()

  const cerca = async () => {
    if (!q) return
    setStato('cerca')
    try {
      setRisultati(await cercaLuoghi(`${q} ${citta.nome}`))
      setStato('fermo')
    } catch {
      setStato('errore')
    }
  }
  const scegli = (l: Luogo) => { onCambia(l); setTesto(''); setRisultati(null) }

  return (
    <div className="cerca-luogo">
      <span className="etichetta-campo">{etichetta}</span>
      {luogo && (
        <div className="luogo-scelto">
          <MapPin size={18} aria-hidden />
          <div>
            <div>{luogo.nome}</div>
            <div className="testo-3">{luogo.lat != null ? 'Con posizione sulla mappa' : 'Senza posizione: solo ricerca per nome'}</div>
          </div>
          <button type="button" className="pulsante-testo" onClick={() => onCambia(undefined)}>Togli</button>
        </div>
      )}
      <div className="fila">
        <input className="campo-in" style={{ flex: 1, minWidth: 0 }} value={testo} placeholder={`Cerca a ${citta.nome}`} aria-label={`Cerca: ${etichetta}`}
          onChange={e => { setTesto(e.target.value); setStato('fermo') }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void cerca() } }} />
        <button type="button" className="pulsante" onClick={() => void cerca()}>{stato === 'cerca' ? 'Cerco…' : 'Cerca'}</button>
      </div>
      {stato === 'errore' && <p className="errore">Ricerca non disponibile. Riprova, o usa il solo nome.</p>}
      {risultati && (risultati.length > 0
        ? <div className="gruppo-corpo risultati">
            {risultati.map((r, i) => <Riga key={i} titolo={r.nome} sottotitolo={r.indirizzo} onClick={() => scegli({ nome: r.nome, query: `${r.nome} ${citta.nome}`, lat: r.lat, lng: r.lng })} />)}
          </div>
        : <p className="testo-2">Nessun risultato per "{q}".</p>)}
      {q && <button type="button" className="pulsante-testo" style={{ justifySelf: 'start' }} onClick={() => scegli({ nome: q, query: `${q} ${citta.nome}` })}>Usa "{q}" senza posizione</button>}
    </div>
  )
}
```

- [ ] **Step 5: Scrivere `src/schermate/programma/EditorTappa.tsx`**

```tsx
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { MODI_SPOSTAMENTO, TIPI_TAPPA, type Citta, type InfoEvento, type ModoSpostamento, type Tappa, type TipoTappa } from '../../model/tipi'
import { Campo } from '../../ui/componenti'
import { ETICHETTA_AFFIDABILITA, ETICHETTA_MODO, ETICHETTA_TIPO } from '../../ui/icone'
import { CercaLuogo } from './CercaLuogo'
import './editor.css'

const numero = (s: string) => (s === '' ? undefined : Math.max(0, Number(s)))

interface Props { iniziale: Tappa; citta: Citta; onSalva: (t: Tappa) => void; onElimina?: () => void }

export function EditorTappa({ iniziale, citta, onSalva, onElimina }: Props) {
  const [b, setB] = useState<Tappa>(iniziale)
  const [errore, setErrore] = useState('')
  const agg = (m: Partial<Tappa>) => setB(x => ({ ...x, ...m }))
  const evento = (m: Partial<InfoEvento>) => agg({ evento: { nome: b.evento?.nome ?? b.titolo, affidabilita: b.evento?.affidabilita ?? 'probabile', ...b.evento, ...m } })

  const salva = () => {
    const titolo = b.titolo.trim()
    if (!titolo) { setErrore('Scrivi un titolo.'); return }
    const pulita: Tappa = { ...b, titolo }
    if (pulita.tipo !== 'evento') delete pulita.evento
    if (!pulita.luogo) delete pulita.luogo
    if (!pulita.spostamento) delete pulita.spostamento
    if (!pulita.biglietti) delete pulita.biglietti
    if (!pulita.foto) delete pulita.foto
    if (pulita.durataMin === undefined) delete pulita.durataMin
    onSalva(pulita)
  }

  return (
    <form className="editor" onSubmit={e => { e.preventDefault(); salva() }}>
      <Campo etichetta="Titolo">
        <input value={b.titolo} placeholder="Tempio Kiyomizu-dera" aria-invalid={!!errore} autoFocus={!iniziale.titolo}
          onChange={e => { agg({ titolo: e.target.value }); setErrore('') }} />
      </Campo>
      {errore && <p className="errore">{errore}</p>}
      <div className="fila">
        <Campo etichetta="Ora"><input type="time" value={b.ora ?? ''} onChange={e => agg({ ora: e.target.value || null })} /></Campo>
        <Campo etichetta="Durata (minuti)"><input type="number" inputMode="numeric" min={0} step={5} value={b.durataMin ?? ''} onChange={e => agg({ durataMin: numero(e.target.value) })} /></Campo>
      </div>
      <Campo etichetta="Tipo">
        <select value={b.tipo} onChange={e => agg({ tipo: e.target.value as TipoTappa })}>
          {TIPI_TAPPA.map(t => <option key={t} value={t}>{ETICHETTA_TIPO[t]}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Descrizione"><textarea value={b.descrizione} onChange={e => agg({ descrizione: e.target.value })} /></Campo>
      <Campo etichetta="Consiglio"><input value={b.consiglio} placeholder="Arrivate presto: dalle 10 c'è la fila" onChange={e => agg({ consiglio: e.target.value })} /></Campo>
      <CercaLuogo etichetta="Luogo" luogo={b.luogo} citta={citta} onCambia={luogo => agg({ luogo })} />
      <div className="fila">
        <Campo etichetta="Poi si va">
          <select value={b.spostamento?.modo ?? ''} onChange={e => agg({ spostamento: e.target.value ? { ...b.spostamento, modo: e.target.value as ModoSpostamento } : undefined })}>
            <option value="">Nessuno spostamento</option>
            {MODI_SPOSTAMENTO.map(m => <option key={m} value={m}>{ETICHETTA_MODO[m]}</option>)}
          </select>
        </Campo>
        {b.spostamento && (
          <Campo etichetta="Minuti">
            <input type="number" inputMode="numeric" min={0} step={5} value={b.spostamento.minuti ?? ''}
              onChange={e => agg({ spostamento: { ...b.spostamento!, minuti: numero(e.target.value) } })} />
          </Campo>
        )}
      </div>
      <label className="interruttore">
        <input type="checkbox" checked={!!b.biglietti} onChange={e => agg({ biglietti: e.target.checked ? { link: b.biglietti?.link ?? null } : undefined })} />
        Serve un biglietto
      </label>
      {b.biglietti && (
        <Campo etichetta="Link dei biglietti (vuoto = cerca online)">
          <input type="url" inputMode="url" value={b.biglietti.link ?? ''} placeholder="https://" onChange={e => agg({ biglietti: { link: e.target.value || null } })} />
        </Campo>
      )}
      {b.tipo === 'evento' && (
        <>
          <Campo etichetta="Nome dell'evento"><input value={b.evento?.nome ?? ''} onChange={e => evento({ nome: e.target.value })} /></Campo>
          <Campo etichetta="Nome in giapponese"><input lang="ja" value={b.evento?.nomeJa ?? ''} onChange={e => evento({ nomeJa: e.target.value || undefined })} /></Campo>
          <Campo etichetta="La data è">
            <select value={b.evento?.affidabilita ?? 'probabile'} onChange={e => evento({ affidabilita: e.target.value as InfoEvento['affidabilita'] })}>
              {(Object.keys(ETICHETTA_AFFIDABILITA) as InfoEvento['affidabilita'][]).map(k => <option key={k} value={k}>{ETICHETTA_AFFIDABILITA[k]}</option>)}
            </select>
          </Campo>
          <Campo etichetta="Fonte (link)"><input type="url" inputMode="url" value={b.evento?.fonte ?? ''} onChange={e => evento({ fonte: e.target.value || undefined })} /></Campo>
        </>
      )}
      <Campo etichetta="Foto (link; vuoto = foto automatica)">
        <input type="url" inputMode="url" value={b.foto ?? ''} onChange={e => agg({ foto: e.target.value || undefined })} />
      </Campo>
      <label className="interruttore">
        <input type="checkbox" checked={b.sera} onChange={e => agg({ sera: e.target.checked })} />
        Tappa serale
      </label>
      <div className="editor-azioni">
        <button type="submit" className="pulsante primario largo">Salva</button>
        {onElimina && <button type="button" className="pulsante pericolo largo" onClick={onElimina}><Trash2 size={18} aria-hidden /> Elimina tappa</button>}
      </div>
    </form>
  )
}
```

- [ ] **Step 6: Scrivere `src/schermate/programma/EditorGiorno.tsx`**

```tsx
import { ArrowLeft, ArrowRight, Copy, Plus, Trash2 } from 'lucide-react'
import { aggiornaAlloggio, aggiornaGiorno, aggiungiGiorno, duplicaGiorno, eliminaGiorno, spostaGiorno } from '../../model/operazioni'
import { cittaDi } from '../../model/riepilogo'
import type { Giorno } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo } from '../../ui/componenti'
import { vai } from '../../ui/rotta'
import { CercaLuogo } from './CercaLuogo'
import './editor.css'

export function EditorGiorno({ indice }: { indice: number }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const giorno = viaggio.giorni[indice]
  const n = viaggio.giorni.length
  const agg = (m: Partial<Omit<Giorno, 'id' | 'tappe'>>) => applica(v => aggiornaGiorno(v, giorno.id, m))

  return (
    <section className="card editor-giorno" aria-label="Modifica il giorno">
      <Campo etichetta="Titolo del giorno"><input value={giorno.titolo} onChange={e => agg({ titolo: e.target.value })} /></Campo>
      <Campo etichetta="Città">
        <select value={giorno.cittaId} onChange={e => agg({ cittaId: e.target.value })}>
          {viaggio.citta.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Introduzione"><textarea value={giorno.intro} onChange={e => agg({ intro: e.target.value })} /></Campo>
      <CercaLuogo etichetta="Hotel della sera" luogo={giorno.alloggio} citta={cittaDi(viaggio, giorno)} onCambia={l => agg({ alloggio: l ?? null })} />
      {giorno.alloggio && (
        <Campo etichetta="Indirizzo dell'hotel in giapponese (per il taxi)">
          <input lang="ja" value={giorno.alloggio.indirizzoJa ?? ''} placeholder="東京都台東区西浅草3-17-1"
            onChange={e => applica(v => aggiornaAlloggio(v, giorno.alloggio!.nome, { indirizzoJa: e.target.value || undefined }))} />
        </Campo>
      )}
      <div className="editor-giorno-azioni">
        <button type="button" className="pulsante piccolo" onClick={() => { applica(v => aggiungiGiorno(v, indice, giorno.cittaId)); vai('programma', indice + 1) }}>
          <Plus size={16} aria-hidden /> Giorno dopo
        </button>
        <button type="button" className="pulsante piccolo" onClick={() => { applica(v => duplicaGiorno(v, giorno.id)); vai('programma', indice + 1) }}>
          <Copy size={16} aria-hidden /> Duplica
        </button>
        {indice > 0 && (
          <button type="button" className="pulsante piccolo" onClick={() => { applica(v => spostaGiorno(v, indice, indice - 1)); vai('programma', indice - 1) }}>
            <ArrowLeft size={16} aria-hidden /> Sposta prima
          </button>
        )}
        {indice < n - 1 && (
          <button type="button" className="pulsante piccolo" onClick={() => { applica(v => spostaGiorno(v, indice, indice + 1)); vai('programma', indice + 1) }}>
            Sposta dopo <ArrowRight size={16} aria-hidden />
          </button>
        )}
        <button type="button" className="pulsante piccolo pericolo" onClick={() => { applicaAnnullabile(v => eliminaGiorno(v, giorno.id), `G${indice} eliminato`); vai('programma', Math.max(0, indice - 1)) }}>
          <Trash2 size={16} aria-hidden /> Elimina giorno
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 7: Trascinamento nella `Timeline`**

Sostituire la funzione `Timeline` in `src/schermate/programma/Timeline.tsx` e aggiungere `VoceOrdinabile` (gli import vanno in cima al file):

```tsx
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { spostaTappa } from '../../model/operazioni'
import { useViaggio } from '../../store/viaggio'
```

```tsx
function VoceOrdinabile({ tappa, successiva, giornoId, data, onApri }: { tappa: Tappa; successiva?: Tappa; giornoId: string; data: string; onApri: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: tappa.id })
  const maniglia = (
    <button type="button" className="maniglia" ref={setActivatorNodeRef} aria-label={`Sposta ${tappa.titolo}`} {...attributes} {...listeners}>
      <GripVertical size={20} aria-hidden />
    </button>
  )
  return (
    <li ref={setNodeRef} className="voce-timeline" style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined, position: 'relative' }}>
      <VoceTimeline tappa={tappa} successiva={successiva} giornoId={giornoId} data={data} onApri={onApri}>
        <CardTappa tappa={tappa} giornoId={giornoId} data={data} onApri={() => onApri(tappa.id)} maniglia={maniglia} />
      </VoceTimeline>
    </li>
  )
}

export function Timeline({ giorno, data, onApri, modifica }: Props) {
  const applica = useViaggio(s => s.applica)
  const sensori = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  if (giorno.tappe.length === 0) return <Vuoto titolo="Giornata libera" testo={modifica ? 'Aggiungi la prima tappa qui sotto.' : 'Nessuna tappa in programma.'} />
  if (!modifica) {
    return (
      <ol className="timeline">
        {giorno.tappe.map((t, i) => (
          <li key={t.id} className="voce-timeline">
            <VoceTimeline tappa={t} successiva={giorno.tappe[i + 1]} giornoId={giorno.id} data={data} onApri={onApri} />
          </li>
        ))}
      </ol>
    )
  }
  const fine = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const da = giorno.tappe.findIndex(t => t.id === active.id)
    const a = giorno.tappe.findIndex(t => t.id === over.id)
    applica(v => spostaTappa(v, giorno.id, da, a))
  }
  return (
    <DndContext sensors={sensori} collisionDetection={closestCenter} onDragEnd={fine}>
      <SortableContext items={giorno.tappe.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <ol className="timeline">
          {giorno.tappe.map((t, i) => (
            <VoceOrdinabile key={t.id} tappa={t} successiva={giorno.tappe[i + 1]} giornoId={giorno.id} data={data} onApri={onApri} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
```

`useSensors` è un hook: resta chiamato prima dei `return` anticipati, come sopra.

- [ ] **Step 8: `FoglioTappa` in modifica e `FoglioNuovaTappa`**

Riscrivere `src/schermate/programma/FoglioTappa.tsx`:

```tsx
import { useState } from 'react'
import { dataGiorno } from '../../model/date'
import { aggiungiTappa, eliminaTappa, nuovaTappa, sostituisciTappa } from '../../model/operazioni'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Foglio } from '../../ui/Foglio'
import { EditorTappa } from './EditorTappa'
import { VistaTappa } from './VistaTappa'

export function FoglioTappa({ giornoId, tappaId, onChiudi }: { giornoId: string | null; tappaId: string | null; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const modifica = useViaggio(s => s.modifica)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const indice = viaggio.giorni.findIndex(g => g.id === giornoId)
  const giorno = viaggio.giorni[indice]
  const tappa = giorno?.tappe.find(t => t.id === tappaId)
  return (
    <Foglio aperto={!!tappa} onChiudi={onChiudi} titolo={modifica ? 'Modifica tappa' : tappa?.titolo || 'Tappa'} pieno={modifica}>
      {tappa && giorno && (modifica
        ? <EditorTappa key={tappa.id} iniziale={tappa} citta={cittaDi(viaggio, giorno)}
            onSalva={t => { applica(v => sostituisciTappa(v, giorno.id, t)); onChiudi() }}
            onElimina={() => { applicaAnnullabile(v => eliminaTappa(v, giorno.id, tappa.id), 'Tappa eliminata'); onChiudi() }} />
        : <VistaTappa giorno={giorno} tappa={tappa} data={dataGiorno(viaggio, indice)} />)}
    </Foglio>
  )
}

export function FoglioNuovaTappa({ giornoId, aperto, onChiudi }: { giornoId: string; aperto: boolean; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const giorno = viaggio.giorni.find(g => g.id === giornoId)
  const [bozza] = useState(() => nuovaTappa({ titolo: '' }))
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Nuova tappa" pieno>
      {giorno && aperto && (
        <EditorTappa iniziale={bozza} citta={cittaDi(viaggio, giorno)} onSalva={t => { applica(v => aggiungiTappa(v, giorno.id, t)); onChiudi() }} />
      )}
    </Foglio>
  )
}
```

In `Programma.tsx`, montare `FoglioNuovaTappa` con `key` diversa a ogni apertura, così ogni nuova tappa ha un id nuovo (vedi step 9).

- [ ] **Step 9: Pulsante Modifica ed editor nel `Programma`**

Riscrivere `src/schermate/programma/Programma.tsx` (gli hook stanno tutti prima del `return` anticipato; `FoglioNuovaTappa` riceve una `key` nuova a ogni apertura, così ogni tappa nuova ha un id nuovo):

```tsx
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { faseViaggio } from '../../model/adesso'
import { dataGiorno, formatoData } from '../../model/date'
import { aggiungiGiorno } from '../../model/operazioni'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Avvisi } from '../../ui/Avvisi'
import { BarraNav, TitoloGrande, Vuoto } from '../../ui/componenti'
import { useAdesso } from '../../ui/hook'
import { hrefRotta } from '../../ui/rotta'
import { EditorGiorno } from './EditorGiorno'
import { ExtraGiorno } from './ExtraGiorno'
import { FoglioNuovaTappa, FoglioTappa } from './FoglioTappa'
import { StrisciaGiorni } from './StrisciaGiorni'
import { Timeline } from './Timeline'
import './programma.css'

export default function Programma({ indice }: { indice: number | null }) {
  const viaggio = useViaggio(s => s.viaggio)
  const modifica = useViaggio(s => s.modifica)
  const setModifica = useViaggio(s => s.setModifica)
  const applica = useViaggio(s => s.applica)
  const fase = faseViaggio(viaggio, useAdesso())
  const [aperta, setAperta] = useState<string | null>(null)
  const [nuove, setNuove] = useState(0)
  const [nuovaAperta, setNuovaAperta] = useState(false)
  const n = viaggio.giorni.length
  const i = Math.min(Math.max(indice ?? (fase.fase === 'durante' ? fase.indice : 0), 0), Math.max(n - 1, 0))
  useEffect(() => { scrollTo({ top: 0 }) }, [i])

  const pulsanteModifica = (
    <button type="button" className="pulsante-testo" onClick={() => setModifica(!modifica)}>{modifica ? 'Fine' : 'Modifica'}</button>
  )

  if (n === 0) {
    return (
      <div className="schermata">
        <BarraNav titolo="Programma" />
        <TitoloGrande>Programma</TitoloGrande>
        <Vuoto titolo="Nessun giorno"
          testo={viaggio.citta.length ? 'Aggiungi il primo giorno del viaggio.' : 'Aggiungi prima una città in Viaggio.'}
          azione={viaggio.citta.length > 0 && (
            <button type="button" className="pulsante primario" onClick={() => applica(v => aggiungiGiorno(v, -1, v.citta[0].id))}>Aggiungi giorno</button>
          )} />
      </div>
    )
  }

  const giorno = viaggio.giorni[i]
  const citta = cittaDi(viaggio, giorno)
  const data = dataGiorno(viaggio, i)
  return (
    <div className="schermata">
      <BarraNav titolo={`G${i} · ${citta.nome}`} destra={pulsanteModifica} />
      <StrisciaGiorni viaggio={viaggio} attivo={i} oggi={fase.fase === 'durante' ? fase.indice : null} />
      <TitoloGrande sopra={`${formatoData(data, 'lungo')} · ${citta.nome} ${citta.kanji}`} sotto={giorno.intro || undefined}>
        {giorno.titolo}
      </TitoloGrande>
      {modifica && <EditorGiorno indice={i} />}
      <Avvisi avvisi={giorno.avvisi} />
      <Timeline giorno={giorno} data={data} onApri={setAperta} modifica={modifica} />
      {modifica && (
        <button type="button" className="pulsante largo aggiungi-tappa" onClick={() => { setNuove(x => x + 1); setNuovaAperta(true) }}>
          <Plus size={18} aria-hidden /> Aggiungi tappa
        </button>
      )}
      <ExtraGiorno giorno={giorno} />
      <nav className="giorno-nav" aria-label="Giorno precedente e successivo">
        {i > 0 ? <a className="pulsante" href={hrefRotta('programma', i - 1)}><ChevronLeft size={18} aria-hidden /> G{i - 1}</a> : <span />}
        {i < n - 1 && <a className="pulsante" href={hrefRotta('programma', i + 1)}>G{i + 1} <ChevronRight size={18} aria-hidden /></a>}
      </nav>
      <FoglioTappa giornoId={giorno.id} tappaId={aperta} onChiudi={() => setAperta(null)} />
      <FoglioNuovaTappa key={nuove} giornoId={giorno.id} aperto={nuovaAperta} onChiudi={() => setNuovaAperta(false)} />
    </div>
  )
}
```

- [ ] **Step 10: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812), su `#/programma/11`:
- "Modifica" mostra il riquadro del giorno; cambiare il titolo aggiorna subito la barra; "Fine" lo chiude.
- Trascinare la maniglia di una tappa sotto un'altra cambia l'ordine; ricaricando la pagina l'ordine resta.
- Tocco su una card in modifica: si apre l'editor; cambiare l'ora a "23:00" e salvare sposta la tappa in fondo; togliere la spunta "Serve un biglietto" e salvare fa sparire il pulsante Biglietti.
- "Aggiungi tappa": salvare senza titolo mostra "Scrivi un titolo."; cercare "Ginkaku-ji" mostra risultati di Nominatim; sceglierne uno e salvare aggiunge la tappa all'ora giusta.
- "Elimina giorno" mostra il toast con "Annulla"; "Annulla" rimette il giorno.
- "Giorno dopo" crea un giorno vuoto e ci porta sopra; la striscia mostra 21 giorni e le date dopo slittano.

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Modifica completa dal Programma: tappe, riordino trascinando, giorni, hotel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Oggi (prima, durante e dopo il viaggio)

**Files:**
- Modify: `src/model/date.ts`, `src/model/date.test.ts` (aggiunge `oraDaMinuti`)
- Create: `src/ui/inviti.css`, `src/ui/Installazione.tsx`, `src/ui/Backup.tsx`, `src/schermate/oggi/oggi.css`, `src/schermate/oggi/Meteo.tsx`, `src/schermate/oggi/CardAdesso.tsx`, `src/schermate/oggi/SchedaTaxi.tsx`, `src/schermate/oggi/PrimaDelViaggio.tsx`, `src/schermate/oggi/DuranteIlViaggio.tsx`, `src/schermate/oggi/DopoIlViaggio.tsx`
- Modify: `src/schermate/oggi/Oggi.tsx` (riscritto)

**Interfaces:**
- Consumes: `faseViaggio`, `tappeAdessoDopo`, `bigliettiDaPrenotare`, `statistiche`, `backupDaFare`, `cittaDi`, `meteoDelGiorno`, `descriviCodice`, `previsioneDisponibile`, `condividiOScarica`, `creaBackup`, `aggiornaImpostazioni`, `aggiornaTappa`, `aggiornaAlloggio`, `FoglioTappa` (Task 11), `Avvisi`.
- Produces: `oraDaMinuti(m: number): string`; `IstruzioniInstallazione({ ios })`, `InvitoInstallazione()`; `useEsportaBackup(): () => Promise<void>`, `PromemoriaBackup()`; `Meteo({ citta, data, oggi })`; `CardAdesso({ etichetta, tappa, onApri, onFatto? })`; `SchedaTaxi({ aperto, onChiudi, alloggio })`; schermata `Oggi()`.

- [ ] **Step 1: Test di `oraDaMinuti`**

In `src/model/date.test.ts`, aggiungere `oraDaMinuti` all'import e questo test:

```ts
test('oraDaMinuti', () => {
  expect(oraDaMinuti(510)).toBe('08:30')
  expect(oraDaMinuti(24 * 60 + 15)).toBe('00:15')
})
```

Run: `npm test -- src/model/date.test.ts`
Expected: FAIL, `oraDaMinuti` non esportato.

- [ ] **Step 2: Implementare `oraDaMinuti` in `src/model/date.ts`**

```ts
export function oraDaMinuti(m: number): string {
  const x = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
}
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Inviti a installare e a fare il backup**

`src/ui/inviti.css`:

```css
.invito { display: flex; gap: 12px; align-items: center; margin: 12px 0; }
.invito > svg { color: var(--tinta-testo); flex-shrink: 0; }
.invito > div { flex: 1; min-width: 0; }
.invito p { font-size: 14px; margin-top: 2px; }
.istruzioni { padding-left: 22px; display: grid; gap: 12px; margin: 8px 0 16px; }
.istruzioni svg { vertical-align: -3px; }
```

`src/ui/Installazione.tsx`:

```tsx
import { EllipsisVertical, Share, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Foglio } from './Foglio'
import { useInstallazione } from './hook'
import './inviti.css'

export function IstruzioniInstallazione({ ios }: { ios: boolean }) {
  return ios ? (
    <ol className="istruzioni">
      <li>In Safari tocca <Share size={18} aria-label="Condividi" /> in basso.</li>
      <li>Scegli <strong>Aggiungi alla schermata Home</strong>.</li>
      <li>Da ora apri l'app dall'icona: così funziona offline e iOS non cancella i dati.</li>
    </ol>
  ) : (
    <ol className="istruzioni">
      <li>In Chrome tocca <EllipsisVertical size={18} aria-label="Menu" /> in alto a destra.</li>
      <li>Scegli <strong>Installa app</strong> (o <strong>Aggiungi a schermata Home</strong>).</li>
      <li>Da ora apri l'app dall'icona: funziona anche offline.</li>
    </ol>
  )
}

export function InvitoInstallazione() {
  const { installata, ios, puoInstallare, installa } = useInstallazione()
  const [aperto, setAperto] = useState(false)
  if (installata) return null
  return (
    <>
      <div className="card invito">
        <Smartphone size={24} aria-hidden />
        <div>
          <strong>Installa l'app sul telefono</strong>
          <p className="testo-2">Funziona offline e, su iPhone, i dati restano al sicuro.</p>
        </div>
        <button type="button" className="pulsante piccolo" onClick={() => (puoInstallare ? void installa() : setAperto(true))}>Installa</button>
      </div>
      <Foglio aperto={aperto} onChiudi={() => setAperto(false)} titolo="Installa sulla Home">
        <IstruzioniInstallazione ios={ios} />
      </Foglio>
    </>
  )
}
```

`src/ui/Backup.tsx`:

```tsx
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { aggiornaImpostazioni } from '../model/operazioni'
import { condividiOScarica, creaBackup } from '../servizi/backup'
import { useViaggio } from '../store/viaggio'
import './inviti.css'

export function useEsportaBackup() {
  const applica = useViaggio(s => s.applica)
  return async () => {
    const adesso = new Date()
    const esito = await condividiOScarica(creaBackup(useViaggio.getState().viaggio, adesso), adesso)
    if (esito === 'annullato') return
    applica(v => aggiornaImpostazioni(v, { ultimoBackup: adesso.toISOString() }))
    toast(esito === 'condiviso' ? 'Backup condiviso' : 'Backup scaricato')
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

- [ ] **Step 4: `src/schermate/oggi/oggi.css`**

```css
.conto { display: flex; align-items: center; gap: 16px; }
.conto-numero { font-size: 64px; line-height: 1; font-weight: 700; letter-spacing: -0.03em; color: var(--tinta-testo); font-variant-numeric: tabular-nums; }
.conto-testo { font-size: 20px; font-weight: 600; }
.meteo { display: flex; gap: 14px; align-items: center; margin: 12px 0; }
.meteo > svg { color: var(--tinta-testo); flex-shrink: 0; }
.card-adesso { margin: 12px 0; display: grid; gap: 12px; }
.card-adesso.secondaria { box-shadow: none; }
.card-adesso-etichetta { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--tinta-testo); }
.card-adesso-corpo { display: flex; gap: 12px; align-items: center; background: none; border: 0; padding: 0; text-align: left; cursor: pointer; }
.card-adesso-foto { width: 72px; height: 72px; border-radius: 12px; flex-shrink: 0; }
.card-adesso h3 { font-size: 21px; line-height: 1.2; font-weight: 600; }
.taxi { display: grid; gap: 14px; padding-top: 8px; }
.taxi-nome { font-size: 22px; font-weight: 600; }
.taxi-indirizzo { font-size: 32px; line-height: 1.35; font-weight: 600; font-family: 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif; overflow-wrap: anywhere; }
.statistiche { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 12px 0; }
.statistica { text-align: center; }
.statistica b { display: block; font-size: 34px; line-height: 1.1; color: var(--tinta-testo); }
```

- [ ] **Step 5: `src/schermate/oggi/Meteo.tsx`**

```tsx
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun, Thermometer, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Citta } from '../../model/tipi'
import { descriviCodice, meteoDelGiorno, previsioneDisponibile, type IconaMeteo, type MeteoGiorno } from '../../servizi/meteo'
import { Avvisi } from '../../ui/Avvisi'

const ICONE: Record<IconaMeteo, LucideIcon> = { sereno: Sun, 'poco-nuvoloso': CloudSun, nuvoloso: Cloud, nebbia: CloudFog, pioggia: CloudRain, neve: Snowflake, temporale: CloudLightning }
const oraTokyo = (ms: number) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })

export function Meteo({ citta, data, oggi }: { citta: Citta; data: string; oggi: string }) {
  const [r, setR] = useState<{ meteo: MeteoGiorno; salvato: number } | null | undefined>(undefined)
  useEffect(() => {
    let vivo = true
    setR(undefined)
    meteoDelGiorno(citta.lat, citta.lng, data, oggi).then(x => { if (vivo) setR(x) })
    return () => { vivo = false }
  }, [citta.lat, citta.lng, data, oggi])

  if (r === undefined && previsioneDisponibile(data, oggi)) return <div className="card meteo foto-attesa" aria-busy="true">Carico il meteo…</div>
  if (!r) {
    return (
      <div className="card meteo">
        <Thermometer size={30} aria-hidden />
        <div>
          <strong>{citta.clima.max}° / {citta.clima.min}°</strong>
          <div className="testo-2">Clima tipico di agosto a {citta.nome}. La previsione arriva 15 giorni prima.</div>
        </div>
      </div>
    )
  }
  const { etichetta, icona } = descriviCodice(r.meteo.codice)
  const Icona = ICONE[icona]
  const vecchio = Date.now() - r.salvato > 3 * 3_600_000
  return (
    <>
      <div className="card meteo">
        <Icona size={34} aria-hidden />
        <div>
          <strong>{r.meteo.max}° / {r.meteo.min}° · {etichetta}</strong>
          <div className="testo-2">
            {r.meteo.pioggia != null ? `Pioggia ${r.meteo.pioggia}%` : ''}
            {vecchio ? ` · dato delle ${oraTokyo(r.salvato)}` : ''}
          </div>
        </div>
      </div>
      {r.meteo.max >= 33 && <Avvisi avvisi={[{ livello: 'attenzione', testo: "Molto caldo: acqua sempre con voi, pause all'ombra o in un konbini, cappello." }]} />}
    </>
  )
}
```

- [ ] **Step 6: `src/schermate/oggi/CardAdesso.tsx` e `SchedaTaxi.tsx`**

`CardAdesso.tsx`:

```tsx
import { Check, Navigation } from 'lucide-react'
import { minutiDaOra, oraDaMinuti } from '../../model/date'
import type { Tappa } from '../../model/tipi'
import { urlIndicazioni } from '../../servizi/mappe'
import { FotoLuogo } from '../../ui/FotoLuogo'

interface Props { etichetta: string; tappa: Tappa; onApri: () => void; onFatto?: () => void; secondaria?: boolean }

export function CardAdesso({ etichetta, tappa, onApri, onFatto, secondaria }: Props) {
  const inizio = minutiDaOra(tappa.ora)
  const orario = tappa.ora ? (tappa.durataMin && inizio !== null ? `${tappa.ora} – ${oraDaMinuti(inizio + tappa.durataMin)}` : tappa.ora) : ''
  return (
    <article className={'card card-adesso' + (secondaria ? ' secondaria' : '')}>
      <div className="card-adesso-etichetta">{etichetta}</div>
      <button type="button" className="card-adesso-corpo" onClick={onApri}>
        {tappa.luogo && tappa.tipo !== 'spostamento' && <FotoLuogo query={tappa.luogo.query} override={tappa.foto} className="card-adesso-foto" />}
        <div>
          <h3>{tappa.titolo}</h3>
          <p className="testo-2">{[orario, tappa.luogo?.nome !== tappa.titolo ? tappa.luogo?.nome : ''].filter(Boolean).join(' · ')}</p>
        </div>
      </button>
      <div className="fila">
        {tappa.luogo && (
          <a className={'pulsante' + (secondaria ? '' : ' primario')} href={urlIndicazioni(tappa.luogo)} target="_blank" rel="noreferrer">
            <Navigation size={18} aria-hidden /> Vai
          </a>
        )}
        {onFatto && <button type="button" className="pulsante" onClick={onFatto}><Check size={18} aria-hidden /> Fatto</button>}
      </div>
    </article>
  )
}
```

`SchedaTaxi.tsx`:

```tsx
import { Copy, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { aggiornaAlloggio } from '../../model/operazioni'
import type { Luogo } from '../../model/tipi'
import { urlCerca } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Campo } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'

/** Scheda a tutto schermo da mostrare al tassista. */
export function SchedaTaxi({ aperto, onChiudi, alloggio }: { aperto: boolean; onChiudi: () => void; alloggio: Luogo }) {
  const applica = useViaggio(s => s.applica)
  const copia = () => navigator.clipboard?.writeText(alloggio.indirizzoJa ?? '').then(() => toast('Indirizzo copiato'), () => toast('Copia non riuscita'))
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Per il tassista" pieno>
      <div className="taxi">
        <p className="testo-2" lang="ja">この住所までお願いします。</p>
        <p className="taxi-nome">{alloggio.nome}</p>
        {alloggio.indirizzoJa
          ? <p className="taxi-indirizzo" lang="ja">{alloggio.indirizzoJa}</p>
          : <p className="testo-2">Manca l'indirizzo in giapponese: copialo dalla prenotazione o dal sito dell'hotel e incollalo qui sotto.</p>}
        <Campo etichetta="Indirizzo in giapponese">
          <input lang="ja" value={alloggio.indirizzoJa ?? ''} placeholder="東京都台東区西浅草3-17-1"
            onChange={e => applica(v => aggiornaAlloggio(v, alloggio.nome, { indirizzoJa: e.target.value || undefined }))} />
        </Campo>
        <div className="fila">
          <a className="pulsante" href={urlCerca(alloggio)} target="_blank" rel="noreferrer"><MapPin size={18} aria-hidden /> Mappa</a>
          {alloggio.indirizzoJa && <button type="button" className="pulsante" onClick={() => void copia()}><Copy size={18} aria-hidden /> Copia</button>}
        </div>
      </div>
    </Foglio>
  )
}
```

- [ ] **Step 7: Le tre fasi**

`src/schermate/oggi/PrimaDelViaggio.tsx`:

```tsx
import { CalendarDays, Ticket } from 'lucide-react'
import { dataGiorno, formatoData, istanteTokyo } from '../../model/date'
import { backupDaFare, bigliettiDaPrenotare, cittaDi } from '../../model/riepilogo'
import { urlCercaBiglietti } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { PromemoriaBackup } from '../../ui/Backup'
import { BarraNav, Gruppo, Riga, TitoloGrande } from '../../ui/componenti'
import { InvitoInstallazione } from '../../ui/Installazione'
import { hrefRotta } from '../../ui/rotta'
import { Meteo } from './Meteo'

export function PrimaDelViaggio({ giorniMancanti, adesso }: { giorniMancanti: number; adesso: Date }) {
  const viaggio = useViaggio(s => s.viaggio)
  const primo = viaggio.giorni[0]
  const fine = dataGiorno(viaggio, Math.max(viaggio.giorni.length - 1, 0))
  const biglietti = bigliettiDaPrenotare(viaggio)
  return (
    <div className="schermata">
      <BarraNav titolo="Oggi" />
      <TitoloGrande sopra="Si parte fra">{viaggio.titolo}</TitoloGrande>
      <div className="card conto">
        <div className="conto-numero">{giorniMancanti}</div>
        <div className="conto-testo">
          {giorniMancanti === 1 ? 'giorno' : 'giorni'}
          <div className="testo-2">{formatoData(viaggio.dataPartenza, 'lungo')} – {formatoData(fine, 'lungo')}</div>
        </div>
      </div>
      <InvitoInstallazione />
      {backupDaFare(viaggio.impostazioni.ultimoBackup, adesso) && <PromemoriaBackup />}
      {primo && giorniMancanti <= 15 && <Meteo citta={cittaDi(viaggio, primo)} data={viaggio.dataPartenza} oggi={istanteTokyo(adesso).data} />}
      {primo && (
        <Gruppo titolo="Il primo giorno">
          <Riga icona={<CalendarDays size={20} />} titolo={primo.titolo} sottotitolo={`${cittaDi(viaggio, primo).nome} · ${primo.tappe.length} tappe`} href={hrefRotta('programma', 0)} />
        </Gruppo>
      )}
      {biglietti.length > 0 && (
        <Gruppo titolo="Biglietti da prenotare" piede="Molte attrazioni aprono le prenotazioni uno o due mesi prima.">
          {biglietti.map(b => (
            <Riga key={b.tappa.id} icona={<Ticket size={20} />} titolo={b.tappa.titolo} sottotitolo={`${formatoData(b.data, 'breve')} · G${b.indice}`}
              href={b.tappa.biglietti!.link ?? urlCercaBiglietti(b.tappa.titolo)} />
          ))}
        </Gruppo>
      )}
    </div>
  )
}
```

`src/schermate/oggi/DuranteIlViaggio.tsx`:

```tsx
import { BedDouble, Check, Circle } from 'lucide-react'
import { useState } from 'react'
import { tappeAdessoDopo } from '../../model/adesso'
import { dataGiorno, formatoData, formatoDurata, istanteTokyo } from '../../model/date'
import { aggiornaTappa } from '../../model/operazioni'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Avvisi } from '../../ui/Avvisi'
import { BarraNav, Gruppo, Riga, TitoloGrande } from '../../ui/componenti'
import { hrefRotta } from '../../ui/rotta'
import { FoglioTappa } from '../programma/FoglioTappa'
import { CardAdesso } from './CardAdesso'
import { Meteo } from './Meteo'
import { SchedaTaxi } from './SchedaTaxi'

export function DuranteIlViaggio({ indice, adesso }: { indice: number; adesso: Date }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const [aperta, setAperta] = useState<string | null>(null)
  const [taxi, setTaxi] = useState(false)
  const giorno = viaggio.giorni[indice]
  const citta = cittaDi(viaggio, giorno)
  const data = dataGiorno(viaggio, indice)
  const { data: oggi, minuti } = istanteTokyo(adesso)
  const { adesso: ora, dopo, minutiAlDopo } = tappeAdessoDopo(giorno.tappe, minuti)
  const fatta = (id: string) => applica(v => aggiornaTappa(v, giorno.id, id, { stato: 'fatta' }))
  const spostamento = ora?.spostamento?.minuti ? ` · ${formatoDurata(ora.spostamento.minuti)} di strada` : ''

  return (
    <div className="schermata">
      <BarraNav titolo={`${citta.nome} · G${indice}`} />
      <TitoloGrande sopra={formatoData(data, 'lungo')} sotto={giorno.titolo}>
        <span className="kanji">{citta.kanji}</span> {citta.nome}
      </TitoloGrande>
      <Meteo citta={citta} data={data} oggi={oggi} />
      <Avvisi avvisi={giorno.avvisi} />
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
      {giorno.alloggio && (
        <Gruppo titolo="Stanotte">
          <Riga icona={<BedDouble size={20} />} titolo={giorno.alloggio.nome}
            sottotitolo={giorno.alloggio.indirizzoJa || "Tocca per l'indirizzo da mostrare al tassista"} onClick={() => setTaxi(true)} />
        </Gruppo>
      )}
      {giorno.alloggio && <SchedaTaxi aperto={taxi} onChiudi={() => setTaxi(false)} alloggio={giorno.alloggio} />}
      <FoglioTappa giornoId={giorno.id} tappaId={aperta} onChiudi={() => setAperta(null)} />
    </div>
  )
}
```

`src/schermate/oggi/DopoIlViaggio.tsx`:

```tsx
import { statistiche } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { BarraNav, TitoloGrande } from '../../ui/componenti'
import { hrefRotta } from '../../ui/rotta'

export function DopoIlViaggio() {
  const viaggio = useViaggio(s => s.viaggio)
  const s = statistiche(viaggio)
  return (
    <div className="schermata">
      <BarraNav titolo="Oggi" />
      <TitoloGrande sopra="Bentornati" sotto={viaggio.titolo}>おかえりなさい</TitoloGrande>
      <div className="statistiche">
        <div className="card statistica"><b>{s.giorni}</b>giorni</div>
        <div className="card statistica"><b>{s.citta}</b>città</div>
        <div className="card statistica"><b>{s.fatte}</b>tappe fatte</div>
        <div className="card statistica"><b>{s.tappe - s.fatte}</b>per la prossima volta</div>
      </div>
      <a className="pulsante largo" href={hrefRotta('programma', 0)}>Rivedi il viaggio</a>
    </div>
  )
}
```

- [ ] **Step 8: Riscrivere `src/schermate/oggi/Oggi.tsx`**

```tsx
import { faseViaggio } from '../../model/adesso'
import { useViaggio } from '../../store/viaggio'
import { useAdesso } from '../../ui/hook'
import { DopoIlViaggio } from './DopoIlViaggio'
import { DuranteIlViaggio } from './DuranteIlViaggio'
import { PrimaDelViaggio } from './PrimaDelViaggio'
import './oggi.css'

export default function Oggi() {
  const viaggio = useViaggio(s => s.viaggio)
  const adesso = useAdesso()
  const fase = faseViaggio(viaggio, adesso)
  if (fase.fase === 'prima') return <PrimaDelViaggio giorniMancanti={fase.giorniMancanti} adesso={adesso} />
  if (fase.fase === 'durante') return <DuranteIlViaggio indice={fase.indice} adesso={adesso} />
  return <DopoIlViaggio />
}
```

- [ ] **Step 9: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview (375×812):
- `/jap-itinerario/#/oggi` (oggi reale, settembre 2026): conto alla rovescia di circa 312 giorni, invito a installare, promemoria backup, clima tipico di Tokyo, elenco dei biglietti con Tokyo Skytree al 9 agosto.
- `/jap-itinerario/?oggi=2027-08-16T10:15#/oggi`: Kyoto, lunedì 16 agosto; "Adesso: Kinkaku-ji", "Dopo · fra 1 h 15: Pausa nelle ore calde"; avvisi dell'Okuribi; "Stanotte: Kyoto Gion Hotel". Tocco su "Fatto": la card Adesso sparisce e la riga nella giornata prende la spunta. Tocco sull'hotel: scheda per il tassista; scrivere un indirizzo lo mostra in grande e compare anche negli altri giorni dello stesso hotel.
- `?oggi=2027-08-16T23:30`: "Giornata finita".
- `?oggi=2027-08-30`: schermata "Bentornati" con le statistiche.

- [ ] **Step 10: Commit**

```bash
git add src
git commit -m "Oggi: conto alla rovescia, adesso e dopo, meteo, avvisi, scheda per il taxi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Mappa

**Files:**
- Create: `src/model/mappa.ts`, `src/schermate/mappa/MappaLeaflet.tsx`, `src/schermate/mappa/mappa.css`
- Modify: `src/schermate/mappa/Mappa.tsx` (riscritto)
- Test: `src/model/mappa.test.ts`

**Interfaces:**
- Consumes: `cittaDi`, `distanzaKm`, `formatoDistanza`, `testoSu`, `FoglioTappa`, `useTemaRisolto`.
- Produces: `interface PuntoMappa { id: string; giornoId: string; indice: number; numero: number; lat: number; lng: number; titolo: string; colore: string; stato: StatoTappa }`, `puntiGiorno(v: Viaggio, indice: number): PuntoMappa[]`, `puntiViaggio(v: Viaggio): PuntoMappa[]`, `vicini(v: Viaggio, pos: { lat: number; lng: number }, max?: number): (PuntoMappa & { km: number })[]`; `MappaLeaflet({ punti, percorso, posizione, tema, onApri })`; schermata `Mappa({ indice })`.

- [ ] **Step 1: Test**

`src/model/mappa.test.ts`:

```ts
import { expect, test } from 'vitest'
import { giornoDiProva, tappaDiProva, viaggioDiProva } from './fixture'
import { puntiGiorno, puntiViaggio, vicini } from './mappa'

const L = (lat: number, lng: number) => ({ nome: 'x', query: 'x', lat, lng })
const v = viaggioDiProva({
  giorni: [
    giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', luogo: L(35.71, 139.79) }), tappaDiProva({ id: 'b' }), tappaDiProva({ id: 'c', luogo: L(35.66, 139.70) })] }),
    giornoDiProva({ id: 'g1', cittaId: 'kyoto', tappe: [tappaDiProva({ id: 'd', luogo: L(35.71, 139.79) }), tappaDiProva({ id: 'e', luogo: L(35.0, 135.77) })] }),
  ],
})

test('puntiGiorno salta le tappe senza coordinate ma tiene la numerazione del giorno', () => {
  expect(puntiGiorno(v, 0).map(p => [p.id, p.numero, p.colore])).toEqual([['a', 1, '#E4572E'], ['c', 3, '#E4572E']])
  expect(puntiGiorno(v, 9)).toEqual([])
})

test('puntiViaggio', () => {
  expect(puntiViaggio(v).map(p => p.id)).toEqual(['a', 'c', 'd', 'e'])
})

test('vicini: ordinati per distanza, senza doppioni dello stesso posto', () => {
  const r = vicini(v, { lat: 35.70, lng: 139.78 }, 3)
  expect(r.map(p => p.id)).toEqual(['a', 'c', 'e'])
  expect(r[0].km).toBeLessThan(2)
})
```

Run: `npm test -- src/model/mappa.test.ts`
Expected: FAIL, import non risolto.

- [ ] **Step 2: `src/model/mappa.ts`**

```ts
import { distanzaKm } from '../servizi/distanza'
import { cittaDi } from './riepilogo'
import type { StatoTappa, Viaggio } from './tipi'

export interface PuntoMappa {
  id: string; giornoId: string; indice: number; numero: number
  lat: number; lng: number; titolo: string; colore: string; stato: StatoTappa
}

function punti(v: Viaggio, indice: number): PuntoMappa[] {
  const g = v.giorni[indice]
  const colore = cittaDi(v, g).colore
  return g.tappe.flatMap((t, i) => {
    const l = t.luogo
    if (l?.lat == null || l.lng == null) return []
    return [{ id: t.id, giornoId: g.id, indice, numero: i + 1, lat: l.lat, lng: l.lng, titolo: t.titolo, colore, stato: t.stato }]
  })
}

export function puntiGiorno(v: Viaggio, indice: number): PuntoMappa[] {
  return indice >= 0 && indice < v.giorni.length ? punti(v, indice) : []
}

export function puntiViaggio(v: Viaggio): PuntoMappa[] {
  return v.giorni.flatMap((_, i) => punti(v, i))
}

/** Le tappe più vicine a `pos`; lo stesso posto visto in più giorni conta una volta. */
export function vicini(v: Viaggio, pos: { lat: number; lng: number }, max = 8): (PuntoMappa & { km: number })[] {
  const visti = new Set<string>()
  return puntiViaggio(v)
    .map(p => ({ ...p, km: distanzaKm(pos, p) }))
    .sort((a, b) => a.km - b.km)
    .filter(p => {
      const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
      if (visti.has(k)) return false
      visti.add(k)
      return true
    })
    .slice(0, max)
}
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: `src/schermate/mappa/mappa.css`**

```css
.mappa-controlli { display: grid; gap: 8px; margin: 12px 0; }
.mappa { height: calc(100dvh - 330px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); min-height: 300px; border-radius: 16px; overflow: hidden; isolation: isolate; border: 0.5px solid var(--bordo); }
.leaflet-container { background: var(--superficie-2); font: 13px/1.4 var(--font); }
.segnaposto-contenitore { background: none; border: 0; }
.segnaposto {
  display: flex; width: 28px; height: 28px; border-radius: 50%; align-items: center; justify-content: center;
  background: var(--c); color: var(--t); font: 700 13px/1 var(--font); border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.segnaposto.fatto { opacity: 0.5; }
```

- [ ] **Step 4: `src/schermate/mappa/MappaLeaflet.tsx`**

```tsx
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { PuntoMappa } from '../../model/mappa'
import { testoSu } from '../../ui/colore'

type Coppia = [number, number]

function icona(p: PuntoMappa) {
  return L.divIcon({
    className: 'segnaposto-contenitore',
    html: `<span class="segnaposto${p.stato === 'fatta' ? ' fatto' : ''}" style="--c:${p.colore};--t:${testoSu(p.colore)}">${p.numero}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function Inquadra({ punti, posizione }: { punti: PuntoMappa[]; posizione: Coppia | null }) {
  const map = useMap()
  useEffect(() => {
    const pts: Coppia[] = punti.map(p => [p.lat, p.lng])
    if (posizione) pts.push(posizione)
    if (pts.length === 1) map.setView(pts[0], 15)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36] })
  }, [map, punti, posizione])
  return null
}

interface Props {
  punti: PuntoMappa[]
  percorso: boolean
  posizione: { lat: number; lng: number } | null
  tema: 'chiaro' | 'scuro'
  onApri: (p: PuntoMappa) => void
}

export function MappaLeaflet({ punti, percorso, posizione, tema, onApri }: Props) {
  const stile = tema === 'scuro' ? 'dark_all' : 'rastertiles/voyager'
  // Stabile fra un render e l'altro, così aprire una tappa non rifà l'inquadratura.
  const pos = useMemo<Coppia | null>(() => (posizione ? [posizione.lat, posizione.lng] : null), [posizione])
  return (
    <MapContainer className="mappa" center={[36.2, 138.2]} zoom={5} zoomControl={false}>
      <TileLayer key={stile} url={`https://{s}.basemaps.cartocdn.com/${stile}/{z}/{x}/{y}{r}.png`} subdomains="abcd" maxZoom={20}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' />
      {percorso && punti.length > 1 && (
        <Polyline positions={punti.map(p => [p.lat, p.lng] as Coppia)} pathOptions={{ color: punti[0].colore, weight: 3, opacity: 0.75, dashArray: '6 8' }} />
      )}
      {punti.map(p => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icona(p)} title={p.titolo} eventHandlers={{ click: () => onApri(p) }} />
      ))}
      {pos && <CircleMarker center={pos} radius={8} pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#1E88E5', fillOpacity: 1 }} />}
      <Inquadra punti={punti} posizione={pos} />
    </MapContainer>
  )
}
```

- [ ] **Step 5: Riscrivere `src/schermate/mappa/Mappa.tsx`**

```tsx
import { LocateFixed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { faseViaggio } from '../../model/adesso'
import { dataGiorno, formatoData } from '../../model/date'
import { puntiGiorno, puntiViaggio, vicini, type PuntoMappa } from '../../model/mappa'
import { cittaDi } from '../../model/riepilogo'
import { formatoDistanza } from '../../servizi/distanza'
import { useViaggio } from '../../store/viaggio'
import { BarraNav, Gruppo, Riga, Segmentato } from '../../ui/componenti'
import { useAdesso, useTemaRisolto } from '../../ui/hook'
import { vai } from '../../ui/rotta'
import { FoglioTappa } from '../programma/FoglioTappa'
import { MappaLeaflet } from './MappaLeaflet'
import '../programma/editor.css'
import './mappa.css'

type Ambito = 'giorno' | 'viaggio'

export default function Mappa({ indice }: { indice: number | null }) {
  const viaggio = useViaggio(s => s.viaggio)
  const tema = useTemaRisolto(viaggio.impostazioni.tema)
  const fase = faseViaggio(viaggio, useAdesso())
  const [ambito, setAmbito] = useState<Ambito>('giorno')
  const [posizione, setPosizione] = useState<{ lat: number; lng: number } | null>(null)
  const [errorePos, setErrorePos] = useState('')
  const [aperta, setAperta] = useState<{ giornoId: string; tappaId: string } | null>(null)
  const n = viaggio.giorni.length
  const i = Math.min(Math.max(indice ?? (fase.fase === 'durante' ? fase.indice : 0), 0), Math.max(n - 1, 0))
  const punti = useMemo(() => (ambito === 'giorno' ? puntiGiorno(viaggio, i) : puntiViaggio(viaggio)), [viaggio, i, ambito])
  const vicine = useMemo(() => (posizione ? vicini(viaggio, posizione) : []), [viaggio, posizione])
  const apri = (p: PuntoMappa) => setAperta({ giornoId: p.giornoId, tappaId: p.id })

  const localizza = () => {
    if (!navigator.geolocation) { setErrorePos('La posizione non è disponibile su questo dispositivo.'); return }
    navigator.geolocation.getCurrentPosition(
      p => { setPosizione({ lat: p.coords.latitude, lng: p.coords.longitude }); setErrorePos('') },
      () => setErrorePos('Non riesco a leggere la posizione: controlla i permessi del browser.'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const giorno = viaggio.giorni[i]
  return (
    <div className="schermata">
      <BarraNav titolo="Mappa" destra={<button type="button" className="pulsante-icona" onClick={localizza} aria-label="Mostra la mia posizione"><LocateFixed size={22} /></button>} />
      <div className="mappa-controlli">
        <Segmentato<Ambito> etichetta="Cosa mostrare" valore={ambito} onCambia={setAmbito}
          opzioni={[{ valore: 'giorno', etichetta: giorno ? `G${i} · ${cittaDi(viaggio, giorno).nome}` : 'Giorno' }, { valore: 'viaggio', etichetta: 'Tutto il viaggio' }]} />
        {ambito === 'giorno' && n > 0 && (
          <select className="campo-in" value={i} aria-label="Giorno da mostrare" onChange={e => vai('mappa', Number(e.target.value))}>
            {viaggio.giorni.map((g, k) => <option key={g.id} value={k}>G{k} · {formatoData(dataGiorno(viaggio, k), 'breve')} · {g.titolo}</option>)}
          </select>
        )}
      </div>
      <MappaLeaflet punti={punti} percorso={ambito === 'giorno'} posizione={posizione} tema={tema} onApri={apri} />
      {punti.length === 0 && <p className="testo-2" style={{ marginTop: 8 }}>Nessuna tappa con una posizione da mostrare.</p>}
      {errorePos && <p className="errore" style={{ marginTop: 8 }}>{errorePos}</p>}
      {vicine.length > 0 && (
        <Gruppo titolo="Vicino a te">
          {vicine.map(p => <Riga key={p.id} titolo={p.titolo} sottotitolo={`G${p.indice} · ${formatoDistanza(p.km)}`} onClick={() => apri(p)} />)}
        </Gruppo>
      )}
      <FoglioTappa giornoId={aperta?.giornoId ?? null} tappaId={aperta?.tappaId ?? null} onChiudi={() => setAperta(null)} />
    </div>
  )
}
```

- [ ] **Step 6: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview, `#/mappa/8`: si vedono i segnaposto numerati di G8 nel colore di Kyoto, uniti dalla linea tratteggiata; tocco su un segnaposto apre il foglio della tappa; "Tutto il viaggio" inquadra il Giappone da Tokyo a Himeji; in tema scuro le tile sono scure. Il pulsante posizione chiede il permesso; con la posizione simulata a Kyoto (35.0036, 135.7780) compare "Vicino a te" ordinato per distanza. Scorrere la pagina non deve scorrere la mappa sotto la tab bar.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "Mappa del giorno e del viaggio, posizione e tappe vicine

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Scheda Viaggio (impostazioni, città, dati) e primo avvio

**Files:**
- Create: `src/schermate/viaggio/EditorCitta.tsx`, `src/schermate/viaggio/PrimoAvvio.tsx`
- Modify: `src/schermate/viaggio/SchermataViaggio.tsx` (riscritto), `src/App.tsx` (monta `PrimoAvvio`)

**Interfaces:**
- Consumes: `aggiornaViaggio`, `aggiornaPersona`, `aggiornaImpostazioni`, `aggiungiCitta`, `aggiornaCitta`, `eliminaCitta`, `leggiBackup`, `useEsportaBackup`, `leggiV1`, `viaggioDaV1`, `viaggioBase`, `InvitoInstallazione`, `IstruzioniInstallazione`, `useInstallazione`, `CercaLuogo`.
- Produces: `EditorCitta({ cittaId, onChiudi })`, `PrimoAvvio()`, `SchermataViaggio()`.

- [ ] **Step 1: `src/schermate/viaggio/EditorCitta.tsx`**

```tsx
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { aggiornaCitta, eliminaCitta } from '../../model/operazioni'
import type { Citta } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { CercaLuogo } from '../programma/CercaLuogo'
import '../programma/editor.css'

export function EditorCitta({ cittaId, onChiudi }: { cittaId: string | null; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const c = viaggio.citta.find(x => x.id === cittaId)
  const agg = (m: Partial<Omit<Citta, 'id'>>) => c && applica(v => aggiornaCitta(v, c.id, m))
  const elimina = () => {
    if (!c) return
    try {
      applica(v => eliminaCitta(v, c.id))
      onChiudi()
    } catch {
      toast('Questa città ha dei giorni: spostali o eliminali prima.')
    }
  }
  return (
    <Foglio aperto={!!c} onChiudi={onChiudi} titolo={c?.nome || 'Città'} pieno>
      {c && (
        <div className="editor">
          <Campo etichetta="Nome"><input value={c.nome} onChange={e => agg({ nome: e.target.value })} /></Campo>
          <div className="fila">
            <Campo etichetta="Kanji"><input lang="ja" value={c.kanji} onChange={e => agg({ kanji: e.target.value })} /></Campo>
            <Campo etichetta="Rōmaji"><input value={c.romaji} onChange={e => agg({ romaji: e.target.value })} /></Campo>
          </div>
          <div className="fila">
            <Campo etichetta="Colore"><input type="color" value={c.colore} onChange={e => agg({ colore: e.target.value.toUpperCase() })} style={{ padding: 4, height: 44 }} /></Campo>
            <Campo etichetta="Max agosto °C"><input type="number" inputMode="numeric" value={c.clima.max} onChange={e => agg({ clima: { ...c.clima, max: Number(e.target.value) } })} /></Campo>
            <Campo etichetta="Min agosto °C"><input type="number" inputMode="numeric" value={c.clima.min} onChange={e => agg({ clima: { ...c.clima, min: Number(e.target.value) } })} /></Campo>
          </div>
          <CercaLuogo etichetta="Posizione (per meteo e mappa)" luogo={{ nome: `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}`, query: c.nome, lat: c.lat, lng: c.lng }} citta={c}
            onCambia={l => { if (l?.lat != null && l.lng != null) agg({ lat: l.lat, lng: l.lng }) }} />
          <Campo etichetta="Introduzione"><textarea value={c.intro} onChange={e => agg({ intro: e.target.value })} /></Campo>
          <div className="editor-azioni">
            <button type="button" className="pulsante pericolo largo" onClick={elimina}><Trash2 size={18} aria-hidden /> Elimina città</button>
          </div>
        </div>
      )}
    </Foglio>
  )
}
```

- [ ] **Step 2: `src/schermate/viaggio/PrimoAvvio.tsx`**

```tsx
import { useViaggio } from '../../store/viaggio'
import { leggiV1, viaggioDaV1 } from '../../store/avvio'
import { Foglio } from '../../ui/Foglio'

/** Una volta sola: se sul telefono c'è la vecchia app modificata, chiede da cosa partire. */
export function PrimoAvvio() {
  const sceltaV1 = useViaggio(s => s.sceltaV1)
  const setSceltaV1 = useViaggio(s => s.setSceltaV1)
  const sostituisci = useViaggio(s => s.sostituisci)
  const chiudi = () => setSceltaV1('fatta')
  const recupera = () => {
    const v1 = leggiV1(localStorage)
    if (v1) sostituisci(viaggioDaV1(v1))
    chiudi()
  }
  return (
    <Foglio aperto={sceltaV1 === 'da-chiedere'} onChiudi={chiudi} titolo="Nuova versione">
      <p style={{ margin: '8px 0 12px' }}>L'app è stata rifatta, con un itinerario 2027 aggiornato: arrivo e partenza, le sere dei festival di Nara e Arashiyama, Kurama e Himeji al posto di Koyasan e Hiroshima.</p>
      <p className="testo-2" style={{ marginBottom: 16 }}>Su questo telefono c'erano anche delle modifiche fatte nella versione vecchia. Da cosa vuoi partire? Potrai cambiare idea da Viaggio → Dati.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        <button type="button" className="pulsante primario largo" onClick={chiudi}>Nuovo itinerario 2027</button>
        <button type="button" className="pulsante largo" onClick={recupera}>Le mie modifiche vecchie</button>
      </div>
    </Foglio>
  )
}
```

In `src/App.tsx`: `import { PrimoAvvio } from './schermate/viaggio/PrimoAvvio'` e `<PrimoAvvio />` subito prima di `<Toaster … />`.

- [ ] **Step 3: Riscrivere `src/schermate/viaggio/SchermataViaggio.tsx`**

```tsx
import { Check, Download, History, Plus, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'
import { dataGiorno, formatoData } from '../../model/date'
import { aggiornaImpostazioni, aggiornaPersona, aggiornaViaggio, aggiungiCitta } from '../../model/operazioni'
import type { Tema, Viaggio } from '../../model/tipi'
import { leggiBackup } from '../../servizi/backup'
import { leggiV1, viaggioBase, viaggioDaV1 } from '../../store/avvio'
import { useViaggio } from '../../store/viaggio'
import { useEsportaBackup } from '../../ui/Backup'
import { BarraNav, Campo, Gruppo, Riga, Segmentato, TitoloGrande } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { useInstallazione } from '../../ui/hook'
import { InvitoInstallazione, IstruzioniInstallazione } from '../../ui/Installazione'
import { EditorCitta } from './EditorCitta'

const TEMI: { valore: Tema; etichetta: string }[] = [
  { valore: 'auto', etichetta: 'Automatico' },
  { valore: 'chiaro', etichetta: 'Washi' },
  { valore: 'scuro', etichetta: 'Notte' },
]

export default function SchermataViaggio() {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const esporta = useEsportaBackup()
  const { installata, ios } = useInstallazione()
  const file = useRef<HTMLInputElement>(null)
  const [daImportare, setDaImportare] = useState<Viaggio | null>(null)
  const [cittaAperta, setCittaAperta] = useState<string | null>(null)
  const v1 = leggiV1(localStorage)
  const ultimo = viaggio.impostazioni.ultimoBackup

  const importa = async (f: File | undefined) => {
    if (!f) return
    const esito = leggiBackup(await f.text())
    if (!esito.ok) toast(esito.errore)
    else setDaImportare(esito.viaggio)
    if (file.current) file.current.value = ''
  }
  const nuovaCitta = () => {
    const { viaggio: n, id } = aggiungiCitta(viaggio, { nome: 'Nuova città', kanji: '', romaji: '', colore: '#8E8E93', lat: 36.2, lng: 138.2, intro: '', clima: { max: 31, min: 24 } })
    applica(() => n)
    setCittaAperta(id)
  }

  return (
    <div className="schermata">
      <BarraNav titolo="Viaggio" />
      <TitoloGrande sotto="Prenotazioni, spese e checklist arrivano nelle prossime versioni.">Viaggio</TitoloGrande>

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
        <Riga icona={<Download size={20} />} titolo="Salva o condividi un backup" sottotitolo="Anche per mandare l'itinerario agli altri" onClick={() => void esporta()} />
        <Riga icona={<Upload size={20} />} titolo="Importa un backup" onClick={() => file.current?.click()} />
        {v1 && <Riga icona={<History size={20} />} titolo="Recupera le modifiche della versione vecchia" onClick={() => applicaAnnullabile(() => viaggioDaV1(v1), 'Modifiche vecchie recuperate')} />}
        <Riga icona={<RotateCcw size={20} />} titolo="Ripristina l'itinerario 2027" pericolo onClick={() => applicaAnnullabile(() => viaggioBase(), 'Itinerario ripristinato')} />
      </Gruppo>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => void importa(e.target.files?.[0])} />

      {installata
        ? <Gruppo titolo="App"><Riga icona={<Check size={20} />} titolo="Installata sulla Home" /></Gruppo>
        : <><InvitoInstallazione /><Gruppo titolo="Come si installa"><div style={{ padding: '8px 16px' }}><IstruzioniInstallazione ios={ios} /></div></Gruppo></>}

      <p className="testo-3" style={{ margin: '24px 16px' }}>
        Mappe © OpenStreetMap e CARTO · Meteo Open-Meteo · Foto Wikipedia e Wikimedia Commons · Ricerca luoghi Nominatim
      </p>

      <EditorCitta cittaId={cittaAperta} onChiudi={() => setCittaAperta(null)} />
      <Foglio aperto={!!daImportare} onChiudi={() => setDaImportare(null)} titolo="Importa backup">
        {daImportare && (
          <>
            <p style={{ margin: '8px 0' }}><strong>{daImportare.titolo}</strong></p>
            <p className="testo-2" style={{ marginBottom: 16 }}>
              {daImportare.giorni.length} giorni dal {formatoData(daImportare.dataPartenza, 'lungo')}. Sostituisce l'itinerario su questo telefono (si può annullare subito dopo).
            </p>
            <button type="button" className="pulsante primario largo" onClick={() => { const n = daImportare; applicaAnnullabile(() => n, 'Backup importato'); setDaImportare(null) }}>Importa</button>
          </>
        )}
      </Foglio>
    </div>
  )
}
```

`Riga` con `destra={null}` non mostra la freccia: la freccia appare solo se `destra === undefined`.

- [ ] **Step 4: Verificare**

Run: `npm test && npm run build`
Expected: PASS e build riuscita.

Nella preview:
- Cambiare la data di G0 al 2027-08-09: in Programma G0 diventa lunedì 9 agosto e G19 sabato 28. Rimetterla al 2027-08-08.
- Tema "Notte" forzato vale anche con il sistema chiaro; "Automatico" torna a seguire il sistema.
- Aprire Kyoto, cambiare colore: la striscia dei giorni e i pulsanti di Kyoto cambiano tinta.
- "Aggiungi città" → nome "Uji" → cercare la posizione; eliminarla funziona; eliminare Tokyo mostra il messaggio e non la elimina.
- "Salva o condividi un backup" scarica `giappone-backup-AAAA-MM-GG.json`; "Importa un backup" con quel file mostra il riepilogo; con un file JSON qualsiasi mostra "Il file non è un backup di quest'app."
- Primo avvio: in console `localStorage.clear(); localStorage.setItem('japan_itinerary_v1', JSON.stringify({ title: 'x', cities: [] }))`, ricaricare: compare il foglio "Nuova versione"; "Nuovo itinerario 2027" lo chiude e non ricompare al ricaricamento.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Scheda Viaggio: data e persone, tema, città, backup e importazione, recupero della versione vecchia

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Offline, icone, prova finale e pubblicazione

**Files:**
- Create: `public/icona.svg`, `pwa-assets.config.ts`, `README.md`, `docs/PROVA-FASE-1.md`, `.claude/launch.json` (se non creato nel Task 9)
- Generate: `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico`
- Modify: `vite.config.ts`, `index.html`, `src/main.tsx`

**Interfaces:**
- Consumes: tutta l'app.
- Produces: build installabile e offline in `dist/`; istruzioni di prova e di pubblicazione.

- [ ] **Step 1: Icona**

`public/icona.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F6F1E7"/>
  <circle cx="256" cy="256" r="150" fill="#C8452C"/>
  <g fill="#1D1B18">
    <path d="M104 166 Q256 136 408 166 L404 196 Q256 172 108 196 Z"/>
    <rect x="136" y="220" width="240" height="22" rx="4"/>
    <rect x="166" y="184" width="28" height="226" rx="6"/>
    <rect x="318" y="184" width="28" height="226" rx="6"/>
    <rect x="243" y="194" width="26" height="30"/>
  </g>
</svg>
```

`pwa-assets.config.ts`:

```ts
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({ preset, images: ['public/icona.svg'] })
```

Run: `npm run icone`
Expected: i PNG e `favicon.ico` in `public/`. Aprire `public/pwa-512x512.png` e controllare che il torii sia centrato e non tagliato.

- [ ] **Step 2: Service worker e manifest in `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/jap-itinerario/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icona.svg'],
      manifest: {
        name: 'Giappone 2027',
        short_name: 'Giappone',
        description: 'Itinerario e compagno di viaggio per il Giappone',
        lang: 'it',
        start_url: '/jap-itinerario/#/oggi',
        scope: '/jap-itinerario/',
        display: 'standalone',
        background_color: '#F6F1E7',
        theme_color: '#F6F1E7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('basemaps.cartocdn.com'),
            handler: 'CacheFirst',
            options: { cacheName: 'mappe', expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 90 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'upload.wikimedia.org',
            handler: 'CacheFirst',
            options: { cacheName: 'foto', expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 180 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
```

Il meteo e le ricerche delle foto sono già in `localStorage` (Task 8): non servono cache del service worker per loro.

- [ ] **Step 3: Icone in `index.html` e memoria persistente in `main.tsx`**

In `index.html`, dentro `<head>` dopo `<title>`:

```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/icona.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

(Vite riscrive i percorsi con la `base` in fase di build.)

In `src/main.tsx`, prima di `createRoot`:

```ts
// Chiede al browser di non cancellare i dati quando lo spazio scarseggia.
void navigator.storage?.persist?.()
```

- [ ] **Step 4: Build e prova offline**

Run: `npm test && npm run build && npm run preview -- --port 4173`
Expected: test verdi, `dist/sw.js` e `dist/manifest.webmanifest` presenti.

Nel browser di preview su `http://localhost:4173/jap-itinerario/` (375×812):
1. Aprire Oggi, Programma G1 e G8 (per mettere in cache foto e mappe), Mappa G8.
2. In DevTools → Application: service worker attivo, manifest senza errori, icone visibili.
3. Simulare offline e ricaricare: l'app si apre, i giorni e le foto già viste ci sono, la mappa mostra le tile già viste, il meteo mostra il clima tipico o l'ultimo dato. Nessuna schermata bianca, nessun errore bloccante in console.
4. Tornare online.

- [ ] **Step 5: Prova completa a misura di telefono**

Seguire tutto `docs/PROVA-FASE-1.md` (step 6) nel browser di preview, in tema chiaro e scuro, a 375×812; controllare anche che a 375 px nessuna schermata scorra in orizzontale. Correggere quello che non va prima di proseguire, con un commit per ogni correzione.

- [ ] **Step 6: Documenti per l'utente**

`docs/PROVA-FASE-1.md`:

```markdown
# Fase 1 — cosa è cambiato e come provarla

## Novità
- App nuova, installabile sulla Home e funzionante offline, in stile iPhone, con tema chiaro (Washi) e scuro (Notte).
- Itinerario 2027: arrivo l'8 agosto, partenza il 27; sere delle lanterne a Nara (15) e dei falò ad Arashiyama (16); Kurama e Kibune (19); Himeji e Kobe (23). Tolti Koyasan e Hiroshima. Gruppo di 3.
- Oggi: conto alla rovescia; durante il viaggio, cosa c'è adesso e dopo, meteo, avvisi, hotel con scheda per il tassista.
- Programma: tutto modificabile (tappe, orari, luoghi, ordine trascinando, giorni, città, hotel), note personali, tappe fatte o saltate.
- Mappa del giorno o dell'intero viaggio, con posizione e tappe vicine.
- Viaggio: data di partenza, persone, tema, città, backup e importazione, recupero delle modifiche della versione vecchia.

## Da provare sul telefono (iPhone e Android)
1. Aprire https://vitojgallo-dev.github.io/jap-itinerario/ e installarla sulla Home (Viaggio → Come si installa).
2. Aprirla dall'icona. Se compare "Nuova versione", scegliere da cosa partire.
3. Oggi: il conto alla rovescia dice quanti giorni mancano all'8 agosto 2027.
4. Per vedere l'app "durante" il viaggio, aprire nel browser
   https://vitojgallo-dev.github.io/jap-itinerario/?oggi=2027-08-16T10:15#/oggi
   (finge che siano le 10:15 del 16 agosto a Kyoto).
5. Programma → G8: toccare una tappa, segnarla fatta, scrivere una nota; chiudere e riaprire l'app: resta tutto.
6. Programma → Modifica: spostare una tappa trascinando la maniglia, aggiungerne una cercando il luogo, eliminare e annullare.
7. Mappa: toccare un segnaposto; provare il pulsante della posizione.
8. Modalità aereo: l'app si apre lo stesso, con le foto e le mappe già viste.
9. Viaggio → Salva o condividi un backup: mandarlo su WhatsApp agli altri; loro lo aprono con Viaggio → Importa un backup.

## Rimasto da fare (fasi 2 e 3)
- Prenotazioni (voli, hotel, biglietti, QR offline) e spese divise fra voi 3.
- Checklist, frasario, emergenze, guida pratica, calendario .ics.
- Da completare nell'app quando li sapete: aeroporto (Haneda o Narita), hotel di Tokyo per il 25–26 agosto, indirizzi in giapponese degli hotel, date 2027 dei festival di fine agosto a Tokyo.
```

`README.md`:

```markdown
# Giappone 2027

Itinerario e compagno di viaggio per il Giappone, 8–27 agosto 2027.
App: https://vitojgallo-dev.github.io/jap-itinerario/

## Sviluppo

    npm install
    npm run dev          # http://localhost:5173/jap-itinerario/
    npm test
    npm run build

L'itinerario di partenza si rigenera con `npm run genera-base` (legge la vecchia app in `legacy/` e applica `scripts/revisione-2027.ts`). Le modifiche fatte dall'app restano sul telefono e non toccano questo file.

Per provare l'app "durante" il viaggio: `?oggi=2027-08-16T10:15` nell'indirizzo.

Pubblicazione: ogni push su `main` viene compilato e pubblicato da GitHub Actions (`.github/workflows/pubblica.yml`).
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Offline e installabile: service worker, manifest, icone; guida di prova della fase 1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Pubblicazione (serve l'utente)**

Questi passi sono visibili a tutti e vanno **confermati dall'utente** prima di farli:

1. L'utente apre https://github.com/vitojgallo-dev/jap-itinerario/settings/pages e imposta **Source: GitHub Actions**. Finché la sorgente resta "Deploy from a branch", il sito servirebbe l'`index.html` sorgente di Vite e resterebbe vuoto.
2. Con il suo ok: `git push -u origin nuova-app`, poi merge su `main` (pull request o `git checkout main && git merge --ff-only nuova-app && git push`).
3. Controllare l'esecuzione del workflow "Pubblica" in *Actions*: `build` e `deploy` verdi.
4. Aprire il sito pubblicato a 375×812 e ripetere i punti 3–5 di `docs/PROVA-FASE-1.md`.
