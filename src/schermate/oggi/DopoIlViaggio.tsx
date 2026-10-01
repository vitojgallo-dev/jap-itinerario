import { statistiche } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { BarraNav, LinkImpostazioni, TitoloGrande } from '../../ui/componenti'
import { hrefRotta } from '../../ui/rotta'

export function DopoIlViaggio() {
  const viaggio = useViaggio(s => s.viaggio)
  const s = statistiche(viaggio)
  return (
    <div className="schermata">
      <BarraNav titolo="Oggi" sinistra={<LinkImpostazioni />} />
      <TitoloGrande sopra="Bentornati" sotto={viaggio.titolo}>おかえりなさい</TitoloGrande>
      <div className="statistiche">
        <div className="card statistica"><b>{s.giorni}</b>giorni</div>
        <div className="card statistica"><b>{s.citta}</b>città</div>
        <div className="card statistica"><b>{s.fatte}</b>tappe fatte</div>
        <div className="card statistica"><b>{s.tappe - s.fatte}</b>per la prossima volta</div>
      </div>
      <a className="pulsante largo" href={hrefRotta('programma', 0)}>Rivedi il viaggio</a>
    </div>
  )
}
