import { Check, Navigation, Ticket } from 'lucide-react'
import type { ReactNode } from 'react'
import { promemoriaBiglietto, type Promemoria } from '../../model/adesso'
import { formatoDurata, istanteTokyo } from '../../model/date'
import { aggiornaTappa } from '../../model/operazioni'
import type { Tappa } from '../../model/tipi'
import { urlCercaBiglietti, urlIndicazioni } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Badge } from '../../ui/componenti'
import { FotoLuogo } from '../../ui/FotoLuogo'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_AFFIDABILITA, ETICHETTA_TIPO, ICONA_TIPO } from '../../ui/icone'

export function testoPromemoria(p: Promemoria): string {
  return { 'prenota-ora': 'La visita è domani: prenota adesso', oggi: 'La visita è oggi', futuro: 'Prenota per tempo', passato: '' }[p]
}

interface Props { tappa: Tappa; giornoId: string; data: string; onApri: () => void; maniglia?: ReactNode }

export function CardTappa({ tappa, giornoId, data, onApri, maniglia }: Props) {
  const applica = useViaggio(s => s.applica)
  const oggi = istanteTokyo(useAdesso()).data
  const Icona = ICONA_TIPO[tappa.tipo]
  const fatta = tappa.stato === 'fatta'
  const promemoria = tappa.biglietti ? promemoriaBiglietto(data, oggi) : null
  return (
    <article className={'card-tappa' + (fatta ? ' fatta' : '') + (tappa.stato === 'saltata' ? ' saltata' : '')}>
      <button type="button" className="card-tappa-apri" onClick={onApri}>
        {tappa.luogo && tappa.tipo !== 'spostamento' && <FotoLuogo query={tappa.luogo.query} override={tappa.foto} className="card-tappa-foto" />}
        <div className="card-tappa-testo">
          <div className="card-tappa-meta">
            <Icona size={14} aria-hidden /> {ETICHETTA_TIPO[tappa.tipo]}
            {tappa.durataMin ? ` · ${formatoDurata(tappa.durataMin)}` : ''}
            {tappa.evento && <Badge tono={tappa.evento.affidabilita === 'certa' ? 'tinta' : 'avviso'}>{ETICHETTA_AFFIDABILITA[tappa.evento.affidabilita]}</Badge>}
            {promemoria === 'prenota-ora' && <Badge tono="avviso">Prenota oggi</Badge>}
          </div>
          <h3>{tappa.titolo}</h3>
          {tappa.descrizione && <p className="clamp-3">{tappa.descrizione}</p>}
          {tappa.consiglio && <p className="consiglio">{tappa.consiglio}</p>}
          {tappa.nota && <p className="nota-personale">{tappa.nota}</p>}
        </div>
      </button>
      <div className="card-tappa-azioni">
        {tappa.luogo && (
          <a className="pulsante piccolo" href={urlIndicazioni(tappa.luogo)} target="_blank" rel="noreferrer">
            <Navigation size={16} aria-hidden /> Vai
          </a>
        )}
        {tappa.biglietti && (
          <a className="pulsante piccolo" href={tappa.biglietti.link ?? urlCercaBiglietti(tappa.titolo)} target="_blank" rel="noreferrer">
            <Ticket size={16} aria-hidden /> Biglietti
          </a>
        )}
        <button type="button" className={'pulsante piccolo' + (fatta ? ' pieno' : '')} aria-pressed={fatta}
          onClick={() => applica(v => aggiornaTappa(v, giornoId, tappa.id, { stato: fatta ? 'da-fare' : 'fatta' }))}>
          <Check size={16} aria-hidden /> {fatta ? 'Fatta' : 'Fatto'}
        </button>
        {maniglia}
      </div>
    </article>
  )
}
