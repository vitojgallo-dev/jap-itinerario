import { afterEach, describe, expect, test, vi } from 'vitest'
import { condividiPdf, nomePdf, puoCondividerePdf } from './condividi'

afterEach(() => vi.unstubAllGlobals())

describe('puoCondividerePdf', () => {
  test('vero solo se il browser sa condividere un file PDF', () => {
    const canShare = vi.fn(() => true)
    vi.stubGlobal('navigator', { canShare, share: vi.fn() })
    expect(puoCondividerePdf()).toBe(true)
    const [dati] = canShare.mock.calls[0] as unknown as [{ files: File[] }]
    expect(dati.files[0].type).toBe('application/pdf')
    vi.stubGlobal('navigator', { canShare: () => false })
    expect(puoCondividerePdf()).toBe(false)
  })
  test('falso senza canShare o se lancia', () => {
    vi.stubGlobal('navigator', {})
    expect(puoCondividerePdf()).toBe(false)
    vi.stubGlobal('navigator', { canShare: () => { throw new Error('boh') } })
    expect(puoCondividerePdf()).toBe(false)
  })
})

describe('nomePdf', () => {
  test('aggiunge .pdf solo se manca', () => {
    expect(nomePdf('Biglietto')).toBe('Biglietto.pdf')
    expect(nomePdf('biglietto.PDF')).toBe('biglietto.PDF')
    expect(nomePdf('  ')).toBe('allegato.pdf')
  })
})

describe('condividiPdf', () => {
  const blob = new Blob(['%PDF'], { type: 'application/pdf' })
  test('passa un File PDF col nome giusto', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })
    expect(await condividiPdf(blob, 'Biglietto')).toBe('condiviso')
    const [dati] = share.mock.calls[0] as [{ files: File[] }]
    expect(dati.files).toHaveLength(1)
    expect(dati.files[0].name).toBe('Biglietto.pdf')
    expect(dati.files[0].type).toBe('application/pdf')
  })
  test('AbortError (menu chiuso) è un annullamento, non un errore', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('chiuso', 'AbortError')) })
    expect(await condividiPdf(blob, 'x')).toBe('annullato')
  })
  test('ogni altro errore diventa "errore" senza lanciare', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError')) })
    expect(await condividiPdf(blob, 'x')).toBe('errore')
    vi.stubGlobal('navigator', {})
    expect(await condividiPdf(blob, 'x')).toBe('errore')
  })
})
