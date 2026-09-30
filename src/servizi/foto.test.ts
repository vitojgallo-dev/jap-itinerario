import { expect, test, vi } from 'vitest'
import { leggiCommons, leggiWikipedia, urlWikipedia } from './foto'

test('legge la miniatura di Wikipedia', () => {
  expect(leggiWikipedia({ query: { pages: { '1': { thumbnail: { source: 'https://upload.wikimedia.org/a.jpg' } } } } })).toBe('https://upload.wikimedia.org/a.jpg')
  expect(leggiWikipedia({ query: { pages: { '1': {} } } })).toBeNull()
  expect(leggiWikipedia({})).toBeNull()
})

test('legge la miniatura di Commons', () => {
  expect(leggiCommons({ query: { pages: { '9': { imageinfo: [{ thumburl: 'https://upload.wikimedia.org/b.jpg' }] } } } })).toBe('https://upload.wikimedia.org/b.jpg')
  expect(leggiCommons(null)).toBeNull()
})

test('url di ricerca', () => {
  expect(urlWikipedia('Tokyo Skytree')).toContain('gsrsearch=Tokyo%20Skytree')
  expect(urlWikipedia('Tokyo Skytree')).toContain('origin=*')
})

test('cercaFoto: Wikipedia restituisce URL e lo cacheizza', async () => {
  const mockFetch = vi.fn()
  const mockStorageData: Record<string, string> = {}
  const mockStorage = { data: mockStorageData, getItem(k: string) { return this.data[k] ?? null }, setItem(k: string, v: string) { this.data[k] = v } }
  vi.stubGlobal('fetch', mockFetch)
  vi.stubGlobal('localStorage', mockStorage)

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ query: { pages: { '1': { thumbnail: { source: 'https://example.com/img.jpg' } } } } })
  })

  vi.resetModules()
  const { cercaFoto: cercaFotoFresh } = await import('./foto')

  const result = await cercaFotoFresh('Tokyo')
  expect(result).toBe('https://example.com/img.jpg')
  expect(mockFetch).toHaveBeenCalledOnce()

  const result2 = await cercaFotoFresh('Tokyo')
  expect(result2).toBe('https://example.com/img.jpg')
  expect(mockFetch).toHaveBeenCalledOnce()
})

test('cercaFoto: Wikipedia fallisce, non viene cacheizzato e riprova', async () => {
  const mockFetch = vi.fn()
  const mockStorageData: Record<string, string> = {}
  const mockStorage = { data: mockStorageData, getItem(k: string) { return this.data[k] ?? null }, setItem(k: string, v: string) { this.data[k] = v } }
  vi.stubGlobal('fetch', mockFetch)
  vi.stubGlobal('localStorage', mockStorage)

  mockFetch.mockRejectedValueOnce(new Error('network error'))
  mockFetch.mockRejectedValueOnce(new Error('network error'))

  vi.resetModules()
  const { cercaFoto: cercaFotoFresh } = await import('./foto')

  const result = await cercaFotoFresh('Tokyo')
  expect(result).toBeNull()
  expect(mockFetch).toHaveBeenCalledTimes(2)

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ query: { pages: { '1': { thumbnail: { source: 'https://example.com/img2.jpg' } } } } })
  })

  const result2 = await cercaFotoFresh('Tokyo')
  expect(result2).toBe('https://example.com/img2.jpg')
  expect(mockFetch).toHaveBeenCalledTimes(3)
})

test('cercaFoto: entrambe le API OK senza immagini → cacheizzato come null', async () => {
  const mockFetch = vi.fn()
  const mockStorageData: Record<string, string> = {}
  const mockStorage = { data: mockStorageData, getItem(k: string) { return this.data[k] ?? null }, setItem(k: string, v: string) { this.data[k] = v } }
  vi.stubGlobal('fetch', mockFetch)
  vi.stubGlobal('localStorage', mockStorage)

  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ query: { pages: {} } }) })
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ query: { pages: {} } }) })

  vi.resetModules()
  const { cercaFoto: cercaFotoFresh } = await import('./foto')

  const result = await cercaFotoFresh('Tokyo')
  expect(result).toBeNull()
  expect(mockFetch).toHaveBeenCalledTimes(2)

  const result2 = await cercaFotoFresh('Tokyo')
  expect(result2).toBeNull()
  expect(mockFetch).toHaveBeenCalledTimes(2)
})

test('cercaFoto: valore "null" in storage non causa crash', async () => {
  const mockFetch = vi.fn()
  const mockStorageData: Record<string, string> = { 'giappone-foto-v1': 'null' }
  const mockStorage = { data: mockStorageData, getItem(k: string) { return this.data[k] ?? null }, setItem(k: string, v: string) { this.data[k] = v } }
  vi.stubGlobal('fetch', mockFetch)
  vi.stubGlobal('localStorage', mockStorage)

  vi.resetModules()
  const { cercaFoto: cercaFotoFresh } = await import('./foto')

  const result = await cercaFotoFresh('Tokyo')
  expect(result).toBeNull()
  expect(mockFetch).toHaveBeenCalledTimes(2)
})
