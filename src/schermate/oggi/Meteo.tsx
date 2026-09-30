import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun, Thermometer, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Citta } from '../../model/tipi'
import { descriviCodice, meteoDelGiorno, previsioneDisponibile, type IconaMeteo, type MeteoGiorno } from '../../servizi/meteo'
import { Avvisi } from '../../ui/Avvisi'

const ICONE: Record<IconaMeteo, LucideIcon> = { sereno: Sun, 'poco-nuvoloso': CloudSun, nuvoloso: Cloud, nebbia: CloudFog, pioggia: CloudRain, neve: Snowflake, temporale: CloudLightning }
const oraTokyo = (ms: number) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })

export function Meteo({ citta, data, oggi }: { citta: Citta; data: string; oggi: string }) {
  const [r, setR] = useState<{ meteo: MeteoGiorno; salvato: number } | null | undefined>(undefined)
  useEffect(() => {
    let vivo = true
    setR(undefined)
    meteoDelGiorno(citta.lat, citta.lng, data, oggi).then(x => { if (vivo) setR(x) })
    return () => { vivo = false }
  }, [citta.lat, citta.lng, data, oggi])

  if (r === undefined && previsioneDisponibile(data, oggi)) return <div className="card meteo foto-attesa" aria-busy="true">Carico il meteo…</div>
  if (!r) {
    return (
      <div className="card meteo">
        <Thermometer size={30} aria-hidden />
        <div>
          <strong>{citta.clima.max}° / {citta.clima.min}°</strong>
          <div className="testo-2">Clima tipico di agosto a {citta.nome}. La previsione arriva 15 giorni prima.</div>
        </div>
      </div>
    )
  }
  const { etichetta, icona } = descriviCodice(r.meteo.codice)
  const Icona = ICONE[icona]
  const vecchio = Date.now() - r.salvato > 3 * 3_600_000
  return (
    <>
      <div className="card meteo">
        <Icona size={34} aria-hidden />
        <div>
          <strong>{r.meteo.max}° / {r.meteo.min}° · {etichetta}</strong>
          <div className="testo-2">
            {r.meteo.pioggia != null ? `Pioggia ${r.meteo.pioggia}%` : ''}
            {vecchio ? ` · dato delle ${oraTokyo(r.salvato)}` : ''}
          </div>
        </div>
      </div>
      {r.meteo.max >= 33 && <Avvisi avvisi={[{ livello: 'attenzione', testo: "Molto caldo: acqua sempre con voi, pause all'ombra o in un konbini, cappello." }]} />}
    </>
  )
}
