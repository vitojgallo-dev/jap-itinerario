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
