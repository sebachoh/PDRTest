import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [captureMode, setCaptureMode] = useState(false)
  const [capturedPoints, setCapturedPoints] = useState([])
  const [mapCenter, setMapCenter] = useState([51.505, -0.09])

  // Component to handle map events and updates
  function MapController() {
    const map = useMap()

    // Handle Capture Mode: Disable/Enable interactions
    useEffect(() => {
      if (captureMode) {
        map.dragging.disable()
        map.touchZoom.disable()
        map.doubleClickZoom.disable()
        map.scrollWheelZoom.disable()
        map.boxZoom.disable()
        map.keyboard.disable()
        if (map.tap) map.tap.disable()
        map.getContainer().style.cursor = 'crosshair'
      } else {
        map.dragging.enable()
        map.touchZoom.enable()
        map.doubleClickZoom.enable()
        map.scrollWheelZoom.enable()
        map.boxZoom.enable()
        map.keyboard.enable()
        if (map.tap) map.tap.enable()
        map.getContainer().style.cursor = ''
      }
    }, [captureMode, map])

    // Handle Map Clicks for Capture
    useMapEvents({
      click(e) {
        if (captureMode && capturedPoints.length < 25) {
          setCapturedPoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng, id: Date.now() }])
        }
      },
    })

    // Fly to new center when it changes (from search only)
    useEffect(() => {
      map.flyTo(mapCenter, 13)
    }, [mapCenter, map])

    return null
  }

  const removePoint = (id) => {
    setCapturedPoints(prev => prev.filter(point => point.id !== id))
  }

  const clearAllPoints = () => {
    setCapturedPoints([])
  }

  const exportCoordinates = () => {
    if (capturedPoints.length === 0) return

    // Create text content with coordinates
    let content = `Coordenadas Capturadas - ${new Date().toLocaleString()}\n`
    content += `Total de puntos: ${capturedPoints.length}\n\n`

    capturedPoints.forEach((point, index) => {
      content += `Punto ${index + 1}:\n`
      content += `  Latitud: ${point.lat.toFixed(6)}\n`
      content += `  Longitud: ${point.lng.toFixed(6)}\n\n`
    })

    // Calculate extreme points
    const northernmost = capturedPoints.reduce((max, p) => p.lat > max.lat ? p : max)
    const southernmost = capturedPoints.reduce((min, p) => p.lat < min.lat ? p : min)
    const easternmost = capturedPoints.reduce((max, p) => p.lng > max.lng ? p : max)
    const westernmost = capturedPoints.reduce((min, p) => p.lng < min.lng ? p : min)

    content += `\n${'='.repeat(50)}\n`
    content += `PUNTOS EXTREMOS\n`
    content += `${'='.repeat(50)}\n\n`

    content += `Punto más al NORTE:\n`
    content += `  Latitud: ${northernmost.lat.toFixed(6)}\n`
    content += `  Longitud: ${northernmost.lng.toFixed(6)}\n\n`

    content += `Punto más al SUR:\n`
    content += `  Latitud: ${southernmost.lat.toFixed(6)}\n`
    content += `  Longitud: ${southernmost.lng.toFixed(6)}\n\n`

    content += `Punto más al ESTE:\n`
    content += `  Latitud: ${easternmost.lat.toFixed(6)}\n`
    content += `  Longitud: ${easternmost.lng.toFixed(6)}\n\n`

    content += `Punto más al OESTE:\n`
    content += `  Latitud: ${westernmost.lat.toFixed(6)}\n`
    content += `  Longitud: ${westernmost.lng.toFixed(6)}\n`

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `coordenadas_${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery) return

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        setMapCenter([parseFloat(lat), parseFloat(lon)])
      } else {
        alert('Location not found')
      }
    } catch (error) {
      console.error('Error searching location:', error)
      alert('Error searching location')
    }
  }

  return (
    <div className="app-container">
      {/* Sidebar for captured points */}
      {capturedPoints.length > 0 && (
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>Puntos Capturados ({capturedPoints.length}/25)</h3>
            <button onClick={clearAllPoints} className="clear-button">Limpiar Todo</button>
          </div>
          <div className="points-list">
            {capturedPoints.map((point, index) => (
              <div key={point.id} className="point-item">
                <div className="point-header">
                  <span className="point-number">Punto {index + 1}</span>
                  <button onClick={() => removePoint(point.id)} className="remove-button">×</button>
                </div>
                <div className="point-coords">
                  <div className="coord-row">
                    <span className="coord-label">Lat:</span>
                    <span className="coord-value">{point.lat.toFixed(6)}</span>
                  </div>
                  <div className="coord-row">
                    <span className="coord-label">Lng:</span>
                    <span className="coord-value">{point.lng.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!captureMode && (
            <div className="sidebar-footer">
              <button onClick={exportCoordinates} className="export-button">
                📥 Exportar Coordenadas
              </button>
            </div>
          )}
        </div>
      )}

      <div className="controls-overlay">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>
        <button
          className={`capture-button ${captureMode ? 'active' : ''}`}
          onClick={() => setCaptureMode(!captureMode)}
        >
          {captureMode ? 'Exit Capture' : 'Capture'}
        </button>
        {capturedPoints.length === 25 && captureMode && (
          <span className="max-points-message">Máximo 25 puntos alcanzado</span>
        )}
      </div>

      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController />

        {/* Draw polygon when 3 or more points are captured */}
        {capturedPoints.length >= 3 && (
          <Polygon
            positions={capturedPoints.map(point => [point.lat, point.lng])}
            pathOptions={{
              color: '#4a90e2',
              fillColor: '#4a90e2',
              fillOpacity: 0.35,
              weight: 3
            }}
          />
        )}

        {capturedPoints.map((point, index) => (
          <Marker key={point.id} position={[point.lat, point.lng]}>
            <Popup>
              <strong>Punto {index + 1}</strong><br />
              Lat: {point.lat.toFixed(6)}<br />
              Lng: {point.lng.toFixed(6)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default App
