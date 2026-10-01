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
