import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

export default function HeatmapLayer({ points, options = {} }) {
  const map = useMap()

  useEffect(() => {
    if (!points || points.length === 0) return
    const heat = L.heatLayer(points, {
      radius: 28,
      blur: 18,
      maxZoom: 17,
      max: 1.0,
      gradient: { 0.15: '#1d4ed8', 0.35: '#7c3aed', 0.55: '#f59e0b', 0.75: '#f97316', 1.0: '#ef4444' },
      ...options,
    })
    heat.addTo(map)
    return () => { heat.remove() }
  }, [map, points])

  return null
}
