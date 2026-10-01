import { CalendarClock, CalendarDays, Copy, ExternalLink, MapPinned, Navigation, Wallet } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { formatoData, istanteTokyo } from '../../model/date'
import { aggiornaPrenotazione, descriviIstante, etichetteDate, scadenza, tappaCollegata } from '../../model/prenotazioni'
import { formatoImporto } from '../../model/spese'
import { linkSicuro, urlIndicazioni } from '../../servizi/mappe'
import { useViaggio } from '../../store/viaggio'
import { Badge, BarraNav, Gruppo, LinkIndietro, Riga, Vuoto } from '../../ui/componenti'
import { copia } from '../../ui/copia'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_PRENOTAZIONE, ICONA_PRENOTAZIONE } from '../../ui/icone'
import { hrefRotta, vai } from '../../ui/rotta'
import { GrigliaAllegati } from './Allegati'
import { FoglioPrenotazione } from './FoglioPrenotazione'
import './documenti.css'

export function DettaglioDocumento({ id }: { id: string }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const oggi = istanteTokyo(useAdesso()).data
  const [modifica, setModifica] = useState(false)
  const [chiave, setChiave] = useState(0)
  useEffect(() => { scrollTo({ top: 0 }) }, [id])
  const indietro = <LinkIndietro href={hrefRotta('documenti')} etichetta="Documenti" />
  const p = viaggio.prenotazioni.find(x => x.id === id)
  if (!p) {
    return (
      <div className="schermata">
        <BarraNav titolo="Documento" sinistra={indietro} />
        <Vuoto titolo="Prenotazione non trovata" testo="Forse è stata eliminata." />
      </div>
    )
  }
  const Icona = ICONA_PRENOTAZIONE[p.tipo]
  const [etInizio, etFine] = etichetteDate(p.tipo)
  const link = linkSicuro(p.link)
  const tappa = tappaCollegata(viaggio, p.tappaId)
  const s = scadenza(p, oggi)
  const apri = () => { setChiave(k => k + 1); setModifica(true) }
  const righe: ReactNode[] = [
    p.inizio && <Riga key="inizio" icona={<CalendarDays size={20} />} titolo={descriviIstante(p.inizio, p.fuso)} sottotitolo={etInizio} />,
    p.fine && <Riga key="fine" icona={<CalendarDays size={20} />} titolo={descriviIstante(p.fine, p.fusoFine ?? p.fuso)} sottotitolo={etFine} />,
    p.riferimento && <Riga key="rif" icona={<Copy size={20} />} titolo={p.riferimento} sottotitolo="Riferimento · tocca per copiare" onClick={() => copia(p.riferimento!)} destra={null} />,
    p.luogo && <Riga key="luogo" icona={<Navigation size={20} />} titolo={p.luogo.nome} sottotitolo="Vai: indicazioni in Google Maps" href={urlIndicazioni(p.luogo)} />,
    p.luogo?.indirizzoJa && <Riga key="ja" icona={<Copy size={20} />} titolo={<span lang="ja">{p.luogo.indirizzoJa}</span>} sottotitolo="Indirizzo per il taxi · tocca per copiare" onClick={() => copia(p.luogo!.indirizzoJa!)} destra={null} />,
    link && <Riga key="link" icona={<ExternalLink size={20} />} titolo="Sito o app della prenotazione" href={link} />,
    p.costo && <Riga key="costo" icona={<Wallet size={20} />} titolo={formatoImporto(p.costo.importo, p.costo.valuta)} sottotitolo="Costo" />,
    p.stato === 'da-prenotare' && p.daPrenotareEntro && (
      <Riga key="entro" icona={<CalendarClock size={20} />} titolo={formatoData(p.daPrenotareEntro, 'lungo')} sottotitolo={s === 'scaduta' ? 'La data per prenotare è passata' : 'Da prenotare entro'} />
    ),
    tappa && <Riga key="tappa" icona={<MapPinned size={20} />} titolo={tappa.tappa.titolo} sottotitolo={`Tappa del G${tappa.indice}`} href={hrefRotta('programma', tappa.indice)} />,
  ].filter(Boolean)

  return (
    <div className="schermata">
      <BarraNav titolo={ETICHETTA_PRENOTAZIONE[p.tipo]} sinistra={indietro}
        destra={<button type="button" className="pulsante-testo" onClick={apri}>Modifica</button>} />
      <header className="documento-testa">
        <div className="documento-tipo">
          <Icona size={16} aria-hidden /> {ETICHETTA_PRENOTAZIONE[p.tipo]}
          {p.stato === 'prenotata'
            ? <Badge>Prenotata</Badge>
            : <Badge tono={s === 'scaduta' || s === 'vicina' ? 'pericolo' : 'avviso'}>{s === 'scaduta' ? 'Scaduta' : 'Da prenotare'}</Badge>}
        </div>
        <h1>{p.titolo || 'Senza titolo'}</h1>
      </header>
      {p.codice && (
        <button type="button" className="card documento-codice" onClick={() => copia(p.codice!)} aria-label={`Codice ${p.codice}: tocca per copiare`}>
          <span className="testo-3">Codice · tocca per copiare</span>
          <strong>{p.codice}</strong>
        </button>
      )}
      {p.stato === 'da-prenotare' && (
        <div className="fila documento-azioni">
          {link && <a className="pulsante primario" href={link} target="_blank" rel="noreferrer"><ExternalLink size={18} aria-hidden /> Prenota</a>}
          <button type="button" className={'pulsante' + (link ? '' : ' primario')} onClick={() => applica(v => aggiornaPrenotazione(v, p.id, { stato: 'prenotata' }))}>
            Segna come prenotata
          </button>
        </div>
      )}
      {righe.length > 0 && <Gruppo>{righe}</Gruppo>}
      {p.note && <Gruppo titolo="Note"><p className="documento-note">{p.note}</p></Gruppo>}
      <section className="gruppo">
        <h2 className="gruppo-titolo">Allegati</h2>
        {p.allegati.length > 0
          ? <GrigliaAllegati allegati={p.allegati} />
          : <p className="testo-2 documento-vuoto">Nessun allegato: da Modifica aggiungi la foto del QR o il PDF del biglietto.</p>}
      </section>
      <FoglioPrenotazione key={chiave} aperto={modifica} iniziale={p} onChiudi={() => setModifica(false)} onEliminata={() => vai('documenti')} />
    </div>
  )
}
