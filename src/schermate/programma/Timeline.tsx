import type { ReactNode } from 'react'
import { formatoDurata } from '../../model/date'
import type { Giorno, Tappa } from '../../model/tipi'
import { modoGoogle, urlPercorso } from '../../servizi/mappe'
import { Vuoto } from '../../ui/componenti'
import { ETICHETTA_MODO, ICONA_MODO } from '../../ui/icone'
import { CardTappa } from './CardTappa'

export function Segmento({ da, a }: { da: Tappa; a: Tappa | undefined }) {
  if (!da.spostamento || !a) return null
  const Icona = ICONA_MODO[da.spostamento.modo]
  const durata = da.spostamento.minuti ? ` · ${formatoDurata(da.spostamento.minuti)}` : ''
  return (
    <div className="segmento">
      <Icona size={16} aria-hidden />
      <span>{ETICHETTA_MODO[da.spostamento.modo]}{durata}</span>
      {da.luogo && a.luogo && (
        <a href={urlPercorso(da.luogo, a.luogo, modoGoogle(da.spostamento.modo))} target="_blank" rel="noreferrer">Percorso</a>
      )}
    </div>
  )
}

export function VoceTimeline({ tappa, successiva, giornoId, data, onApri, children }: {
  tappa: Tappa; successiva?: Tappa; giornoId: string; data: string; onApri: (id: string) => void; children?: ReactNode
}) {
  return (
    <>
      <div className={'voce-ora' + (tappa.sera ? ' sera' : '')}>{tappa.ora ?? ''}</div>
      {children ?? <CardTappa tappa={tappa} giornoId={giornoId} data={data} onApri={() => onApri(tappa.id)} />}
      <Segmento da={tappa} a={successiva} />
    </>
  )
}

interface Props { giorno: Giorno; data: string; onApri: (id: string) => void; modifica: boolean }

export function Timeline({ giorno, data, onApri }: Props) {
  if (giorno.tappe.length === 0) return <Vuoto titolo="Giornata libera" testo="Nessuna tappa in programma." />
  return (
    <ol className="timeline">
      {giorno.tappe.map((t, i) => (
        <li key={t.id} className="voce-timeline">
          <VoceTimeline tappa={t} successiva={giorno.tappe[i + 1]} giornoId={giorno.id} data={data} onApri={onApri} />
        </li>
      ))}
    </ol>
  )
}
