import { Info, TriangleAlert } from 'lucide-react'
import type { Avviso } from '../model/tipi'
import './avvisi.css'

export function Avvisi({ avvisi }: { avvisi: Avviso[] }) {
  if (avvisi.length === 0) return null
  return (
    <ul className="avvisi">
      {avvisi.map((a, i) => (
        <li key={i} className={`avviso ${a.livello}`}>
          {a.livello === 'attenzione' ? <TriangleAlert size={18} aria-hidden /> : <Info size={18} aria-hidden />}
          <span>{a.testo}</span>
        </li>
      ))}
    </ul>
  )
}
