import { ArrowLeft, ArrowRight, Copy, Plus, Trash2 } from 'lucide-react'
import { aggiornaAlloggio, aggiornaGiorno, aggiungiGiorno, duplicaGiorno, eliminaGiorno, spostaGiorno } from '../../model/operazioni'
import { cittaDi } from '../../model/riepilogo'
import type { Giorno } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo } from '../../ui/componenti'
import { vai } from '../../ui/rotta'
import { CercaLuogo } from './CercaLuogo'
import './editor.css'

export function EditorGiorno({ indice }: { indice: number }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const giorno = viaggio.giorni[indice]
  const n = viaggio.giorni.length
  const agg = (m: Partial<Omit<Giorno, 'id' | 'tappe'>>) => applica(v => aggiornaGiorno(v, giorno.id, m))

  return (
    <section className="card editor-giorno" aria-label="Modifica il giorno">
      <Campo etichetta="Titolo del giorno"><input value={giorno.titolo} onChange={e => agg({ titolo: e.target.value })} /></Campo>
      <Campo etichetta="Città">
        <select value={giorno.cittaId} onChange={e => agg({ cittaId: e.target.value })}>
          {viaggio.citta.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Introduzione"><textarea value={giorno.intro} onChange={e => agg({ intro: e.target.value })} /></Campo>
      <CercaLuogo etichetta="Hotel della sera" luogo={giorno.alloggio} citta={cittaDi(viaggio, giorno)} onCambia={l => agg({ alloggio: l ?? null })} />
      {giorno.alloggio && (
        <Campo etichetta="Indirizzo dell'hotel in giapponese (per il taxi)">
          <input lang="ja" value={giorno.alloggio.indirizzoJa ?? ''} placeholder="東京都台東区西浅草3-17-1"
            onChange={e => applica(v => aggiornaAlloggio(v, giorno.alloggio!.nome, { indirizzoJa: e.target.value || undefined }))} />
        </Campo>
      )}
      <div className="editor-giorno-azioni">
        <button type="button" className="pulsante piccolo" onClick={() => { applica(v => aggiungiGiorno(v, indice, giorno.cittaId)); vai('programma', indice + 1) }}>
          <Plus size={16} aria-hidden /> Giorno dopo
        </button>
        <button type="button" className="pulsante piccolo" onClick={() => { applica(v => duplicaGiorno(v, giorno.id)); vai('programma', indice + 1) }}>
          <Copy size={16} aria-hidden /> Duplica
        </button>
        {indice > 0 && (
          <button type="button" className="pulsante piccolo" onClick={() => { applica(v => spostaGiorno(v, indice, indice - 1)); vai('programma', indice - 1) }}>
            <ArrowLeft size={16} aria-hidden /> Sposta prima
          </button>
        )}
        {indice < n - 1 && (
          <button type="button" className="pulsante piccolo" onClick={() => { applica(v => spostaGiorno(v, indice, indice + 1)); vai('programma', indice + 1) }}>
            Sposta dopo <ArrowRight size={16} aria-hidden />
          </button>
        )}
        <button type="button" className="pulsante piccolo pericolo" onClick={() => { applicaAnnullabile(v => eliminaGiorno(v, giorno.id), `G${indice} eliminato`); vai('programma', Math.max(0, indice - 1)) }}>
          <Trash2 size={16} aria-hidden /> Elimina giorno
        </button>
      </div>
    </section>
  )
}
