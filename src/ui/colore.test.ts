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
