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
