/**
 * locationService.js
 * 
 * Dedicated Location & Geocoding Service Layer
 * 
 * Architecture:
 * - TIER 1: MapTiler Cloud Geocoding API (with explicit POI, address, region, municipality types & proximity bias)
 * - TIER 2: Photon by Komoot (100% Free, Zero-Account, Open-Source OpenSearch Geocoder over OpenStreetMap)
 * - TIER 3: Open-Meteo Geocoding API (Smart fallback with multi-token address parsing & population weighting)
 * - TIER 4: Smart Parent Locality Fallback (Handles sub-neighborhoods like "Burmamines Jamshedpur" or "Bhuiyadih")
 * - Normalized Location Schema across the entire application
 * - Disambiguation support for multi-candidate queries
 */

/**
 * @typedef {Object} NormalizedLocation
 * @property {string} id - Unique identifier (e.g. "poi.12345", "photon_123", "om_123456")
 * @property {string} name - Short display name (e.g. "Arka Jain University", "Mohanpur", "Burmamines")
 * @property {string} fullName - Complete geographic address
 * @property {number} latitude - Decimal latitude
 * @property {number} longitude - Decimal longitude
 * @property {string} country - Country name (e.g. "India")
 * @property {string} countryCode - ISO 2-letter country code (e.g. "IN")
 * @property {string} admin1 - Primary administrative division / State (e.g. "Jharkhand")
 * @property {string} admin2 - Secondary administrative division / District (e.g. "East Singhbhum")
 * @property {string} type - Feature category ("poi" | "municipality" | "locality" | "region" | "address" | "village")
 * @property {number} relevance - Confidence score between 0.0 and 1.0
 */

// Supported MapTiler types - explicitly including POI and Region
const MAPTILER_TYPES = [
  'poi',
  'address',
  'municipality',
  'locality',
  'place',
  'region',
  'country',
  'county',
  'subregion',
  'neighbourhood',
].join(',');

/**
 * Normalizes a MapTiler GeoJSON feature into a NormalizedLocation object
 * @param {object} feature - MapTiler GeoJSON feature
 * @returns {NormalizedLocation}
 */
export function normalizeMapTilerFeature(feature) {
  const coords = feature.center || feature.geometry?.coordinates || [0, 0];
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  const context = feature.context || [];

  const countryObj = context.find((c) => c.id?.startsWith('country'));
  const regionObj = context.find((c) => c.id?.startsWith('region'));
  const subregionObj = context.find(
    (c) => c.id?.startsWith('subregion') || c.id?.startsWith('county') || c.id?.startsWith('district')
  );

  const placeType = Array.isArray(feature.place_type) ? feature.place_type[0] : (feature.place_type || 'place');
  const shortName = feature.text || feature.place_name?.split(',')[0]?.trim() || 'Location';

  return {
    id: String(feature.id || `maptiler_${lat.toFixed(4)}_${lon.toFixed(4)}`),
    name: shortName,
    fullName: feature.place_name || shortName,
    latitude: lat,
    longitude: lon,
    country: countryObj?.text || '',
    countryCode: (countryObj?.short_code || '').toUpperCase(),
    admin1: regionObj?.text || '',
    admin2: subregionObj?.text || '',
    type: placeType,
    relevance: typeof feature.relevance === 'number' ? Math.min(1.0, Math.max(0.1, feature.relevance)) : 0.9,
  };
}

/**
 * Normalizes a Photon by Komoot GeoJSON feature into a NormalizedLocation object
 * @param {object} feature - Photon GeoJSON feature
 * @returns {NormalizedLocation}
 */
export function normalizePhotonFeature(feature) {
  const coords = feature.geometry?.coordinates || [0, 0];
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  const p = feature.properties || {};

  const shortName = p.name || p.city || p.locality || p.district || 'Location';

  const fullParts = [
    p.name,
    p.street,
    p.suburb || p.district,
    p.city,
    p.state,
    p.country,
  ].filter(Boolean);

  // Deduplicate adjacent identical names (e.g. "Mohanpur, Mohanpur")
  const uniqueParts = fullParts.filter((item, idx, arr) => arr.indexOf(item) === idx);

  const osmVal = p.osm_value || '';
  const osmKey = p.osm_key || '';

  const type =
    osmVal === 'university' || osmVal === 'college' || osmKey === 'amenity'
      ? 'poi'
      : osmVal === 'state'
      ? 'region'
      : ['city', 'town'].includes(osmVal)
      ? 'municipality'
      : ['suburb', 'neighbourhood', 'village', 'hamlet', 'quarter'].includes(osmVal)
      ? 'locality'
      : 'place';

  return {
    id: `photon_${p.osm_type || 'W'}_${p.osm_id || `${lat.toFixed(4)}_${lon.toFixed(4)}`}`,
    name: shortName,
    fullName: uniqueParts.join(', ') || shortName,
    latitude: lat,
    longitude: lon,
    country: p.country || '',
    countryCode: (p.countrycode || '').toUpperCase(),
    admin1: p.state || '',
    admin2: p.district || p.city || '',
    type,
    relevance: 0.9,
  };
}

