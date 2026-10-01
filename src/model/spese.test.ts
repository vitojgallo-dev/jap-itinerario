import { describe, expect, test } from 'vitest'
import { spesaDiProva as s, viaggioDiProva } from './fixture'
import * as sp from './spese'

const persone = [{ id: 'p1', nome: 'Vito' }, { id: 'p2', nome: 'Anna' }, { id: 'p3', nome: 'Luca' }]

describe('saldi', () => {
  test('due persone, divisa a metà', () => {
    expect(sp.saldi(persone.slice(0, 2), [s({ id: 'a', importo: 3000, pagatoDa: 'p1', divisaFra: ['p1', 'p2'] })])).toEqual({ p1: 1500, p2: -1500 })
  })
  test('tre persone: il resto dello yen va ai primi dell\'elenco', () => {
    expect(sp.saldi(persone, [s({ id: 'a', importo: 1000, pagatoDa: 'p1', divisaFra: ['p1', 'p2', 'p3'] })])).toEqual({ p1: 666, p2: -333, p3: -333 })
  })
  test('valute miste: gli euro diventano yen col cambio della spesa', () => {
    const r = sp.saldi(persone, [
      s({ id: 'a', importo: 10, valuta: 'EUR', cambio: 160, pagatoDa: 'p1', divisaFra: ['p1', 'p2'] }),
      s({ id: 'b', importo: 1000, pagatoDa: 'p2', divisaFra: ['p1', 'p2', 'p3'] }),
    ])
    expect(r).toEqual({ p1: 466, p2: -133, p3: -333 })
  })
  test('divisione parziale: chi paga può non essere fra chi divide', () => {
    expect(sp.saldi(persone, [s({ id: 'a', importo: 900, pagatoDa: 'p1', divisaFra: ['p2', 'p3'] })])).toEqual({ p1: 900, p2: -450, p3: -450 })
  })
  test('gli euro con i centesimi si arrotondano allo yen', () => {
    // 12,35 € × 161,27 = 1991,68 → 1992 ¥
    expect(sp.saldi(persone.slice(0, 2), [s({ id: 'a', importo: 12.35, valuta: 'EUR', cambio: 161.27, pagatoDa: 'p2', divisaFra: ['p1', 'p2'] })])).toEqual({ p1: -996, p2: 996 })
  })
  test('una persona rinominata non cambia i saldi: contano gli id', () => {
    const spese = [s({ id: 'a', importo: 3000, pagatoDa: 'p1', divisaFra: ['p1', 'p2', 'p3'] })]
    const rinominate = persone.map(p => (p.id === 'p2' ? { ...p, nome: 'Anna Maria' } : p))
    expect(sp.saldi(rinominate, spese)).toEqual(sp.saldi(persone, spese))
  })
})

describe('rimborsiMinimi', () => {
  test('due debitori verso un creditore', () => {
    expect(sp.rimborsiMinimi({ p1: 466, p2: -133, p3: -333 })).toEqual([
      { da: 'p3', a: 'p1', yen: 333 },
      { da: 'p2', a: 'p1', yen: 133 },
    ])
  })
  test('un debitore verso due creditori', () => {
    expect(sp.rimborsiMinimi({ p1: 700, p2: 300, p3: -1000 })).toEqual([
      { da: 'p3', a: 'p1', yen: 700 },
      { da: 'p3', a: 'p2', yen: 300 },
    ])
  })
  test('pari: nessun rimborso', () => {
    expect(sp.rimborsiMinimi({ p1: 0, p2: 0 })).toEqual([])
  })
  test('segnare i rimborsi suggeriti azzera i saldi', () => {
    const spese = [
      s({ id: 'a', importo: 1000, pagatoDa: 'p1', divisaFra: ['p1', 'p2', 'p3'] }),
      s({ id: 'b', importo: 10, valuta: 'EUR', cambio: 160, pagatoDa: 'p2', divisaFra: ['p2', 'p3'] }),
    ]
    const rimborsi = sp.rimborsiMinimi(sp.saldi(persone, spese))
    const dopo = [...spese, ...rimborsi.map(r => sp.spesaRimborso(r, '2027-08-12', 160))]
    expect(Object.values(sp.saldi(persone, dopo))).toEqual([0, 0, 0])
  })
  test('il rimborso è una spesa "altro" divisa col solo creditore', () => {
    const r = sp.spesaRimborso({ da: 'p2', a: 'p1', yen: 1500 }, '2027-08-12', 161)
    expect(r).toMatchObject({ data: '2027-08-12', importo: 1500, valuta: 'JPY', cambio: 161, categoria: 'altro', descrizione: 'Rimborso', pagatoDa: 'p2', divisaFra: ['p1'], rimborso: true })
    expect(r.id).toMatch(/^s-/)
  })
})

