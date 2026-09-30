import { CalendarDays, Map as IconaMappa, Sun, Ticket } from 'lucide-react'
import { hrefRotta, type Schermata } from './rotta'

const VOCI = [
  { s: 'oggi', etichetta: 'Oggi', Icona: Sun },
  { s: 'programma', etichetta: 'Programma', Icona: CalendarDays },
  { s: 'mappa', etichetta: 'Mappa', Icona: IconaMappa },
  { s: 'viaggio', etichetta: 'Viaggio', Icona: Ticket },
] as const

export function TabBar({ attiva }: { attiva: Schermata }) {
  return (
    <nav className="tabbar" aria-label="Sezioni">
      {VOCI.map(({ s, etichetta, Icona }) => (
        <a key={s} href={hrefRotta(s)} aria-current={s === attiva ? 'page' : undefined}>
          <Icona size={24} strokeWidth={s === attiva ? 2.2 : 1.8} aria-hidden />
          <span>{etichetta}</span>
        </a>
      ))}
    </nav>
  )
}
