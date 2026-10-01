export const URL_CAMBIO = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=JPY'

export interface Cambio { valore: number; data: string }

type Risposta = { date?: unknown; rates?: { JPY?: unknown } }

export function leggiCambio(j: unknown): Cambio | null {
  const r = j as Risposta | null
  const valore = r?.rates?.JPY
  const data = r?.date
  if (typeof valore !== 'number' || !Number.isFinite(valore) || valore <= 0) return null
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null
  return { valore, data }
}

const prendiJson = async (url: string): Promise<unknown> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

/** Il cambio del giorno (BCE, senza chiave). Offline o in errore restituisce null: si usa l'ultimo salvato. */
export async function scaricaCambio(prendi: (url: string) => Promise<unknown> = prendiJson): Promise<Cambio | null> {
  try {
    return leggiCambio(await prendi(URL_CAMBIO))
  } catch {
    return null
  }
}
