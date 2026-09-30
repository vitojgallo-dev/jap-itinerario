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
