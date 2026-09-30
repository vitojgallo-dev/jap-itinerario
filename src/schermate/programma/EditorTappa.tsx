import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { MODI_SPOSTAMENTO, TIPI_TAPPA, type Citta, type InfoEvento, type ModoSpostamento, type Tappa, type TipoTappa } from '../../model/tipi'
import { Campo } from '../../ui/componenti'
import { ETICHETTA_AFFIDABILITA, ETICHETTA_MODO, ETICHETTA_TIPO } from '../../ui/icone'
import { CercaLuogo } from './CercaLuogo'
import './editor.css'

const numero = (s: string) => (s === '' ? undefined : Math.max(0, Number(s)))

interface Props { iniziale: Tappa; citta: Citta; onSalva: (t: Tappa) => void; onElimina?: () => void }

export function EditorTappa({ iniziale, citta, onSalva, onElimina }: Props) {
  const [b, setB] = useState<Tappa>(iniziale)
  const [errore, setErrore] = useState('')
  const agg = (m: Partial<Tappa>) => setB(x => ({ ...x, ...m }))
  const evento = (m: Partial<InfoEvento>) => agg({ evento: { nome: b.evento?.nome ?? b.titolo, affidabilita: b.evento?.affidabilita ?? 'probabile', ...b.evento, ...m } })

  const salva = () => {
    const titolo = b.titolo.trim()
    if (!titolo) { setErrore('Scrivi un titolo.'); return }
    const pulita: Tappa = { ...b, titolo }
    if (pulita.tipo !== 'evento') delete pulita.evento
    if (!pulita.luogo) delete pulita.luogo
    if (!pulita.spostamento) delete pulita.spostamento
    if (!pulita.biglietti) delete pulita.biglietti
    if (!pulita.foto) delete pulita.foto
    if (pulita.durataMin === undefined) delete pulita.durataMin
    onSalva(pulita)
  }

  return (
    <form className="editor" onSubmit={e => { e.preventDefault(); salva() }}>
      <Campo etichetta="Titolo">
        <input value={b.titolo} placeholder="Tempio Kiyomizu-dera" aria-invalid={!!errore} autoFocus={!iniziale.titolo}
          onChange={e => { agg({ titolo: e.target.value }); setErrore('') }} />
      </Campo>
      {errore && <p className="errore">{errore}</p>}
      <div className="fila">
        <Campo etichetta="Ora"><input type="time" value={b.ora ?? ''} onChange={e => agg({ ora: e.target.value || null })} /></Campo>
        <Campo etichetta="Durata (minuti)"><input type="number" inputMode="numeric" min={0} step={5} value={b.durataMin ?? ''} onChange={e => agg({ durataMin: numero(e.target.value) })} /></Campo>
      </div>
      <Campo etichetta="Tipo">
        <select value={b.tipo} onChange={e => agg({ tipo: e.target.value as TipoTappa })}>
          {TIPI_TAPPA.map(t => <option key={t} value={t}>{ETICHETTA_TIPO[t]}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Descrizione"><textarea value={b.descrizione} onChange={e => agg({ descrizione: e.target.value })} /></Campo>
      <Campo etichetta="Consiglio"><input value={b.consiglio} placeholder="Arrivate presto: dalle 10 c'è la fila" onChange={e => agg({ consiglio: e.target.value })} /></Campo>
      <CercaLuogo etichetta="Luogo" luogo={b.luogo} citta={citta} onCambia={luogo => agg({ luogo })} />
      <div className="fila">
        <Campo etichetta="Poi si va">
          <select value={b.spostamento?.modo ?? ''} onChange={e => agg({ spostamento: e.target.value ? { ...b.spostamento, modo: e.target.value as ModoSpostamento } : undefined })}>
            <option value="">Nessuno spostamento</option>
            {MODI_SPOSTAMENTO.map(m => <option key={m} value={m}>{ETICHETTA_MODO[m]}</option>)}
          </select>
        </Campo>
        {b.spostamento && (
          <Campo etichetta="Minuti">
            <input type="number" inputMode="numeric" min={0} step={5} value={b.spostamento.minuti ?? ''}
              onChange={e => agg({ spostamento: { ...b.spostamento!, minuti: numero(e.target.value) } })} />
          </Campo>
        )}
      </div>
      <label className="interruttore">
        <input type="checkbox" checked={!!b.biglietti} onChange={e => agg({ biglietti: e.target.checked ? { link: b.biglietti?.link ?? null } : undefined })} />
        Serve un biglietto
      </label>
      {b.biglietti && (
        <Campo etichetta="Link dei biglietti (vuoto = cerca online)">
          <input type="url" inputMode="url" value={b.biglietti.link ?? ''} placeholder="https://" onChange={e => agg({ biglietti: { link: e.target.value || null } })} />
        </Campo>
      )}
      {b.tipo === 'evento' && (
        <>
          <Campo etichetta="Nome dell'evento"><input value={b.evento?.nome ?? ''} onChange={e => evento({ nome: e.target.value })} /></Campo>
          <Campo etichetta="Nome in giapponese"><input lang="ja" value={b.evento?.nomeJa ?? ''} onChange={e => evento({ nomeJa: e.target.value || undefined })} /></Campo>
          <Campo etichetta="La data è">
            <select value={b.evento?.affidabilita ?? 'probabile'} onChange={e => evento({ affidabilita: e.target.value as InfoEvento['affidabilita'] })}>
              {(Object.keys(ETICHETTA_AFFIDABILITA) as InfoEvento['affidabilita'][]).map(k => <option key={k} value={k}>{ETICHETTA_AFFIDABILITA[k]}</option>)}
            </select>
          </Campo>
          <Campo etichetta="Fonte (link)"><input type="url" inputMode="url" value={b.evento?.fonte ?? ''} onChange={e => evento({ fonte: e.target.value || undefined })} /></Campo>
        </>
      )}
      <Campo etichetta="Foto (link; vuoto = foto automatica)">
        <input type="url" inputMode="url" value={b.foto ?? ''} onChange={e => agg({ foto: e.target.value || undefined })} />
      </Campo>
      <label className="interruttore">
        <input type="checkbox" checked={b.sera} onChange={e => agg({ sera: e.target.checked })} />
        Tappa serale
      </label>
      <div className="editor-azioni">
        <button type="submit" className="pulsante primario largo">Salva</button>
        {onElimina && <button type="button" className="pulsante pericolo largo" onClick={onElimina}><Trash2 size={18} aria-hidden /> Elimina tappa</button>}
      </div>
    </form>
  )
}
