import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { PuntoMappa } from '../../model/mappa'
import { testoSu } from '../../ui/colore'

type Coppia = [number, number]

// Un'icona per combinazione di numero, colore e stato: lo stesso oggetto fra un render e l'altro, così Leaflet non ricrea i segnaposto.
const cacheIcone = new Map<string, L.DivIcon>()
function icona(p: PuntoMappa) {
  const chiave = `${p.numero}|${p.colore}|${p.stato}`
  let i = cacheIcone.get(chiave)
  if (!i) {
    i = L.divIcon({
      className: 'segnaposto-contenitore',
      html: `<span class="segnaposto${p.stato === 'fatta' ? ' fatto' : ''}" style="--c:${p.colore};--t:${testoSu(p.colore)}">${p.numero}</span>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    })
    cacheIcone.set(chiave, i)
  }
  return i
}

function Inquadra({ punti, posizione }: { punti: PuntoMappa[]; posizione: Coppia | null }) {
  const map = useMap()
  const firma = punti.map(p => `${p.id}:${p.lat},${p.lng}`).join('|')
  useEffect(() => {
    const pts: Coppia[] = punti.map(p => [p.lat, p.lng])
    if (posizione) pts.push(posizione)
    if (pts.length === 1) map.setView(pts[0], 15)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36] })
    // Rinquadra solo se cambiano i luoghi o la posizione, non a ogni modifica dello store (es. una tappa segnata fatta).
  }, [map, firma, posizione])
  return null
}

interface Props {
  punti: PuntoMappa[]
  percorso: boolean
  posizione: { lat: number; lng: number } | null
  tema: 'chiaro' | 'scuro'
  onApri: (p: PuntoMappa) => void
}

export function MappaLeaflet({ punti, percorso, posizione, tema, onApri }: Props) {
  // Stabile fra un render e l'altro, così aprire una tappa non rifà l'inquadratura.
  const pos = useMemo<Coppia | null>(() => (posizione ? [posizione.lat, posizione.lng] : null), [posizione])
  return (
    <MapContainer className={'mappa' + (tema === 'scuro' ? ' mappa-scura' : '')} center={[36.2, 138.2]} zoom={5} zoomControl={false}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {percorso && punti.length > 1 && (
        <Polyline positions={punti.map(p => [p.lat, p.lng] as Coppia)} pathOptions={{ color: punti[0].colore, weight: 3, opacity: 0.75, dashArray: '6 8' }} />
      )}
      {punti.map(p => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icona(p)} title={p.titolo} eventHandlers={{ click: () => onApri(p) }} />
      ))}
      {pos && <CircleMarker center={pos} radius={8} pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#1E88E5', fillOpacity: 1 }} />}
      <Inquadra punti={punti} posizione={pos} />
    </MapContainer>
  )
}
