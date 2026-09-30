import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CHIAVE_SCARTATO, CHIAVE_VIAGGIO } from '../store/avvio'

interface Stato { errore: boolean }

function leggiGrezzo(): string | null {
  try {
    return localStorage.getItem(CHIAVE_VIAGGIO)
  } catch {
    return null
  }
}

/** Il tema scelto nel salvataggio, se si legge; altrimenti quello del telefono. */
function temaCorrente(grezzo: string | null): 'chiaro' | 'scuro' {
  let scelta: unknown
  try { scelta = JSON.parse(grezzo ?? 'null')?.state?.viaggio?.impostazioni?.tema } catch { /* salvataggio illeggibile */ }
  if (scelta === 'chiaro' || scelta === 'scuro') return scelta
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'scuro' : 'chiaro'
}

/** Se l'app si rompe mentre disegna, invece della pagina bianca offre di salvare i dati e di ripartire. */
export class ErrorBoundary extends Component<{ children: ReactNode }, Stato> {
  state: Stato = { errore: false }

  static getDerivedStateFromError(): Stato {
    return { errore: true }
  }

  componentDidCatch(errore: unknown, info: ErrorInfo) {
    console.error(errore, info.componentStack)
    // Se l'app è caduta al primo disegno, il tema non è mai stato applicato.
    const r = document.documentElement
    if (!r.dataset.tema) r.dataset.tema = temaCorrente(leggiGrezzo())
  }

  private salva = () => {
    const grezzo = leggiGrezzo()
    if (grezzo === null) return
    const url = URL.createObjectURL(new Blob([grezzo], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'giappone-dati-grezzi.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  private ripristina = () => {
    try {
      const grezzo = localStorage.getItem(CHIAVE_VIAGGIO)
      if (grezzo !== null) localStorage.setItem(CHIAVE_SCARTATO, grezzo)
      localStorage.removeItem(CHIAVE_VIAGGIO)
    } catch { /* memoria non disponibile: si ricarica comunque */ }
    location.reload()
  }

  render() {
    if (!this.state.errore) return this.props.children
    const ciSonoDati = leggiGrezzo() !== null
    return (
      <div className="schermata" role="alert" style={{ paddingTop: 'calc(48px + env(safe-area-inset-top))' }}>
        <h1 style={{ fontSize: 28, lineHeight: 1.15, marginBottom: 8 }}>Qualcosa si è rotto</h1>
        <p className="testo-2" style={{ marginBottom: 24 }}>
          L'app non riesce a mostrare il viaggio. Prima di tutto salva i tuoi dati in un file: poi prova a ricaricare, o riparti dall'itinerario 2027 (i dati di adesso restano da parte).
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <button type="button" className="pulsante primario largo" onClick={this.salva} disabled={!ciSonoDati}>Salva i miei dati</button>
          <button type="button" className="pulsante largo" onClick={() => location.reload()}>Ricarica</button>
          <button type="button" className="pulsante pericolo largo" onClick={this.ripristina}>Ripristina l'itinerario 2027</button>
        </div>
      </div>
    )
  }
}
