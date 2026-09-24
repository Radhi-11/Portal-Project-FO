const fs = require('fs');
const JSZip = require('jszip');
const { XMLParser } = require('fast-xml-parser');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: true,
  allowBooleanAttributes: true,
});

function parseCoordinates(coordStr) {
  if (!coordStr || typeof coordStr !== 'string') return [];
  const coords = [];
  const parts = coordStr.trim().split(/[\s\n]+/).filter((p) => p.length > 0);
  for (const part of parts) {
    const [lon, lat, alt] = part.split(',').map((v) => {
      const num = parseFloat(v);
      return isNaN(num) ? null : num;
    });
    if (lon !== null && lat !== null) {
      coords.push({ lat, lon, alt: alt || 0 });
    }
  }
  return coords;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function geodesicDistance(lat1, lon1, lat2, lon2) {
  const a = 6378137;
  const b = 6356752.314245;
  const f = 1 / 298.257223563;

  const toRad = (deg) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const L = toRad(lon2 - lon1);

  const sinU1 = Math.sin(Math.atan((1 - f) * Math.tan(phi1)));
  const cosU1 = Math.cos(Math.atan((1 - f) * Math.tan(phi1)));
  const sinU2 = Math.sin(Math.atan((1 - f) * Math.tan(phi2)));
  const cosU2 = Math.cos(Math.atan((1 - f) * Math.tan(phi2)));

  let lambda = L;
  let iterLimit = 100;

  let sinLambda, cosLambda, sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM, c;
  let lambdaP;

  do {
    sinLambda = Math.sin(lambda);
    cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      cosU2 * sinLambda * cosU2 * sinLambda +
      (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
        (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda),
    );

    if (sinSigma === 0) return 0;

    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;

    cos2SigmaM = cosSqAlpha !== 0 ? cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha : 0;

    c = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda = L + (1 - c) * f * sinAlpha * (
      sigma + c * sinSigma * (cos2SigmaM + c * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM))
    );
  } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));

  const deltaSigma = B * sinSigma * (
    cos2SigmaM + (B / 4) * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
    (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM))
  );

  const s = b * A * (sigma - deltaSigma);

  return s;
}

function calculateLineStringLength(coords) {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += geodesicDistance(
      coords[i - 1].lat, coords[i - 1].lon,
      coords[i].lat, coords[i].lon,
    );
  }
  return total;
}

function parseTrackCoordinates(coordStr) {
  if (!coordStr || typeof coordStr !== 'string') return [];
  const coords = [];
  const parts = coordStr.trim().split(/[\s\n]+/).filter((p) => p.length > 0);
  for (const part of parts) {
    const values = part.split(' ').map((v) => {
      const num = parseFloat(v);
      return isNaN(num) ? null : num;
    });
    if (values.length >= 2 && values[0] !== null && values[1] !== null) {
      coords.push({ lat: values[1], lon: values[0], alt: values[2] || 0 });
    }
  }
  return coords;
}

module.exports = {
  parseKmz,
  extractFirstCoordinate,
  classifyRoute,
  calculateLineStringLength,
  parseTrackCoordinates,
  haversineDistance,
  geodesicDistance,
};

