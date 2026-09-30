import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { faseViaggio } from '../../model/adesso'
import { dataGiorno, formatoData } from '../../model/date'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Avvisi } from '../../ui/Avvisi'
import { BarraNav, TitoloGrande, Vuoto } from '../../ui/componenti'
import { useAdesso } from '../../ui/hook'
import { hrefRotta } from '../../ui/rotta'
import { ExtraGiorno } from './ExtraGiorno'
import { FoglioTappa } from './FoglioTappa'
import { StrisciaGiorni } from './StrisciaGiorni'
import { Timeline } from './Timeline'
import './programma.css'

export default function Programma({ indice }: { indice: number | null }) {
  const viaggio = useViaggio(s => s.viaggio)
  const modifica = useViaggio(s => s.modifica)
  const fase = faseViaggio(viaggio, useAdesso())
  const [aperta, setAperta] = useState<string | null>(null)
  const n = viaggio.giorni.length
  const i = Math.min(Math.max(indice ?? (fase.fase === 'durante' ? fase.indice : 0), 0), Math.max(n - 1, 0))
  useEffect(() => { scrollTo({ top: 0 }) }, [i])

  if (n === 0) {
    return (
      <div className="schermata">
        <BarraNav titolo="Programma" />
        <TitoloGrande>Programma</TitoloGrande>
        <Vuoto titolo="Nessun giorno" testo="Il viaggio non ha ancora giorni." />
      </div>
    )
  }

  const giorno = viaggio.giorni[i]
  const citta = cittaDi(viaggio, giorno)
  const data = dataGiorno(viaggio, i)
  return (
    <div className="schermata">
      <BarraNav titolo={`G${i} · ${citta.nome}`} />
      <StrisciaGiorni viaggio={viaggio} attivo={i} oggi={fase.fase === 'durante' ? fase.indice : null} />
      <TitoloGrande sopra={`${formatoData(data, 'lungo')} · ${citta.nome} ${citta.kanji}`} sotto={giorno.intro || undefined}>
        {giorno.titolo}
      </TitoloGrande>
      <Avvisi avvisi={giorno.avvisi} />
      <Timeline giorno={giorno} data={data} onApri={setAperta} modifica={modifica} />
      <ExtraGiorno giorno={giorno} />
      <nav className="giorno-nav" aria-label="Giorno precedente e successivo">
        {i > 0 ? <a className="pulsante" href={hrefRotta('programma', i - 1)}><ChevronLeft size={18} aria-hidden /> G{i - 1}</a> : <span />}
        {i < n - 1 && <a className="pulsante" href={hrefRotta('programma', i + 1)}>G{i + 1} <ChevronRight size={18} aria-hidden /></a>}
      </nav>
      <FoglioTappa giornoId={giorno.id} tappaId={aperta} onChiudi={() => setAperta(null)} />
    </div>
  )
}
