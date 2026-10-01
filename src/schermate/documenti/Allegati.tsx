import { ChevronLeft, ChevronRight, FileText, ImageOff, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Allegato } from '../../model/tipi'
import { mimeAmmesso, mimeFoto } from '../../model/mime'
import { archivioIndexedDb, mimeSicuro } from '../../servizi/allegati'
import { useScorrimento } from '../../ui/scorrimento'

/**
 * L'indirizzo temporaneo (object URL) di un allegato: undefined mentre si legge, null se non c'è più o non si può leggere.
 * Il blob riceve sempre uno dei tipi ammessi (`mimeSicuro`), mai quello che dice il dato: niente SVG o HTML.
 * L'indirizzo viene revocato quando l'allegato cambia o la vista si smonta.
 */
export function useUrlAllegato(id: string, mime?: string): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let vivo = true
    let creato: string | null = null
    setUrl(undefined)
    archivioIndexedDb.leggi(id).then(
      b => {
        if (!vivo) return
        if (!b) { setUrl(null); return }
        creato = URL.createObjectURL(new Blob([b], { type: mimeSicuro(b.type || mime) }))
        setUrl(creato)
      },
      () => { if (vivo) setUrl(null) },
    )
    return () => {
      vivo = false
      if (creato) URL.revokeObjectURL(creato)
    }
  }, [id, mime])
  return url
}

const MANCA = 'Allegato non più disponibile: ricaricalo'

/** Senza `onApri` (nell'editor, dentro un foglio) la foto non si apre: si può solo togliere. */
function Miniatura({ allegato, onApri }: { allegato: Allegato; onApri?: () => void }) {
  const tipo = mimeSicuro(allegato.mime)
  const url = useUrlAllegato(allegato.id, tipo)
  if (url === null) {
    return <div className="miniatura mancante" role="img" aria-label={`${allegato.nome}: ${MANCA}`}><ImageOff size={24} aria-hidden /><span>{MANCA}</span></div>
  }
  if (!mimeAmmesso(tipo)) {
    // Un tipo che l'app non sa mostrare (dato rovinato): niente indirizzo da aprire.
    return <div className="miniatura" role="img" aria-label={allegato.nome}><FileText size={30} aria-hidden /><span>{allegato.nome}</span></div>
  }
  if (tipo === 'application/pdf') {
    // I PDF li apre il visore del telefono.
    return <a className="miniatura" href={url} target="_blank" rel="noreferrer" aria-label={`Apri ${allegato.nome}`}><FileText size={30} aria-hidden /><span>{allegato.nome}</span></a>
  }
  const foto = url ? <img src={url} alt="" /> : null
  if (!onApri) return <div className="miniatura" role="img" aria-label={allegato.nome}>{foto}</div>
  return <button type="button" className="miniatura" onClick={onApri} disabled={!url} aria-label={`Apri ${allegato.nome}`}>{foto}</button>
}

function ImmagineGrande({ allegato, zoom }: { allegato: Allegato; zoom: number }) {
  const url = useUrlAllegato(allegato.id, allegato.mime)
  if (url === null) return <p>{MANCA}.</p>
  if (!url) return null
  return <img src={url} alt={allegato.nome} className={zoom === 1 ? 'adatta' : undefined} style={zoom === 1 ? undefined : { width: `${zoom * 100}%` }} />
}

/** A tutto schermo su fondo bianco (per lo scanner del QR), con zoom e scorrimento fra le foto. */
function Visualizzatore({ immagini, indice, onChiudi }: { immagini: Allegato[]; indice: number | null; onChiudi: () => void }) {
  const [attuale, setAttuale] = useState(0)
  const [zoom, setZoom] = useState(1)
  const n = immagini.length
  const sposta = (d: number) => {
    setAttuale(i => (i + d + n) % n)
    setZoom(1)
  }
  const { gestori } = useScorrimento({ versi: ['destra', 'sinistra'], soglia: 60, attivo: zoom === 1 && n > 1, onScatta: v => sposta(v === 'sinistra' ? 1 : -1) })
  useEffect(() => {
    if (indice === null) return
    setAttuale(indice)
    setZoom(1)
  }, [indice])
  useEffect(() => {
    if (indice === null) return
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
      else if (e.key === 'ArrowRight' && n > 1) sposta(1)
      else if (e.key === 'ArrowLeft' && n > 1) sposta(-1)
    }
    addEventListener('keydown', tasto)
    return () => removeEventListener('keydown', tasto)
  })
  if (indice === null || n === 0) return null
  const a = immagini[Math.min(attuale, n - 1)]
  return createPortal(
    <div className="visore" role="dialog" aria-modal="true" aria-label={a.nome}>
      <div className="visore-testa">
        <button type="button" className="pulsante-icona" onClick={onChiudi} aria-label="Chiudi"><X size={26} aria-hidden /></button>
        <span>{n > 1 ? `${Math.min(attuale, n - 1) + 1} di ${n}` : a.nome}</span>
        <button type="button" className="pulsante-icona" onClick={() => setZoom(z => (z >= 3 ? 1 : z + 1))} aria-label={zoom >= 3 ? 'Torna a schermo intero' : 'Ingrandisci'}>
          {zoom >= 3 ? <ZoomOut size={24} aria-hidden /> : <ZoomIn size={24} aria-hidden />}
        </button>
      </div>
      <div className="visore-corpo" {...gestori} style={{ touchAction: zoom === 1 ? 'pan-y pinch-zoom' : 'pan-x pan-y pinch-zoom' }}
        onDoubleClick={() => setZoom(z => (z === 1 ? 2 : 1))}>
        <ImmagineGrande key={a.id} allegato={a} zoom={zoom} />
      </div>
      {n > 1 && (
        <div className="visore-piede">
          <button type="button" className="pulsante" onClick={() => sposta(-1)}><ChevronLeft size={20} aria-hidden /> Prima</button>
          <button type="button" className="pulsante" onClick={() => sposta(1)}>Dopo <ChevronRight size={20} aria-hidden /></button>
        </div>
      )}
    </div>,
    document.body,
  )
}

/** Gli allegati in griglia. Con `onTogli` è la griglia dell'editor: ogni allegato ha la sua ×. */
export function GrigliaAllegati({ allegati, onTogli }: { allegati: Allegato[]; onTogli?: (id: string) => void }) {
  const [aperto, setAperto] = useState<number | null>(null)
  const immagini = allegati.filter(a => mimeFoto(mimeSicuro(a.mime)))
  if (allegati.length === 0) return null
  return (
    <>
      <div className="griglia-allegati">
        {allegati.map(a => (
          <div key={a.id} className="miniatura-cella">
            <Miniatura allegato={a} onApri={onTogli ? undefined : () => setAperto(immagini.findIndex(x => x.id === a.id))} />
            {onTogli && (
              <button type="button" className="miniatura-togli" aria-label={`Togli ${a.nome}`} onClick={() => onTogli(a.id)}>
                <span><X size={16} aria-hidden /></span>
              </button>
            )}
          </div>
        ))}
      </div>
      {!onTogli && <Visualizzatore immagini={immagini} indice={aperto} onChiudi={() => setAperto(null)} />}
    </>
  )
}
