import { Check, Navigation } from 'lucide-react'
import { minutiDaOra, oraDaMinuti } from '../../model/date'
import type { Tappa } from '../../model/tipi'
import { urlIndicazioni } from '../../servizi/mappe'
import { Badge } from '../../ui/componenti'
import { FotoLuogo } from '../../ui/FotoLuogo'

interface Props { etichetta: string; tappa: Tappa; onApri: () => void; onFatto?: () => void; secondaria?: boolean; avviso?: string | null }

export function CardAdesso({ etichetta, tappa, onApri, onFatto, secondaria, avviso }: Props) {
  const inizio = minutiDaOra(tappa.ora)
  const orario = tappa.ora ? (tappa.durataMin && inizio !== null ? `${tappa.ora} – ${oraDaMinuti(inizio + tappa.durataMin)}` : tappa.ora) : ''
  return (
    <article className={'card card-adesso' + (secondaria ? ' secondaria' : '')}>
      <div className="card-adesso-etichetta">{etichetta}</div>
      <button type="button" className="card-adesso-corpo" onClick={onApri}>
        {tappa.luogo && tappa.tipo !== 'spostamento' && <FotoLuogo query={tappa.luogo.query} override={tappa.foto} className="card-adesso-foto" />}
        <div>
          <h3>{tappa.titolo}</h3>
          <p className="testo-2">{[orario, tappa.luogo?.nome !== tappa.titolo ? tappa.luogo?.nome : ''].filter(Boolean).join(' · ')}</p>
          {avviso && <p style={{ marginTop: 6 }}><Badge tono="avviso">{avviso}</Badge></p>}
        </div>
      </button>
      <div className="fila">
        {tappa.luogo && (
          <a className={'pulsante' + (secondaria ? '' : ' primario')} href={urlIndicazioni(tappa.luogo)} target="_blank" rel="noreferrer">
            <Navigation size={18} aria-hidden /> Vai
          </a>
        )}
        {onFatto && <button type="button" className="pulsante" onClick={onFatto}><Check size={18} aria-hidden /> Fatto</button>}
      </div>
    </article>
  )
}
