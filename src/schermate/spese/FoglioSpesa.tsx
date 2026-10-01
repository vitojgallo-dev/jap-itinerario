import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { istanteTokyo } from '../../model/date'
import { aggiornaImpostazioni } from '../../model/operazioni'
import {
  aggiungiSpesa, cambioDaUsare, controllaSpesa, eliminaSpesa, formatoImporto, formatoNumero, leggiImporto, nuovaSpesa, sostituisciSpesa,
} from '../../model/spese'
import { CATEGORIE_SPESA, type MetodoPagamento, type Spesa, type Valuta } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo, Segmentato } from '../../ui/componenti'
import { Foglio } from '../../ui/Foglio'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_CATEGORIA, ICONA_CATEGORIA } from '../../ui/icone'
import '../programma/editor.css'
import './spese.css'

const VALUTE: { valore: Valuta; etichetta: string }[] = [{ valore: 'JPY', etichetta: '¥ Yen' }, { valore: 'EUR', etichetta: '€ Euro' }]
const METODI: { valore: MetodoPagamento; etichetta: string }[] = [{ valore: 'contanti', etichetta: 'Contanti' }, { valore: 'carta', etichetta: 'Carta' }]
const ERRORE_IMPORTO = 'Scrivi un importo maggiore di zero.'

/** Nuova spesa (iniziale null) o modifica. Chi apre il foglio cambia `key` a ogni apertura. */
export function FoglioSpesa({ aperto, iniziale, onChiudi }: { aperto: boolean; iniziale: Spesa | null; onChiudi: () => void }) {
  return (
    <Foglio aperto={aperto} onChiudi={onChiudi} titolo={iniziale ? 'Modifica spesa' : 'Nuova spesa'} pieno>
      {aperto && <EditorSpesa iniziale={iniziale} onFatto={onChiudi} />}
    </Foglio>
  )
}

