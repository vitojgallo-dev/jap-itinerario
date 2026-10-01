import { expect, test } from 'vitest'
import { HREF_NUOVA_SPESA, hrefDocumento, hrefRotta, leggiOverride, leggiRotta, reindirizzamento } from './rotta'

test('leggiRotta', () => {
  expect(leggiRotta('')).toEqual({ schermata: 'oggi', indice: null, id: null })
  expect(leggiRotta('#/programma/7')).toEqual({ schermata: 'programma', indice: 7, id: null })
  expect(leggiRotta('#/mappa')).toEqual({ schermata: 'mappa', indice: null, id: null })
  expect(leggiRotta('#/boh/x')).toEqual({ schermata: 'oggi', indice: null, id: null })
})

test('rotte della fase 2', () => {
  expect(leggiRotta('#/documenti')).toEqual({ schermata: 'documenti', indice: null, id: null })
  expect(leggiRotta('#/documenti/pr-volo%20andata')).toEqual({ schermata: 'documenti', indice: null, id: 'pr-volo andata' })
  expect(leggiRotta('#/spese/nuova')).toEqual({ schermata: 'spese', indice: null, id: 'nuova' })
  expect(leggiRotta('#/impostazioni')).toEqual({ schermata: 'impostazioni', indice: null, id: null })
  expect(leggiRotta('#/viaggio')).toEqual({ schermata: 'impostazioni', indice: null, id: null })
  expect(leggiRotta('#/constructor')).toEqual({ schermata: 'oggi', indice: null, id: null })
  expect(leggiRotta('#/documenti/%E0%A4%A')).toEqual({ schermata: 'documenti', indice: null, id: null })
})

test('la vecchia scheda Viaggio porta alle Impostazioni', () => {
  expect(reindirizzamento('#/viaggio')).toBe('#/impostazioni')
  expect(reindirizzamento('#/viaggio/2')).toBe('#/impostazioni')
  expect(reindirizzamento('#/viaggiatori')).toBeNull()
  expect(reindirizzamento('#/programma/2')).toBeNull()
})

test('hrefRotta, hrefDocumento, nuova spesa', () => {
  expect(hrefRotta('programma', 3)).toBe('#/programma/3')
  expect(hrefRotta('impostazioni')).toBe('#/impostazioni')
  expect(hrefDocumento('pr volo')).toBe('#/documenti/pr%20volo')
  expect(HREF_NUOVA_SPESA).toBe('#/spese/nuova')
})

test('leggiOverride per provare l\'app "durante" il viaggio', () => {
  expect(leggiOverride('?oggi=2027-08-16T10:15')?.toISOString()).toBe('2027-08-16T01:15:00.000Z')
  expect(leggiOverride('?oggi=2027-08-16')?.toISOString()).toBe('2027-08-16T00:00:00.000Z')
  expect(leggiOverride('')).toBeNull()
  expect(leggiOverride('?oggi=boh')).toBeNull()
})
