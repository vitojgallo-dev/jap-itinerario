import type { Prenotazione, Viaggio } from './tipi'

/**
 * L'hotel prenotato che copre la notte di `data`: dal giorno del check-in al giorno prima del check-out.
 * Se due si sovrappongono vince quello col check-in più recente. Senza prenotazione, chi chiama usa `Giorno.alloggio`.
 */
export function notteCoperta(v: Viaggio, data: string): Prenotazione | null {
  const coprono = v.prenotazioni.filter(p =>
    p.tipo === 'hotel' && p.stato === 'prenotata' && p.inizio && p.fine
    && p.inizio.slice(0, 10) <= data && data < p.fine.slice(0, 10))
  coprono.sort((a, b) => b.inizio!.localeCompare(a.inizio!) || a.id.localeCompare(b.id))
  return coprono[0] ?? null
}
