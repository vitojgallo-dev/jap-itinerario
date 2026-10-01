import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { faseViaggio } from '../../model/adesso'
import { dataGiorno, formatoData } from '../../model/date'
import { aggiungiGiorno } from '../../model/operazioni'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Avvisi } from '../../ui/Avvisi'
import { BarraNav, TitoloGrande, Vuoto } from '../../ui/componenti'
import { useAdesso } from '../../ui/hook'
import { hrefRotta } from '../../ui/rotta'
import { Stanotte } from '../oggi/Stanotte'
import { EditorGiorno } from './EditorGiorno'
import { ExtraGiorno } from './ExtraGiorno'
import { FoglioNuovaTappa, FoglioTappa } from './FoglioTappa'
import { StrisciaGiorni } from './StrisciaGiorni'
import { Timeline } from './Timeline'
import './programma.css'

export default function Programma({ indice }: { indice: number | null }) {
  const viaggio = useViaggio(s => s.viaggio)
  const modifica = useViaggio(s => s.modifica)
  const setModifica = useViaggio(s => s.setModifica)
  const applica = useViaggio(s => s.applica)
  const fase = faseViaggio(viaggio, useAdesso())
  const [aperta, setAperta] = useState<string | null>(null)
  const [nuove, setNuove] = useState(0)
  const [nuovaAperta, setNuovaAperta] = useState(false)
  const n = viaggio.giorni.length
  const i = Math.min(Math.max(indice ?? (fase.fase === 'durante' ? fase.indice : 0), 0), Math.max(n - 1, 0))
  useEffect(() => { scrollTo({ top: 0 }); setAperta(null) }, [i])

  const pulsanteModifica = (
    <button type="button" className="pulsante-testo" onClick={() => setModifica(!modifica)}>{modifica ? 'Fine' : 'Modifica'}</button>
  )

  if (n === 0) {
    return (
      <div className="schermata">
        <BarraNav titolo="Programma" />
        <TitoloGrande>Programma</TitoloGrande>
        <Vuoto titolo="Nessun giorno"
          testo={viaggio.citta.length ? 'Aggiungi il primo giorno del viaggio.' : 'Aggiungi prima una città in Impostazioni.'}
          azione={viaggio.citta.length > 0 && (
            <button type="button" className="pulsante primario" onClick={() => applica(v => aggiungiGiorno(v, -1, v.citta[0].id))}>Aggiungi giorno</button>
          )} />
      </div>
    )
  }

  const giorno = viaggio.giorni[i]
  const citta = cittaDi(viaggio, giorno)
  const data = dataGiorno(viaggio, i)
  return (
    <div className="schermata">
      <BarraNav titolo={`G${i} · ${citta.nome}`} destra={pulsanteModifica} />
      <StrisciaGiorni viaggio={viaggio} attivo={i} oggi={fase.fase === 'durante' ? fase.indice : null} />
      <TitoloGrande sopra={`${formatoData(data, 'lungo')} · ${citta.nome} ${citta.kanji}`} sotto={giorno.intro || undefined}>
        {giorno.titolo}
      </TitoloGrande>
      {modifica && <EditorGiorno indice={i} />}
      <Avvisi avvisi={giorno.avvisi} />
      <Timeline giorno={giorno} data={data} onApri={setAperta} modifica={modifica} />
      {modifica && (
        <button type="button" className="pulsante largo aggiungi-tappa" onClick={() => { setNuove(x => x + 1); setNuovaAperta(true) }}>
          <Plus size={18} aria-hidden /> Aggiungi tappa
        </button>
      )}
      <Stanotte indice={i} />
      <ExtraGiorno giorno={giorno} />
      <nav className="giorno-nav" aria-label="Giorno precedente e successivo">
        {i > 0 ? <a className="pulsante" href={hrefRotta('programma', i - 1)}><ChevronLeft size={18} aria-hidden /> G{i - 1}</a> : <span />}
        {i < n - 1 && <a className="pulsante" href={hrefRotta('programma', i + 1)}>G{i + 1} <ChevronRight size={18} aria-hidden /></a>}
      </nav>
      <FoglioTappa giornoId={giorno.id} tappaId={aperta} onChiudi={() => setAperta(null)} modificabile />
      <FoglioNuovaTappa key={nuove} giornoId={giorno.id} aperto={nuovaAperta} onChiudi={() => setNuovaAperta(false)} />
    </div>
  )
}
