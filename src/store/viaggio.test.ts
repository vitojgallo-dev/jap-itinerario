import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { spesaDiProva, viaggioDiProva } from '../model/fixture'
import type { StatoApp } from './viaggio'

// Stub localStorage prima di importare il store
const storageMock = new Map<string, string>()
const localStorageStub = {
  getItem: (k: string) => storageMock.get(k) ?? null,
  setItem: (k: string, v: string) => storageMock.set(k, v),
  removeItem: (k: string) => storageMock.delete(k),
  clear: () => storageMock.clear(),
  length: 0,
  key: () => null,
}
vi.stubGlobal('localStorage', localStorageStub)

// Stub sonner.toast
const toastMock = vi.fn()
vi.mock('sonner', () => ({ toast: toastMock }))

// Importa il store dinamicamente DOPO i stub
let useViaggio: typeof import('./viaggio').useViaggio

beforeEach(async () => {
  storageMock.clear()
  toastMock.mockClear()
  // Ricarica il modulo per resettare lo store
  vi.resetModules()
  const module = await import('./viaggio')
  useViaggio = module.useViaggio
})

afterEach(() => {
  vi.clearAllMocks()
})

test('applicaAnnullabile poi annulla ripristina il viaggio precedente', () => {
  let store = useViaggio.getState() as unknown as StatoApp
  const vInitial = store.viaggio
  const v1 = viaggioDiProva({ titolo: 'Modificato' })

  // applicaAnnullabile
  store.applicaAnnullabile(
    () => v1,
    'Test undo'
  )
  store = useViaggio.getState() as unknown as StatoApp
  expect(store.viaggio.titolo).toBe('Modificato')
  expect(store.precedente?.titolo).toBe(vInitial.titolo)
  expect(toastMock).toHaveBeenCalled()

  // annulla
  store.annulla()
  store = useViaggio.getState() as unknown as StatoApp
  expect(store.viaggio.titolo).toBe(vInitial.titolo)
  expect(store.precedente).toBeNull()
})

test('applicaAnnullabile(A) poi applica(B) poi toast onClick lascia B al posto', () => {
  let store = useViaggio.getState() as unknown as StatoApp
  const vA = viaggioDiProva({ titolo: 'A' })
  const vB = viaggioDiProva({ titolo: 'B' })

  // applicaAnnullabile con A
  store.applicaAnnullabile(
    () => vA,
    'Undo A'
  )
  store = useViaggio.getState() as unknown as StatoApp
  expect(store.viaggio.titolo).toBe('A')

  // applica con B (non undoable)
  store.applica(() => vB)
  store = useViaggio.getState() as unknown as StatoApp
  expect(store.viaggio.titolo).toBe('B')
  expect(store.precedente).toBeNull() // IMPORTANTE: applica deve clearare precedente

  // Prendi l'azione dal toast call precedente
  const toastCall = toastMock.mock.calls[0]
  const toastOptions = toastCall[1] as { action: { onClick: () => void } }
  toastOptions.action.onClick()

  // Deve rimanere B perché precedente è già stato clearato da applica
  store = useViaggio.getState() as unknown as StatoApp
  expect(store.viaggio.titolo).toBe('B')
})

test('blob persistito corrotto cede il passo all\'itinerario base', async () => {
  // Metti un viaggio corrotto nel localStorage
  storageMock.set(
    'giappone-viaggio',
    JSON.stringify({
      state: { viaggio: { versione: 99 }, sceltaV1: 'fatta' },
      version: 2,
    })
  )

  // Ricarica il modulo per hydratare con il blob corrotto
  vi.resetModules()
  const module = await import('./viaggio')
  const store = module.useViaggio.getState() as unknown as StatoApp

  // Deve avere il titolo base (non crashare)
  expect(store.viaggio.titolo).toBe('Giappone — agosto 2027')
  expect(store.viaggio.versione).toBe(2)
})

test('un salvataggio non valido viene copiato da parte prima di ripartire dalla base', async () => {
  const grezzo = JSON.stringify({ state: { viaggio: { versione: 2, titolo: 5 }, sceltaV1: 'fatta' }, version: 2 })
  storageMock.set('giappone-viaggio', grezzo)

  vi.resetModules()
  const module = await import('./viaggio')
  const store = module.useViaggio.getState() as unknown as StatoApp

  expect(storageMock.get('giappone-viaggio-scartato')).toBe(grezzo)
  expect(store.viaggio.titolo).toBe('Giappone — agosto 2027')
  expect(toastMock).toHaveBeenCalledWith('I dati salvati erano danneggiati: ne ho tenuto una copia e riparto dall\'itinerario 2027.')
})

test('anche un salvataggio che non è JSON viene copiato da parte', async () => {
  storageMock.set('giappone-viaggio', '{rotto')

  vi.resetModules()
  const module = await import('./viaggio')
  module.useViaggio.getState().setModifica(true)

  expect(storageMock.get('giappone-viaggio-scartato')).toBe('{rotto')
  expect(toastMock).toHaveBeenCalledTimes(1)
})

test('senza nulla di salvato non copia niente e non avvisa', async () => {
  vi.resetModules()
  await import('./viaggio')
  expect(storageMock.has('giappone-viaggio-scartato')).toBe(false)
  expect(toastMock).not.toHaveBeenCalled()
})

describe('la rete: una modifica che renderebbe invalido il viaggio non passa', () => {
  const rotto = (v: ReturnType<typeof viaggioDiProva>) => ({ ...v, spese: [spesaDiProva({ id: 's', data: '0027-08-07', pagatoDa: v.persone[0].id, divisaFra: [v.persone[0].id] })] })

  test('applica rifiuta, lascia lo stato com\'è e avvisa sempre con lo stesso toast', () => {
    const prima = useViaggio.getState().viaggio
    useViaggio.getState().applica(rotto)
    useViaggio.getState().applica(rotto)
    expect(useViaggio.getState().viaggio).toBe(prima)
    expect(toastMock).toHaveBeenCalledTimes(2)
    // Stesso id: sonner sostituisce il toast invece di impilarne due.
    expect(toastMock.mock.calls[0][1]).toMatchObject({ id: 'modifica-rifiutata' })
    expect(toastMock.mock.calls[1][1]).toMatchObject({ id: 'modifica-rifiutata' })
    expect(toastMock.mock.calls[0][0]).toBe('Modifica non salvata: un dato non è valido')
  })

  test('applicaAnnullabile rifiuta senza toccare precedente e senza il toast di Annulla', () => {
    const prima = useViaggio.getState().viaggio
    useViaggio.getState().applicaAnnullabile(rotto, 'Fatto')
    const s = useViaggio.getState()
    expect(s.viaggio).toBe(prima)
    expect(s.precedente).toBeNull()
    expect(toastMock).toHaveBeenCalledTimes(1)
    expect(toastMock.mock.calls[0][0]).toBe('Modifica non salvata: un dato non è valido')
  })

  test('una modifica valida passa e non avvisa', () => {
    useViaggio.getState().applica(v => ({ ...v, titolo: 'Nuovo' }))
    expect(useViaggio.getState().viaggio.titolo).toBe('Nuovo')
    expect(toastMock).not.toHaveBeenCalled()
  })
})
