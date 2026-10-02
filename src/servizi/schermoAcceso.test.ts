import { describe, expect, test, vi } from 'vitest'
import { creaGestoreBlocco, type BloccoSchermo } from './schermoAcceso'

/** Un blocco finto che ricorda se è stato rilasciato; `richiedi` lo consegna solo quando il test lo decide. */
function scenario() {
  const creati: (BloccoSchermo & { rilasciato: boolean })[] = []
  const attese: ((b: BloccoSchermo) => void)[] = []
  const richiedi = vi.fn(() => new Promise<BloccoSchermo>(risolvi => {
    const b = {
      rilasciato: false,
      get released() { return this.rilasciato },
      release: async () => { b.rilasciato = true },
    }
    creati.push(b)
    attese.push(() => risolvi(b))
  }))
  return { creati, consegna: () => attese.shift()!(creati[creati.length - 1]), richiedi }
}
const ferma = () => new Promise(r => setTimeout(r, 0))

describe('creaGestoreBlocco', () => {
  test('due richieste ravvicinate fanno un solo blocco', async () => {
    const s = scenario()
    const g = creaGestoreBlocco(s.richiedi, () => {})
    const a = g.chiedi()
    const b = g.chiedi()
    expect(s.richiedi).toHaveBeenCalledTimes(1)
    s.consegna()
    await Promise.all([a, b])
    await g.chiedi()
    expect(s.richiedi).toHaveBeenCalledTimes(1)
    g.rilascia()
    await ferma()
    expect(s.creati.every(c => c.rilasciato)).toBe(true)
  })

  test('se il sistema ha tolto il blocco, la richiesta successiva ne prende un altro', async () => {
    const s = scenario()
    const g = creaGestoreBlocco(s.richiedi, () => {})
    const a = g.chiedi()
    s.consegna()
    await a
    s.creati[0].rilasciato = true
    const b = g.chiedi()
    s.consegna()
    await b
    expect(s.richiedi).toHaveBeenCalledTimes(2)
  })

  test('rilasciato mentre la richiesta è in corso: il blocco appena nato viene rilasciato subito', async () => {
    const s = scenario()
    const g = creaGestoreBlocco(s.richiedi, () => {})
    const a = g.chiedi()
    g.rilascia()
    s.consegna()
    await a
    await ferma()
    expect(s.creati[0].rilasciato).toBe(true)
    await g.chiedi()
    expect(s.richiedi).toHaveBeenCalledTimes(1)
  })

  test('un rifiuto del sistema avvisa una volta; se nel frattempo è stato rilasciato, tace', async () => {
    const alErrore = vi.fn()
    const g = creaGestoreBlocco(() => Promise.reject(new Error('no')), alErrore)
    await g.chiedi()
    expect(alErrore).toHaveBeenCalledTimes(1)
    await g.chiedi()
    expect(alErrore).toHaveBeenCalledTimes(2)
    g.rilascia()
    await g.chiedi()
    expect(alErrore).toHaveBeenCalledTimes(2)
  })
})
