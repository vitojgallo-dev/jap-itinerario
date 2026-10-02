/** Sul telefono apre il menu di condivisione (WhatsApp, File, Calendario…); altrove, o se la condivisione non va, scarica il file. */
export async function condividiFile(file: File, titolo: string): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titolo })
      return 'condiviso'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'annullato'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'scaricato'
}

const TIPO_PDF = 'application/pdf'

/** Il browser sa passare un file PDF al menu di condivisione? (Solo allora ha senso mostrare "Condividi o salva".) */
export function puoCondividerePdf(): boolean {
  try {
    return navigator.canShare?.({ files: [new File([], 'a.pdf', { type: TIPO_PDF })] }) === true
  } catch {
    return false
  }
}

/** Il nome del file per la condivisione: quello dell'allegato, con ".pdf" se non ce l'ha già. */
export function nomePdf(nome: string): string {
  const n = nome.trim() || 'allegato'
  return /\.pdf$/i.test(n) ? n : `${n}.pdf`
}

/**
 * Passa un PDF al menu di condivisione del telefono (Salva su File, AirDrop, WhatsApp…): dove l'app installata non sa aprire
 * un indirizzo `blob:` in una scheda, questa strada funziona. Non lancia mai: "annullato" se si chiude il menu, "errore" per il resto.
 */
export async function condividiPdf(blob: Blob, nome: string): Promise<'condiviso' | 'annullato' | 'errore'> {
  try {
    await navigator.share({ files: [new File([blob], nomePdf(nome), { type: TIPO_PDF })] })
    return 'condiviso'
  } catch (e) {
    return (e as Error | null)?.name === 'AbortError' ? 'annullato' : 'errore'
  }
}