/**
 * Normalizes an Open-Meteo search result into a NormalizedLocation object
 * @param {object} res - Open-Meteo geocoding result
 * @param {number} score - Computed relevance score
 * @returns {NormalizedLocation}
 */
export function normalizeOpenMeteoResult(res, score = 70) {
  const isRegion = res.feature_code?.startsWith('ADM1') || res.feature_code === 'PCLI';
  const isMajorCity = ['PPLC', 'PPLA', 'PPLA2'].includes(res.feature_code);
  const type = isRegion ? 'region' : isMajorCity ? 'municipality' : 'locality';

  const fullParts = [res.name, res.admin2, res.admin1, res.country].filter(Boolean);

  return {
    id: `om_${res.id || `${res.latitude}_${res.longitude}`}`,
    name: res.name,
    fullName: fullParts.join(', '),
    latitude: Number(res.latitude),
    longitude: Number(res.longitude),
    country: res.country || '',
    countryCode: (res.country_code || '').toUpperCase(),
    admin1: res.admin1 || '',
    admin2: res.admin2 || '',
    type,
    relevance: Math.min(1.0, Math.max(0.2, Math.round((score / 120) * 100) / 100)),
  };
}

/**
 * Tier 1: MapTiler Cloud Geocoding API
 * @param {string} query
 * @param {object} [options]
 * @returns {Promise<NormalizedLocation[]>}
 */
export async function searchMapTiler(query, options = {}) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey =
    options.apiKey ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPTILER_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_MAPTILER_API_KEY) ||
    '';
  if (!apiKey) return [];

  let url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    trimmed
  )}.json?key=${apiKey}&language=en&limit=10&types=${MAPTILER_TYPES}`;

  if (options.proximity && typeof options.proximity.latitude === 'number' && typeof options.proximity.longitude === 'number') {
    url += `&proximity=${options.proximity.longitude},${options.proximity.latitude}`;
  }

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
    return [];
  }

  return data.features.map(normalizeMapTilerFeature);
}

/**
 * Tier 2: Photon by Komoot (100% Free, Zero-Account, Open-Source Geocoder over OpenStreetMap)
 * Features:
 * - Native OpenSearch fuzzy matching
 * - Supports compound address queries (e.g. "Mohanpur, Gamharia, Jharkhand")
 * - Proximity biasing via lat & lon
 * 
 * @param {string} query
 * @param {object} [options]
 * @returns {Promise<NormalizedLocation[]>}
 */
export async function searchPhoton(query, options = {}) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=10`;

    if (options.proximity && typeof options.proximity.latitude === 'number' && typeof options.proximity.longitude === 'number') {
      url += `&lat=${options.proximity.latitude}&lon=${options.proximity.longitude}`;
    }

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
      return [];
    }

    return data.features.map(normalizePhotonFeature);
  } catch (err) {
    console.warn('Photon geocoding notice:', err);
    return [];
  }
}

/**
 * Tier 3: Smart Open-Meteo Geocoding with Multi-Token Ranking
 * @param {string} query
 * @returns {Promise<NormalizedLocation[]>}
 */