describe('riepilogoSpese', () => {
  const spese = [
    s({ id: 'a', data: '2027-08-10', importo: 3000, categoria: 'cibo', pagatoDa: 'p1', divisaFra: ['p1', 'p2', 'p3'], metodo: 'contanti' }),
    s({ id: 'b', data: '2027-08-11', importo: 20, valuta: 'EUR', cambio: 160, categoria: 'trasporti', pagatoDa: 'p2', divisaFra: ['p1', 'p2'], metodo: 'carta' }),
    s({ id: 'c', data: '2027-08-11', importo: 500, categoria: 'cibo', pagatoDa: 'p3', divisaFra: ['p3'], metodo: 'contanti' }),
    s({ id: 'r', data: '2027-08-11', importo: 1000, categoria: 'altro', descrizione: 'Rimborso', pagatoDa: 'p2', divisaFra: ['p1'], rimborso: true }),
  ]
  test('totali in yen ed euro, quote e metodi, senza i rimborsi', () => {
    const r = sp.riepilogoSpese(spese)
    expect(r.yen).toBe(6700)
    expect(r.euro).toBeCloseTo(3000 / 160 + 20 + 500 / 160, 6)
    expect(r.quote).toEqual({ p1: 2600, p2: 2600, p3: 1500 })
    expect(r.perMetodo).toEqual({ contanti: 3500, carta: 3200 })
  })
  test('per categoria e per giorno, dal più recente', () => {
    const r = sp.riepilogoSpese(spese)
    expect(r.perCategoria).toEqual([{ categoria: 'cibo', yen: 3500 }, { categoria: 'trasporti', yen: 3200 }])
    expect(r.perGiorno.map(g => [g.data, g.yen, g.spese.map(x => x.id)])).toEqual([
      ['2027-08-11', 3700, ['r', 'c', 'b']],
      ['2027-08-10', 3000, ['a']],
    ])
  })
  test('niente spese: tutto a zero', () => {
    expect(sp.riepilogoSpese([])).toEqual({ yen: 0, euro: 0, quote: {}, perMetodo: { contanti: 0, carta: 0 }, perCategoria: [], perGiorno: [] })
  })
})

