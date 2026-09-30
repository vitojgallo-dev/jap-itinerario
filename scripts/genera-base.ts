import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { migraV1 } from '../src/model/migrazioneV1'
import { validaViaggio } from '../src/model/validazione'
import { leggiLegacy } from './legacy'
import { revisione2027 } from './revisione-2027'

const html = readFileSync(new URL('../legacy/index-v1.html', import.meta.url), 'utf8')
const { dati, extra } = leggiLegacy(html)
const viaggio = revisione2027(migraV1(dati, extra, { dataPartenza: '2027-08-09' }))
const esito = validaViaggio(viaggio)
if (!esito.ok) {
  console.error('Itinerario non valido:\n' + esito.errori.join('\n'))
  process.exit(1)
}
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../src/data/itinerario-base.json', import.meta.url), JSON.stringify(viaggio, null, 1) + '\n')
writeFileSync(new URL('../src/data/legacy-extra.json', import.meta.url), JSON.stringify(extra, null, 1) + '\n')
console.log(`Itinerario: ${viaggio.giorni.length} giorni, ${viaggio.giorni.flatMap(g => g.tappe).length} tappe`)
