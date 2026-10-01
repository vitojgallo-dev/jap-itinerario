import { toast } from 'sonner'

/** Copia negli appunti e lo dice con "Copiato"; senza clipboard (http, browser vecchi) l'avviso arriva comunque. */
export function copia(testo: string): void {
  if (!navigator.clipboard) {
    toast('Copia non riuscita')
    return
  }
  navigator.clipboard.writeText(testo).then(() => toast('Copiato'), () => toast('Copia non riuscita'))
}
