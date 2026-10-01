import { MapPin, Plus, Ticket, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useViaggio } from '../../store/viaggio'
import { Gruppo, Riga } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { HREF_NUOVA_SPESA, hrefDocumento } from '../../ui/rotta'
import { FoglioPrenotazione } from '../documenti/FoglioPrenotazione'
import { FoglioNuovaTappa } from '../programma/FoglioTappa'

type Scelta = 'spesa' | 'tappa' | 'prenotazione'

/** Il "+" tondo sopra la tab bar: spesa, tappa (nel giorno mostrato o di oggi), prenotazione. */
export function PulsanteAggiungi({ indiceGiorno }: { indiceGiorno: number }) {
  const giorno = useViaggio(s => s.viaggio.giorni[indiceGiorno])
  const [menu, setMenu] = useState(false)
  const [scelta, setScelta] = useState<Exclude<Scelta, 'spesa'> | null>(null)
  const [chiave, setChiave] = useState(0)
  const scegli = (s: Scelta) => {
    setMenu(false)
    // La spesa ha la sua rotta: apre le Spese col foglio già aperto.
    if (s === 'spesa') { location.hash = HREF_NUOVA_SPESA; return }
    setChiave(k => k + 1)
    setScelta(s)
  }
  return (
    <>
      <button type="button" className="fab" aria-label="Aggiungi spesa, tappa o prenotazione" onClick={() => setMenu(true)}>
        <Plus size={28} aria-hidden />
      </button>
      <Foglio aperto={menu} onChiudi={() => setMenu(false)} titolo="Aggiungi">
        <Gruppo>
          <Riga icona={<Wallet size={22} />} titolo="Spesa" sottotitolo="Quanto, chi ha pagato, per chi" onClick={() => scegli('spesa')} />
          {giorno && <Riga icona={<MapPin size={22} />} titolo="Tappa" sottotitolo={`Nel G${indiceGiorno} · ${giorno.titolo}`} onClick={() => scegli('tappa')} />}
          <Riga icona={<Ticket size={22} />} titolo="Prenotazione" sottotitolo="Volo, hotel, treno, biglietto, con QR e PDF" onClick={() => scegli('prenotazione')} />
        </Gruppo>
      </Foglio>
      {giorno && <FoglioNuovaTappa key={`tappa-${chiave}`} giornoId={giorno.id} aperto={scelta === 'tappa'} onChiudi={() => setScelta(null)} />}
      <FoglioPrenotazione key={`prenotazione-${chiave}`} aperto={scelta === 'prenotazione'} iniziale={null} onChiudi={() => setScelta(null)}
        onSalvata={id => { location.hash = hrefDocumento(id) }} />
    </>
  )
}
