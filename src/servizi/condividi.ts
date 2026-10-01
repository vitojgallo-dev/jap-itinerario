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
