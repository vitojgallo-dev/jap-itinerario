import { LocateFixed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { faseViaggio } from '../../model/adesso'
import { dataGiorno, formatoData } from '../../model/date'
import { puntiGiorno, puntiViaggio, vicini, type PuntoMappa } from '../../model/mappa'
import { cittaDi } from '../../model/riepilogo'
import { formatoDistanza } from '../../servizi/distanza'
import { useViaggio } from '../../store/viaggio'
import { BarraNav, Gruppo, Riga, Segmentato } from '../../ui/componenti'
import { useAdesso, useTemaRisolto } from '../../ui/hook'
import { vai } from '../../ui/rotta'
import { FoglioTappa } from '../programma/FoglioTappa'
import { MappaLeaflet } from './MappaLeaflet'
import '../programma/editor.css'
import './mappa.css'

type Ambito = 'giorno' | 'viaggio'

export default function Mappa({ indice }: { indice: number | null }) {
  const viaggio = useViaggio(s => s.viaggio)
  const tema = useTemaRisolto(viaggio.impostazioni.tema)
  const fase = faseViaggio(viaggio, useAdesso())
  const [ambito, setAmbito] = useState<Ambito>('giorno')
  const [posizione, setPosizione] = useState<{ lat: number; lng: number } | null>(null)
  const [errorePos, setErrorePos] = useState('')
  const [aperta, setAperta] = useState<{ giornoId: string; tappaId: string } | null>(null)
  const n = viaggio.giorni.length
  const i = Math.min(Math.max(indice ?? (fase.fase === 'durante' ? fase.indice : 0), 0), Math.max(n - 1, 0))
  const punti = useMemo(() => (ambito === 'giorno' ? puntiGiorno(viaggio, i) : puntiViaggio(viaggio)), [viaggio, i, ambito])
  const vicine = useMemo(() => (posizione ? vicini(viaggio, posizione) : []), [viaggio, posizione])
  const apri = (p: PuntoMappa) => setAperta({ giornoId: p.giornoId, tappaId: p.id })

  const localizza = () => {
    if (!navigator.geolocation) { setErrorePos('La posizione non è disponibile su questo dispositivo.'); return }
    navigator.geolocation.getCurrentPosition(
      p => { setPosizione({ lat: p.coords.latitude, lng: p.coords.longitude }); setErrorePos('') },
      () => setErrorePos('Non riesco a leggere la posizione: controlla i permessi del browser.'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const giorno = viaggio.giorni[i]
  return (
    <div className="schermata">
      <BarraNav titolo="Mappa" destra={<button type="button" className="pulsante-icona" onClick={localizza} aria-label="Mostra la mia posizione"><LocateFixed size={22} /></button>} />
      <div className="mappa-controlli">
        <Segmentato<Ambito> etichetta="Cosa mostrare" valore={ambito} onCambia={setAmbito}
          opzioni={[{ valore: 'giorno', etichetta: giorno ? `G${i} · ${cittaDi(viaggio, giorno).nome}` : 'Giorno' }, { valore: 'viaggio', etichetta: 'Tutto il viaggio' }]} />
        {ambito === 'giorno' && n > 0 && (
          <select className="campo-in" value={i} aria-label="Giorno da mostrare" onChange={e => vai('mappa', Number(e.target.value))}>
            {viaggio.giorni.map((g, k) => <option key={g.id} value={k}>G{k} · {formatoData(dataGiorno(viaggio, k), 'breve')} · {g.titolo}</option>)}
          </select>
        )}
      </div>
      <MappaLeaflet punti={punti} percorso={ambito === 'giorno'} posizione={posizione} tema={tema} onApri={apri} />
      {punti.length === 0 && <p className="testo-2" style={{ marginTop: 8 }}>Nessuna tappa con una posizione da mostrare.</p>}
      {errorePos && <p className="errore" style={{ marginTop: 8 }}>{errorePos}</p>}
      {vicine.length > 0 && (
        <Gruppo titolo="Vicino a te">
          {vicine.map(p => <Riga key={p.id} titolo={p.titolo} sottotitolo={`G${p.indice} · ${formatoDistanza(p.km)}`} onClick={() => apri(p)} />)}
        </Gruppo>
      )}
      <FoglioTappa giornoId={aperta?.giornoId ?? null} tappaId={aperta?.tappaId ?? null} onChiudi={() => setAperta(null)} />
    </div>
  )
}
