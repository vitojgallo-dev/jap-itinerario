import { expect, test } from 'vitest'
import { hrefBiglietti, linkSicuro, modoGoogle, urlCerca, urlCercaBiglietti, urlIndicazioni, urlPercorso } from './mappe'

const sensoji = { nome: 'Senso-ji', query: 'Senso-ji Temple Asakusa', lat: 35.7148, lng: 139.7967 }

test('le indicazioni usano il nome, che Google risolve meglio delle coordinate', () => {
  expect(urlIndicazioni(sensoji)).toBe('https://www.google.com/maps/dir/?api=1&destination=Senso-ji%20Temple%20Asakusa&travelmode=transit')
  expect(urlIndicazioni({ nome: 'X', query: '', lat: 1, lng: 2 }, 'walking')).toBe('https://www.google.com/maps/dir/?api=1&destination=1%2C2&travelmode=walking')
  expect(urlIndicazioni({ nome: 'Solo nome', query: '' })).toContain('destination=Solo%20nome')
})

test('percorso, ricerca, biglietti, modi', () => {
  expect(urlPercorso(sensoji, { nome: 'S', query: 'Tokyo Skytree' }, 'walking'))
    .toBe('https://www.google.com/maps/dir/?api=1&origin=Senso-ji%20Temple%20Asakusa&destination=Tokyo%20Skytree&travelmode=walking')
  expect(urlCerca(sensoji)).toBe('https://www.google.com/maps/search/?api=1&query=Senso-ji%20Temple%20Asakusa')
  expect(urlCercaBiglietti('Shibuya Sky')).toBe('https://www.google.com/search?q=Shibuya%20Sky%20biglietti%20prenotazione%20tickets')
  expect([modoGoogle('piedi'), modoGoogle('mezzi'), modoGoogle('treno'), modoGoogle('taxi')]).toEqual(['walking', 'transit', 'transit', 'driving'])
})

test('linkSicuro lascia passare solo indirizzi http e https', () => {
  expect(linkSicuro('https://www.jrpass.com/')).toBe('https://www.jrpass.com/')
  expect(linkSicuro('http://example.jp/biglietti')).toBe('http://example.jp/biglietti')
  expect(linkSicuro('javascript:alert(1)')).toBeUndefined()
  expect(linkSicuro(' javascript:alert(1)')).toBeUndefined()
  expect(linkSicuro('data:text/html,<script>alert(1)</script>')).toBeUndefined()
  expect(linkSicuro('//evil.example')).toBeUndefined()
  expect(linkSicuro('#/programma/3')).toBeUndefined()
  expect(linkSicuro('')).toBeUndefined()
  expect(linkSicuro(null)).toBeUndefined()
  expect(linkSicuro(5)).toBeUndefined()
})

test('i biglietti con un link non sicuro ripiegano sulla ricerca', () => {
  expect(hrefBiglietti({ titolo: 'Shibuya Sky', biglietti: { link: 'https://www.shibuya-scramble-square.com/sky/' } })).toBe('https://www.shibuya-scramble-square.com/sky/')
  expect(hrefBiglietti({ titolo: 'Shibuya Sky', biglietti: { link: null } })).toBe(urlCercaBiglietti('Shibuya Sky'))
  expect(hrefBiglietti({ titolo: 'Shibuya Sky', biglietti: { link: 'javascript:alert(1)' } })).toBe(urlCercaBiglietti('Shibuya Sky'))
})
