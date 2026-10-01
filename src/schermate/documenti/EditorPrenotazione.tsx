import { Camera, Paperclip, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { differenzaGiorni } from '../../model/date'
import { controllaPrenotazione, etichetteDate } from '../../model/prenotazioni'
import { CITTA_SCONOSCIUTA, cittaDi } from '../../model/riepilogo'
import { formatoNumero, leggiImporto } from '../../model/spese'
import { TIPI_PRENOTAZIONE, type Allegato, type Citta, type Prenotazione, type TipoPrenotazione, type Valuta, type Viaggio } from '../../model/tipi'
import { salvaAllegato } from '../../servizi/allegati'
import { linkSicuro } from '../../servizi/mappe'
import { Campo, Segmentato } from '../../ui/componenti'
import { ETICHETTA_PRENOTAZIONE } from '../../ui/icone'
import { CercaLuogo } from '../programma/CercaLuogo'
import { GrigliaAllegati } from './Allegati'
import '../programma/editor.css'
import './documenti.css'

const FUSI = [{ valore: 'Asia/Tokyo', etichetta: 'Ora del Giappone' }, { valore: 'Europe/Rome', etichetta: 'Ora italiana' }]
const STATI: { valore: Prenotazione['stato']; etichetta: string }[] = [{ valore: 'da-prenotare', etichetta: 'Da prenotare' }, { valore: 'prenotata', etichetta: 'Prenotata' }]
const VALUTE: { valore: Valuta; etichetta: string }[] = [{ valore: 'JPY', etichetta: '¥ Yen' }, { valore: 'EUR', etichetta: '€ Euro' }]

const opzioniFuso = (attuale: string) => (FUSI.some(f => f.valore === attuale) ? FUSI : [...FUSI, { valore: attuale, etichetta: attuale }])

/** La città del giorno in cui cade la prenotazione, per cercare il luogo lì intorno. */
function cittaPerData(v: Viaggio, inizio: string | undefined): Citta {
  if (v.giorni.length === 0) return CITTA_SCONOSCIUTA
  const i = inizio ? differenzaGiorni(v.dataPartenza, inizio.slice(0, 10)) : 0
  return cittaDi(v, v.giorni[Math.min(Math.max(i, 0), v.giorni.length - 1)])
}

interface Props {
  viaggio: Viaggio
  iniziale: Prenotazione
  onSalva: (p: Prenotazione) => void
  /** Ogni allegato scritto in IndexedDB: se poi il foglio si chiude senza salvare, chi chiama lo cancella. */
  onAllegato: (id: string) => void
  onElimina?: () => void
}

export function EditorPrenotazione({ viaggio, iniziale, onSalva, onAllegato, onElimina }: Props) {
  const [b, setB] = useState<Prenotazione>(iniziale)
  const [costo, setCosto] = useState(iniziale.costo ? formatoNumero(iniziale.costo.importo) : '')
  const [valutaCosto, setValutaCosto] = useState<Valuta>(iniziale.costo?.valuta ?? 'JPY')
  const [errori, setErrori] = useState<string[]>([])
  const [erroreAllegato, setErroreAllegato] = useState('')
  const [carico, setCarico] = useState(false)
  const foto = useRef<HTMLInputElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const agg = (m: Partial<Prenotazione>) => { setB(x => ({ ...x, ...m })); setErrori([]) }
  const [etInizio, etFine] = etichetteDate(b.tipo)
  const viaggia = b.tipo === 'volo' || b.tipo === 'treno'
  const tappe = viaggio.giorni.flatMap((g, i) => g.tappe.map(t => ({ id: t.id, etichetta: `G${i} · ${t.titolo}` })))

  const aggiungiFile = async (lista: FileList | null) => {
    if (!lista?.length) return
    setCarico(true)
    setErroreAllegato('')
    const nuovi: Allegato[] = []
    for (const f of Array.from(lista)) {
      const r = await salvaAllegato(f)
      if (!r.ok) { setErroreAllegato(r.errore); break }
      nuovi.push(r.allegato)
      onAllegato(r.allegato.id)
    }
    setB(x => ({ ...x, allegati: [...x.allegati, ...nuovi] }))
    setCarico(false)
    if (foto.current) foto.current.value = ''
    if (file.current) file.current.value = ''
  }

  const salva = () => {
    const importo = leggiImporto(costo)
    const messaggi: string[] = []
    if (costo.trim() && (importo === null || importo < 0)) messaggi.push('Il costo non è un numero.')
    const link = (b.link ?? '').trim()
    if (link && !linkSicuro(link)) messaggi.push('Il link deve cominciare con http:// o https://.')
    const pulita: Prenotazione = { ...b, titolo: b.titolo.trim(), link, ...(importo !== null && importo >= 0 ? { costo: { importo, valuta: valutaCosto } } : {}) }
    if (importo === null || importo < 0) delete pulita.costo
    for (const k of ['inizio', 'fine', 'codice', 'riferimento', 'daPrenotareEntro', 'link', 'tappaId'] as const) {
      if (!pulita[k]?.trim()) delete pulita[k]
    }
    if (pulita.codice) pulita.codice = pulita.codice.trim()
    if (!pulita.luogo) delete pulita.luogo
    if (pulita.stato === 'prenotata') delete pulita.daPrenotareEntro
    if (!viaggia || pulita.fusoFine === pulita.fuso) delete pulita.fusoFine
    messaggi.push(...controllaPrenotazione(pulita))
    if (messaggi.length) { setErrori(messaggi); return }
    onSalva(pulita)
  }

  return (
    <form className="editor" onSubmit={e => { e.preventDefault(); salva() }}>
      <Campo etichetta="Tipo">
        <select value={b.tipo} onChange={e => agg({ tipo: e.target.value as TipoPrenotazione })}>
          {TIPI_PRENOTAZIONE.map(t => <option key={t} value={t}>{ETICHETTA_PRENOTAZIONE[t]}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Titolo">
        <input value={b.titolo} placeholder="Volo Roma → Tokyo" autoFocus={!iniziale.titolo} onChange={e => agg({ titolo: e.target.value })} />
      </Campo>
      <div className="campo"><Segmentato etichetta="Stato" valore={b.stato} opzioni={STATI} onCambia={stato => agg({ stato })} /></div>
      <div className="fila">
        <Campo etichetta={etInizio}><input type="datetime-local" value={b.inizio ?? ''} onChange={e => agg({ inizio: e.target.value || undefined })} /></Campo>
        <Campo etichetta={etFine}><input type="datetime-local" value={b.fine ?? ''} onChange={e => agg({ fine: e.target.value || undefined })} /></Campo>
      </div>
      <div className="fila">
        <Campo etichetta={viaggia ? 'Fuso della partenza' : 'Fuso'}>
          <select value={b.fuso} onChange={e => agg({ fuso: e.target.value })}>
            {opzioniFuso(b.fuso).map(f => <option key={f.valore} value={f.valore}>{f.etichetta}</option>)}
          </select>
        </Campo>
        {viaggia && (
          <Campo etichetta="Fuso dell'arrivo">
            <select value={b.fusoFine ?? b.fuso} onChange={e => agg({ fusoFine: e.target.value })}>
              {opzioniFuso(b.fusoFine ?? b.fuso).map(f => <option key={f.valore} value={f.valore}>{f.etichetta}</option>)}
            </select>
          </Campo>
        )}
      </div>
      <CercaLuogo etichetta="Luogo" luogo={b.luogo} citta={cittaPerData(viaggio, b.inizio)} onCambia={luogo => agg({ luogo })} />
      {b.luogo && (
        <Campo etichetta="Indirizzo in giapponese (per il taxi)">
          <input lang="ja" value={b.luogo.indirizzoJa ?? ''} placeholder="京都市東山区祇園町南側555"
            onChange={e => agg({ luogo: { ...b.luogo!, indirizzoJa: e.target.value || undefined } })} />
        </Campo>
      )}
      <Campo etichetta="Codice di conferma">
        <input value={b.codice ?? ''} autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={e => agg({ codice: e.target.value })} />
      </Campo>
      <Campo etichetta="Riferimento">
        <input value={b.riferimento ?? ''} placeholder="AZ 784 · Nozomi 21 carrozza 7 posto 12D" onChange={e => agg({ riferimento: e.target.value })} />
      </Campo>
      {b.stato === 'da-prenotare' && (
        <Campo etichetta="Da prenotare entro">
          <input type="date" value={b.daPrenotareEntro ?? ''} onChange={e => agg({ daPrenotareEntro: e.target.value || undefined })} />
        </Campo>
      )}
      <div className="fila">
        <Campo etichetta="Costo"><input inputMode="decimal" value={costo} placeholder="0" onChange={e => { setCosto(e.target.value); setErrori([]) }} /></Campo>
        <div style={{ flex: 1, minWidth: 150 }}><Segmentato etichetta="Valuta del costo" valore={valutaCosto} opzioni={VALUTE} onCambia={setValutaCosto} /></div>
      </div>
      <Campo etichetta="Link (sito o app della prenotazione)">
        <input type="url" inputMode="url" value={b.link ?? ''} placeholder="https://" onChange={e => agg({ link: e.target.value })} />
      </Campo>
      <Campo etichetta="Tappa collegata">
        <select value={b.tappaId ?? ''} onChange={e => agg({ tappaId: e.target.value || undefined })}>
          <option value="">Nessuna</option>
          {tappe.map(t => <option key={t.id} value={t.id}>{t.etichetta}</option>)}
        </select>
      </Campo>
      <Campo etichetta="Note"><textarea value={b.note} onChange={e => agg({ note: e.target.value })} /></Campo>
      <div className="allegati-editor">
        <span className="etichetta-campo">Allegati (foto del QR, PDF del biglietto)</span>
        <GrigliaAllegati allegati={b.allegati} onTogli={id => agg({ allegati: b.allegati.filter(a => a.id !== id) })} />
        <div className="fila">
          <button type="button" className="pulsante" disabled={carico} onClick={() => foto.current?.click()}><Camera size={18} aria-hidden /> Scatta foto</button>
          <button type="button" className="pulsante" disabled={carico} onClick={() => file.current?.click()}><Paperclip size={18} aria-hidden /> Scegli file</button>
        </div>
        {carico && <p className="testo-2" aria-live="polite">Salvo l'allegato…</p>}
        {erroreAllegato && <p className="errore" role="alert">{erroreAllegato}</p>}
        <input ref={foto} type="file" accept="image/*" capture="environment" hidden onChange={e => void aggiungiFile(e.target.files)} />
        <input ref={file} type="file" accept="image/*,application/pdf" multiple hidden onChange={e => void aggiungiFile(e.target.files)} />
      </div>
      {errori.map(x => <p key={x} className="errore" role="alert">{x}</p>)}
      <div className="editor-azioni">
        <button type="submit" className="pulsante primario largo" disabled={carico}>Salva</button>
        {onElimina && <button type="button" className="pulsante pericolo largo" onClick={onElimina}><Trash2 size={18} aria-hidden /> Elimina prenotazione</button>}
      </div>
    </form>
  )
}
