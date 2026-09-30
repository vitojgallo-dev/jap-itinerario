import { toast } from 'sonner'
import { validaViaggio } from '../../model/validazione'
import { useViaggio } from '../../store/viaggio'
import { ERRORE_V1, leggiV1, viaggioDaV1 } from '../../store/avvio'
import { Foglio } from '../../ui/Foglio'

/** Una volta sola: se sul telefono c'è la vecchia app modificata, chiede da cosa partire. */
export function PrimoAvvio() {
  const sceltaV1 = useViaggio(s => s.sceltaV1)
  const setSceltaV1 = useViaggio(s => s.setSceltaV1)
  const sostituisci = useViaggio(s => s.sostituisci)
  const chiudi = () => setSceltaV1('fatta')
  const recupera = () => {
    try {
      const v1 = leggiV1(localStorage)
      if (v1) {
        const esito = validaViaggio(viaggioDaV1(v1))
        if (esito.ok) sostituisci(esito.viaggio)
        else toast(ERRORE_V1)
      }
    } catch {
      toast(ERRORE_V1)
    }
    chiudi()
  }
  return (
    <Foglio aperto={sceltaV1 === 'da-chiedere'} onChiudi={chiudi} titolo="Nuova versione">
      <p style={{ margin: '8px 0 12px' }}>L'app è stata rifatta, con un itinerario 2027 aggiornato: arrivo e partenza, le sere dei festival di Nara e Arashiyama, Kurama e Himeji al posto di Koyasan e Hiroshima.</p>
      <p className="testo-2" style={{ marginBottom: 16 }}>Su questo telefono c'erano anche delle modifiche fatte nella versione vecchia. Da cosa vuoi partire? Potrai cambiare idea da Viaggio → Dati.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        <button type="button" className="pulsante primario largo" onClick={chiudi}>Nuovo itinerario 2027</button>
        <button type="button" className="pulsante largo" onClick={recupera}>Le mie modifiche vecchie</button>
      </div>
    </Foglio>
  )
}
