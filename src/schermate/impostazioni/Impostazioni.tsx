import { Check, Download, History, ListPlus, Plus, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState, type CSSProperties } from 'react'
import { toast } from 'sonner'
import { dataGiorno, formatoData } from '../../model/date'
import { aggiornaImpostazioni, aggiornaPersona, aggiornaViaggio, aggiungiCitta } from '../../model/operazioni'
import type { Tema, Viaggio } from '../../model/tipi'
import { validaViaggio } from '../../model/validazione'
import { avvisoImportazione, eliminaSeOrfani, idAllegati, ripristinaAllegati } from '../../servizi/allegati'
import { leggiBackup, type AllegatiBackup } from '../../servizi/backup'
import { ERRORE_V1, leggiV1, viaggioBase, viaggioDaV1 } from '../../store/avvio'
import { useViaggio } from '../../store/viaggio'
import { useEsportaBackup } from '../../ui/Backup'
import { BarraNav, Campo, Gruppo, LinkIndietro, Riga, Segmentato, TitoloGrande } from '../../ui/componenti'
import { useAggiungiDatiDiPartenza } from '../../ui/datiDiPartenza'
import { Foglio } from '../../ui/Foglio'
import { useInstallazione } from '../../ui/hook'
import { InvitoInstallazione, IstruzioniInstallazione } from '../../ui/Installazione'
import { hrefRotta } from '../../ui/rotta'
import { EditorCitta } from './EditorCitta'

const TEMI: { valore: Tema; etichetta: string }[] = [
  { valore: 'auto', etichetta: 'Automatico' },
  { valore: 'chiaro', etichetta: 'Washi' },
  { valore: 'scuro', etichetta: 'Notte' },
]

