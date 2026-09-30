import { toast } from 'sonner'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Viaggio } from '../model/tipi'
import { leggiV1, viaggioBase } from './avvio'

type SceltaV1 = 'da-chiedere' | 'fatta'

interface StatoApp {
  viaggio: Viaggio
  sceltaV1: SceltaV1
  modifica: boolean
  precedente: Viaggio | null
  applica: (fn: (v: Viaggio) => Viaggio) => void
  applicaAnnullabile: (fn: (v: Viaggio) => Viaggio, messaggio: string) => void
  annulla: () => void
  sostituisci: (v: Viaggio) => void
  setModifica: (on: boolean) => void
  setSceltaV1: (s: SceltaV1) => void
}

function sceltaIniziale(): SceltaV1 {
  try {
    return leggiV1(localStorage) ? 'da-chiedere' : 'fatta'
  } catch {
    return 'fatta'
  }
}

export const useViaggio = create<StatoApp>()(
  persist(
    (set, get) => ({
      viaggio: viaggioBase(),
      sceltaV1: sceltaIniziale(),
      modifica: false,
      precedente: null,
      applica: fn => set({ viaggio: fn(get().viaggio) }),
      applicaAnnullabile: (fn, messaggio) => {
        const prima = get().viaggio
        set({ viaggio: fn(prima), precedente: prima })
        toast(messaggio, { action: { label: 'Annulla', onClick: () => get().annulla() }, duration: 6000 })
      },
      annulla: () => {
        const p = get().precedente
        if (p) set({ viaggio: p, precedente: null })
      },
      sostituisci: viaggio => set({ viaggio, precedente: null }),
      setModifica: modifica => set({ modifica }),
      setSceltaV1: sceltaV1 => set({ sceltaV1 }),
    }),
    {
      name: 'giappone-viaggio',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ viaggio: s.viaggio, sceltaV1: s.sceltaV1 }),
    },
  ),
)
