import { EllipsisVertical, Share, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Foglio } from './Foglio'
import { useInstallazione } from './hook'
import './inviti.css'

export function IstruzioniInstallazione({ ios }: { ios: boolean }) {
  return ios ? (
    <ol className="istruzioni">
      <li>In Safari tocca <Share size={18} aria-label="Condividi" /> in basso.</li>
      <li>Scegli <strong>Aggiungi alla schermata Home</strong>.</li>
      <li>Da ora apri l'app dall'icona: così funziona offline e iOS non cancella i dati.</li>
    </ol>
  ) : (
    <ol className="istruzioni">
      <li>In Chrome tocca <EllipsisVertical size={18} aria-label="Menu" /> in alto a destra.</li>
      <li>Scegli <strong>Installa app</strong> (o <strong>Aggiungi a schermata Home</strong>).</li>
      <li>Da ora apri l'app dall'icona: funziona anche offline.</li>
    </ol>
  )
}

export function InvitoInstallazione() {
  const { installata, ios, puoInstallare, installa } = useInstallazione()
  const [aperto, setAperto] = useState(false)
  if (installata) return null
  return (
    <>
      <div className="card invito">
        <Smartphone size={24} aria-hidden />
        <div>
          <strong>Installa l'app sul telefono</strong>
          <p className="testo-2">Funziona offline e, su iPhone, i dati restano al sicuro.</p>
        </div>
        <button type="button" className="pulsante piccolo" onClick={() => (puoInstallare ? void installa() : setAperto(true))}>Installa</button>
      </div>
      <Foglio aperto={aperto} onChiudi={() => setAperto(false)} titolo="Installa sulla Home">
        <IstruzioniInstallazione ios={ios} />
      </Foglio>
    </>
  )
}