export default function Impostazioni() {
  const viaggio = useViaggio(s => s.viaggio)
  const applica = useViaggio(s => s.applica)
  const applicaAnnullabile = useViaggio(s => s.applicaAnnullabile)
  const esporta = useEsportaBackup()
  const aggiungiPartenza = useAggiungiDatiDiPartenza()
  const { installata, ios } = useInstallazione()
  const file = useRef<HTMLInputElement>(null)
  const [daImportare, setDaImportare] = useState<{ viaggio: Viaggio; allegati: AllegatiBackup; scartati: number } | null>(null)
  const [cittaAperta, setCittaAperta] = useState<string | null>(null)
  const [ripristino, setRipristino] = useState(false)
  // La chiave vecchia non cambia mai mentre l'app è aperta: basta leggerla una volta.
  const [v1] = useState(() => {
    try { return leggiV1(localStorage) } catch { return null }
  })
  const ultimo = viaggio.impostazioni.ultimoBackup

  const importa = async (f: File | undefined) => {
    if (!f) return
    let testo: string
    try {
      testo = await f.text()
    } catch {
      toast('Non riesco a leggere il file.')
      if (file.current) file.current.value = ''
      return
    }
    const esito = leggiBackup(testo)
    if (!esito.ok) toast(esito.errore)
    else setDaImportare({ viaggio: esito.viaggio, allegati: esito.allegati, scartati: esito.scartati })
    if (file.current) file.current.value = ''
  }
  const nuovaCitta = () => {
    const { viaggio: n, id } = aggiungiCitta(viaggio, { nome: 'Nuova città', kanji: '', romaji: '', colore: '#8E8E93', lat: 36.2, lng: 138.2, intro: '', clima: { max: 31, min: 24 } })
    applica(() => n)
    setCittaAperta(id)
  }
  const recuperaV1 = () => {
    if (!v1) return
    let esito: ReturnType<typeof validaViaggio>
    try {
      esito = validaViaggio(viaggioDaV1(v1))
    } catch {
      toast(ERRORE_V1)
      return
    }
    if (!esito.ok) { toast(ERRORE_V1); return }
    const recuperato = esito.viaggio
    applicaAnnullabile(() => recuperato, 'Modifiche vecchie recuperate')
  }

  // Finita la finestra per annullare, gli allegati che il viaggio sostituito usava (e il nuovo no) si cancellano.
  const pulisciDopo = (ids: string[]) => {
    if (ids.length) setTimeout(() => void eliminaSeOrfani(ids, useViaggio.getState().viaggio), 7000)
  }
  const confermaImportazione = async () => {
    if (!daImportare) return
    const { viaggio: nuovo, allegati, scartati } = daImportare
    setDaImportare(null)
    const vecchi = idAllegati(useViaggio.getState().viaggio)
    // Gli id che il viaggio attuale usa e che sono già nell'archivio non si sovrascrivono.
    const esito = await ripristinaAllegati(allegati, undefined, vecchi)
    applicaAnnullabile(() => nuovo, 'Backup importato')
    const avviso = avvisoImportazione(nuovo, esito, scartati)
    if (avviso) toast(avviso)
    // Se l'importazione viene annullata, gli allegati appena scritti restano orfani: si cancellano insieme ai vecchi.
    pulisciDopo([...vecchi, ...esito.scritti])
  }
  const ripristina = () => {
    const vecchi = idAllegati(viaggio)
    applicaAnnullabile(() => viaggioBase(), 'Itinerario ripristinato')
    setRipristino(false)
    pulisciDopo(vecchi)
  }

  return (
    <div className="schermata">
      <BarraNav titolo="Impostazioni" sinistra={<LinkIndietro href={hrefRotta('oggi')} etichetta="Oggi" />} />
      <TitoloGrande>Impostazioni</TitoloGrande>

      <Gruppo titolo="Il viaggio" piede="Cambiando la data del primo giorno, tutte le date si spostano insieme.">
        <div style={{ padding: '4px 16px 8px' }}>
          <Campo etichetta="Titolo"><input value={viaggio.titolo} onChange={e => applica(v => aggiornaViaggio(v, { titolo: e.target.value }))} /></Campo>
          <Campo etichetta={`Primo giorno (G0) · ultimo: ${viaggio.giorni.length ? formatoData(dataGiorno(viaggio, viaggio.giorni.length - 1), 'lungo') : '—'}`}>
            <input type="date" value={viaggio.dataPartenza} onChange={e => e.target.value && applica(v => aggiornaViaggio(v, { dataPartenza: e.target.value }))} />
          </Campo>
          {viaggio.persone.map((p, i) => (
            <Campo key={p.id} etichetta={`Persona ${i + 1}`}><input value={p.nome} onChange={e => applica(v => aggiornaPersona(v, p.id, e.target.value))} /></Campo>
          ))}
        </div>
      </Gruppo>

      <Gruppo titolo="Aspetto">
        <div style={{ padding: 12 }}>
          <Segmentato etichetta="Tema" valore={viaggio.impostazioni.tema} opzioni={TEMI} onCambia={tema => applica(v => aggiornaImpostazioni(v, { tema }))} />
        </div>
      </Gruppo>

      <Gruppo titolo="Città">
        {viaggio.citta.map(c => (
          <Riga key={c.id} icona={<span style={{ width: 14, height: 14, borderRadius: 7, background: c.colore, display: 'block' } as CSSProperties} />}
            titolo={<>{c.nome} <span className="kanji testo-2">{c.kanji}</span></>}
            sottotitolo={`${viaggio.giorni.filter(g => g.cittaId === c.id).length} giorni`} onClick={() => setCittaAperta(c.id)} />
        ))}
        <Riga icona={<Plus size={20} />} titolo="Aggiungi città" onClick={nuovaCitta} destra={null} />
      </Gruppo>

      <Gruppo titolo="Dati" piede={ultimo ? `Ultimo backup: ${new Date(ultimo).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Nessun backup ancora.'}>
        <Riga icona={<Download size={20} />} titolo="Salva o condividi un backup" sottotitolo="Con gli allegati: anche per mandare tutto agli altri" onClick={() => void esporta()} />
        <Riga icona={<Upload size={20} />} titolo="Importa un backup" onClick={() => file.current?.click()} />
        <Riga icona={<ListPlus size={20} />} titolo="Aggiungi prenotazioni e orari del 2027" sottotitolo="Solo quelli che mancano su questo telefono" onClick={aggiungiPartenza} />
        {v1 && <Riga icona={<History size={20} />} titolo="Recupera le modifiche della versione vecchia" onClick={recuperaV1} />}
        <Riga icona={<RotateCcw size={20} />} titolo="Ripristina l'itinerario 2027" pericolo onClick={() => setRipristino(true)} />
      </Gruppo>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => void importa(e.target.files?.[0])} />

      {installata
        ? <Gruppo titolo="App"><Riga icona={<Check size={20} />} titolo="Installata sulla Home" /></Gruppo>
        : <><InvitoInstallazione /><Gruppo titolo="Come si installa"><div style={{ padding: '8px 16px' }}><IstruzioniInstallazione ios={ios} /></div></Gruppo></>}

      <p className="testo-3" style={{ margin: '24px 16px' }}>
        Mappe © OpenStreetMap · Meteo Open-Meteo · Foto Wikipedia e Wikimedia Commons · Ricerca luoghi Nominatim · Cambio BCE via Frankfurter · Orari OpenStreetMap via Overpass
      </p>

      <EditorCitta cittaId={cittaAperta} onChiudi={() => setCittaAperta(null)} />
      <Foglio aperto={!!daImportare} onChiudi={() => setDaImportare(null)} titolo="Importa backup">
        {daImportare && (
          <>
            <p style={{ margin: '8px 0' }}><strong>{daImportare.viaggio.titolo}</strong></p>
            <p className="testo-2" style={{ marginBottom: 16 }}>
              {daImportare.viaggio.giorni.length} giorni dal {formatoData(daImportare.viaggio.dataPartenza, 'lungo')}
              {Object.keys(daImportare.allegati).length > 0 && `, con ${Object.keys(daImportare.allegati).length === 1 ? '1 allegato' : `${Object.keys(daImportare.allegati).length} allegati`}`}.
              {' '}Sostituisce l'itinerario su questo telefono (si può annullare subito dopo).
            </p>
            <button type="button" className="pulsante primario largo" onClick={() => void confermaImportazione()}>Importa</button>
          </>
        )}
      </Foglio>
      <Foglio aperto={ripristino} onChiudi={() => setRipristino(false)} titolo="Ripristina l'itinerario 2027">
        <p className="testo-2" style={{ margin: '8px 0 16px' }}>Sostituisce l'itinerario su questo telefono (si può annullare subito dopo).</p>
        <button type="button" className="pulsante primario largo" onClick={ripristina}>Ripristina</button>
      </Foglio>
    </div>
  )
}
