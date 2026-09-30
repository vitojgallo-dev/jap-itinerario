import { expect, test } from 'vitest'
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
