import { useEffect, useRef, type CSSProperties } from 'react'
import { dataGiorno, formatoData, partiData } from '../../model/date'
import { cittaDi } from '../../model/riepilogo'
import type { Viaggio } from '../../model/tipi'
import { hrefRotta } from '../../ui/rotta'

export function StrisciaGiorni({ viaggio, attivo, oggi }: { viaggio: Viaggio; attivo: number; oggi: number | null }) {
  const rif = useRef<HTMLElement>(null)
  useEffect(() => {
    const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches
    rif.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: riduci ? 'auto' : 'smooth' })
  }, [attivo])
  return (
    <nav className="striscia" ref={rif} aria-label="Giorni del viaggio">
      {viaggio.giorni.map((g, i) => {
        const data = dataGiorno(viaggio, i)
        const { settimana, numero } = partiData(data)
        const citta = cittaDi(viaggio, g)
        return (
          <a key={g.id} href={hrefRotta('programma', i)} className={'chip-giorno' + (i === oggi ? ' oggi' : '')}
            aria-current={i === attivo ? 'page' : undefined} style={{ '--c': citta.colore } as CSSProperties}
            aria-label={`Giorno ${i}, ${formatoData(data, 'lungo')}, ${citta.nome}`}>
            <small>{settimana}</small>
            <b>{numero}</b>
            <small>G{i}</small>
          </a>
        )
      })}
    </nav>
  )
}
