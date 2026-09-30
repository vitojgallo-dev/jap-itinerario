import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function BarraNav({ titolo, sinistra, destra }: { titolo: ReactNode; sinistra?: ReactNode; destra?: ReactNode }) {
  return (
    <header className="barra-nav">
      <div className="barra-nav-lato">{sinistra}</div>
      <div className="barra-nav-titolo">{titolo}</div>
      <div className="barra-nav-lato destra">{destra}</div>
    </header>
  )
}

export function TitoloGrande({ children, sopra, sotto }: { children: ReactNode; sopra?: ReactNode; sotto?: ReactNode }) {
  return (
    <div className="titolo-grande">
      {sopra && <div className="sopra">{sopra}</div>}
      <h1>{children}</h1>
      {sotto && <p className="sotto">{sotto}</p>}
    </div>
  )
}

export function Gruppo({ titolo, piede, children }: { titolo?: ReactNode; piede?: ReactNode; children: ReactNode }) {
  return (
    <section className="gruppo">
      {titolo && <h2 className="gruppo-titolo">{titolo}</h2>}
      <div className="gruppo-corpo">{children}</div>
      {piede && <p className="gruppo-piede">{piede}</p>}
    </section>
  )
}

interface PropsRiga {
  icona?: ReactNode
  titolo: ReactNode
  sottotitolo?: ReactNode
  destra?: ReactNode
  onClick?: () => void
  href?: string
  pericolo?: boolean
}

export function Riga({ icona, titolo, sottotitolo, destra, onClick, href, pericolo }: PropsRiga) {
  const classe = 'riga' + (pericolo ? ' pericolo' : '')
  const freccia = (onClick || href) && destra === undefined ? <ChevronRight size={18} aria-hidden /> : destra
  const corpo = (
    <>
      {icona && <span className="riga-icona" aria-hidden>{icona}</span>}
      <span className="riga-testo">
        <span>{titolo}</span>
        {sottotitolo && <span className="riga-sotto" style={{ display: 'block' }}>{sottotitolo}</span>}
      </span>
      {freccia && <span className="riga-destra">{freccia}</span>}
    </>
  )
  if (href) return <a className={classe} href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{corpo}</a>
  if (onClick) return <button type="button" className={classe} onClick={onClick}>{corpo}</button>
  return <div className={classe}>{corpo}</div>
}

export function Segmentato<T extends string>({ valore, opzioni, onCambia, etichetta }: {
  valore: T
  opzioni: { valore: T; etichetta: string }[]
  onCambia: (v: T) => void
  etichetta: string
}) {
  return (
    <div className="segmentato" role="radiogroup" aria-label={etichetta}>
      {opzioni.map(o => (
        <button key={o.valore} type="button" role="radio" aria-checked={o.valore === valore} onClick={() => onCambia(o.valore)}>
          {o.etichetta}
        </button>
      ))}
    </div>
  )
}

export function Badge({ tono = 'tinta', children }: { tono?: 'tinta' | 'avviso' | 'neutro'; children: ReactNode }) {
  return <span className={'badge' + (tono === 'tinta' ? '' : ` ${tono}`)}>{children}</span>
}

export function Vuoto({ titolo, testo, azione }: { titolo: string; testo?: string; azione?: ReactNode }) {
  return (
    <div className="card vuoto">
      <strong>{titolo}</strong>
      {testo && <p>{testo}</p>}
      {azione}
    </div>
  )
}

export function Campo({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{etichetta}</span>
      {children}
    </label>
  )
}
