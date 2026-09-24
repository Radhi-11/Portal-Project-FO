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
}

module.exports = {
  reverseGeocode,
};
