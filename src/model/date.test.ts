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
