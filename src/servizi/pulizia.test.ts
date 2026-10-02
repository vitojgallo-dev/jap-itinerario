import { describe, expect, test } from 'vitest'
import { prenotazioneDiProva as p, viaggioDiProva } from '../model/fixture'
import type { Viaggio } from '../model/tipi'
import { CHIAVE_SCARTATO, CHIAVE_VIAGGIO } from '../store/avvio'
import type { ArchivioAllegati } from './allegati'
import { pulisciQuandoNonAnnullabile, spazzaOrfani, type NegozioAnnullabile } from './pulizia'

const con = (...ids: string[]) =>
  viaggioDiProva({ prenotazioni: [p({ id: 'pr', allegati: ids.map(id => ({ id, nome: id, mime: 'image/jpeg', byte: 1 })) })] })

/** Uno store finto con la stessa logica di `applicaAnnullabile`/`applica`/`annulla`. */
function negozioFinto(iniziale: Viaggio) {
  let stato: { viaggio: Viaggio; precedente: Viaggio | null } = { viaggio: iniziale, precedente: null }
  const ascoltatori = new Set<(s: typeof stato) => void>()
  const imposta = (s: typeof stato) => { stato = s; [...ascoltatori].forEach(a => a(stato)) }
  const negozio: NegozioAnnullabile = {
    getState: () => stato,
    subscribe: a => { ascoltatori.add(a); return () => { ascoltatori.delete(a) } },
  }
  return {
    negozio,
    ascoltatori,
    annullabile: (v: Viaggio) => { const prima = stato.viaggio; imposta({ viaggio: v, precedente: prima }); return prima },
    applica: (v: Viaggio) => imposta({ viaggio: v, precedente: null }),
    annulla: () => { if (stato.precedente) imposta({ viaggio: stato.precedente, precedente: null }) },
  }
}

function archivioFinto(ids: string[], conChiavi = true) {
  const m = new Set(ids)
  const archivio: ArchivioAllegati = {
    leggi: async () => undefined,
    scrivi: async id => { m.add(id) },
    elimina: async id => { m.delete(id) },
    ...(conChiavi ? { chiavi: async () => [...m] } : {}),
  }
  return { archivio, m }
}
const ferma = () => new Promise(r => setTimeout(r, 0))

describe('pulisciQuandoNonAnnullabile', () => {
  test('non cancella finché la modifica si può annullare, poi sì', async () => {
    const { archivio, m } = archivioFinto(['a', 'b'])
    const s = negozioFinto(con('a', 'b'))
    const prima = s.annullabile(viaggioDiProva())
    pulisciQuandoNonAnnullabile(['a', 'b'], prima, s.negozio, archivio)
    await ferma()
    expect([...m]).toEqual(['a', 'b'])
    s.applica(viaggioDiProva({ titolo: 'altro' }))
    await ferma()
    expect([...m]).toEqual([])
    expect(s.ascoltatori.size).toBe(0)
  })

  test('dopo un Annulla i riferimenti ripristinati proteggono i file', async () => {
    const { archivio, m } = archivioFinto(['a', 'b'])
    const s = negozioFinto(con('a', 'b'))
    const prima = s.annullabile(viaggioDiProva())
    pulisciQuandoNonAnnullabile(['a', 'b'], prima, s.negozio, archivio)
    s.annulla()
    await ferma()
    expect([...m]).toEqual(['a', 'b'])
    expect(s.ascoltatori.size).toBe(0)
  })

  test('una nuova modifica annullabile chiude la finestra della prima', async () => {
    const { archivio, m } = archivioFinto(['a'])
    const s = negozioFinto(con('a'))
    const prima = s.annullabile(viaggioDiProva())
    pulisciQuandoNonAnnullabile(['a'], prima, s.negozio, archivio)
    s.annullabile(viaggioDiProva({ titolo: 'seconda' }))
    await ferma()
    expect([...m]).toEqual([])
  })

  test('se non è più annullabile già alla chiamata, pulisce subito; senza id non iscrive niente', async () => {
    const { archivio, m } = archivioFinto(['a'])
    const s = negozioFinto(viaggioDiProva())
    pulisciQuandoNonAnnullabile(['a'], con('a'), s.negozio, archivio)
    await ferma()
    expect([...m]).toEqual([])
    pulisciQuandoNonAnnullabile([], con('a'), s.negozio, archivio)
    expect(s.ascoltatori.size).toBe(0)
  })
})

describe('spazzaOrfani (all\'avvio)', () => {
  const salvato = (v: Viaggio) => JSON.stringify({ state: { viaggio: v, sceltaV1: 'fatta' }, version: 2 })
  const memoria = (voci: Record<string, string> = {}) => ({ getItem: (k: string) => voci[k] ?? null })

  test('toglie i file che il viaggio non usa e tiene gli altri', async () => {
    const v = con('a')
    const { archivio, m } = archivioFinto(['a', 'orfano', 'altro'])
    expect(await spazzaOrfani(v, archivio, memoria({ [CHIAVE_VIAGGIO]: salvato(v) }))).toBe(2)
    expect([...m]).toEqual(['a'])
  })

  test('niente da fare se esiste il salvataggio scartato', async () => {
    const v = con('a')
    const { archivio, m } = archivioFinto(['a', 'orfano'])
    expect(await spazzaOrfani(v, archivio, memoria({ [CHIAVE_VIAGGIO]: salvato(v), [CHIAVE_SCARTATO]: '{}' }))).toBe(0)
    expect([...m]).toEqual(['a', 'orfano'])
  })

  test('niente da fare se il salvataggio in uso non è valido (la copia scartata non si è potuta scrivere)', async () => {
    const { archivio, m } = archivioFinto(['a', 'orfano'])
    expect(await spazzaOrfani(viaggioDiProva(), archivio, memoria({ [CHIAVE_VIAGGIO]: '{"state":{"viaggio":{"rotto":true}}}' }))).toBe(0)
    expect(await spazzaOrfani(viaggioDiProva(), archivio, memoria({ [CHIAVE_VIAGGIO]: 'non è json' }))).toBe(0)
    expect([...m]).toEqual(['a', 'orfano'])
  })

  test('niente da fare se in localStorage non c\'è nessun salvataggio: il viaggio in memoria è quello di base e non dice cosa serve', async () => {
    const { archivio, m } = archivioFinto(['a', 'b'])
    expect(await spazzaOrfani(viaggioDiProva(), archivio, memoria())).toBe(0)
    expect([...m]).toEqual(['a', 'b'])
  })

  test('senza l\'elenco delle chiavi o con storage che lancia non fa niente e non lancia', async () => {
    const senza = archivioFinto(['a'], false)
    expect(await spazzaOrfani(viaggioDiProva(), senza.archivio, memoria())).toBe(0)
    const { archivio, m } = archivioFinto(['a'])
    const rotto = { getItem: () => { throw new Error('storage bloccato') } }
    expect(await spazzaOrfani(viaggioDiProva(), archivio, rotto)).toBe(0)
    expect([...m]).toEqual(['a'])
  })
})
