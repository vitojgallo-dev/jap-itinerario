import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { PuntoMappa } from '../../model/mappa'
import { testoSu } from '../../ui/colore'

type Coppia = [number, number]

function icona(p: PuntoMappa) {
  return L.divIcon({
    className: 'segnaposto-contenitore',
    html: `<span class="segnaposto${p.stato === 'fatta' ? ' fatto' : ''}" style="--c:${p.colore};--t:${testoSu(p.colore)}">${p.numero}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function Inquadra({ punti, posizione }: { punti: PuntoMappa[]; posizione: Coppia | null }) {
  const map = useMap()
  useEffect(() => {
    const pts: Coppia[] = punti.map(p => [p.lat, p.lng])
    if (posizione) pts.push(posizione)
    if (pts.length === 1) map.setView(pts[0], 15)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36] })
  }, [map, punti, posizione])
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
  const stile = tema === 'scuro' ? 'dark_all' : 'rastertiles/voyager'
  // Stabile fra un render e l'altro, così aprire una tappa non rifà l'inquadratura.
  const pos = useMemo<Coppia | null>(() => (posizione ? [posizione.lat, posizione.lng] : null), [posizione])
  return (
    <MapContainer className="mappa" center={[36.2, 138.2]} zoom={5} zoomControl={false}>
      <TileLayer key={stile} url={`https://{s}.basemaps.cartocdn.com/${stile}/{z}/{x}/{y}{r}.png`} subdomains="abcd" maxZoom={20}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' />
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
