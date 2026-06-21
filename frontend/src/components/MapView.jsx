import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_ATTR = '&copy; <a href="https://carto.com">CARTO</a>'

export default function MapView({
  center = [12.9716, 77.5946],
  zoom = 11,
  children,
  onMapClick,
  style,
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: 12, ...style }}
      zoomControl={true}
    >
      <TileLayer url={DARK_TILE} attribution={DARK_ATTR} />
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      {children}
    </MapContainer>
  )
}

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}