describe('inserimento', () => {
  test('dataPredefinita: oggi a Tokyo, o G0 prima della partenza', () => {
    const v = viaggioDiProva()
    expect(sp.dataPredefinita(v, new Date('2027-08-09T23:30:00+09:00'))).toBe('2027-08-09')
    expect(sp.dataPredefinita(v, new Date('2027-08-09T15:30:00Z'))).toBe('2027-08-10')
    expect(sp.dataPredefinita(v, new Date('2026-10-01T12:00:00+09:00'))).toBe('2027-08-08')
  })
  test('nuovaSpesa ricorda le ultime scelte (non i rimborsi) e divide fra tutti', () => {
    const v = viaggioDiProva({
      persone,
      spese: [s({ id: 'a', pagatoDa: 'p2', categoria: 'trasporti', valuta: 'EUR', metodo: 'carta' }), s({ id: 'r', pagatoDa: 'p3', rimborso: true, categoria: 'altro' })],
      impostazioni: { tema: 'auto', ultimoCambio: { valore: 162, data: '2027-08-09' } },
    })
    const n = sp.nuovaSpesa(v, new Date('2027-08-10T12:00:00+09:00'))
    expect(n).toMatchObject({ data: '2027-08-10', importo: 0, pagatoDa: 'p2', categoria: 'trasporti', valuta: 'EUR', metodo: 'carta', divisaFra: ['p1', 'p2', 'p3'], cambio: 162, descrizione: '' })
    expect(n.id).toMatch(/^s-/)
  })
  test('senza spese: la prima persona, cibo, yen, contanti, cambio da chiedere', () => {
    const n = sp.nuovaSpesa(viaggioDiProva({ persone }), new Date('2027-08-10T12:00:00+09:00'))
    expect(n).toMatchObject({ pagatoDa: 'p1', categoria: 'cibo', valuta: 'JPY', metodo: 'contanti', cambio: 0 })
  })
  test('cambioDaUsare: il manuale vince sull\'ultimo scaricato', () => {
    expect(sp.cambioDaUsare({ tema: 'auto' })).toBeNull()
    expect(sp.cambioDaUsare({ tema: 'auto', ultimoCambio: { valore: 162, data: '2027-08-09' } })).toBe(162)
    expect(sp.cambioDaUsare({ tema: 'auto', cambioManuale: 150, ultimoCambio: { valore: 162, data: '2027-08-09' } })).toBe(150)
  })
  test('controllaSpesa', () => {
    expect(sp.controllaSpesa(s({ id: 'a' }))).toEqual([])
    expect(sp.controllaSpesa(s({ id: 'a', importo: 0, divisaFra: [], cambio: 0 }))).toEqual([
      'Scrivi un importo maggiore di zero.',
      'Scegli almeno una persona con cui dividere.',
      'Serve il cambio: scrivi quanti yen vale 1 euro.',
    ])
  })
  test('leggiImporto accetta la virgola', () => {
    expect(sp.leggiImporto('12,50')).toBe(12.5)
    expect(sp.leggiImporto(' 1500 ')).toBe(1500)
    expect(sp.leggiImporto('1.234,5')).toBe(1234.5)
    expect(sp.leggiImporto('12.5')).toBe(12.5)
    expect(sp.leggiImporto('')).toBeNull()
    expect(sp.leggiImporto('boh')).toBeNull()
  })
  test('aggiungi, sostituisci, elimina', () => {
    const v = viaggioDiProva({ spese: [s({ id: 'a' })] })
    const conB = sp.aggiungiSpesa(v, s({ id: 'b' }))
    expect(conB.spese.map(x => x.id)).toEqual(['a', 'b'])
    expect(sp.sostituisciSpesa(conB, s({ id: 'a', importo: 5 })).spese[0].importo).toBe(5)
    expect(sp.eliminaSpesa(conB, 'a').spese.map(x => x.id)).toEqual(['b'])
    expect(() => sp.sostituisciSpesa(v, s({ id: 'z' }))).toThrow('spesa z')
  })
})

test('formati degli importi', () => {
  expect(sp.formatoYen(1234567)).toBe('1.234.567 ¥')
  expect(sp.formatoYen(-333.4)).toBe('-333 ¥')
  expect(sp.formatoYen(999)).toBe('999 ¥')
  expect(sp.formatoEuro(12.5)).toBe('12,50 €')
  expect(sp.formatoEuro(1234.567)).toBe('1.234,57 €')
  expect(sp.formatoImporto(900, 'JPY')).toBe('900 ¥')
  expect(sp.formatoImporto(9, 'EUR')).toBe('9,00 €')
  expect(sp.formatoNumero(162.35)).toBe('162,35')
  expect(sp.formatoNumero(160)).toBe('160')
})
