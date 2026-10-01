import { useEffect, useLayoutEffect } from 'react'
import { Toaster } from 'sonner'
import { faseViaggio } from './model/adesso'
import { coloreSicuro } from './model/mappa'
import { cittaDi } from './model/riepilogo'
import { PulsanteAggiungi } from './schermate/aggiungi/Aggiungi'
import Documenti from './schermate/documenti/Documenti'
import Impostazioni from './schermate/impostazioni/Impostazioni'
import { PrimoAvvio } from './schermate/impostazioni/PrimoAvvio'
import Mappa from './schermate/mappa/Mappa'
import Oggi from './schermate/oggi/Oggi'
import Programma from './schermate/programma/Programma'
import Spese from './schermate/spese/Spese'
import { useViaggio } from './store/viaggio'
import { calcolaTinta } from './ui/colore'
import { useAdesso, useTemaRisolto } from './ui/hook'
import { reindirizzamento, sostituisciRotta, useRotta } from './ui/rotta'
import { TabBar } from './ui/TabBar'

export default function App() {
  const rotta = useRotta()
  const viaggio = useViaggio(s => s.viaggio)
  const tema = useTemaRisolto(viaggio.impostazioni.tema)
  const adesso = useAdesso(60_000)
  const fase = faseViaggio(viaggio, adesso)

  // Il colore dei controlli è quello della città del giorno che si sta guardando (o di oggi).
  const indice = Math.min(rotta.indice ?? (fase.fase === 'durante' ? fase.indice : 0), viaggio.giorni.length - 1)
  const giorno = viaggio.giorni[indice]
  const colore = coloreSicuro(giorno ? cittaDi(viaggio, giorno).colore : '#C8452C')

  // Su Oggi, Programma, l'elenco dei Documenti e Spese; sulla Mappa coprirebbe i controlli.
  const conAggiungi = rotta.schermata === 'oggi' || rotta.schermata === 'programma' || rotta.schermata === 'spese'
    || (rotta.schermata === 'documenti' && rotta.id === null)

  // #/viaggio (fase 1) porta a #/impostazioni.
  useEffect(() => {
    const altrove = reindirizzamento(location.hash)
    if (altrove) sostituisciRotta(altrove)
  })

  useLayoutEffect(() => {
    const r = document.documentElement
    r.dataset.tema = tema
    const t = calcolaTinta(colore, tema)
    r.style.setProperty('--tinta', colore)
    r.style.setProperty('--tinta-forte', t.forte)
    r.style.setProperty('--su-tinta', t.suForte)
    r.style.setProperty('--tinta-testo', t.testo)
    r.style.setProperty('--tinta-tenue', t.tenue)
  }, [tema, colore])

  // Dove c'è il "+" le schermate lasciano più spazio in fondo, perché l'ultima riga non finisca sotto il tasto.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('con-fab', conAggiungi)
  }, [conAggiungi])

  return (
    <>
      {rotta.schermata === 'oggi' && <Oggi />}
      {rotta.schermata === 'programma' && <Programma indice={rotta.indice} />}
      {rotta.schermata === 'mappa' && <Mappa indice={rotta.indice} />}
      {rotta.schermata === 'documenti' && <Documenti id={rotta.id} />}
      {rotta.schermata === 'spese' && <Spese id={rotta.id} />}
      {rotta.schermata === 'impostazioni' && <Impostazioni />}
      {conAggiungi && <PulsanteAggiungi indiceGiorno={indice} />}
      <TabBar attiva={rotta.schermata} />
      <PrimoAvvio />
      <Toaster position="top-center" theme={tema === 'scuro' ? 'dark' : 'light'} offset="calc(12px + env(safe-area-inset-top))" />
    </>
  )
}
