import type { ReactNode } from 'react'
import { Drawer } from 'vaul'

interface Props {
  aperto: boolean
  onChiudi: () => void
  titolo: string
  children: ReactNode
  pieno?: boolean
  azioneDestra?: ReactNode
}

/** Pannello che sale dal basso, trascinabile per chiuderlo. */
export function Foglio({ aperto, onChiudi, titolo, children, pieno, azioneDestra }: Props) {
  return (
    <Drawer.Root open={aperto} onOpenChange={o => { if (!o) onChiudi() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="foglio-velo" />
        <Drawer.Content className={'foglio' + (pieno ? ' pieno' : '')} aria-describedby={undefined}>
          <div className="foglio-maniglia" aria-hidden />
          <div className="foglio-testa">
            <button type="button" className="pulsante-testo" onClick={onChiudi} style={{ justifySelf: 'start' }}>Chiudi</button>
            <Drawer.Title className="foglio-titolo">{titolo}</Drawer.Title>
            <div style={{ justifySelf: 'end' }}>{azioneDestra}</div>
          </div>
          <div className="foglio-corpo">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
