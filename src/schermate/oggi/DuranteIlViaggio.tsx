import { Check, Circle } from 'lucide-react'
import { useState } from 'react'
import { tappeAdessoDopo } from '../../model/adesso'
import { dataGiorno, formatoData, formatoDurata, istanteTokyo } from '../../model/date'
import { aggiornaTappa } from '../../model/operazioni'
import { avvisoApertura } from '../../model/orari'
import { cittaDi } from '../../model/riepilogo'
import { useViaggio } from '../../store/viaggio'
import { Avvisi } from '../../ui/Avvisi'
import { BarraNav, Gruppo, LinkImpostazioni, Riga, TitoloGrande } from '../../ui/componenti'
import { hrefRotta } from '../../ui/rotta'
import { FoglioTappa } from '../programma/FoglioTappa'
import { CardAdesso } from './CardAdesso'
import { CardProssimo } from './CardProssimo'
import { Meteo } from './Meteo'
import { Stanotte } from './Stanotte'

export function DuranteIlViaggio({ indice, adesso }: { indice: number; adesso: Date }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const [aperta, setAperta] = useState<string | null>(null)
  const giorno = viaggio.giorni[indice]
  const citta = cittaDi(viaggio, giorno)
  const data = dataGiorno(viaggio, indice)
  const { data: oggi, minuti } = istanteTokyo(adesso)
  const { adesso: ora, dopo, minutiAlDopo } = tappeAdessoDopo(giorno.tappe, minuti)
  const fatta = (id: string) => applica(v => aggiornaTappa(v, giorno.id, id, { stato: 'fatta' }))
  const spostamento = ora?.spostamento?.minuti ? ` · ${formatoDurata(ora.spostamento.minuti)} di strada` : ''

  return (
    <div className="schermata">
      <BarraNav titolo={`${citta.nome} · G${indice}`} sinistra={<LinkImpostazioni />} />
      <TitoloGrande sopra={formatoData(data, 'lungo')} sotto={giorno.titolo}>
        <span className="kanji">{citta.kanji}</span> {citta.nome}
      </TitoloGrande>
      <Meteo citta={citta} data={data} oggi={oggi} />
      <Avvisi avvisi={giorno.avvisi} />
      <CardProssimo adesso={adesso} />
      {ora && <CardAdesso etichetta="Adesso" tappa={ora} avviso={avvisoApertura(ora, data)} onApri={() => setAperta(ora.id)} onFatto={() => fatta(ora.id)} />}
      {dopo && (
        <CardAdesso secondaria tappa={dopo} avviso={avvisoApertura(dopo, data)} onApri={() => setAperta(dopo.id)}
          etichetta={`Dopo${minutiAlDopo && minutiAlDopo > 0 ? ` · fra ${formatoDurata(minutiAlDopo)}` : ''}${spostamento}`} />
      )}
      {!ora && !dopo && <div className="card vuoto"><strong>Giornata finita</strong><p>Riposatevi: domani si riparte.</p></div>}
      {giorno.tappe.length > 0 && (
        <Gruppo titolo="Tutta la giornata" piede={<a href={hrefRotta('programma', indice)}>Apri nel Programma</a>}>
          {giorno.tappe.map(t => (
            <Riga key={t.id} icona={t.stato === 'fatta' ? <Check size={18} /> : <Circle size={18} />} titolo={t.titolo}
              sottotitolo={[t.ora, t.stato === 'saltata' ? 'saltata' : ''].filter(Boolean).join(' · ') || undefined} onClick={() => setAperta(t.id)} />
          ))}
        </Gruppo>
      )}
      <Stanotte indice={indice} />
      <FoglioTappa giornoId={giorno.id} tappaId={aperta} onChiudi={() => setAperta(null)} />
    </div>
  )
}
