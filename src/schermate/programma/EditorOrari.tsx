import { Copy, Search } from 'lucide-react'
import { useState } from 'react'
import { SETTIMANA } from '../../model/date'
import { ORDINE_SETTIMANA } from '../../model/orari'
import type { Luogo, OrariTappa } from '../../model/tipi'
import { cercaOrariOsm, type OrarioOsm } from '../../servizi/osm'
import { Campo } from '../../ui/componenti'
import { copia } from '../../ui/copia'

interface Props {
  orari?: OrariTappa
  /** Testi con cui cercare il nome su OSM (il titolo della tappa); si aggiungono nome e query del luogo. */
  testi: string[]
  luogo?: Luogo
  onCambia: (o: OrariTappa) => void
}

/** Giorni di chiusura, apertura, chiusura e nota. I campi vuoti li toglie il Salva della tappa (`orariPuliti`). */
export function EditorOrari({ orari, testi, luogo, onCambia }: Props) {
  const o: OrariTappa = orari ?? { chiusoIl: [] }
  const [stato, setStato] = useState<'fermo' | 'cerca' | 'errore'>('fermo')
  const [trovati, setTrovati] = useState<OrarioOsm[] | null>(null)
  const agg = (m: Partial<OrariTappa>) => onCambia({ ...o, ...m, fonte: m.fonte ?? 'manuale' })
  const alterna = (g: number) => agg({ chiusoIl: o.chiusoIl.includes(g) ? o.chiusoIl.filter(x => x !== g) : [...o.chiusoIl, g] })
  const lat = luogo?.lat
  const lng = luogo?.lng
  const cerca = async () => {
    if (stato === 'cerca' || lat == null || lng == null || !luogo) return
    setStato('cerca')
    try {
      setTrovati(await cercaOrariOsm([...testi, luogo.nome, luogo.query], lat, lng))
      setStato('fermo')
    } catch {
      setStato('errore')
    }
  }
  return (
    <fieldset className="orari">
      <legend className="etichetta-campo">Orari di apertura</legend>
      <div className="giorni-chiusi" role="group" aria-label="Giorni di chiusura">
        {ORDINE_SETTIMANA.map(g => (
          <button key={g} type="button" className="giorno-chiuso" aria-pressed={o.chiusoIl.includes(g)}
            aria-label={`Chiuso ${g === 0 ? 'la' : 'il'} ${SETTIMANA[g]}`} onClick={() => alterna(g)}>
            {SETTIMANA[g].slice(0, 3)}
          </button>
        ))}
      </div>
      <p className="testo-3">Tocca i giorni in cui è chiuso.</p>
      <div className="fila">
        <Campo etichetta="Apre"><input type="time" value={o.apre ?? ''} onChange={e => agg({ apre: e.target.value || undefined })} /></Campo>
        <Campo etichetta="Chiude"><input type="time" value={o.chiude ?? ''} onChange={e => agg({ chiude: e.target.value || undefined })} /></Campo>
      </div>
      <Campo etichetta="Nota sugli orari">
        <input value={o.nota ?? ''} placeholder="Molti banchi chiusi il mercoledì e i festivi" onChange={e => agg({ nota: e.target.value })} />
      </Campo>
      {lat != null && lng != null
        ? (
          <button type="button" className="pulsante" disabled={stato === 'cerca'} onClick={() => void cerca()}>
            <Search size={18} aria-hidden /> {stato === 'cerca' ? 'Cerco…' : 'Cerca orari su OpenStreetMap'}
          </button>
        )
        : <p className="testo-3">Per cercare gli orari su OpenStreetMap serve un luogo con la posizione.</p>}
      {stato === 'errore' && <p className="errore">OpenStreetMap non è disponibile adesso: riprova più tardi.</p>}
      {trovati && (trovati.length === 0
        ? <p className="testo-2">Niente orari con questo nome entro 300 m.</p>
        : (
          <div className="gruppo-corpo orari-osm">
            {trovati.map((t, i) => (
              <div key={i} className="orario-osm">
                <div><strong>{t.nome || 'Senza nome'}</strong><code>{t.orari}</code></div>
                <div className="fila">
                  <button type="button" className="pulsante piccolo" onClick={() => copia(t.orari)}><Copy size={16} aria-hidden /> Copia</button>
                  <button type="button" className="pulsante piccolo" onClick={() => agg({ nota: t.orari, fonte: 'osm' })}>Metti nella nota</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      {trovati && trovati.length > 0 && <p className="testo-3">Gli orari di OpenStreetMap sono mostrati così come sono: riportali nei campi qui sopra.</p>}
    </fieldset>
  )
}
