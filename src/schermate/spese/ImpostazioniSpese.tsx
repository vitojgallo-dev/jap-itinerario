import { useEffect, useState } from 'react'
import { formatoData } from '../../model/date'
import { aggiornaImpostazioni } from '../../model/operazioni'
import { CAMBIO_PLAUSIBILE, ERRORE_CAMBIO_FUORI_INTERVALLO, cambioPlausibile, formatoNumero, formatoNumeroPieno, leggiImporto, leggiTasso } from '../../model/spese'
import type { Impostazioni, Valuta } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo, Gruppo, Segmentato } from '../../ui/componenti'
import '../programma/editor.css'
import './spese.css'

const VALUTE: { valore: Valuta; etichetta: string }[] = [{ valore: 'JPY', etichetta: '¥ Yen' }, { valore: 'EUR', etichetta: '€ Euro' }]

/**
 * Un numero scritto con la virgola, salvato quando si esce dal campo. Vuoto = tolto; uguale a quello salvato = non si fa niente
 * (niente arrotondamenti, e l'annulla resta com'era); un testo non valido resta nel campo con l'errore.
 * `tasso`: si legge con `leggiTasso` (solo decimali) e deve stare nell'intervallo dei cambi plausibili.
 */
function CampoNumero({ etichetta, valore, onCambia, tasso }: { etichetta: string; valore: number | undefined; onCambia: (n: number | null) => void; tasso?: boolean }) {
  const mostra = (v: number | undefined) => (v !== undefined ? formatoNumeroPieno(v) : '')
  const [testo, setTesto] = useState(mostra(valore))
  const [errore, setErrore] = useState<string | null>(null)
  // Se il valore cambia altrove (un backup importato), il campo lo segue.
  useEffect(() => { setTesto(mostra(valore)); setErrore(null) }, [valore])
  const esci = () => {
    if (testo.trim() === '') { setErrore(null); if (valore !== undefined) onCambia(null); return }
    const n = tasso ? leggiTasso(testo) : leggiImporto(testo)
    if (n === null || n <= 0) { setErrore('Scrivi un numero maggiore di zero, o lascia vuoto.'); return }
    if (tasso && !cambioPlausibile(n)) { setErrore(ERRORE_CAMBIO_FUORI_INTERVALLO); return }
    setErrore(null)
    if (n !== valore) onCambia(n)
  }
  return (
    <div className="campo-numero">
      <Campo etichetta={etichetta}>
        <input inputMode="decimal" value={testo} aria-invalid={errore !== null} onChange={e => { setTesto(e.target.value); setErrore(null) }} onBlur={esci}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
      </Campo>
      {errore && <p className="errore" role="alert">{errore}</p>}
    </div>
  )
}

/** Budget di ogni giorno e cambio manuale, in fondo alle Spese. */
export function ImpostazioniSpese() {
  const imp = useViaggio(s => s.viaggio.impostazioni)
  const applica = useViaggio(s => s.applica)
  const budget = imp.budgetGiornaliero
  const [valuta, setValuta] = useState<Valuta>(budget?.valuta ?? 'JPY')
  const imposta = (m: Partial<Impostazioni>) => applica(v => aggiornaImpostazioni(v, m))
  const ultimo = imp.ultimoCambio
  const piede = ultimo
    ? `Ultimo cambio, del ${formatoData(ultimo.data, 'breve')}: 1 € = ${formatoNumero(ultimo.valore)} ¥ (BCE, o quello scritto in una spesa). Il cambio manuale vince su tutti; ogni spesa tiene il cambio del suo momento.`
    : 'Nessun cambio scaricato ancora: scrivilo qui, o riapri le Spese con la rete.'
  return (
    <Gruppo titolo="Budget e cambio" piede={piede}>
      <div style={{ padding: '4px 16px 8px' }}>
        <div className="fila">
          <CampoNumero etichetta="Budget di ogni giorno" valore={budget?.importo}
            onCambia={n => imposta({ budgetGiornaliero: n !== null ? { importo: n, valuta } : undefined })} />
          <div style={{ flex: 1, minWidth: 150 }}>
            <Segmentato etichetta="Valuta del budget" valore={valuta} opzioni={VALUTE}
              onCambia={x => { setValuta(x); if (budget) imposta({ budgetGiornaliero: { ...budget, valuta: x } }) }} />
          </div>
        </div>
        <CampoNumero tasso etichetta={`Cambio manuale (¥ per 1 €, da ${CAMBIO_PLAUSIBILE.min} a ${CAMBIO_PLAUSIBILE.max}; vuoto = automatico)`} valore={imp.cambioManuale}
          onCambia={n => imposta({ cambioManuale: n ?? undefined })} />
      </div>
    </Gruppo>
  )
}
