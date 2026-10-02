import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import base from '../data/itinerario-base.json'
import { SFONDO, SUPERFICI, calcolaTinta, contrasto, testoSu } from './colore'

test('contrasto WCAG', () => {
  expect(contrasto('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
  expect(contrasto('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
})

const colori = [...base.citta.map(c => c.colore), '#F4A259', '#FFD166', '#4A7C99', '#8E8E93', '#C1440E', '#1D3557', '#8E7CC3']

test.each(colori)('la tinta %s è leggibile in entrambi i temi', hex => {
  for (const tema of ['chiaro', 'scuro'] as const) {
    const t = calcolaTinta(hex, tema)
    expect(contrasto(t.forte, t.suForte)).toBeGreaterThanOrEqual(4.5)
    for (const fondo of [SFONDO[tema], SUPERFICI[tema].card, SUPERFICI[tema].barra, t.tenue]) {
      expect(contrasto(t.testo, fondo), `testo su ${fondo}`).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test('testoSu sceglie bianco o quasi nero', () => {
  expect(testoSu('#1D3557')).toBe('#FFFFFF')
  expect(testoSu('#FFD166')).toBe('#111114')
})

/** I valori di tema.css, letti dal file: il test segue i colori veri e non una copia. */
function variabiliDelTema(tema: 'chiaro' | 'scuro'): Record<string, string> {
  const css = readFileSync(new URL('./tema.css', import.meta.url), 'utf8')
  const inizio = css.indexOf(tema === 'scuro' ? ":root[data-tema='scuro']" : ':root,')
  const blocco = css.slice(inizio, css.indexOf('}', inizio))
  return Object.fromEntries([...blocco.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(m => [m[1], m[2]]))
}

test.each(['chiaro', 'scuro'] as const)('il testo su --successo (spunta "fatta", tema %s) resta sopra 4.5:1', tema => {
  const v = variabiliDelTema(tema)
  expect(v['--successo'], 'colore di riempimento letto da tema.css').toBeDefined()
  expect(v['--su-successo'], 'colore del testo letto da tema.css').toBeDefined()
  expect(contrasto(v['--su-successo'], v['--successo'])).toBeGreaterThanOrEqual(4.5)
})
