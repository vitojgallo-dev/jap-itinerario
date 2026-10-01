import { Copy, MapPin } from 'lucide-react'
import type { Luogo } from '../../model/tipi'
import { urlCerca } from '../../servizi/mappe'
import { Campo } from '../../ui/componenti'
import { copia } from '../../ui/copia'
import { Foglio } from '../../ui/Foglio'

interface Props {
  aperto: boolean
  onChiudi: () => void
  luogo: Luogo
  /** Il codice della prenotazione, se c'è: alla reception serve. */
  codice?: string
  onCambiaIndirizzo: (indirizzoJa: string | undefined) => void
}

/** Scheda a tutto schermo da mostrare al tassista. */
export function SchedaTaxi({ aperto, onChiudi, luogo, codice, onCambiaIndirizzo }: Props) {
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Per il tassista" pieno>
      <div className="taxi">
        <p className="testo-2" lang="ja">この住所までお願いします。</p>
        <p className="taxi-nome">{luogo.nome}</p>
        {luogo.indirizzoJa
          ? <p className="taxi-indirizzo" lang="ja">{luogo.indirizzoJa}</p>
          : <p className="testo-2">Manca l'indirizzo in giapponese: copialo dalla prenotazione o dal sito dell'hotel e incollalo qui sotto.</p>}
        <Campo etichetta="Indirizzo in giapponese">
          <input lang="ja" value={luogo.indirizzoJa ?? ''} placeholder="東京都台東区西浅草3-17-1" onChange={e => onCambiaIndirizzo(e.target.value || undefined)} />
        </Campo>
        <div className="fila">
          <a className="pulsante" href={urlCerca(luogo)} target="_blank" rel="noreferrer"><MapPin size={18} aria-hidden /> Mappa</a>
          {luogo.indirizzoJa && <button type="button" className="pulsante" onClick={() => copia(luogo.indirizzoJa!)}><Copy size={18} aria-hidden /> Copia</button>}
          {codice && <button type="button" className="pulsante" onClick={() => copia(codice)}><Copy size={18} aria-hidden /> Codice {codice}</button>}
        </div>
      </div>
    </Foglio>
  )
}
