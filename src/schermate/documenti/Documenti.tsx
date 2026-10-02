import { CalendarPlus, ListPlus, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatoData, istanteTokyo } from '../../model/date'
import { descriviQuando, gruppiDocumenti, scadenza } from '../../model/prenotazioni'
import type { Prenotazione } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Badge, BarraNav, Gruppo, Riga, TitoloGrande, Vuoto } from '../../ui/componenti'
import { FoglioCalendario } from '../../ui/Calendario'
import { useAggiungiDatiDiPartenza } from '../../ui/datiDiPartenza'
import { useAdesso } from '../../ui/hook'
import { GRUPPO_PRENOTAZIONE, ICONA_PRENOTAZIONE } from '../../ui/icone'
import { hrefDocumento } from '../../ui/rotta'
import { DettaglioDocumento } from './DettaglioDocumento'
import { FoglioPrenotazione } from './FoglioPrenotazione'
import { PulsanteRicerca } from '../ricerca/Ricerca'
import './documenti.css'

export default function Documenti({ id }: { id: string | null }) {
  return id ? <DettaglioDocumento id={id} /> : <ElencoDocumenti />
}

function RigaDocumento({ p, oggi }: { p: Prenotazione; oggi: string }) {
  const Icona = ICONA_PRENOTAZIONE[p.tipo]
  const s = scadenza(p, oggi)
  const sotto = [descriviQuando(p), p.codice].filter(Boolean).join(' · ')
  let badge: ReactNode
  if (p.stato === 'da-prenotare') {
    const testo = s === 'scaduta' ? 'Scaduta' : p.daPrenotareEntro ? `Entro ${formatoData(p.daPrenotareEntro, 'breve')}` : 'Da prenotare'
    badge = <Badge tono={s === 'scaduta' || s === 'vicina' ? 'pericolo' : 'avviso'}>{testo}</Badge>
  }
  return <Riga icona={<Icona size={20} />} titolo={p.titolo || 'Senza titolo'} sottotitolo={sotto || undefined} destra={badge} href={hrefDocumento(p.id)} />
}

function ElencoDocumenti() {
  const prenotazioni = useViaggio(s => s.viaggio.prenotazioni)
  const aggiungiPartenza = useAggiungiDatiDiPartenza()
  const oggi = istanteTokyo(useAdesso()).data
  const [nuova, setNuova] = useState(false)
  const [chiave, setChiave] = useState(0)
  const [calendario, setCalendario] = useState(false)
  const gruppi = gruppiDocumenti(prenotazioni)
  const daFare = prenotazioni.filter(p => p.stato === 'da-prenotare').length
  const apriNuova = () => { setChiave(k => k + 1); setNuova(true) }
  return (
    <div className="schermata">
      <BarraNav titolo="Documenti" destra={<PulsanteRicerca />} />
      <TitoloGrande sotto={prenotazioni.length ? (daFare ? `${daFare} da prenotare su ${prenotazioni.length}` : 'Tutto prenotato') : undefined}>Documenti</TitoloGrande>
      {gruppi.length === 0 && (
        <Vuoto titolo="Nessuna prenotazione" testo="Voli, hotel, treni e biglietti, con codici, QR e PDF che restano anche offline."
          azione={<button type="button" className="pulsante primario" onClick={aggiungiPartenza}><ListPlus size={18} aria-hidden /> Parti da quelle del 2027</button>} />
      )}
      {gruppi.map(g => (
        <Gruppo key={g.tipo} titolo={GRUPPO_PRENOTAZIONE[g.tipo]}>
          {g.voci.map(p => <RigaDocumento key={p.id} p={p} oggi={oggi} />)}
        </Gruppo>
      ))}
      <Gruppo>
        <Riga icona={<Plus size={20} />} titolo="Nuova prenotazione" onClick={apriNuova} destra={null} />
        <Riga icona={<CalendarPlus size={20} />} titolo="Aggiungi al calendario" sottotitolo="Promemoria che arrivano anche ad app chiusa" onClick={() => setCalendario(true)} destra={null} />
      </Gruppo>
      <FoglioPrenotazione key={chiave} aperto={nuova} iniziale={null} onChiudi={() => setNuova(false)} onSalvata={id => { location.hash = hrefDocumento(id) }} />
      <FoglioCalendario aperto={calendario} onChiudi={() => setCalendario(false)} />
    </div>
  )
}
