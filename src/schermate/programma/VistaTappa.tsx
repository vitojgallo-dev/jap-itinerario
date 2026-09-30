import { Footprints, Info, MapPin, Navigation, Ticket } from 'lucide-react'
import { promemoriaBiglietto } from '../../model/adesso'
import { formatoDurata, istanteTokyo } from '../../model/date'
import { aggiornaTappa } from '../../model/operazioni'
import type { Giorno, StatoTappa, Tappa } from '../../model/tipi'
import { hrefBiglietti, linkSicuro, urlCerca, urlIndicazioni } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Badge, Campo, Gruppo, Riga, Segmentato } from '../../ui/componenti'
import { FotoLuogo } from '../../ui/FotoLuogo'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_AFFIDABILITA, ETICHETTA_TIPO } from '../../ui/icone'
import { testoPromemoria } from './CardTappa'

const STATI: { valore: StatoTappa; etichetta: string }[] = [
  { valore: 'da-fare', etichetta: 'Da fare' },
  { valore: 'fatta', etichetta: 'Fatta' },
  { valore: 'saltata', etichetta: 'Saltata' },
]

export function VistaTappa({ giorno, tappa, data }: { giorno: Giorno; tappa: Tappa; data: string }) {
  const applica = useViaggio(s => s.applica)
  const oggi = istanteTokyo(useAdesso()).data
  const agg = (m: Partial<Tappa>) => applica(v => aggiornaTappa(v, giorno.id, tappa.id, m))
  const l = tappa.luogo
  const fonte = linkSicuro(tappa.evento?.fonte)
  const righe = [
    l && <Riga key="mezzi" icona={<Navigation size={20} />} titolo="Indicazioni coi mezzi" href={urlIndicazioni(l, 'transit')} />,
    l && <Riga key="piedi" icona={<Footprints size={20} />} titolo="Indicazioni a piedi" href={urlIndicazioni(l, 'walking')} />,
    l && <Riga key="maps" icona={<MapPin size={20} />} titolo="Apri in Google Maps" sottotitolo={l.query} href={urlCerca(l)} />,
    tappa.biglietti && (
      <Riga key="biglietti" icona={<Ticket size={20} />} titolo={linkSicuro(tappa.biglietti.link) ? 'Sito dei biglietti' : 'Cerca i biglietti'}
        sottotitolo={testoPromemoria(promemoriaBiglietto(data, oggi)) || undefined}
        href={hrefBiglietti(tappa)} />
    ),
    fonte && <Riga key="fonte" icona={<Info size={20} />} titolo="Fonte dell'evento" href={fonte} />,
  ].filter(Boolean)

  return (
    <>
      {l && tappa.tipo !== 'spostamento' && <FotoLuogo query={l.query} override={tappa.foto} className="vista-foto" alt={tappa.titolo} />}
      <div className="vista-meta">
        {tappa.ora && <strong>{tappa.ora}</strong>}
        {tappa.durataMin ? <span>· {formatoDurata(tappa.durataMin)}</span> : null}
        <span>· {ETICHETTA_TIPO[tappa.tipo]}</span>
      </div>
      <h2 className="vista-titolo">{tappa.titolo}</h2>
      {tappa.evento && (
        <p className="fila">
          <Badge tono={tappa.evento.affidabilita === 'certa' ? 'tinta' : 'avviso'}>{ETICHETTA_AFFIDABILITA[tappa.evento.affidabilita]}</Badge>
          {tappa.evento.nomeJa && <span className="kanji" lang="ja">{tappa.evento.nomeJa}</span>}
        </p>
      )}
      {tappa.descrizione && <p className="vista-testo">{tappa.descrizione}</p>}
      {tappa.consiglio && <p className="consiglio">{tappa.consiglio}</p>}
      <div className="vista-stato">
        <Segmentato etichetta="Stato della tappa" valore={tappa.stato} opzioni={STATI} onCambia={stato => agg({ stato })} />
      </div>
      <Campo etichetta="La tua nota">
        <textarea value={tappa.nota} onChange={e => agg({ nota: e.target.value })} placeholder="Com'era, cosa ricordare…" />
      </Campo>
      {righe.length > 0 && <Gruppo>{righe}</Gruppo>}
    </>
  )
}