/** Tre tocchi: l'importo ha già il focus, chi paga, categoria, valuta e metodo sono gli ultimi usati, si divide fra tutti. */
function EditorSpesa({ iniziale, onFatto }: { iniziale: Spesa | null; onFatto: () => void }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const adesso = useAdesso()
  const cambioNoto = cambioDaUsare(viaggio.impostazioni)
  const [b, setB] = useState<Spesa>(() => iniziale ?? nuovaSpesa(viaggio, adesso))
  const [importo, setImporto] = useState(() => (iniziale ? formatoNumero(iniziale.importo) : ''))
  const [cambio, setCambio] = useState(() => (iniziale ? formatoNumero(iniziale.cambio) : ''))
  const [errori, setErrori] = useState<string[]>([])
  const agg = (m: Partial<Spesa>) => { setB(x => ({ ...x, ...m })); setErrori([]) }
  // Il cambio si chiede solo se non se ne conosce nessuno (offline al primo uso); in modifica si può correggere.
  const chiediCambio = iniziale !== null || cambioNoto === null
  const divisa = (id: string) => b.divisaFra.includes(id)
  const alterna = (id: string) => agg({ divisaFra: viaggio.persone.map(p => p.id).filter(x => (x === id ? !divisa(id) : divisa(x))) })

  const salva = () => {
    const s: Spesa = {
      ...b,
      importo: leggiImporto(importo) ?? 0,
      cambio: chiediCambio ? leggiImporto(cambio) ?? 0 : cambioNoto ?? 0,
      descrizione: b.descrizione.trim() || ETICHETTA_CATEGORIA[b.categoria],
    }
    const e = controllaSpesa(s)
    if (e.length) { setErrori(e); return }
    const cambioScrittoOra = iniziale === null && cambioNoto === null
    try {
      applica(v => {
        const conSpesa = iniziale ? sostituisciSpesa(v, s) : aggiungiSpesa(v, s)
        // Il cambio scritto a mano diventa l'ultimo noto: vale per le prossime spese finché la BCE non ne dà uno nuovo.
        return cambioScrittoOra ? aggiornaImpostazioni(conSpesa, { ultimoCambio: { valore: s.cambio, data: istanteTokyo(adesso).data } }) : conSpesa
      })
    } catch {
      // sostituisciSpesa non trova più la spesa: eliminata altrove (un annulla, un backup importato) mentre il foglio era aperto.
      toast('Questa spesa non esiste più: non è stata modificata.')
      onFatto()
      return
    }
    toast(iniziale ? 'Spesa aggiornata' : `Spesa di ${formatoImporto(s.importo, s.valuta)} salvata`)
    onFatto()
  }
  const elimina = () => {
    if (!iniziale) return
    applicaAnnullabile(v => eliminaSpesa(v, iniziale.id), 'Spesa eliminata')
    onFatto()
  }

  return (
    <form className="editor" onSubmit={e => { e.preventDefault(); salva() }}>
      <div className="fila importo-fila">
        <Campo etichetta="Importo">
          <input className="importo-grande" inputMode="decimal" autoFocus value={importo} placeholder="0" aria-invalid={errori.includes(ERRORE_IMPORTO)}
            onChange={e => { setImporto(e.target.value); setErrori([]) }} />
        </Campo>
        <div className="importo-valuta"><Segmentato etichetta="Valuta" valore={b.valuta} opzioni={VALUTE} onCambia={valuta => agg({ valuta })} /></div>
      </div>
      <Campo etichetta="Descrizione">
        <input value={b.descrizione} placeholder={ETICHETTA_CATEGORIA[b.categoria]} onChange={e => agg({ descrizione: e.target.value })} />
      </Campo>
      <div className="campo">
        <span className="etichetta-campo">Categoria</span>
        <div className="scelte" role="radiogroup" aria-label="Categoria">
          {CATEGORIE_SPESA.map(c => {
            const Icona = ICONA_CATEGORIA[c]
            return (
              <button key={c} type="button" role="radio" aria-checked={b.categoria === c} className="scelta" onClick={() => agg({ categoria: c })}>
                <Icona size={18} aria-hidden /> {ETICHETTA_CATEGORIA[c]}
              </button>
            )
          })}
        </div>
      </div>
      <div className="campo">
        <span className="etichetta-campo">Pagato da</span>
        <Segmentato etichetta="Pagato da" valore={b.pagatoDa} opzioni={viaggio.persone.map(p => ({ valore: p.id, etichetta: p.nome || '—' }))} onCambia={pagatoDa => agg({ pagatoDa })} />
      </div>
      <div className="campo">
        <span className="etichetta-campo">Diviso fra</span>
        <div className="scelte persone">
          {viaggio.persone.map(p => (
            <button key={p.id} type="button" className="scelta" aria-pressed={divisa(p.id)} onClick={() => alterna(p.id)}>{p.nome || '—'}</button>
          ))}
        </div>
      </div>
      <div className="campo"><Segmentato etichetta="Pagato in" valore={b.metodo} opzioni={METODI} onCambia={metodo => agg({ metodo })} /></div>
      <Campo etichetta="Data"><input type="date" value={b.data} onChange={e => e.target.value && agg({ data: e.target.value })} /></Campo>
      {chiediCambio && (
        <Campo etichetta="Cambio: quanti yen vale 1 euro">
          <input inputMode="decimal" value={cambio} placeholder="es. 162" onChange={e => { setCambio(e.target.value); setErrori([]) }} />
        </Campo>
      )}
      {errori.map(x => <p key={x} className="errore" role="alert">{x}</p>)}
      <div className="editor-azioni">
        <button type="submit" className="pulsante primario largo">Salva</button>
        {iniziale && <button type="button" className="pulsante pericolo largo" onClick={elimina}><Trash2 size={18} aria-hidden /> Elimina spesa</button>}
      </div>
    </form>
  )
}
