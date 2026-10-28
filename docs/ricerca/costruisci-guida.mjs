// Costruisce guida.html da GUIDA.md: la pagina da aprire sul telefono durante il viaggio.
// Uso: node docs/ricerca/costruisci-guida.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const qui = dirname(fileURLToPath(import.meta.url))
const md = readFileSync(join(qui, 'GUIDA.md'), 'utf8')
// Il testo va nella pagina come stringa JSON: niente "</script>" che chiude il tag per sbaglio.
const dati = JSON.stringify(md).replace(/</g, '\\u003c')

const html = `<title>Giappone 2027, la guida</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@600;800&display=swap">
<style>
/* Layout: una colonna di lettura, barra delle sezioni fissa in alto, i giorni come schede con il colore della città (gli stessi dell'app). */
:root {
  --sfondo: #f6f1e7; --superficie: #fffdf8; --superficie-2: #efe8da;
  --testo: #1d1b18; --testo-2: #6b6254; --bordo: rgba(60,40,10,.13);
  --tinta: #c8452c; --tinta-testo: #a93822; --tinta-tenue: #f8e3dd;
  --avviso-sfondo: #fbebd0; --avviso-testo: #6e4200; --segno: #ffe08a;
  --tokyo: #c8452c; --nikko: #1f7f74; --kanazawa: #6f5cab; --kyoto: #a8390b; --osaka: #b86a12; --hakone: #4a6f90;
  --display: 'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', Georgia, serif;
  --corpo: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Hiragino Sans', 'Noto Sans JP', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --sfondo: #0e0f13; --superficie: #1a1c23; --superficie-2: #24262f;
  --testo: #f2f2f5; --testo-2: #a3a6b1; --bordo: rgba(255,255,255,.1);
  --tinta: #ff5a5f; --tinta-testo: #ff7d81; --tinta-tenue: #3a1c20;
  --avviso-sfondo: #3a2a10; --avviso-testo: #ffcf7a; --segno: #6b5410;
  --tokyo: #ff7d81; --nikko: #4cc3b0; --kanazawa: #b3a2f0; --kyoto: #ff8a5c; --osaka: #f4b259; --hakone: #8db3d6;
  color-scheme: dark } }
:root[data-theme="dark"] {
  --sfondo: #0e0f13; --superficie: #1a1c23; --superficie-2: #24262f;
  --testo: #f2f2f5; --testo-2: #a3a6b1; --bordo: rgba(255,255,255,.1);
  --tinta: #ff5a5f; --tinta-testo: #ff7d81; --tinta-tenue: #3a1c20;
  --avviso-sfondo: #3a2a10; --avviso-testo: #ffcf7a; --segno: #6b5410;
  --tokyo: #ff7d81; --nikko: #4cc3b0; --kanazawa: #b3a2f0; --kyoto: #ff8a5c; --osaka: #f4b259; --hakone: #8db3d6;
  color-scheme: dark }

html { scroll-padding-top: calc(env(safe-area-inset-top, 0px) + 112px); }
body { background: var(--sfondo); color: var(--testo); font: 16px/1.6 var(--corpo); -webkit-text-size-adjust: 100%; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--sfondo); }
.guscio { max-width: 720px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 64px; }

.testata { padding-block: 28px 8px; display: grid; gap: 6px; }
.testata .kanji { font-family: var(--display); font-weight: 800; color: var(--tinta-testo); font-size: 15px; letter-spacing: .3em; }
.testata h1 { font-family: var(--display); font-weight: 800; font-size: clamp(30px, 8vw, 44px); line-height: 1.1; margin: 0; text-wrap: balance; }
.testata p { margin: 0; color: var(--testo-2); font-size: 15px; }

.barra { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: color-mix(in srgb, var(--sfondo) 92%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--bordo); margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px))); padding: 10px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px)); display: grid; gap: 8px; }
.cerca { display: flex; gap: 8px; align-items: center; }
.cerca input { flex: 1; min-width: 0; font: inherit; font-size: 16px; padding: 10px 14px; min-height: 44px; border-radius: 12px; border: 1px solid var(--bordo); background: var(--superficie); color: var(--testo); }
.cerca input:focus-visible { outline: 2px solid var(--tinta); outline-offset: 1px; }
.cerca output { font-size: 13px; color: var(--testo-2); white-space: nowrap; font-variant-numeric: tabular-nums; }
.sezioni { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-inline: -2px; padding-inline: 2px; }
.sezioni::-webkit-scrollbar { display: none; }
.sezioni a { flex: none; text-decoration: none; color: var(--testo); background: var(--superficie); border: 1px solid var(--bordo); border-radius: 999px; padding: 8px 14px; font-size: 14px; font-weight: 600; min-height: 36px; display: inline-flex; align-items: center; }
.sezioni a[aria-current="true"] { background: var(--tinta); border-color: var(--tinta); color: #fff; }
:root[data-theme="dark"] .sezioni a[aria-current="true"] { color: #111114; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .sezioni a[aria-current="true"] { color: #111114; } }
.sezioni a:focus-visible { outline: 2px solid var(--tinta); outline-offset: 2px; }

#contenuto h2 { font-family: var(--display); font-weight: 800; font-size: 26px; line-height: 1.2; margin: 44px 0 14px; text-wrap: balance; }
#contenuto h3 { font-size: 18px; line-height: 1.35; margin: 0 0 8px; text-wrap: balance; }
#contenuto h4 { font-size: 15px; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: .06em; color: var(--testo-2); }
#contenuto p, #contenuto li { max-width: 68ch; }
#contenuto ul, #contenuto ol { padding-left: 1.2em; margin: 8px 0; display: grid; gap: 6px; }
#contenuto a { color: var(--tinta-testo); text-underline-offset: 2px; overflow-wrap: anywhere; }
#contenuto strong { font-weight: 700; }
#contenuto hr { border: 0; border-top: 1px solid var(--bordo); margin: 28px 0; }
#contenuto blockquote { margin: 12px 0; padding: 10px 14px; border-radius: 12px; background: var(--avviso-sfondo); color: var(--avviso-testo); }
#contenuto code { font-size: .92em; background: var(--superficie-2); padding: 1px 5px; border-radius: 6px; }
.tabella { overflow-x: auto; margin: 12px 0; border: 1px solid var(--bordo); border-radius: 12px; background: var(--superficie); }
.tabella table { border-collapse: collapse; width: 100%; font-size: 14px; min-width: 520px; }
.tabella th, .tabella td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid var(--bordo); }
.tabella th { background: var(--superficie-2); font-weight: 700; }
.tabella tr:last-child td { border-bottom: 0; }
mark { background: var(--segno); color: inherit; border-radius: 3px; padding: 0 1px; }

/* I giorni: scheda con la striscia del colore della città. */
.giorno { background: var(--superficie); border: 1px solid var(--bordo); border-radius: 16px; padding: 16px 16px 12px; margin: 14px 0; border-top: 4px solid var(--citta, var(--tinta)); }
.giorno .etichetta { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--citta, var(--tinta-testo)); margin-bottom: 4px; }
.blocco { min-width: 0; }
.subito ol > li::marker { font-family: var(--display); font-weight: 800; color: var(--tinta-testo); }
.vuoto { text-align: center; color: var(--testo-2); padding: 40px 0; }
.piede { margin-top: 48px; color: var(--testo-2); font-size: 13px; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
</style>

<div class="guscio">
  <header class="testata">
    <span class="kanji">日本 二〇二七</span>
    <h1>Giappone, 8–27 agosto 2027</h1>
    <p>Cosa vedere giorno per giorno, dove dormire, i negozi giusti e cosa prenotare quando. Ricerca del 28 ottobre 2026: prezzi e orari 2027 non ancora pubblicati.</p>
  </header>
  <div class="barra">
    <label class="cerca" for="filtro">
      <input id="filtro" type="search" placeholder="Cerca: bacchette, kimono, Kobe, coltelli…" autocomplete="off" enterkeyhint="search" aria-label="Cerca nella guida">
      <output id="conta" for="filtro"></output>
    </label>
    <nav class="sezioni" id="sezioni" aria-label="Sezioni della guida"></nav>
  </div>
  <main id="contenuto"><p class="vuoto">Carico la guida…</p></main>
  <p class="vuoto" id="nessuno" hidden>Niente per questa ricerca.</p>
  <p class="piede">Fonte: docs/ricerca/GUIDA.md nel repository jap-itinerario. Ogni dato ha il suo link; dove c'è "da verificare" il dato non è confermato.</p>
</div>

<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script>
const MD = ${dati};
// I giorni dell'itinerario: indice → città (stessi colori dell'app).
const CITTA = ['tokyo','tokyo','tokyo','tokyo','nikko','kanazawa','kanazawa','kyoto','kyoto','kyoto','kyoto','kyoto','osaka','osaka','osaka','osaka','hakone','tokyo','tokyo','tokyo'];
const NOMI = { tokyo: 'Tokyo', nikko: 'Nikko', kanazawa: 'Kanazawa', kyoto: 'Kyoto · Nara', osaka: 'Osaka · Himeji · Kobe', hakone: 'Hakone' };
const BREVI = { 'Le 12 cose da sapere subito': 'Subito', 'Itinerario ottimizzato': 'Giorni', 'Dove dormire': 'Dormire', 'Negozi e posti per città': 'Negozi', 'Spostamenti e biglietti': 'Treni', 'Calendario prenotazioni': 'Prenota', 'Pratiche': 'Pratiche', 'Fonti': 'Fonti' };
const ANCORE = { 'Le 12 cose da sapere subito': 'subito', 'Itinerario ottimizzato': 'giorni', 'Dove dormire': 'dormire', 'Negozi e posti per città': 'negozi', 'Spostamenti e biglietti': 'treni', 'Calendario prenotazioni': 'prenota', 'Pratiche': 'pratiche', 'Fonti': 'fonti' };
const norm = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();

function costruisci() {
  const main = document.getElementById('contenuto');
  let html = '';
  try { html = window.marked ? marked.parse(MD) : '<pre>' + MD.replace(/[&<]/g, c => c === '&' ? '&amp;' : '&lt;') + '</pre>'; }
  catch (e) { html = '<pre>' + MD.replace(/[&<]/g, c => c === '&' ? '&amp;' : '&lt;') + '</pre>'; }
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  tmp.querySelector('h1')?.remove();
  tmp.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  tmp.querySelectorAll('table').forEach(t => { const w = document.createElement('div'); w.className = 'tabella'; t.replaceWith(w); w.append(t); });

  // Raggruppa: ogni h2 apre una sezione; dentro, ogni h3 apre un blocco (i giorni diventano schede).
  main.textContent = '';
  let sezione = null, blocco = null, nomeSez = '';
  const nav = document.getElementById('sezioni');
  const apriBlocco = (cls) => { blocco = document.createElement('div'); blocco.className = 'blocco' + (cls ? ' ' + cls : ''); (sezione || main).append(blocco); };
  for (const n of [...tmp.childNodes]) {
    if (n.nodeName === 'H2') {
      nomeSez = n.textContent.trim();
      sezione = document.createElement('section');
      sezione.id = ANCORE[nomeSez] || norm(nomeSez).replace(/[^a-z0-9]+/g, '-');
      if (sezione.id === 'subito') sezione.classList.add('subito');
      sezione.append(n); main.append(sezione); apriBlocco();
      const a = document.createElement('a'); a.href = '#' + sezione.id; a.textContent = BREVI[nomeSez] || nomeSez; nav.append(a);
      continue;
    }
    if (n.nodeName === 'H3') {
      const m = nomeSez === 'Itinerario ottimizzato' && n.textContent.match(/^G(\\d+)/);
      if (m) {
        apriBlocco('giorno'); const c = CITTA[+m[1]] || 'tokyo';
        blocco.style.setProperty('--citta', 'var(--' + c + ')');
        blocco.id = 'g' + m[1];
        const e = document.createElement('span'); e.className = 'etichetta'; e.textContent = NOMI[c]; blocco.append(e);
      } else apriBlocco();
      blocco.append(n); continue;
    }
    if (n.nodeName === 'HR' && sezione) continue;
    if (!blocco) apriBlocco();
    blocco.append(n);
  }
  for (const b of main.querySelectorAll('.blocco')) b.dataset.testo = norm(b.textContent);
  osservaSezioni();
  const h = location.hash.slice(1); if (h) document.getElementById(h)?.scrollIntoView();
}

function osservaSezioni() {
  const links = [...document.querySelectorAll('#sezioni a')];
  const segna = id => links.forEach(a => { const s = a.getAttribute('href') === '#' + id; a.setAttribute('aria-current', s ? 'true' : 'false'); if (s) a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) segna(v.target.id); }, { rootMargin: '-120px 0px -60% 0px' });
  document.querySelectorAll('#contenuto section').forEach(s => io.observe(s));
}

// Ricerca: lascia visibili solo i blocchi che contengono tutte le parole, ed evidenzia le parole.
function togliSegni(root) { root.querySelectorAll('mark').forEach(m => m.replaceWith(m.textContent)); root.normalize(); }
function segnaParole(root, parole) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodi = []; while (w.nextNode()) nodi.push(w.currentNode);
  for (const t of nodi) {
    const s = t.nodeValue, n = norm(s); let pos = []; for (const p of parole) { let i = n.indexOf(p); while (i !== -1) { pos.push([i, i + p.length]); i = n.indexOf(p, i + p.length); } }
    if (!pos.length || s.length !== n.length) continue;
    pos.sort((a, b) => a[0] - b[0]); const f = document.createDocumentFragment(); let k = 0;
    for (const [a, b] of pos) { if (a < k) continue; f.append(s.slice(k, a)); const m = document.createElement('mark'); m.textContent = s.slice(a, b); f.append(m); k = b; }
    f.append(s.slice(k)); t.replaceWith(f);
  }
}
let attesa;
function filtra() {
  const q = norm(document.getElementById('filtro').value.trim()); const parole = q.split(/\\s+/).filter(p => p.length > 1);
  const main = document.getElementById('contenuto'); togliSegni(main); let visti = 0;
  for (const b of main.querySelectorAll('.blocco')) { const ok = !parole.length || parole.every(p => b.dataset.testo.includes(p)); b.hidden = !ok; if (ok && parole.length) { visti++; segnaParole(b, parole); } }
  for (const s of main.querySelectorAll('section')) s.hidden = parole.length > 0 && !s.querySelector('.blocco:not([hidden])');
  document.getElementById('conta').textContent = parole.length ? visti + (visti === 1 ? ' blocco' : ' blocchi') : '';
  document.getElementById('nessuno').hidden = !(parole.length && visti === 0);
}
document.getElementById('filtro').addEventListener('input', () => { clearTimeout(attesa); attesa = setTimeout(filtra, 150); });
costruisci();
</script>
`
writeFileSync(join(qui, 'guida.html'), html)
console.log('guida.html', html.length, 'byte')
