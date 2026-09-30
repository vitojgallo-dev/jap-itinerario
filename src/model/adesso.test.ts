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
