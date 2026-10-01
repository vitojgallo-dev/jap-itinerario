import { Banknote, CreditCard, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { differenzaGiorni, formatoData, istanteTokyo } from '../../model/date'
import { aggiornaImpostazioni } from '../../model/operazioni'
import {
  aggiungiSpesa, cambioDaUsare, dataPredefinita, eliminaSpesa, formatoEuro, formatoImporto, formatoYen, inYen,
  riepilogoSpese, rimborsiMinimi, rimborsoDaSaldare, saldi, spesaRimborso, type Rimborso,
} from '../../model/spese'
import type { MetodoPagamento, Spesa } from '../../model/tipi'
import { scaricaCambio } from '../../servizi/cambio'
import { useViaggio } from '../../store/viaggio'
import { BarraNav, Gruppo, Riga, Segmentato, TitoloGrande, Vuoto } from '../../ui/componenti'
import { useAdesso } from '../../ui/hook'
import { ETICHETTA_CATEGORIA, ICONA_CATEGORIA } from '../../ui/icone'
import { HREF_NUOVA_SPESA, hrefRotta, sostituisciRotta } from '../../ui/rotta'
import { riduciMovimento, useScorrimento } from '../../ui/scorrimento'
import { FoglioSpesa } from './FoglioSpesa'
import { ImpostazioniSpese } from './ImpostazioniSpese'
import './spese.css'

type Filtro = 'tutte' | MetodoPagamento
const FILTRI: { valore: Filtro; etichetta: string }[] = [
  { valore: 'tutte', etichetta: 'Tutte' }, { valore: 'contanti', etichetta: 'Contanti' }, { valore: 'carta', etichetta: 'Carta' },
]

// Una richiesta sola per apertura dell'app; offline resta l'ultimo cambio salvato.
let cambioChiesto = false

function useCambioDelGiorno() {
  const applica = useViaggio(s => s.applica)
  useEffect(() => {
    if (cambioChiesto) return
    cambioChiesto = true
    void scaricaCambio().then(c => {
      if (!c) return
      const attuale = useViaggio.getState().viaggio.impostazioni.ultimoCambio
      if (c.valore !== attuale?.valore || c.data !== attuale?.data) applica(v => aggiornaImpostazioni(v, { ultimoCambio: c }))
    })
  }, [applica])
}

/** Una riga: scorrendo verso sinistra oltre 96 px si elimina (con "Annulla"); il tocco apre la modifica. */
function RigaSpesa({ spesa, nome, onApri, onElimina }: { spesa: Spesa; nome: string; onApri: () => void; onElimina: () => void }) {
  const { gestori, dx, oltre } = useScorrimento({ versi: ['sinistra'], soglia: 96, onScatta: onElimina })
  const Icona = ICONA_CATEGORIA[spesa.categoria]
  const sposta = dx !== 0 && !riduciMovimento()
  return (
    <div className={'spesa-scorri' + (oltre ? ' oltre' : '')}>
      <div className="spesa-scorri-sotto" aria-hidden><Trash2 size={18} /> Elimina</div>
      <button type="button" className="riga spesa-riga" onClick={onApri} {...gestori} style={sposta ? { transform: `translateX(${dx}px)` } : undefined}>
        <span className="riga-icona" aria-hidden><Icona size={20} /></span>
        <span className="riga-testo">
          <span>{spesa.descrizione}</span>
          <span className="riga-sotto" style={{ display: 'block' }}>{spesa.rimborso ? `Rimborso pagato da ${nome}` : `${nome} · ${spesa.metodo}`}</span>
        </span>
        <span className="riga-destra spesa-importo">
          <span>{formatoImporto(spesa.importo, spesa.valuta)}</span>
          {spesa.valuta === 'EUR' && <small>≈ {formatoYen(inYen(spesa))}</small>}
        </span>
      </button>
    </div>
  )
}

function Budget({ spesoYen, budgetYen, titolo }: { spesoYen: number; budgetYen: number; titolo: string }) {
  const oltre = spesoYen > budgetYen
  return (
    <div className="card budget">
      <div className="budget-testa">
        <strong>{titolo}</strong>
        <span className={oltre ? 'budget-oltre' : 'testo-2'}>{formatoYen(spesoYen)} di {formatoYen(budgetYen)}</span>
      </div>
      <div className="budget-barra" role="progressbar" aria-label={`Budget: ${titolo}`} aria-valuemin={0} aria-valuemax={Math.round(budgetYen)}
        aria-valuenow={Math.round(Math.min(spesoYen, budgetYen))}>
        <div className={oltre ? 'oltre' : undefined} style={{ width: `${Math.min(100, (spesoYen / budgetYen) * 100)}%` }} />
      </div>
      <p className="testo-3">{oltre ? `Oltre il budget di ${formatoYen(spesoYen - budgetYen)}` : `Restano ${formatoYen(budgetYen - spesoYen)}`}</p>
    </div>
  )
}

export default function Spese({ id }: { id: string | null }) {
  const viaggio = useViaggio(s => s.viaggio)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const adesso = useAdesso()
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [foglio, setFoglio] = useState<{ spesa: Spesa | null } | null>(null)
  const [chiave, setChiave] = useState(0)
  useCambioDelGiorno()
  const apri = (spesa: Spesa | null) => {
    setChiave(k => k + 1)
    setFoglio({ spesa })
  }
  // #/spese/nuova (dal tasto "+" o dalla scorciatoia dell'icona) apre subito il foglio.
  useEffect(() => { if (id === 'nuova') apri(null) }, [id])
  const chiudi = () => {
    setFoglio(null)
    if (location.hash === HREF_NUOVA_SPESA) sostituisciRotta(hrefRotta('spese'))
  }

  const nome = (pid: string) => viaggio.persone.find(p => p.id === pid)?.nome || '—'
  const cambio = cambioDaUsare(viaggio.impostazioni)
  const visibili = filtro === 'tutte' ? viaggio.spese : viaggio.spese.filter(s => s.metodo === filtro)
  const r = riepilogoSpese(visibili)
  const perMetodo = riepilogoSpese(viaggio.spese).perMetodo
  const rimborsi = rimborsiMinimi(saldi(viaggio.persone, viaggio.spese))
  const oggi = dataPredefinita(viaggio, adesso)
  const spesoOggi = riepilogoSpese(viaggio.spese.filter(s => s.data === oggi)).yen
  const budget = viaggio.impostazioni.budgetGiornaliero
  // Prima della partenza la data predefinita è il G0: dirlo, non scrivere "Oggi".
  const primaDellaPartenza = differenzaGiorni(viaggio.dataPartenza, istanteTokyo(adesso).data) < 0
  const titoloBudget = `${primaDellaPartenza ? 'G0' : 'Oggi'} · ${formatoData(oggi, 'breve')}`
  const budgetYen = !budget ? null : budget.valuta === 'JPY' ? budget.importo : cambio ? budget.importo * cambio : null
  // Un rimborso è una spesa: gli serve un cambio, quello di adesso o quello dell'ultima spesa.
  const cambioRimborsi = cambio ?? viaggio.spese[viaggio.spese.length - 1]?.cambio ?? null
  const equivalente = (yen: number) => (cambioRimborsi ? ` · ≈ ${formatoEuro(yen / cambioRimborsi)}` : '')
  // Il blocco evita due tocchi ravvicinati sullo stesso bottone; il resto lo fa rimborsoDaSaldare, che guarda i saldi di adesso.
  const saldando = useRef(false)
  const salda = (x: Rimborso) => {
    if (saldando.current) return
    const v = useViaggio.getState().viaggio
    const attuale = rimborsoDaSaldare(v, x.da, x.a)
    const cambioOra = cambioDaUsare(v.impostazioni) ?? v.spese[v.spese.length - 1]?.cambio ?? null
    if (!attuale || !cambioOra) return
    saldando.current = true
    setTimeout(() => { saldando.current = false }, 800)
    applicaAnnullabile(u => aggiungiSpesa(u, spesaRimborso(attuale, oggi, cambioOra)), `${nome(x.da)} ha saldato ${nome(x.a)}`)
  }
  const elimina = (s: Spesa) => applicaAnnullabile(v => eliminaSpesa(v, s.id), 'Spesa eliminata')
  const giornoDelViaggio = (data: string) => {
    const i = differenzaGiorni(viaggio.dataPartenza, data)
    return i >= 0 && i < viaggio.giorni.length ? ` · G${i}` : ''
  }

  return (
    <div className="schermata">
      <BarraNav titolo="Spese" />
      <TitoloGrande>Spese</TitoloGrande>
      {viaggio.spese.length === 0 ? (
        <Vuoto titolo="Ancora nessuna spesa" testo="Importo, chi ha pagato, salva: si divide fra tutti e i conti li fa l'app."
          azione={<button type="button" className="pulsante primario" onClick={() => apri(null)}>Aggiungi una spesa</button>} />
      ) : (
        <>
          <div className="spese-filtro"><Segmentato<Filtro> etichetta="Contanti o carta" valore={filtro} opzioni={FILTRI} onCambia={setFiltro} /></div>
          <div className="card spese-totale">
            <div className="testo-3">{filtro === 'tutte' ? 'Totale del viaggio' : filtro === 'contanti' ? 'Totale in contanti' : 'Totale con la carta'}</div>
            <div className="spese-totale-yen">{formatoYen(r.yen)}</div>
            <div className="testo-2">≈ {formatoEuro(r.euro)}</div>
            <ul className="spese-quote" aria-label="Quota di ciascuno">
              {viaggio.persone.map(p => <li key={p.id}><span>{p.nome || '—'}</span><b>{formatoYen(r.quote[p.id] ?? 0)}</b></li>)}
            </ul>
            {filtro === 'tutte' && (
              <p className="testo-3 spese-metodi">
                <Banknote size={14} aria-hidden /> Contanti {formatoYen(perMetodo.contanti)} · <CreditCard size={14} aria-hidden /> Carta {formatoYen(perMetodo.carta)}
              </p>
            )}
          </div>
          {budgetYen !== null && <Budget spesoYen={spesoOggi} budgetYen={budgetYen} titolo={titoloBudget} />}
          <Gruppo titolo="Chi deve a chi" piede="In yen, col cambio di ogni spesa; il numero minimo di rimborsi.">
            {rimborsi.length === 0 ? <Riga titolo="Siete pari" /> : rimborsi.map(x => (
              <div key={`${x.da}-${x.a}`} className="rimborso">
                <div>
                  <strong>{nome(x.da)} → {nome(x.a)}</strong>
                  <div className="testo-2">{formatoYen(x.yen)}{equivalente(x.yen)}</div>
                </div>
                <button type="button" className="pulsante piccolo" onClick={() => salda(x)}>Segna come saldato</button>
              </div>
            ))}
          </Gruppo>
          {r.perCategoria.length > 0 && (
            <Gruppo titolo="Per categoria">
              {r.perCategoria.map(c => {
                const Icona = ICONA_CATEGORIA[c.categoria]
                return <Riga key={c.categoria} icona={<Icona size={20} />} titolo={ETICHETTA_CATEGORIA[c.categoria]} destra={formatoYen(c.yen)} />
              })}
            </Gruppo>
          )}
          {r.perGiorno.map(g => (
            <Gruppo key={g.data} titolo={<span className="spese-giorno"><span>{formatoData(g.data, 'breve')}{giornoDelViaggio(g.data)}</span><span>{formatoYen(g.yen)}</span></span>}>
              {g.spese.map(s => <RigaSpesa key={s.id} spesa={s} nome={nome(s.pagatoDa)} onApri={() => apri(s)} onElimina={() => elimina(s)} />)}
            </Gruppo>
          ))}
          {visibili.length > 0 && <p className="testo-3" style={{ margin: '0 16px' }}>Scorri una spesa verso sinistra per eliminarla.</p>}
        </>
      )}
      <ImpostazioniSpese />
      <FoglioSpesa key={chiave} aperto={foglio !== null} iniziale={foglio?.spesa ?? null} onChiudi={chiudi} />
    </div>
  )
}
