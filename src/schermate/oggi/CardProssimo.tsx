import { Copy, Paperclip } from 'lucide-react'
import { formatoDurata } from '../../model/date'
import { descriviQuando, prossimaPrenotazione } from '../../model/prenotazioni'
import { useViaggio } from '../../store/viaggio'
import { copia } from '../../ui/copia'
import { ETICHETTA_PRENOTAZIONE, ICONA_PRENOTAZIONE } from '../../ui/icone'
import { hrefDocumento } from '../../ui/rotta'

/** "Prossimo: Volo fra 3 h", se una prenotazione comincia nelle prossime 24 ore. */
export function CardProssimo({ adesso }: { adesso: Date }) {
  const viaggio = useViaggio(s => s.viaggio)
  const prossimo = prossimaPrenotazione(viaggio, adesso)
  if (!prossimo) return null
  const { prenotazione: p, minuti } = prossimo
  const Icona = ICONA_PRENOTAZIONE[p.tipo]
  return (
    <article className="card card-adesso">
      <div className="card-adesso-etichetta">Prossimo: {ETICHETTA_PRENOTAZIONE[p.tipo]} fra {formatoDurata(minuti)}</div>
      <a className="card-adesso-corpo" href={hrefDocumento(p.id)}>
        <Icona size={30} className="card-adesso-icona" aria-hidden />
        <div>
          <h3>{p.titolo}</h3>
          <p className="testo-2">{[descriviQuando(p), p.riferimento].filter(Boolean).join(' · ')}</p>
        </div>
      </a>
      <div className="fila">
        {p.codice && <button type="button" className="pulsante primario" onClick={() => copia(p.codice!)}><Copy size={18} aria-hidden /> {p.codice}</button>}
        <a className="pulsante" href={hrefDocumento(p.id)}><Paperclip size={18} aria-hidden /> {p.allegati.length ? `Allegati (${p.allegati.length})` : 'Dettagli'}</a>
      </div>
    </article>
  )
}