async function parseKmz(filePath) {
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  let kmlContent = null;
  let docKmlName = null;

  const kmlFiles = Object.keys(zip.files).filter((name) =>
    name.toLowerCase().endsWith('.kml'),
  );

  if (kmlFiles.length > 0) {
    docKmlName = kmlFiles[0];
    kmlContent = await zip.file(docKmlName).async('string');
  } else {
    const kmlEntry = Object.keys(zip.files).find(
      (name) => !name.endsWith('/'),
    );
    if (kmlEntry) {
      kmlContent = await zip.file(kmlEntry).async('string');
      docKmlName = kmlEntry;
    }
  }

  if (!kmlContent) {
    throw new Error('No KML content found inside KMZ');
  }

  const kmlObj = xmlParser.parse(kmlContent);

  const objects = [];

  function processPlacemarks(placemarks, parentFolder = 'Root') {
    if (!placemarks) return;
    const arr = Array.isArray(placemarks) ? placemarks : [placemarks];

    for (const pm of arr) {
      const name =
        pm.name || pm.Name || parentFolder || 'Unnamed';
      const description =
        pm.description || pm.Description || '';

      if (pm.Point || (pm['@_'] && pm.Point)) {
        const coords = parseCoordinates(
          typeof pm.Point?.coordinates === 'string'
            ? pm.Point.coordinates
            : typeof pm.Point?.coordinates === 'object'
              ? pm.Point.coordinates['#text'] || pm.Point.coordinates
              : '',
        );
        if (coords.length > 0) {
          objects.push({
            name,
            type: 'POINT',
            route_type: classifyRoute(name),
            coordinates: coords,
            calculated_length: 0,
            description: typeof description === 'string' ? description : '',
            is_selected_for_validation: false,
          });
        }
      }

      if (pm.LineString) {
        const coords = parseCoordinates(
          typeof pm.LineString?.coordinates === 'string'
            ? pm.LineString.coordinates
            : typeof pm.LineString?.coordinates === 'object'
              ? pm.LineString.coordinates['#text'] || pm.LineString.coordinates
              : '',
        );
        if (coords.length > 0) {
          const length = calculateLineStringLength(coords);
          objects.push({
            name,
            type: 'LINESTRING',
            route_type: classifyRoute(name),
            coordinates: coords,
            calculated_length: length,
            description: typeof description === 'string' ? description : '',
            is_selected_for_validation: name.toLowerCase().includes('dropcore') || name.toLowerCase().includes('drop'),
          });
        }
      }

      if (pm['gx:Track'] || pm.gxTrack) {
        const track = pm['gx:Track'] || pm.gxTrack;
        const coordStr = Array.isArray(track)
          ? track.map((t) => t['gx:coord'] || t.coord || '').join(' ')
          : track['gx:coord'] || track.coord || '';
        const coords = parseTrackCoordinates(coordStr);
        if (coords.length > 0) {
          const length = calculateLineStringLength(coords);
          objects.push({
            name,
            type: 'LINESTRING',
            route_type: classifyRoute(name),
            coordinates: coords,
            calculated_length: length,
            description: typeof description === 'string' ? description : '',
            is_selected_for_validation: name.toLowerCase().includes('dropcore') || name.toLowerCase().includes('drop'),
          });
        }
      }

      if (pm.Polygon) {
        const coords = parseCoordinates(
          typeof pm.Polygon?.outerBoundaryIs?.LinearRing?.coordinates === 'string'
            ? pm.Polygon.outerBoundaryIs.LinearRing.coordinates
            : typeof pm.Polygon?.outerBoundaryIs?.LinearRing?.coordinates === 'object'
              ? pm.Polygon.outerBoundaryIs.LinearRing.coordinates['#text'] || pm.Polygon.outerBoundaryIs.LinearRing.coordinates
              : '',
        );
        if (coords.length > 0) {
          objects.push({
            name,
            type: 'POLYGON',
            route_type: classifyRoute(name),
            coordinates: coords,
            calculated_length: 0,
            description: typeof description === 'string' ? description : '',
            is_selected_for_validation: false,
          });
        }
      }

      if (pm.MultiGeometry) {
        const mg = pm.MultiGeometry;
        if (mg.Point) {
          const pts = Array.isArray(mg.Point) ? mg.Point : [mg.Point];
          for (const p of pts) {
            const coords = parseCoordinates(
              typeof p.coordinates === 'string'
                ? p.coordinates
                : typeof p.coordinates === 'object'
                  ? p.coordinates['#text'] || p.coordinates
                  : '',
            );
            if (coords.length > 0) {
              objects.push({
                name,
                type: 'POINT',
                route_type: classifyRoute(name),
                coordinates: coords,
                calculated_length: 0,
                description: typeof description === 'string' ? description : '',
                is_selected_for_validation: false,
              });
            }
          }
        }
        if (mg.LineString) {
          const lss = Array.isArray(mg.LineString) ? mg.LineString : [mg.LineString];
          for (const ls of lss) {
            const coords = parseCoordinates(
              typeof ls.coordinates === 'string'
                ? ls.coordinates
                : typeof ls.coordinates === 'object'
                  ? ls.coordinates['#text'] || ls.coordinates
                  : '',
            );
            if (coords.length > 0) {
              const length = calculateLineStringLength(coords);
              objects.push({
                name,
                type: 'LINESTRING',
                route_type: classifyRoute(name),
                coordinates: coords,
                calculated_length: length,
                description: typeof description === 'string' ? description : '',
                is_selected_for_validation: name.toLowerCase().includes('dropcore') || name.toLowerCase().includes('drop'),
              });
            }
          }
        }
        if (mg.Polygon) {
          const polys = Array.isArray(mg.Polygon) ? mg.Polygon : [mg.Polygon];
          for (const poly of polys) {
            const ring = poly.outerBoundaryIs?.LinearRing;
            const coords = parseCoordinates(
              typeof ring?.coordinates === 'string'
                ? ring.coordinates
                : typeof ring?.coordinates === 'object'
                  ? ring.coordinates['#text'] || ring.coordinates
                  : '',
            );
            if (coords.length > 0) {
              objects.push({
                name,
                type: 'POLYGON',
                route_type: classifyRoute(name),
                coordinates: coords,
                calculated_length: 0,
                description: typeof description === 'string' ? description : '',
                is_selected_for_validation: false,
              });
            }
          }
        }
      }

      if (pm.Folder) {
        const folders = Array.isArray(pm.Folder) ? pm.Folder : [pm.Folder];
        for (const folder of folders) {
          const folderName = folder.name || folder.Name || parentFolder;
          processPlacemarks(folder.Placemark, folderName);
        }
      }
    }
  }

  const doc = kmlObj?.kml?.Document;
  const folders = Array.isArray(doc?.Folder) ? doc.Folder : doc?.Folder ? [doc.Folder] : [];
  const topPlacemarks = doc?.Placemark;

  if (topPlacemarks) {
    processPlacemarks(topPlacemarks, 'Root');
  }

  function processFolder(folder, folderName) {
    if (!folder) return;
    const folders = Array.isArray(folder) ? folder : [folder];
    for (const f of folders) {
      const name = f.name || f.Name || folderName || 'Folder';
      if (f.Placemark) {
        processPlacemarks(f.Placemark, name);
      }
      if (f.Folder) {
        processFolder(f.Folder, name);
      }
    }
  }

  processFolder(folders, 'Root');

  return {
    success: true,
    objects,
    totalObjects: objects.length,
    points: objects.filter((o) => o.type === 'POINT'),
    lineStrings: objects.filter((o) => o.type === 'LINESTRING'),
    polygons: objects.filter((o) => o.type === 'POLYGON'),
  };
}

function classifyRoute(name) {
  if (!name) return 'UNKNOWN';
  const lower = name.toLowerCase();
  if (lower.includes('eksisting') || lower.includes('existing')) return 'EXISTING';
  if (lower.includes('proposed') || lower.includes('usul') || lower.includes('baru')) return 'PROPOSED';
  if (lower.includes('drop') && lower.includes('core')) return 'DROP_CORE';
  return 'UNKNOWN';
}

async function extractFirstCoordinate(kmzPath) {
  const result = await parseKmz(kmzPath);
  if (result.objects.length === 0) {
    throw new Error('No geometry objects found in KMZ');
  }

  const point = result.objects.find((o) => o.type === 'POINT' && o.coordinates.length > 0);
  if (point) {
    return point.coordinates[0];
  }

  const lineString = result.objects.find((o) => o.type === 'LINESTRING' && o.coordinates.length > 0);
  if (lineString) {
    return lineString.coordinates[0];
  }

  throw new Error('No valid coordinates found in KMZ');
}
