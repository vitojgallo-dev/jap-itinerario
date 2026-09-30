/** Id breve e casuale, con un prefisso leggibile ("t-3f9a1c2b"). */
export function nuovoId(prefisso: string): string {
  return `${prefisso}-${crypto.randomUUID().slice(0, 8)}`
}
