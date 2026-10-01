import { useEffect, useState } from 'react'
import { formatoData } from '../../model/date'
import { aggiornaImpostazioni } from '../../model/operazioni'
import { formatoNumero, leggiImporto } from '../../model/spese'
import type { Impostazioni, Valuta } from '../../model/tipi'
import { useViaggio } from '../../store/viaggio'
import { Campo, Gruppo, Segmentato } from '../../ui/componenti'

const VALUTE: { valore: Valuta; etichetta: string }[] = [{ valore: 'JPY', etichetta: '¥ Yen' }, { valore: 'EUR', etichetta: '€ Euro' }]

/** Un numero scritto con la virgola, salvato quando si esce dal campo. */
function CampoNumero({ etichetta, valore, onCambia }: { etichetta: string; valore: number | undefined; onCambia: (n: number | null) => void }) {
  const [testo, setTesto] = useState(valore !== undefined ? formatoNumero(valore) : '')
  // Se il valore cambia altrove (un backup importato), il campo lo segue.
  useEffect(() => { setTesto(valore !== undefined ? formatoNumero(valore) : '') }, [valore])
  return (
    <Campo etichetta={etichetta}>
      <input inputMode="decimal" value={testo} onChange={e => setTesto(e.target.value)} onBlur={() => onCambia(leggiImporto(testo))}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
    </Campo>
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
            onCambia={n => imposta({ budgetGiornaliero: n !== null && n > 0 ? { importo: n, valuta } : undefined })} />
          <div style={{ flex: 1, minWidth: 150 }}>
            <Segmentato etichetta="Valuta del budget" valore={valuta} opzioni={VALUTE}
              onCambia={x => { setValuta(x); if (budget) imposta({ budgetGiornaliero: { ...budget, valuta: x } }) }} />
          </div>
        </div>
        <CampoNumero etichetta="Cambio manuale (¥ per 1 €, vuoto = automatico)" valore={imp.cambioManuale}
          onCambia={n => imposta({ cambioManuale: n !== null && n > 0 ? n : undefined })} />
      </div>
    </Gruppo>
  )
}
