async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lon),
    zoom: '10',
    addressdetails: '1',
    namedetails: '0',
    'accept-language': 'id',
  });

  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PortalProjectFO/1.1.0 (Fiber Optic Project Management)',
        'Accept-Language': 'id',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.address?.country_code !== 'id' && data.address?.country?.toLowerCase().includes('indonesia')) {
      data.address = { ...data.address, country_code: 'id' };
    }

    return {
      displayName: data.display_name || null,
      province: data.address?.state || data.address?.province || null,
      city: data.address?.city || data.address?.town || data.address?.village || null,
      district: data.address?.county || data.address?.district || null,
      road: data.address?.road || null,
      postcode: data.address?.postcode || null,
      country: data.address?.country || null,
      countryCode: data.address?.country_code || null,
      lat: parseFloat(data.lat) || lat,
      lon: parseFloat(data.lon) || lon,
    };
  } catch (error) {
    return fallbackGeocode(lat, lon, error.message);
  }
}

function fallbackGeocode(lat, lon, errorMessage) {
  const indonesiaCities = [
    { name: 'Jakarta', province: 'DKI Jakarta', lat: [-6.2, -6.0], lon: [106.6, 107.0] },
    { name: 'Bandung', province: 'Jawa Barat', lat: [-6.9, -6.8], lon: [107.5, 107.7] },
    { name: 'Surabaya', province: 'Jawa Timur', lat: [-7.3, -7.2], lon: [112.7, 112.8] },
    { name: 'Medan', province: 'Sumatera Utara', lat: [3.5, 3.6], lon: [98.6, 98.7] },
    { name: 'Makassar', province: 'Sulawesi Selatan', lat: [-5.1, -5.0], lon: [119.4, 119.5] },
    { name: 'Denpasar', province: 'Bali', lat: [-8.6, -8.5], lon: [115.1, 115.3] },
    { name: 'Semarang', province: 'Jawa Tengah', lat: [-6.97, -6.95], lon: [110.37, 110.42] },
    { name: 'Palembang', province: 'Sumatera Selatan', lat: [-2.99, -2.97], lon: [104.75, 104.78] },
    { name: 'Balikpapan', province: 'Kalimantan Timur', lat: [-1.48, -1.46], lon: [116.78, 117.42] },
    { name: 'Pontianak', province: 'Kalimantan Barat', lat: [-0.04, 0.0], lon: [109.3, 109.35] },
  ];

  let closestCity = null;
  let minDistance = Infinity;

  for (const city of indonesiaCities) {
    const centerLat = (city.lat[0] + city.lat[1]) / 2;
    const centerLon = (city.lon[0] + city.lon[1]) / 2;
    const distance = haversineDistance(lat, lon, centerLat, centerLon);
    if (distance < minDistance && distance < 100000) {
      minDistance = distance;
      closestCity = city;
    }
  }

  return {
    displayName: closestCity ? `${closestCity.name}, ${closestCity.province}, Indonesia` : null,
    province: closestCity ? closestCity.province : null,
    city: closestCity ? closestCity.name : null,
    district: null,
    road: null,
    postcode: null,
    country: 'Indonesia',
    countryCode: 'id',
    lat,
    lon,
    error: errorMessage,
  };
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

module.exports = {
  reverseGeocode,
  fallbackGeocode,
  haversineDistance,
};
