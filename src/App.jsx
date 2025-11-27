import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [captureMode, setCaptureMode] = useState(false)
  const [capturedPoint, setCapturedPoint] = useState(null)
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
        if (captureMode) {
          setCapturedPoint(e.latlng)
        }
      },
    })

    // Fly to new center when it changes (from search)
    useEffect(() => {
      map.flyTo(mapCenter, 13)
    }, [mapCenter, map])

    return null
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
      </div>

      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController />
        {capturedPoint && (
          <Marker position={capturedPoint}>
            <Popup>
              <strong>Captured Point</strong><br />
              Lat: {capturedPoint.lat.toFixed(5)}<br />
              Lng: {capturedPoint.lng.toFixed(5)}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

export default App
