import { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../api/axios';
import Spinner from './Spinner';
import './KMZMap.css';

let iconsInitialized = false;
function initIcons() {
  if (iconsInitialized) return;
  iconsInitialized = true;
  try {
    const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
    const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
    const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  } catch (e) {
    console.warn('Leaflet icon initialization skipped:', e);
  }
}

initIcons();

const routeColors = {
  EXISTING: '#3b82f6',
  PROPOSED: '#22c55e',
  DROP_CORE: '#f59e0b',
  UNKNOWN: '#6b7280',
};

const routeLabels = {
  EXISTING: 'Existing Route',
  PROPOSED: 'Proposed Route',
  DROP_CORE: 'Drop Core',
  UNKNOWN: 'Unknown',
};

function FitBounds({ objects }) {
  const map = useMap();

  useEffect(() => {
    if (!objects || objects.length === 0) return;

    const allCoords = [];
    objects.forEach((obj) => {
      if (obj.coordinates) {
        obj.coordinates.forEach((c) => {
          allCoords.push([c.lat, c.lon]);
        });
      }
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, objects]);

  return null;
}

export default function KMZMap({ projectId }) {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    loadKmzGeometry();
  }, [projectId]);

  const loadKmzGeometry = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/kmz`);
      setObjects(res.data.objects || []);
      setError('');
    } catch (err) {
      setError('Failed to load KMZ geometry.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner label="Loading map..." />;

  if (error) {
    return <div className="map-error">{error}</div>;
  }

  if (!objects || objects.length === 0) {
    return <div className="map-empty">No geometry data available for this project.</div>;
  }

  const defaultCenter = objects[0]?.coordinates?.[0]
    ? [objects[0].coordinates[0].lat, objects[0].coordinates[0].lon]
    : [-6.1748, 106.8272];

  const renderGeometry = (obj) => {
    switch (obj.type) {
      case 'POINT':
        return (
          <CircleMarker
            key={`point-${obj.name}`}
            center={[obj.coordinates[0].lat, obj.coordinates[0].lon]}
            radius={8}
            color={routeColors[obj.route_type] || routeColors.UNKNOWN}
            fillOpacity={0.8}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {obj.name} ({routeLabels[obj.route_type] || 'Unknown'})
            </Tooltip>
            <Popup>
              <div className="popup-content">
                <strong>{obj.name}</strong>
                <p>Type: {routeLabels[obj.route_type] || 'Unknown'}</p>
              </div>
            </Popup>
          </CircleMarker>
        );

      case 'LINESTRING':
        const latlngs = obj.coordinates.map((c) => [c.lat, c.lon]);
        const color = routeColors[obj.route_type] || routeColors.UNKNOWN;
        return (
          <Polyline
            key={`linestring-${obj.name}`}
            positions={latlngs}
            color={color}
            weight={5}
            opacity={0.8}
          >
            <Tooltip direction="center" offset={[0, 0]} permanent={false}>
              {obj.name}
            </Tooltip>
            <Popup>
              <div className="popup-content">
                <strong>{obj.name}</strong>
                <p>Type: {routeLabels[obj.route_type] || 'Unknown'}</p>
                <p>Length: {obj.calculated_length.toFixed(2)} m</p>
              </div>
            </Popup>
          </Polyline>
        );

      case 'POLYGON':
        const polygonCoords = obj.coordinates.map((c) => [c.lat, c.lon]);
        return (
          <Polygon
            key={`polygon-${obj.name}`}
            positions={polygonCoords}
            color="#8b5cf6"
            weight={3}
            fillOpacity={0.3}
          >
            <Tooltip direction="top" offset={[0, 0]}>
              {obj.name}
            </Tooltip>
            <Popup>
              <div className="popup-content">
                <strong>{obj.name}</strong>
                <p>Type: Polygon</p>
              </div>
            </Popup>
          </Polygon>
        );

      default:
        return null;
    }
  };

  return (
    <div className="map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={15}
        style={{ height: '400px', width: '100%' }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds objects={objects} />
        {objects.map((obj) => renderGeometry(obj))}
      </MapContainer>
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: routeColors.EXISTING }}></span>
          Existing Route
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: routeColors.PROPOSED }}></span>
          Proposed Route
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: routeColors.DROP_CORE }}></span>
          Drop Core
        </div>
      </div>
    </div>
  );
}