export async function searchOpenMeteo(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = trimmed.split(',').map((t) => t.trim()).filter(Boolean);
  const primaryToken = tokens[0];
  const contextTokens = tokens.slice(1).map((t) => t.toLowerCase());

  async function fetchAndScore(token) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        token
      )}&count=10&language=en&format=json`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      if (!data.results || !Array.isArray(data.results)) return [];

      return data.results.map((item) => {
        let score = 50;
        const itemName = (item.name || '').toLowerCase();
        const queryLower = token.toLowerCase();

        if (itemName === queryLower) {
          score += 35;
        } else if (itemName.includes(queryLower) || queryLower.includes(itemName)) {
          score += 15;
        }

        const itemAdmin1 = (item.admin1 || '').toLowerCase();
        const itemAdmin2 = (item.admin2 || '').toLowerCase();
        const itemCountry = (item.country || '').toLowerCase();

        contextTokens.forEach((ctx) => {
          if (itemAdmin1.includes(ctx) || ctx.includes(itemAdmin1)) score += 40;
          if (itemAdmin2.includes(ctx) || ctx.includes(itemAdmin2)) score += 25;
          if (itemCountry.includes(ctx) || ctx.includes(itemCountry)) score += 15;
        });

        if (item.feature_code === 'ADM1' || item.feature_code === 'PCLI') {
          score += 30;
        } else if (['PPLC', 'PPLA', 'PPLA2'].includes(item.feature_code)) {
          score += 25;
        } else if (item.feature_code === 'PPL') {
          score += 10;
        }

        if (typeof item.population === 'number' && item.population > 0) {
          score += Math.min(25, Math.log10(item.population) * 4);
        }

        return { item, score };
      });
    } catch {
      return [];
    }
  }

  let scoredList = await fetchAndScore(primaryToken);

  if (tokens.length > 1 && (scoredList.length === 0 || Math.max(...scoredList.map((s) => s.score)) < 70)) {
    const secondaryList = await fetchAndScore(tokens[1]);
    scoredList = [...scoredList, ...secondaryList];
  }

  if (scoredList.length === 0) return [];

  scoredList.sort((a, b) => b.score - a.score);

  const deduplicated = [];
  scoredList.forEach(({ item, score }) => {
    const exists = deduplicated.some(
      (d) => Math.abs(d.item.latitude - item.latitude) < 0.05 && Math.abs(d.item.longitude - item.longitude) < 0.05
    );
    if (!exists) deduplicated.push({ item, score });
  });

  return deduplicated.slice(0, 8).map(({ item, score }) => normalizeOpenMeteoResult(item, score));
}

/**
 * Tier 4: Smart Parent City Token Fallback
 * Handles sub-localities (e.g. "Burmamines Jamshedpur" or "Bhuiyadih Jamshedpur") where
 * the local colony has no standalone weather station, but the parent city is recognized.
 * 
 * @param {string} query
 * @param {object} [options]
 * @returns {Promise<NormalizedLocation[]>}
 */
export async function searchParentCityFallback(query, options = {}) {
  const trimmed = query.trim();
  const tokens = trimmed.split(/[\s,]+/).filter((t) => t.length >= 3);
  if (tokens.length <= 1) return [];

  // Check tokens from right to left (e.g., "Jamshedpur" in "Burmamines Jamshedpur")
  for (let i = tokens.length - 1; i >= 0; i--) {
    const candidateCity = tokens[i];
    // Skip words that are generic suffixes
    if (['road', 'street', 'main', 'east', 'west', 'north', 'south'].includes(candidateCity.toLowerCase())) {
      continue;
    }

    try {
      const photonResults = await searchPhoton(candidateCity, options);
      const top = photonResults.find(
        (r) => ['municipality', 'region', 'place'].includes(r.type) && r.name.toLowerCase() === candidateCity.toLowerCase()
      );

      if (top) {
        const localityName = tokens.slice(0, i).join(' ');
        const compositeName = localityName ? `${localityName}, ${top.name}` : top.name;
        return [
          {
            id: `parent_${top.id}`,
            name: compositeName,
            fullName: `${compositeName}, ${top.admin1 ? `${top.admin1}, ` : ''}${top.country}`,
            latitude: top.latitude,
            longitude: top.longitude,
            country: top.country,
            countryCode: top.countryCode,
            admin1: top.admin1,
            admin2: top.admin2,
            type: 'locality',
            relevance: 0.88,
          },
        ];
      }
    } catch {
      // Continue to next token
    }
  }

  return [];
}

/**
 * Unified Location Search Engine
 * Cascades through:
 * 1. MapTiler Cloud Geocoding (Primary)
 * 2. Photon by Komoot (100% Free OpenSearch over OpenStreetMap)
 * 3. Open-Meteo Geocoding (Fallback)
 * 4. Smart Parent City Fallback
 * 
 * @param {string} query - Location query string
 * @param {object} [options]
 * @param {{ latitude: number, longitude: number }} [options.proximity] - Optional user GPS proximity
 * @returns {Promise<NormalizedLocation[]>}
 */
export async function searchLocations(query, options = {}) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. TIER 1: MapTiler Geocoding
  try {
    const mapTilerResults = await searchMapTiler(trimmed, options);
    const strongMapTiler = mapTilerResults.filter((r) => r.relevance >= 0.7);
    if (strongMapTiler.length > 0) {
      return strongMapTiler;
    }
  } catch (err) {
    console.warn('MapTiler geocoding notice, proceeding to Photon:', err);
  }

  // 2. TIER 2: Photon by Komoot (100% Free OpenSearch OSM Geocoder)
  try {
    const photonResults = await searchPhoton(trimmed, options);
    if (photonResults.length > 0) {
      return photonResults;
    }
  } catch (err) {
    console.warn('Photon fallback geocoding notice:', err);
  }

  // 3. TIER 3: Open-Meteo Geocoding
  try {
    const openMeteoResults = await searchOpenMeteo(trimmed);
    const strongOpenMeteo = openMeteoResults.filter((r) => r.relevance >= 0.5);
    if (strongOpenMeteo.length > 0) {
      return strongOpenMeteo;
    }
  } catch (err) {
    console.warn('Open-Meteo fallback geocoding notice:', err);
  }

  // 4. TIER 4: Smart Parent City Fallback (Handles "Burmamines Jamshedpur", "Bhuiyadih Jamshedpur")
  try {
    const parentCityResults = await searchParentCityFallback(trimmed, options);
    if (parentCityResults.length > 0) {
      return parentCityResults;
    }
  } catch (err) {
    console.warn('Parent city fallback notice:', err);
  }

  return [];
}

/**
 * Resolves a search query into either a direct match (if single/clear winner)
 * or a candidate list for user disambiguation.
 * 
 * @param {string} query
 * @param {object} [options]
 * @returns {Promise<{ directMatch: NormalizedLocation | null, candidates: NormalizedLocation[] }>}
 */
export async function resolveLocation(query, options = {}) {
  const candidates = await searchLocations(query, options);

  if (!candidates || candidates.length === 0) {
    return { directMatch: null, candidates: [] };
  }

  // If exactly 1 candidate, it is a direct match
  if (candidates.length === 1) {
    return { directMatch: candidates[0], candidates };
  }

  const top = candidates[0];
  const second = candidates[1];
  const queryLower = query.trim().toLowerCase();

  // Check if second candidate is merely a sub-facility/station within the same primary place
  const isTopPrimaryPlace = ['place', 'municipality', 'region', 'country'].includes(top.type);
  const isSecondSubPoi = second.type === 'poi' || second.type === 'address';
  const isSubFacility =
    isTopPrimaryPlace &&
    isSecondSubPoi &&
    (top.name.toLowerCase() === queryLower || top.fullName.toLowerCase().startsWith(queryLower));

  // Check if candidates with the same name are actually the same metropolitan city (within ~15km)
  const isSameMetroArea =
    Math.abs(top.latitude - second.latitude) < 0.15 &&
    Math.abs(top.longitude - second.longitude) < 0.15;

  // Ambiguity Check 1: Multiple candidates share the exact same short name in DIFFERENT regions
  const shareSameNameDifferentPlaces =
    top.name.toLowerCase() === second.name.toLowerCase() && !isSameMetroArea;

  // Ambiguity Check 2: Runner-up candidate is in a different location with close relevance
  const isCloseMatchDifferentPlaces =
    Math.abs(top.relevance - (second.relevance || 0)) < 0.15 && !isSameMetroArea;

  // If candidates are truly ambiguous between different locations, require user selection
  if (!isSubFacility && (shareSameNameDifferentPlaces || isCloseMatchDifferentPlaces)) {
    return { directMatch: null, candidates };
  }

  // Clear single winner with high confidence
  if (top.relevance >= 0.85) {
    return { directMatch: top, candidates };
  }

  return { directMatch: null, candidates };
}

/**
 * Reverse Geocodes coordinates [latitude, longitude] to a NormalizedLocation
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<NormalizedLocation>}
 */
export async function reverseGeocodeLocation(latitude, longitude) {
  const apiKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPTILER_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_MAPTILER_API_KEY) ||
    '';

  // 1. Try MapTiler Reverse Geocoding
  if (apiKey) {
    try {
      const url = `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${apiKey}&language=en&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          return normalizeMapTilerFeature(data.features[0]);
        }
      }
    } catch (err) {
      console.warn('MapTiler reverse geocode notice:', err);
    }
  }

  // 2. Try Photon Reverse Geocoding (100% Free OpenStreetMap)
  try {
    const url = `https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        return normalizePhotonFeature(data.features[0]);
      }
    }
  } catch (err) {
    console.warn('Photon reverse geocode notice:', err);
  }

  // 3. Fallback to BigDataCloud client reverse geocoding
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const cityName = data.locality || data.city || data.principalSubdivision || 'Current Location';
      return {
        id: `gps_${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
        name: cityName,
        fullName: [cityName, data.principalSubdivision, data.countryName].filter(Boolean).join(', '),
        latitude,
        longitude,
        country: data.countryName || '',
        countryCode: (data.countryCode || '').toUpperCase(),
        admin1: data.principalSubdivision || '',
        admin2: data.locality || '',
        type: 'locality',
        relevance: 1.0,
      };
    }
  } catch (err) {
    console.warn('BigDataCloud reverse geocode notice:', err);
  }

  // Final fallback
  return {
    id: `gps_${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
    name: 'GPS Location',
    fullName: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
    latitude,
    longitude,
    country: '',
    countryCode: '',
    admin1: '',
    admin2: '',
    type: 'locality',
    relevance: 1.0,
  };
}
