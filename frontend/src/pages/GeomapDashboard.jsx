import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { useProjects } from '../contexts/ProjectContext';
import Spinner from '../components/Spinner';
import { getStatusText, formatCurrency } from '../utils/projectUtils';
import './GeomapDashboard.css';

const DEFAULT_CENTER = [-6.1748, 106.8272];

function FormatCompact({ value }) {
  return formatCurrency(value || 0);
}

function ProjectMarker({ project, onSelect, isSelected, map }) {
  const pinColor = isSelected ? '#FF6B35' : '#0F3460';
  const icon = useMemo(() => {
    return L.divIcon({
      className: 'project-marker-modern',
      html: `
        <div class="marker-pin-modern" style="--pin-color: ${pinColor};">
          <div class="marker-inner"></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -40],
    });
  }, [pinColor]);

  return (
    <Marker
      position={[project.latitude, project.longitude]}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          onSelect(project);
          map?.openPopup;
        },
      }}
    >
      <Popup
        className="project-popup-modern"
        autoClose
        closeButton
      >
          <div className="popup-content-modern">
            <div className="popup-title">{project.project_name}</div>
            <div className="popup-row">
              <span className="popup-label">Project Value</span>
              <span className="popup-value">
                <FormatCompact value={project.total_project_value} />
              </span>
            </div>
          <div className="popup-row">
            <span className="popup-label">Location</span>
            <span className="popup-value">
              {project.city || '-'}, {project.province || '-'}
            </span>
          </div>
          <div className="popup-row">
            <span className="popup-label">Status</span>
            <span className="popup-badge popup-badge-approved">
              {getStatusText(project.review_status)}
            </span>
          </div>
          <Link
            to={`/projects/${project.id}`}
            className="popup-view-btn"
            onClick={(e) => e.stopPropagation()}
          >
            View Project Details
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

function MapController({ selectedProject, allProjects }) {
  const map = useMapEvents({
    click: () => {},
  });

  useEffect(() => {
    if (!map) return;

    if (selectedProject) {
      map.flyTo(
        [selectedProject.latitude, selectedProject.longitude],
        11,
        { duration: 1.2, easeLinearity: 0.35 },
      );
    } else if (allProjects && allProjects.length > 0) {
      const coords = allProjects
        .filter((p) => p.latitude && p.longitude)
        .map((p) => [p.latitude, p.longitude]);
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [80, 80], duration: 1 });
      }
    }
  }, [selectedProject, allProjects, map]);

  return null;
}

export default function GeomapDashboard() {
  const { geomapProjects: projects, geomapLoading: loading, geomapError: error, loadGeomapProjects } = useProjects();
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [provinceFilter, setProvinceFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showList, setShowList] = useState(true);

  const provinces = useMemo(
    () => [...new Set(projects.map((p) => p.province).filter(Boolean))].sort(),
    [projects],
  );
  const cities = useMemo(
    () => [
      ...new Set(projects.map((p) => p.city).filter(Boolean)),
    ].sort(),
    [projects],
  );

  useEffect(() => {
    loadGeomapProjects();
  }, [loadGeomapProjects]);

  useEffect(() => {
    let result = projects;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.project_name || '').toLowerCase().includes(lower) ||
          (p.city || '').toLowerCase().includes(lower) ||
          (p.province || '').toLowerCase().includes(lower),
      );
    }

    if (provinceFilter) {
      result = result.filter((p) => p.province === provinceFilter);
    }

    if (cityFilter) {
      result = result.filter((p) => p.city === cityFilter);
    }

    setFilteredProjects(result);
  }, [search, provinceFilter, cityFilter, projects]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleProvinceChange = (e) => {
    setProvinceFilter(e.target.value);
    setCityFilter('');
  };

  const handleCityChange = (e) => {
    setCityFilter(e.target.value);
  };

  const clearFilters = () => {
    setSearch('');
    setProvinceFilter('');
    setCityFilter('');
  };

  const handleFitAll = () => {
    setSelectedProject(null);
  };

  const totalValue = filteredProjects.reduce(
    (sum, p) => sum + (Number(p.total_project_value) || 0),
    0,
  );

  if (loading) {
    return (
      <div className="geomap-page">
        <div className="geomap-header">
          <h1>Geomap Dashboard</h1>
        </div>
        <div className="loading-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="geomap-page">
        <div className="geomap-header">
          <h1>Geomap Dashboard</h1>
        </div>
        <div className="geomap-error">
          <p>Unable to load project locations.</p>
          <button className="btn btn-primary" onClick={loadGeomapProjects}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="geomap-page">
      <div className="geomap-header">
        <div>
          <h1>Geomap Dashboard</h1>
          <p className="text-secondary">
            {filteredProjects.length === 0
              ? 'No approved projects found.'
              : `${filteredProjects.length} approved project${filteredProjects.length > 1 ? 's' : ''} on map`}
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-sm btn-secondary toggle-list-btn"
            onClick={() => setShowList(!showList)}
          >
            {showList ? 'Hide List' : 'Show List'}
          </button>
        </div>
      </div>

      <div className="geomap-summary">
        <div className="summary-card">
          <div className="summary-card-inner">
            <div className="summary-icon">📍</div>
            <div className="summary-content">
              <div className="summary-label">Approved Projects</div>
              <div className="summary-value">{filteredProjects.length}</div>
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-inner">
            <div className="summary-icon">💰</div>
            <div className="summary-content">
              <div className="summary-label">Total Project Value</div>
              <div className="summary-value">
                <FormatCompact value={totalValue} />
              </div>
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-inner">
            <div className="summary-icon">🏛️</div>
            <div className="summary-content">
              <div className="summary-label">Provinces</div>
              <div className="summary-value">{provinces.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="geomap-container">
        {showList && (
          <div className="geomap-sidebar">
            <div className="sidebar-controls">
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Search project..."
                  value={search}
                  onChange={handleSearchChange}
                  className="search-input-modern"
                />
              </div>
              <div className="filter-row">
                <select
                  value={provinceFilter}
                  onChange={handleProvinceChange}
                  className="filter-select-modern"
                >
                  <option value="">All Provinces</option>
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                <select
                  value={cityFilter}
                  onChange={handleCityChange}
                  className="filter-select-modern"
                >
                  <option value="">All Cities</option>
                  {cities
                    .filter((c) => !provinceFilter || projects.some((p) => p.city === c && p.province === provinceFilter))
                    .map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                </select>
              </div>
              <div className="map-actions">
                <button className="btn btn-sm btn-modern" onClick={handleFitAll}>
                  Fit All Projects
                </button>
                {(search || provinceFilter || cityFilter) && (
                  <button className="btn btn-sm btn-modern-secondary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="project-list-modern">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`project-list-item-modern ${
                      selectedProject?.id === project.id ? 'active' : ''
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="project-list-marker"></div>
                    <div className="project-list-info">
                      <div className="project-list-name">{project.project_name}</div>
                      <div className="project-list-location">
                        {project.city || '-'}, {project.province || '-'}
                      </div>
                      <div className="project-list-value">
                        <FormatCompact value={project.total_project_value} />
                      </div>
                    </div>
                    <Link
                      to={`/projects/${project.id}`}
                      className="project-list-view-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Link>
                  </div>
                ))
              ) : (
                <div className="empty-state-modern">
                  <div className="empty-icon">📍</div>
                  <p>No projects match your search.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="map-wrapper-modern">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapController
              selectedProject={selectedProject}
              allProjects={selectedProject ? null : filteredProjects}
            />
            {filteredProjects
              .filter((p) => p.latitude && p.longitude)
              .map((project) => (
                <ProjectMarker
                  key={project.id}
                  project={project}
                  onSelect={setSelectedProject}
                  isSelected={selectedProject?.id === project.id}
                  map={null}
                />
              ))}
          </MapContainer>

          <div className="map-overlay-toolbar">
            <button
              className="toolbar-btn"
              onClick={handleFitAll}
              title="Fit All Projects"
            >
              🌍
            </button>
            {selectedProject && (
              <button
                className="toolbar-btn active"
                title="Selected Project"
              >
                📍
              </button>
            )}
          </div>

          <div className="map-legend-modern">
            <div className="legend-header">
              <span>Legend</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot approved"></span>
              <span>Project Location</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot selected"></span>
              <span>Selected</span>
            </div>
          </div>

          {filteredProjects.length === 0 && (
            <div className="empty-state-map">
              <div className="empty-icon">📍</div>
              <h3>No Approved Projects</h3>
              <p>There are currently no approved FO projects to display.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
