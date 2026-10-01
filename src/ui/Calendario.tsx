import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { eventiCalendario, generaIcs, NOME_FILE_ICS } from '../model/ics'
import { condividiFile } from '../servizi/condividi'
import { useViaggio } from '../store/viaggio'
import { Foglio } from './Foglio'

/** Genera giappone-2027.ics e lo condivide o lo scarica, come il backup. */
export function FoglioCalendario({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const [tappe, setTappe] = useState(false)
  const [lavoro, setLavoro] = useState(false)
  const quanti = eventiCalendario(viaggio, { tappe }).length
  const crea = async () => {
    setLavoro(true)
    try {
      const testo = generaIcs(useViaggio.getState().viaggio, { tappe, adesso: new Date() })
      const esito = await condividiFile(new File([testo], NOME_FILE_ICS, { type: 'text/calendar' }), 'Giappone 2027')
      if (esito === 'annullato') return
      toast(esito === 'condiviso' ? 'Calendario condiviso' : `${NOME_FILE_ICS} scaricato: aprilo per aggiungere gli eventi`)
      onChiudi()
    } catch {
      toast('Non sono riuscito a creare il calendario. Riprova.')
    } finally {
      setLavoro(false)
    }
  }
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo="Aggiungi al calendario">
      <p style={{ margin: '8px 0' }}>
        Voli e treni con un avviso 3 ore prima, hotel e biglietti 1 ora prima, le scadenze per prenotare alle 9 di quel giorno
        e il tax-free 4 ore prima del volo di ritorno. Gli avvisi li dà il calendario: arrivano anche ad app chiusa.
      </p>
      <p className="testo-2" style={{ marginBottom: 8 }}>
        Rifacendo il file più avanti gli eventi hanno lo stesso identificativo: i calendari che lo supportano li aggiornano invece di duplicarli.
      </p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, margin: '8px 4px 16px' }}>
        <input type="checkbox" checked={tappe} onChange={e => setTappe(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--tinta-forte)' }} />
        Anche tutte le tappe del programma, senza avviso
      </label>
      <button type="button" className="pulsante primario largo" disabled={lavoro || quanti === 0} onClick={() => void crea()}>
        <CalendarPlus size={18} aria-hidden /> {quanti === 0 ? 'Nessun evento da aggiungere' : `Crea ${NOME_FILE_ICS} · ${quanti} eventi`}
      </button>
    </Foglio>
  )
}
