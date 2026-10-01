import { expect, test, vi } from 'vitest'
import { leggiCambio, scaricaCambio, URL_CAMBIO } from './cambio'

test('leggiCambio', () => {
  expect(leggiCambio({ amount: 1, base: 'EUR', date: '2027-08-10', rates: { JPY: 162.35 } })).toEqual({ valore: 162.35, data: '2027-08-10' })
  expect(leggiCambio({ date: '2027-08-10', rates: {} })).toBeNull()
  expect(leggiCambio({ date: '2027-08-10', rates: { JPY: -1 } })).toBeNull()
  expect(leggiCambio({ rates: { JPY: 160 } })).toBeNull()
  expect(leggiCambio(null)).toBeNull()
})

test('scaricaCambio: una richiesta alla BCE, null se la rete manca', async () => {
  const prendi = vi.fn().mockResolvedValue({ date: '2027-08-10', rates: { JPY: 162.35 } })
  expect(await scaricaCambio(prendi)).toEqual({ valore: 162.35, data: '2027-08-10' })
  expect(prendi).toHaveBeenCalledTimes(1)
  expect(prendi).toHaveBeenCalledWith(URL_CAMBIO)
  expect(await scaricaCambio(() => Promise.reject(new Error('offline')))).toBeNull()
})

test('scaricaCambio di default: un fetch che si interrompe per il timeout dà null', async () => {
  const fetchFinto = vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError'))
  vi.stubGlobal('fetch', fetchFinto)
  try {
    expect(await scaricaCambio()).toBeNull()
    expect(fetchFinto).toHaveBeenCalledTimes(1)
    expect(fetchFinto.mock.calls[0][0]).toBe(URL_CAMBIO)
    expect(fetchFinto.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
  } finally {
    vi.unstubAllGlobals()
  }
})

test('l\'indirizzo è quello della BCE via Frankfurter, senza chiave', () => {
  expect(URL_CAMBIO).toBe('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=JPY')
})
