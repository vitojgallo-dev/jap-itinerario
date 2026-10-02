import { toast } from 'sonner'
import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import { validaViaggio } from '../model/validazione'
import { aggiornaImpostazioni } from '../model/operazioni'
import type { Impostazioni, Viaggio } from '../model/tipi'
import { CHIAVE_SCARTATO, CHIAVE_VIAGGIO, leggiV1, viaggioBase } from './avvio'

type SceltaV1 = 'da-chiedere' | 'fatta'

export interface StatoApp {
  viaggio: Viaggio
  sceltaV1: SceltaV1
  modifica: boolean
  precedente: Viaggio | null
  applica: (fn: (v: Viaggio) => Viaggio) => void
  applicaAnnullabile: (fn: (v: Viaggio) => Viaggio, messaggio: string) => void
  /** Il cambio scaricato dalla BCE: aggiorna le impostazioni senza far perdere l'"Annulla" di una modifica in corso. */
  aggiornaCambio: (cambio: NonNullable<Impostazioni['ultimoCambio']>) => void
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

type Persistito = Pick<StatoApp, 'viaggio' | 'sceltaV1'>

// Come createJSONStorage, ma un blob che non è JSON arriva a `merge` come "niente di valido"
// invece di interrompere l'idratazione (che lascerebbe il prossimo `set` scriverci sopra in silenzio).
const archivio: PersistStorage<Persistito> = {
  getItem: nome => {
    const grezzo = localStorage.getItem(nome)
    if (grezzo === null) return null
    try {
      return JSON.parse(grezzo)
    } catch {
      return null
    }
  },
  setItem: (nome, valore) => localStorage.setItem(nome, JSON.stringify(valore)),
  removeItem: nome => localStorage.removeItem(nome),
}

/** Se c'è un salvataggio (non valido), lo mette da parte prima che l'itinerario base lo sovrascriva. */
function scartaSalvato() {
  let grezzo: string | null = null
  try {
    grezzo = localStorage.getItem(CHIAVE_VIAGGIO)
    if (grezzo !== null) localStorage.setItem(CHIAVE_SCARTATO, grezzo)
  } catch { /* memoria piena o non disponibile: resta almeno l'avviso */ }
  if (grezzo !== null) toast('I dati salvati erano danneggiati: ne ho tenuto una copia e riparto dall\'itinerario 2027.')
}

/** Fisso, così due rifiuti di fila sostituiscono il toast invece di impilarsi. */
export const ID_TOAST_RIFIUTO = 'modifica-rifiutata'

/**
 * La rete sotto gli editor: un viaggio che `validaViaggio` rifiuterebbe al riavvio manderebbe in malora tutto il salvataggio,
 * quindi non entra nello stato. Ritorna false (e avvisa) se la modifica va scartata.
 */
function modificaAmmessa(dopo: Viaggio): boolean {
  if (validaViaggio(dopo).ok) return true
  toast('Modifica non salvata: un dato non è valido', { id: ID_TOAST_RIFIUTO })
  return false
}

export const useViaggio = create<StatoApp>()(
  persist(
    (set, get) => ({
      viaggio: viaggioBase(),
      sceltaV1: sceltaIniziale(),
      modifica: false,
      precedente: null,
      applica: fn => {
        const dopo = fn(get().viaggio)
        if (!modificaAmmessa(dopo)) return
        set({ viaggio: dopo, precedente: null })
      },
      applicaAnnullabile: (fn, messaggio) => {
        const prima = get().viaggio
        const dopo = fn(prima)
        if (!modificaAmmessa(dopo)) return
        set({ viaggio: dopo, precedente: prima })
        toast(messaggio, {
          action: {
            label: 'Annulla',
            onClick: () => {
              if (get().precedente === prima) {
                get().annulla()
              }
            },
          },
          duration: 6000,
        })
      },
      aggiornaCambio: cambio => {
        // Non passa da `applica`: quello azzera `precedente` e un "Annulla" appena offerto smetterebbe di funzionare.
        // Anche `precedente` resta lo stesso oggetto (il toast e la pulizia degli allegati lo confrontano per identità):
        // il cambio nuovo lo recupera `annulla`.
        const dopo = aggiornaImpostazioni(get().viaggio, { ultimoCambio: cambio })
        if (!modificaAmmessa(dopo)) return
        set({ viaggio: dopo })
      },
      annulla: () => {
        const p = get().precedente
        if (!p) return
        // Annullare riporta il viaggio com'era, ma un cambio più recente (arrivato nel frattempo) non si butta via.
        const attuale = get().viaggio.impostazioni.ultimoCambio
        const vecchio = p.impostazioni.ultimoCambio
        const tieniAttuale = attuale && (!vecchio || attuale.data >= vecchio.data)
        set({ viaggio: tieniAttuale ? aggiornaImpostazioni(p, { ultimoCambio: attuale }) : p, precedente: null })
      },
      sostituisci: viaggio => set({ viaggio, precedente: null }),
      setModifica: modifica => set({ modifica }),
      setSceltaV1: sceltaV1 => set({ sceltaV1 }),
    }),
    {
      name: CHIAVE_VIAGGIO,
      version: 2,
      storage: archivio,
      partialize: s => ({ viaggio: s.viaggio, sceltaV1: s.sceltaV1 }),
      merge: (persistito, attuale) => {
        const p = persistito as Partial<StatoApp> | undefined
        const esito = validaViaggio(p?.viaggio)
        if (esito.ok) return { ...attuale, viaggio: esito.viaggio, sceltaV1: p?.sceltaV1 === 'da-chiedere' ? 'da-chiedere' : 'fatta' }
        scartaSalvato()
        return attuale
      },
    },
  ),
)
