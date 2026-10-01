import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { aggiornaCitta, eliminaCitta } from '../../model/operazioni'
import type { Citta } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { CercaLuogo } from '../programma/CercaLuogo'
import '../programma/editor.css'

export function EditorCitta({ cittaId, onChiudi }: { cittaId: string | null; onChiudi: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const c = viaggio.citta.find(x => x.id === cittaId)
  const agg = (m: Partial<Omit<Citta, 'id'>>) => c && applica(v => aggiornaCitta(v, c.id, m))
  const elimina = () => {
    if (!c) return
    try {
      applica(v => eliminaCitta(v, c.id))
      onChiudi()
    } catch {
      toast('Questa città ha dei giorni: spostali o eliminali prima.')
    }
  }
  return (
    <Foglio aperto={!!c} onChiudi={onChiudi} titolo={c?.nome || 'Città'} pieno>
      {c && (
        <div className="editor">
          <Campo etichetta="Nome"><input value={c.nome} onChange={e => agg({ nome: e.target.value })} /></Campo>
          <div className="fila">
            <Campo etichetta="Kanji"><input lang="ja" value={c.kanji} onChange={e => agg({ kanji: e.target.value })} /></Campo>
            <Campo etichetta="Rōmaji"><input value={c.romaji} onChange={e => agg({ romaji: e.target.value })} /></Campo>
          </div>
          <div className="fila">
            <Campo etichetta="Colore"><input type="color" value={c.colore} onChange={e => agg({ colore: e.target.value.toUpperCase() })} style={{ padding: 4, height: 44 }} /></Campo>
            <Campo etichetta="Max agosto °C"><input type="number" inputMode="numeric" value={c.clima.max} onChange={e => agg({ clima: { ...c.clima, max: Number(e.target.value) } })} /></Campo>
            <Campo etichetta="Min agosto °C"><input type="number" inputMode="numeric" value={c.clima.min} onChange={e => agg({ clima: { ...c.clima, min: Number(e.target.value) } })} /></Campo>
          </div>
          <CercaLuogo etichetta="Posizione (per meteo e mappa)" luogo={{ nome: `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}`, query: c.nome, lat: c.lat, lng: c.lng }} citta={c}
            onCambia={l => { if (l?.lat != null && l.lng != null) agg({ lat: l.lat, lng: l.lng }) }} />
          <Campo etichetta="Introduzione"><textarea value={c.intro} onChange={e => agg({ intro: e.target.value })} /></Campo>
          <div className="editor-azioni">
            <button type="button" className="pulsante pericolo largo" onClick={elimina}><Trash2 size={18} aria-hidden /> Elimina città</button>
          </div>
        </div>
      )}
    </Foglio>
  )
}
