import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { leggiLegacy } from '../../scripts/legacy'
import { migraV1, pulisciIntro, tipoDaTitolo } from './migrazioneV1'
import { validaViaggio } from './validazione'

const html = readFileSync(new URL('../../legacy/index-v1.html', import.meta.url), 'utf8')
const { dati, extra } = leggiLegacy(html)
const v = migraV1(dati, extra, { dataPartenza: '2027-08-09' })

describe('migraV1 sui dati veri della vecchia app', () => {
  test('è un viaggio valido', () => {
    const r = validaViaggio(v)
    expect(r.ok ? [] : r.errori).toEqual([])
  })
  test('città uniche, giorni in ordine', () => {
    expect(v.citta.map(c => c.id)).toEqual(['tokyo', 'nikko', 'kanazawa', 'kyoto', 'koyasan', 'osaka', 'hiroshima', 'hakone'])
    expect(v.giorni.map(g => g.id)).toEqual(Array.from({ length: 18 }, (_, i) => `g${i + 1}`))
    expect(v.giorni[16].cittaId).toBe('tokyo')
  })
  test('tappe con ora, luogo e coordinate', () => {
    expect(v.giorni.flatMap(g => g.tappe)).toHaveLength(115)
    const prima = v.giorni[0].tappe[0]
    expect(prima.ora).toBe('08:00')
    expect(prima.luogo).toMatchObject({ query: 'Asakusa View Hotel Tokyo', lat: 35.7146 })
    expect(prima.spostamento?.modo).toBe('piedi')
  })
  test('biglietti', () => {
    const tutte = v.giorni.flatMap(g => g.tappe)
    expect(tutte.find(t => t.luogo?.query === 'Tokyo Skytree')?.biglietti).toEqual({ link: 'https://www.tokyo-skytree.jp/' })
    expect(tutte.find(t => t.luogo?.query === 'Nikko Toshogu shrine')?.biglietti).toEqual({ link: null })
  })
  test('alloggi, consigli, suggerimenti, cene speciali, intro', () => {
    expect(v.giorni[0].alloggio).toMatchObject({ nome: 'Asakusa View Hotel', lat: 35.7146 })
    expect(v.giorni[16].alloggio).toBeNull()
    expect(v.giorni[3].consigli).toHaveLength(3)
    expect(v.giorni.flatMap(g => g.suggerimenti)).toHaveLength(101)
    expect(v.giorni[2].speciale?.opzioni).toHaveLength(3)
    expect(v.citta[0].intro).not.toContain('{.underline}')
    expect(v.giorni[16].intro).toMatch(/^Rientro nella capitale/)
  })
})

test('tipoDaTitolo', () => {
  expect(tipoDaTitolo('Pranzo a Solamachi')).toBe('cibo')
  expect(tipoDaTitolo('Colazione in hotel + partenza')).toBe('cibo')
  expect(tipoDaTitolo('Partenza per Nara')).toBe('spostamento')
  expect(tipoDaTitolo('Arrivo e check-in al monastero')).toBe('spostamento')
  expect(tipoDaTitolo('Senso-ji')).toBe('visita')
})

test('pulisciIntro toglie il link markdown rotto', () => {
  expect(pulisciIntro('Base: X. Bello. 📍 [[X]{.underline}](https://maps)')).toBe('Base: X. Bello.')
})
