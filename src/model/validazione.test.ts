import { expect, test } from 'vitest'
import { giornoDiProva, tappaDiProva, viaggioDiProva } from './fixture'
import { validaViaggio } from './validazione'

test('accetta un viaggio corretto', () => {
  expect(validaViaggio(viaggioDiProva()).ok).toBe(true)
})

test('rifiuta cose che non sono un viaggio', () => {
  expect(validaViaggio(null).ok).toBe(false)
  expect(validaViaggio({ cities: [] }).ok).toBe(false)
  expect(validaViaggio({ ...viaggioDiProva(), versione: 3 }).ok).toBe(false)
})

test('elenca gli errori interni', () => {
  const v = viaggioDiProva({
    dataPartenza: '8 agosto',
    giorni: [
      giornoDiProva({ id: 'g0', cittaId: 'marte', tappe: [tappaDiProva({ id: 'a', ora: '8:00' })] }),
      giornoDiProva({ id: 'g0', tappe: [tappaDiProva({ id: 'a', stato: 'boh' as never, tipo: 'x' as never })] }),
    ],
  })
  const r = validaViaggio(v)
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.errori).toEqual(expect.arrayContaining([
      'dataPartenza non valida: 8 agosto',
      'giorno g0: città "marte" inesistente',
      'id giorno duplicato: g0',
      'tappa a: ora non valida "8:00"',
      'id tappa duplicato: a',
      'tappa a: stato non valido "boh"',
      'tappa a: tipo non valido "x"',
    ]))
  }
})
