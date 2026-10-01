import { expect, test, vi } from 'vitest'
import { cercaOrariOsm, leggiOverpass, queryOverpass, terminiRicerca, URL_OVERPASS } from './osm'

test('terminiRicerca: parole di almeno 4 lettere, senza accenti, senza nomi di città', () => {
  expect(terminiRicerca(["Kinkaku-ji (Padiglione d'Oro)", 'Kinkaku-ji Kyoto'])).toEqual(['kinkaku', 'padiglione'])
  expect(terminiRicerca(['Tempio Tenryu-ji', 'Tenryu-ji Arashiyama Kyoto'])).toEqual(['tempio', 'tenryu', 'arashiyama'])
  expect(terminiRicerca(['Tōdai-ji'])).toEqual(['todai'])
  expect(terminiRicerca(['東京', 'Tokyo Station'])).toEqual([])
})

test('queryOverpass: entro 300 m, per nome, solo con opening_hours', () => {
  const q = queryOverpass(['kinkaku', 'padiglione'], 35.0394, 135.7292)
  expect(q.startsWith('[out:json][timeout:20];')).toBe(true)
  expect(q).toContain('nwr(around:300,35.0394,135.7292)["name"~"kinkaku|padiglione",i]["opening_hours"];')
  expect(q).toContain('nwr(around:300,35.0394,135.7292)["name:en"~"kinkaku|padiglione",i]["opening_hours"];')
  expect(q.endsWith('out tags 20;')).toBe(true)
})

const risposta = {
  elements: [
    { type: 'node', tags: { name: '金閣寺 売店', 'name:en': 'Kinkaku-ji shop', opening_hours: 'Mo-Su 10:00-16:00' } },
    { type: 'way', tags: { name: '鹿苑寺', 'name:en': 'Kinkaku-ji Temple', opening_hours: 'Mo-Su 09:00-17:00' } },
    { type: 'way', tags: { name: '鹿苑寺', 'name:en': 'Kinkaku-ji Temple', opening_hours: 'Mo-Su 09:00-17:00' } },
    { type: 'node', tags: { name: 'senza orari' } },
  ],
}

test('leggiOverpass: prima i nomi che somigliano di più, senza doppioni, orari così come sono', () => {
  expect(leggiOverpass(risposta, ['kinkaku', 'temple'])).toEqual([
    { nome: 'Kinkaku-ji Temple', orari: 'Mo-Su 09:00-17:00' },
    { nome: 'Kinkaku-ji shop', orari: 'Mo-Su 10:00-16:00' },
  ])
  expect(leggiOverpass({}, ['x'])).toEqual([])
})

test('cercaOrariOsm: una richiesta sola, e nessuna se non c\'è un nome da cercare', async () => {
  const prendi = vi.fn().mockResolvedValue(risposta)
  expect(await cercaOrariOsm(['Kinkaku-ji Temple'], 35.0394, 135.7292, prendi)).toHaveLength(2)
  expect(prendi).toHaveBeenCalledTimes(1)
  const [url, corpo] = prendi.mock.calls[0] as [string, string]
  expect(url).toBe(URL_OVERPASS)
  expect(corpo.startsWith('data=')).toBe(true)
  expect(decodeURIComponent(corpo.slice(5))).toContain('"kinkaku|temple"')
  const mai = vi.fn()
  expect(await cercaOrariOsm(['東京'], 35, 139, mai)).toEqual([])
  expect(mai).not.toHaveBeenCalled()
})
