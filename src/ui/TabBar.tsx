import { CalendarDays, Map as IconaMappa, Sun, Ticket, Wallet } from 'lucide-react'
import { hrefRotta, type Schermata } from './rotta'

const VOCI = [
  { s: 'oggi', etichetta: 'Oggi', Icona: Sun },
  { s: 'programma', etichetta: 'Programma', Icona: CalendarDays },
  { s: 'mappa', etichetta: 'Mappa', Icona: IconaMappa },
  { s: 'documenti', etichetta: 'Documenti', Icona: Ticket },
  { s: 'spese', etichetta: 'Spese', Icona: Wallet },
] as const

export function TabBar({ attiva }: { attiva: Schermata }) {
  // Le impostazioni si aprono da Oggi: la voce accesa resta quella.
  const accesa = attiva === 'impostazioni' ? 'oggi' : attiva
  return (
    <nav className="tabbar" aria-label="Sezioni">
      {VOCI.map(({ s, etichetta, Icona }) => (
        <a key={s} href={hrefRotta(s)} aria-current={s === accesa ? 'page' : undefined}>
          <span className="tabbar-pillola"><Icona size={26} strokeWidth={s === accesa ? 2.2 : 1.8} aria-hidden /></span>
          <span>{etichetta}</span>
        </a>
      ))}
    </nav>
  )
}
