import { BedDouble, Copy, Ticket } from 'lucide-react'
import { useState } from 'react'
import { impostaIndirizzoNotte } from '../../model/operazioni'
import { luogoDellaNotte } from '../../model/prenotazioni'
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
  const { luogo, prenotazione: notte } = luogoDellaNotte(viaggio, indice)
  if (!luogo) return null
  // L'indirizzo scritto qui va dove sta l'hotel: nella prenotazione e in tutti i giorni con lo stesso alloggio.
  const cambiaIndirizzo = (indirizzoJa: string | undefined) => applica(v => impostaIndirizzoNotte(v, indice, indirizzoJa))
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
