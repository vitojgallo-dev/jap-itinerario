import { BedDouble, Copy, Ticket } from 'lucide-react'
import { useState } from 'react'
import { dataGiorno } from '../../model/date'
import { aggiornaAlloggio } from '../../model/operazioni'
import { aggiornaPrenotazione, notteCoperta } from '../../model/prenotazioni'
import { useViaggio } from '../../store/viaggio'
import { Gruppo, Riga } from '../../ui/componenti'
import { copia } from '../../ui/copia'
import { hrefDocumento } from '../../ui/rotta'
import { SchedaTaxi } from './SchedaTaxi'

/** L'hotel della notte del giorno `indice`: la prenotazione che la copre, altrimenti `Giorno.alloggio`. */
export function Stanotte({ indice }: { indice: number }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const [taxi, setTaxi] = useState(false)
  const giorno = viaggio.giorni[indice]
  if (!giorno) return null
  const notte = notteCoperta(viaggio, dataGiorno(viaggio, indice))
  const luogo = notte ? (notte.luogo ?? giorno.alloggio ?? { nome: notte.titolo, query: notte.titolo }) : giorno.alloggio
  if (!luogo) return null
  // L'indirizzo scritto qui va dove sta l'hotel: nella prenotazione, o in tutti i giorni con lo stesso alloggio.
  const cambiaIndirizzo = (indirizzoJa: string | undefined) => applica(v => (notte
    ? aggiornaPrenotazione(v, notte.id, { luogo: { ...luogo, indirizzoJa } })
    : aggiornaAlloggio(v, luogo.nome, { indirizzoJa })))
  return (
    <>
      <Gruppo titolo="Stanotte">
        <Riga icona={<BedDouble size={20} />} titolo={notte?.titolo ?? luogo.nome}
          sottotitolo={luogo.indirizzoJa || "Tocca per l'indirizzo da mostrare al tassista"} onClick={() => setTaxi(true)} />
        {notte?.codice && <Riga icona={<Copy size={20} />} titolo={`Codice ${notte.codice}`} sottotitolo="Tocca per copiare" onClick={() => copia(notte.codice!)} destra={null} />}
        {notte && <Riga icona={<Ticket size={20} />} titolo="Prenotazione e allegati" href={hrefDocumento(notte.id)} />}
      </Gruppo>
      <SchedaTaxi aperto={taxi} onChiudi={() => setTaxi(false)} luogo={luogo} codice={notte?.codice} onCambiaIndirizzo={cambiaIndirizzo} />
    </>
  )
}
