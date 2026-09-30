import { Copy, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { aggiornaAlloggio } from '../../model/operazioni'
import type { Luogo } from '../../model/tipi'
import { urlCerca } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Campo } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'

/** Scheda a tutto schermo da mostrare al tassista. */
export function SchedaTaxi({ aperto, onChiudi, alloggio }: { aperto: boolean; onChiudi: () => void; alloggio: Luogo }) {
  const applica = useViaggio(s => s.applica)
  const copia = () => {
    // Senza clipboard (http, browser vecchi) l'avviso deve arrivare comunque.
    if (!navigator.clipboard) { toast('Copia non riuscita'); return }
    navigator.clipboard.writeText(alloggio.indirizzoJa ?? '').then(() => toast('Indirizzo copiato'), () => toast('Copia non riuscita'))
  }
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Per il tassista" pieno>
      <div className="taxi">
        <p className="testo-2" lang="ja">この住所までお願いします。</p>
        <p className="taxi-nome">{alloggio.nome}</p>
        {alloggio.indirizzoJa
          ? <p className="taxi-indirizzo" lang="ja">{alloggio.indirizzoJa}</p>
          : <p className="testo-2">Manca l'indirizzo in giapponese: copialo dalla prenotazione o dal sito dell'hotel e incollalo qui sotto.</p>}
        <Campo etichetta="Indirizzo in giapponese">
          <input lang="ja" value={alloggio.indirizzoJa ?? ''} placeholder="東京都台東区西浅草3-17-1"
            onChange={e => applica(v => aggiornaAlloggio(v, alloggio.nome, { indirizzoJa: e.target.value || undefined }))} />
        </Campo>
        <div className="fila">
          <a className="pulsante" href={urlCerca(alloggio)} target="_blank" rel="noreferrer"><MapPin size={18} aria-hidden /> Mappa</a>
          {alloggio.indirizzoJa && <button type="button" className="pulsante" onClick={copia}><Copy size={18} aria-hidden /> Copia</button>}
        </div>
      </div>
    </Foglio>
  )
}
