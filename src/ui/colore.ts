export const SFONDO = { chiaro: '#F6F1E7', scuro: '#0E0F13' } as const

/** Superfici su cui sta il testo colorato: card e gruppi, e la base opaca delle barre (tab bar, barra nav). */
export const SUPERFICI = {
  chiaro: { card: '#FFFDF8', barra: '#FBF8F2' },
  scuro: { card: '#1A1C23', barra: '#16171D' },
} as const

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function esadecimale(c: number[]): string {
  return '#' + c.map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function luminanza(hex: string): number {
  const [r, g, b] = rgb(hex).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrasto(a: string, b: string): number {
  const [l1, l2] = [luminanza(a), luminanza(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

function mescola(a: string, b: string, t: number): string {
  const A = rgb(a), B = rgb(b)
  return esadecimale(A.map((x, i) => x + (B[i] - x) * t))
}

/** Mescola `colore` verso `verso` a passi del 5% finché il contrasto con ogni fondo di `contro` basta. */
function finoAContrasto(colore: string, verso: string, contro: string | string[], minimo = 4.5): string {
  const fondi = Array.isArray(contro) ? contro : [contro]
  for (let i = 0; i <= 20; i++) {
    const c = mescola(colore, verso, i / 20)
    if (fondi.every(f => contrasto(c, f) >= minimo)) return c
  }
  return verso
}

export function testoSu(hex: string): '#FFFFFF' | '#111114' {
  return contrasto(hex, '#FFFFFF') >= contrasto(hex, '#111114') ? '#FFFFFF' : '#111114'
}

export interface Tinta { forte: string; suForte: string; testo: string; tenue: string }

/** Varianti leggibili del colore della città per il tema attivo. `testo` regge su pagina, card, barre e badge `tenue`. */
export function calcolaTinta(hex: string, tema: 'chiaro' | 'scuro'): Tinta {
  const tenue = tema === 'chiaro' ? mescola(hex, '#FFFFFF', 0.86) : mescola(hex, SFONDO.scuro, 0.8)
  const fondi = [SFONDO[tema], SUPERFICI[tema].card, SUPERFICI[tema].barra, tenue]
  if (tema === 'chiaro') {
    return {
      forte: finoAContrasto(hex, '#000000', '#FFFFFF'),
      suForte: '#FFFFFF',
      testo: finoAContrasto(hex, '#000000', fondi),
      tenue,
    }
  }
  const suForte = testoSu(hex)
  return {
    forte: finoAContrasto(hex, suForte === '#FFFFFF' ? '#000000' : '#FFFFFF', suForte),
    suForte,
    testo: finoAContrasto(hex, '#FFFFFF', fondi),
    tenue,
  }
}
