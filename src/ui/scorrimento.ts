import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'

export type Verso = 'destra' | 'sinistra'
export type Direzione = 'orizzontale' | 'verticale'

/** Dopo 10 px di movimento: orizzontale se |dx| > 2|dy|; altrimenti verticale, e lo scorrimento resta al browser. */
export function direzioneGesto(dx: number, dy: number): Direzione | null {
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return null
  return Math.abs(dx) > 2 * Math.abs(dy) ? 'orizzontale' : 'verticale'
}

/** Il verso in cui `dx` ha superato la soglia, se è fra quelli ammessi. */
export function versoScattato(dx: number, soglia: number, versi: readonly Verso[]): Verso | null {
  const verso: Verso | null = dx > soglia ? 'destra' : dx < -soglia ? 'sinistra' : null
  return verso && versi.includes(verso) ? verso : null
}

export const riduciMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches

interface Opzioni { versi: readonly Verso[]; soglia: number; attivo?: boolean; onScatta: (verso: Verso) => void }

/**
 * Scorrimento orizzontale su un elemento: `dx` segue il dito (solo nei versi ammessi) e `oltre` dice se, rilasciando,
 * il gesto scatta. Il click che segue un gesto viene assorbito. L'elemento deve avere `touch-action: pan-y`.
 * Non parte dalla maniglia di riordino né dai campi di testo.
 */
export function useScorrimento({ versi, soglia, attivo = true, onScatta }: Opzioni) {
  const inizio = useRef<{ x: number; y: number; id: number } | null>(null)
  const direzione = useRef<Direzione | null>(null)
  const appenaScorso = useRef(false)
  const [dx, setDx] = useState(0)
  const limita = (x: number) => (versi.includes('destra') ? (versi.includes('sinistra') ? x : Math.max(0, x)) : Math.min(0, x))
  const ferma = () => {
    inizio.current = null
    direzione.current = null
    setDx(0)
  }
  const gestori = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!attivo || e.button !== 0) return
      if ((e.target as Element).closest('.maniglia, input, textarea, select')) return
      inizio.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
      direzione.current = null
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = inizio.current
      if (!s || s.id !== e.pointerId) return
      const mx = e.clientX - s.x
      if (direzione.current === null) {
        direzione.current = direzioneGesto(mx, e.clientY - s.y)
        if (direzione.current === 'verticale') { ferma(); return }
        if (direzione.current === 'orizzontale') e.currentTarget.setPointerCapture?.(e.pointerId)
      }
      if (direzione.current === 'orizzontale') setDx(limita(mx))
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const s = inizio.current
      if (s && direzione.current === 'orizzontale') {
        appenaScorso.current = true
        setTimeout(() => { appenaScorso.current = false }, 0)
        const verso = versoScattato(limita(e.clientX - s.x), soglia, versi)
        if (verso) {
          navigator.vibrate?.(10)
          onScatta(verso)
        }
      }
      ferma()
    },
    onPointerCancel: () => ferma(),
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (!appenaScorso.current) return
      e.preventDefault()
      e.stopPropagation()
      appenaScorso.current = false
    },
  }
  return { gestori, dx, oltre: versoScattato(dx, soglia, versi) !== null }
}
