import { describe, expect, test, vi } from 'vitest'
import { descriviCodice, leggiMeteo, meteoDelGiorno, previsioneDisponibile, urlMeteo } from './meteo'

const risposta = {
  daily: { time: ['2027-08-16'], weather_code: [2], temperature_2m_max: [34.6], temperature_2m_min: [24.2], precipitation_probability_max: [10] },
}

test('leggiMeteo', () => {
  expect(leggiMeteo(risposta)).toEqual({ data: '2027-08-16', codice: 2, max: 35, min: 24, pioggia: 10 })
  expect(leggiMeteo({ daily: { time: [] } })).toBeNull()
  expect(leggiMeteo({})).toBeNull()
})

test('descriviCodice', () => {
  expect(descriviCodice(0)).toEqual({ etichetta: 'Sereno', icona: 'sereno' })
  expect(descriviCodice(2).icona).toBe('poco-nuvoloso')
  expect(descriviCodice(63).icona).toBe('pioggia')
  expect(descriviCodice(81).etichetta).toBe('Rovesci')
  expect(descriviCodice(95).icona).toBe('temporale')
})

test('previsioneDisponibile: da oggi a 15 giorni', () => {
  expect(previsioneDisponibile('2027-08-16', '2027-08-16')).toBe(true)
  expect(previsioneDisponibile('2027-08-31', '2027-08-16')).toBe(true)
  expect(previsioneDisponibile('2027-09-01', '2027-08-16')).toBe(false)
  expect(previsioneDisponibile('2027-08-15', '2027-08-16')).toBe(false)
})

test('urlMeteo chiede i dati giornalieri in ora di Tokyo', () => {
  expect(urlMeteo(35.01, 135.77, '2027-08-16')).toBe(
    'https://api.open-meteo.com/v1/forecast?latitude=35.01&longitude=135.77&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&start_date=2027-08-16&end_date=2027-08-16',
  )
})

describe('meteoDelGiorno', () => {
  const memoria = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
  }
  const ORA = Date.parse('2027-08-16T08:00:00+09:00')

  test('scarica e salva', async () => {
    const storage = memoria()
    const prendi = vi.fn().mockResolvedValue(risposta)
    const r = await meteoDelGiorno(35.01, 135.77, '2027-08-16', '2027-08-16', { prendi, storage, ora: ORA })
    expect(r).toEqual({ meteo: expect.objectContaining({ max: 35 }), salvato: ORA })
    const di = await meteoDelGiorno(35.01, 135.77, '2027-08-16', '2027-08-16', { prendi, storage, ora: ORA + 60_000 })
    expect(di?.salvato).toBe(ORA)
    expect(prendi).toHaveBeenCalledTimes(1)
  })
  test('offline: restituisce il dato vecchio', async () => {
    const storage = memoria()
    await meteoDelGiorno(35.01, 135.77, '2027-08-16', '2027-08-16', { prendi: async () => risposta, storage, ora: ORA })
    const r = await meteoDelGiorno(35.01, 135.77, '2027-08-16', '2027-08-16', { prendi: () => Promise.reject(new Error('offline')), storage, ora: ORA + 5 * 3_600_000 })
    expect(r?.salvato).toBe(ORA)
  })
  test('troppo lontano: niente richiesta', async () => {
    const prendi = vi.fn()
    expect(await meteoDelGiorno(35, 135, '2027-08-16', '2026-09-30', { prendi, storage: memoria(), ora: ORA })).toBeNull()
    expect(prendi).not.toHaveBeenCalled()
  })
})
