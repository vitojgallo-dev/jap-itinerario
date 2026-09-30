import { MapPin } from 'lucide-react'
import { useState } from 'react'
import type { Citta, Luogo } from '../../model/tipi'
import { cercaLuoghi, type RisultatoLuogo } from '../../servizi/luoghi'
import { Riga } from '../../ui/componenti'

interface Props { etichetta: string; luogo?: Luogo | null; citta: Citta; onCambia: (l: Luogo | undefined) => void }

export function CercaLuogo({ etichetta, luogo, citta, onCambia }: Props) {
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState<'fermo' | 'cerca' | 'errore'>('fermo')
  const [risultati, setRisultati] = useState<RisultatoLuogo[] | null>(null)
  const q = testo.trim()

  const cerca = async () => {
    if (!q) return
    setStato('cerca')
    try {
      setRisultati(await cercaLuoghi(`${q} ${citta.nome}`))
      setStato('fermo')
    } catch {
      setStato('errore')
    }
  }
  const scegli = (l: Luogo) => { onCambia(l); setTesto(''); setRisultati(null) }

  return (
    <div className="cerca-luogo">
      <span className="etichetta-campo">{etichetta}</span>
      {luogo && (
        <div className="luogo-scelto">
          <MapPin size={18} aria-hidden />
          <div>
            <div>{luogo.nome}</div>
            <div className="testo-3">{luogo.lat != null ? 'Con posizione sulla mappa' : 'Senza posizione: solo ricerca per nome'}</div>
          </div>
          <button type="button" className="pulsante-testo" onClick={() => onCambia(undefined)}>Togli</button>
        </div>
      )}
      <div className="fila">
        <input className="campo-in" style={{ flex: 1, minWidth: 0 }} value={testo} placeholder={`Cerca a ${citta.nome}`} aria-label={`Cerca: ${etichetta}`}
          onChange={e => { setTesto(e.target.value); setStato('fermo') }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void cerca() } }} />
        <button type="button" className="pulsante" onClick={() => void cerca()}>{stato === 'cerca' ? 'Cerco…' : 'Cerca'}</button>
      </div>
      {stato === 'errore' && <p className="errore">Ricerca non disponibile. Riprova, o usa il solo nome.</p>}
      {risultati && (risultati.length > 0
        ? <div className="gruppo-corpo risultati">
            {risultati.map((r, i) => <Riga key={i} titolo={r.nome} sottotitolo={r.indirizzo} onClick={() => scegli({ nome: r.nome, query: `${r.nome} ${citta.nome}`, lat: r.lat, lng: r.lng })} />)}
          </div>
        : <p className="testo-2">Nessun risultato per "{q}".</p>)}
      {q && <button type="button" className="pulsante-testo" style={{ justifySelf: 'start' }} onClick={() => scegli({ nome: q, query: `${q} ${citta.nome}` })}>Usa "{q}" senza posizione</button>}
    </div>
  )
}
