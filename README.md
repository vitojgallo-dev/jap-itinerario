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

Le icone delle scorciatoie (tenendo premuta l'icona su Android) si rigenerano con `npm run icone-scorciatoie`.

## Cosa fa

- **Oggi**: conto alla rovescia, adesso e dopo, meteo, avvisi (anche sulle chiusure), l'hotel della notte con la scheda per il tassista, la card "Prossimo" nelle 24 ore, lo schermo sempre acceso.
- **Programma**: tutto modificabile, orari di apertura (anche da OpenStreetMap), scorri per segnare una tappa fatta, ricerca.
- **Mappa**: del giorno o di tutto il viaggio, con le tappe vicine.
- **Documenti**: voli, hotel, treni e biglietti con codici copiabili, QR e PDF offline, scadenze per prenotare, promemoria sul calendario (`.ics`).
- **Spese**: inserimento in tre tocchi, yen ed euro col cambio della BCE, budget di ogni giorno, chi deve a chi.
- **Impostazioni** (ingranaggio in Oggi): viaggio, persone, tema, città, backup con gli allegati, spazio usato.

Tutto resta sul telefono: niente account e niente server. Servizi esterni senza chiave: OpenStreetMap, Open-Meteo, Wikipedia/Commons, Nominatim, Overpass, Frankfurter (BCE). Guide di prova: [fase 1](docs/PROVA-FASE-1.md), [fase 2](docs/PROVA-FASE-2.md).

Pubblicazione: ogni push su `main` viene compilato e pubblicato da GitHub Actions (`.github/workflows/pubblica.yml`).
