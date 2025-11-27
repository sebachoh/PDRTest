import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

// Helper function to calculate distance between two points in meters (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper function to calculate polygon area in square meters
const calculatePolygonArea = (points) => {
  if (points.length < 3) return 0;
  let area = 0;
  const R = 6371e3; // Earth radius in meters

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    const x1 = p1.lng * Math.PI / 180;
    const y1 = p1.lat * Math.PI / 180;
    const x2 = p2.lng * Math.PI / 180;
    const y2 = p2.lat * Math.PI / 180;

    area += (x2 - x1) * (2 + Math.sin(y1) + Math.sin(y2));
  }
  area = Math.abs(area * R * R / 2);
  return area;
}

// Helper function to calculate perimeter in meters
const calculatePerimeter = (points) => {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length - 1; i++) {
    perimeter += calculateDistance(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
  }
  // Close the loop if it's a polygon (3+ points)
  if (points.length >= 3) {
    perimeter += calculateDistance(points[points.length - 1].lat, points[points.length - 1].lng, points[0].lat, points[0].lng);
  }
  return perimeter;
}

// Component to handle map events and updates
function MapController({ captureMode, restrictionMode, setCapturedPoints, setCurrentRestriction, mapCenter, capturedPoints, currentRestriction }) {
  const map = useMap()

  // Handle Capture/Restriction Mode: Disable/Enable interactions
  useEffect(() => {
    if (captureMode || restrictionMode) {
      map.dragging.disable()
      map.touchZoom.disable()
      map.doubleClickZoom.disable()
      map.scrollWheelZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()
      map.zoomControl.disable()

      if (map.tap) map.tap.disable()
      map.getContainer().style.cursor = 'crosshair'

      map.options.scrollWheelZoom = false
      map.options.doubleClickZoom = false
      map.options.boxZoom = false
      map.options.zoomControl = false

    } else {
      map.dragging.enable()
      map.touchZoom.enable()
      map.doubleClickZoom.enable()
      map.scrollWheelZoom.enable()
      map.boxZoom.enable()
      map.keyboard.enable()
      map.zoomControl.enable()

      if (map.tap) map.tap.enable()
      map.getContainer().style.cursor = ''

      map.options.scrollWheelZoom = true
      map.options.doubleClickZoom = true
      map.options.boxZoom = true
      map.options.zoomControl = true
    }

    map.invalidateSize()
  }, [captureMode, restrictionMode, map])

  // Handle Map Clicks for Capture
  useMapEvents({
    click(e) {
      if (captureMode && capturedPoints.length < 25) {
        setCapturedPoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng, id: Date.now() }])
      } else if (restrictionMode) {
        setCurrentRestriction(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng, id: Date.now() }])
      }
    },

    wheel(e) {
      if (captureMode || restrictionMode) {
        e.originalEvent.preventDefault()
        return false
      }
    }
  })

  // Fly to new center when it changes (from search only)
  useEffect(() => {
    if (!captureMode && !restrictionMode) {
      map.flyTo(mapCenter, 13)
    }
  }, [mapCenter, map]) // captureMode/restrictionMode removed from deps to avoid re-fly on toggle

  return null
}

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [captureMode, setCaptureMode] = useState(false)
  const [capturedPoints, setCapturedPoints] = useState([])
  const [mapCenter, setMapCenter] = useState([51.505, -0.09])

  // Restriction state
  const [restrictionMode, setRestrictionMode] = useState(false)
  const [restrictions, setRestrictions] = useState([]) // Array of arrays of points
  const [currentRestriction, setCurrentRestriction] = useState([])

  const removePoint = (id) => {
    setCapturedPoints(prev => prev.filter(point => point.id !== id))
  }

  const clearAllPoints = () => {
    setCapturedPoints([])
    setRestrictions([])
    setCurrentRestriction([])
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

  const mainArea = calculatePolygonArea(capturedPoints);
  const restrictionArea = restrictions.reduce((acc, points) => acc + calculatePolygonArea(points), 0);
  const totalArea = Math.max(0, mainArea - restrictionArea);

  const perimeter = calculatePerimeter(capturedPoints);

  const toggleRestrictionMode = () => {
    if (restrictionMode) {
      // Save current restriction if valid
      if (currentRestriction.length >= 3) {
        setRestrictions(prev => [...prev, currentRestriction])
      }
      setCurrentRestriction([])
      setRestrictionMode(false)
    } else {
      setRestrictionMode(true)
      setCaptureMode(false) // Ensure capture mode is off
    }
  }

  const toggleCaptureMode = () => {
    if (captureMode) {
      setCaptureMode(false)
    } else {
      setCaptureMode(true)
      setRestrictionMode(false) // Ensure restriction mode is off
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

          {/* Restrictions List in Sidebar */}
          {restrictions.length > 0 && (
            <div className="restrictions-list-section">
              <div className="sidebar-header" style={{ marginTop: '20px', background: 'linear-gradient(135deg, #c0392b 0%, #8e44ad 100%)' }}>
                <h3>Restricciones ({restrictions.length})</h3>
                <button onClick={() => setRestrictions([])} className="clear-button">Limpiar</button>
              </div>
              <div className="points-list" style={{ maxHeight: '200px' }}>
                {restrictions.map((res, i) => (
                  <div key={i} className="point-item restriction-item">
                    <div className="point-header">
                      <span className="point-number" style={{ color: '#e74c3c' }}>Restricción {i + 1}</span>
                      <button onClick={() => setRestrictions(prev => prev.filter((_, idx) => idx !== i))} className="remove-button">×</button>
                    </div>
                    <div className="coord-row">
                      <span className="coord-label">Área:</span>
                      <span className="coord-value">{calculatePolygonArea(res).toLocaleString(undefined, { maximumFractionDigits: 2 })} m²</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!captureMode && !restrictionMode && (
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

        <div className="capture-controls">
          <button
            className={`capture-button ${captureMode ? 'active' : ''}`}
            onClick={toggleCaptureMode}
          >
            {captureMode ? 'Terminar Captura' : 'Capturar'}
          </button>

          {capturedPoints.length >= 3 && (
            <button
              className={`capture-button restriction-button ${restrictionMode ? 'active' : ''}`}
              onClick={toggleRestrictionMode}
            >
              {restrictionMode ? 'Terminar Restricción' : 'Agregar Restricción'}
            </button>
          )}

          {(capturedPoints.length >= 2) && (
            <div className="metrics-box">
              {capturedPoints.length >= 3 && (
                <div className="metric-item">
                  <span className="metric-label">Área:</span>
                  <span className="metric-value">{totalArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²</span>
                  {restrictionArea > 0 && (
                    <span className="metric-subtext">(Restricción: -{restrictionArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²)</span>
                  )}
                </div>
              )}
              <div className="metric-item">
                <span className="metric-label">Perímetro:</span>
                <span className="metric-value">{perimeter.toLocaleString(undefined, { maximumFractionDigits: 2 })} m</span>
              </div>
            </div>
          )}
        </div>

        {capturedPoints.length === 25 && captureMode && (
          <span className="max-points-message">Máximo 25 puntos alcanzado</span>
        )}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController
          captureMode={captureMode}
          restrictionMode={restrictionMode}
          setCapturedPoints={setCapturedPoints}
          setCurrentRestriction={setCurrentRestriction}
          mapCenter={mapCenter}
          capturedPoints={capturedPoints}
          currentRestriction={currentRestriction}
        />

        {/* Draw polygon when 3 or more points are captured */}
        {capturedPoints.length >= 3 && (
          <Polygon
            positions={[
              capturedPoints.map(point => [point.lat, point.lng]),
              ...restrictions.map(res => res.map(p => [p.lat, p.lng]))
            ]}
            pathOptions={{
              color: '#4a90e2',
              fillColor: '#4a90e2',
              fillOpacity: 0.35,
              weight: 3
            }}
          />
        )}

        {/* Draw current restriction being drawn */}
        {currentRestriction.length > 0 && (
          <>
            <Polygon
              positions={currentRestriction.map(point => [point.lat, point.lng])}
              pathOptions={{
                color: '#e74c3c',
                fillColor: '#e74c3c',
                fillOpacity: 0.35,
                weight: 3,
                dashArray: '5, 5'
              }}
            />
            {currentRestriction.map((point, index) => (
              <Marker key={point.id} position={[point.lat, point.lng]}>
                <Popup>
                  <strong>Restricción Punto {index + 1}</strong>
                </Popup>
              </Marker>
            ))}
          </>
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