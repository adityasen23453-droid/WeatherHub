/**
 * locationService.js
 * 
 * Dedicated Location & Geocoding Service Layer
 * 
 * Architecture:
 * - PRIMARY: MapTiler Cloud Geocoding API (with explicit POI, address, region, municipality types & proximity bias)
 * - FALLBACK: Open-Meteo Geocoding API (with multi-token address parsing, compound query handling & multi-criteria scoring)
 * - NO unrestricted public Nominatim client-side calls (avoids policy / rate-limit violations)
 * - Normalized Location Schema across the entire application
 * - Disambiguation support for multi-candidate queries
 */

/**
 * @typedef {Object} NormalizedLocation
 * @property {string} id - Unique identifier (e.g. "poi.12345", "om_123456")
 * @property {string} name - Short display name (e.g. "Arka Jain University", "Mohanpur")
 * @property {string} fullName - Complete geographic address
 * @property {number} latitude - Decimal latitude
 * @property {number} longitude - Decimal longitude
 * @property {string} country - Country name (e.g. "India")
 * @property {string} countryCode - ISO 2-letter country code (e.g. "IN")
 * @property {string} admin1 - Primary administrative division / State (e.g. "Jharkhand")
 * @property {string} admin2 - Secondary administrative division / District (e.g. "Saraikela Kharsawan")
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
 * Primary Geocoder: MapTiler Cloud Geocoding API
 * Explicitly requests POI, addresses, municipalities, and regions with optional proximity bias
 * 
 * @param {string} query - Raw search query
 * @param {object} [options]
 * @param {{ latitude: number, longitude: number }} [options.proximity] - Proximity bias coordinates
 * @param {string} [options.apiKey] - Optional explicit key (defaults to import.meta.env)
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
  if (!apiKey) {
    return [];
  }

  let url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    trimmed
  )}.json?key=${apiKey}&language=en&limit=10&types=${MAPTILER_TYPES}`;

  if (options.proximity && typeof options.proximity.latitude === 'number' && typeof options.proximity.longitude === 'number') {
    url += `&proximity=${options.proximity.longitude},${options.proximity.latitude}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`MapTiler Geocoding HTTP status: ${res.status}`);
    return [];
  }

  const data = await res.json();
  if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
    return [];
  }

  return data.features.map(normalizeMapTilerFeature);
}

/**
 * Fallback Geocoder: Smart Open-Meteo Geocoding with Multi-Token Ranking
 * 
 * Features:
 * 1. Tokenizes compound queries (e.g. "Mohanpur, Gamharia, Jharkhand")
 * 2. Fetches count=10 candidates
 * 3. Multi-criteria ranking:
 *    - Exact string match
 *    - Contextual state/admin1 match
 *    - Feature code classification (region vs major city vs hamlet)
 *    - Population weighting
 * 
 * @param {string} query
 * @returns {Promise<NormalizedLocation[]>}
 */
export async function searchOpenMeteo(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Parse comma-separated compound tokens
  const tokens = trimmed.split(',').map((t) => t.trim()).filter(Boolean);
  const primaryToken = tokens[0];
  const contextTokens = tokens.slice(1).map((t) => t.toLowerCase());

  // Helper to fetch and score a specific token against Open-Meteo
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

        // 1. Exact name match
        if (itemName === queryLower) {
          score += 35;
        } else if (itemName.includes(queryLower) || queryLower.includes(itemName)) {
          score += 15;
        }

        // 2. Context tokens match (admin1, admin2, country)
        const itemAdmin1 = (item.admin1 || '').toLowerCase();
        const itemAdmin2 = (item.admin2 || '').toLowerCase();
        const itemCountry = (item.country || '').toLowerCase();

        contextTokens.forEach((ctx) => {
          if (itemAdmin1.includes(ctx) || ctx.includes(itemAdmin1)) {
            score += 40;
          }
          if (itemAdmin2.includes(ctx) || ctx.includes(itemAdmin2)) {
            score += 25;
          }
          if (itemCountry.includes(ctx) || ctx.includes(itemCountry)) {
            score += 15;
          }
        });

        // 3. Feature code weighting (prefer state capitals / major cities over unpopulated hamlets)
        if (item.feature_code === 'ADM1' || item.feature_code === 'PCLI') {
          score += 30;
        } else if (['PPLC', 'PPLA', 'PPLA2'].includes(item.feature_code)) {
          score += 25;
        } else if (item.feature_code === 'PPL') {
          score += 10;
        }

        // 4. Population weighting (log scale)
        if (typeof item.population === 'number' && item.population > 0) {
          score += Math.min(25, Math.log10(item.population) * 4);
        }

        return { item, score };
      });
    } catch (err) {
      console.warn('Open-Meteo fallback fetch notice:', err);
      return [];
    }
  }

  // First try primary token
  let scoredList = await fetchAndScore(primaryToken);

  // If compound query and primary token had 0 matches or poor matches, try secondary token (e.g. "Gamharia")
  if (tokens.length > 1 && (scoredList.length === 0 || Math.max(...scoredList.map((s) => s.score)) < 70)) {
    const secondaryList = await fetchAndScore(tokens[1]);
    scoredList = [...scoredList, ...secondaryList];
  }

  if (scoredList.length === 0) return [];

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  // Deduplicate by proximity (lat/lon within 0.05 deg)
  const deduplicated = [];
  scoredList.forEach(({ item, score }) => {
    const exists = deduplicated.some(
      (d) => Math.abs(d.item.latitude - item.latitude) < 0.05 && Math.abs(d.item.longitude - item.longitude) < 0.05
    );
    if (!exists) {
      deduplicated.push({ item, score });
    }
  });

  return deduplicated.slice(0, 8).map(({ item, score }) => normalizeOpenMeteoResult(item, score));
}

/**
 * Unified Location Search Engine
 * 
 * Pipeline:
 * 1. Queries PRIMARY provider (MapTiler Cloud Geocoding API with POI support)
 * 2. Filters out low-confidence fuzzy matches (relevance < 0.65)
 * 3. If no strong results found or MapTiler fails, queries FALLBACK (Open-Meteo smart ranker)
 * 4. Returns array of NormalizedLocation candidates
 * 
 * @param {string} query - Location query string
 * @param {object} [options]
 * @param {{ latitude: number, longitude: number }} [options.proximity] - Optional user GPS proximity
 * @returns {Promise<NormalizedLocation[]>}
 */
export async function searchLocations(query, options = {}) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    // 1. PRIMARY: MapTiler Geocoding
    const mapTilerResults = await searchMapTiler(trimmed, options);
    // Filter out weak / unrelated fuzzy matches (e.g. matching 'Arka' in Russia when query is complex)
    const strongMapTiler = mapTilerResults.filter((r) => r.relevance >= 0.65);
    if (strongMapTiler.length > 0) {
      return strongMapTiler;
    }
  } catch (err) {
    console.warn('MapTiler geocoding notice, proceeding to fallback:', err);
  }

  // 2. FALLBACK: Open-Meteo Geocoding
  try {
    const openMeteoResults = await searchOpenMeteo(trimmed);
    const strongOpenMeteo = openMeteoResults.filter((r) => r.relevance >= 0.5);
    if (strongOpenMeteo.length > 0) {
      return strongOpenMeteo;
    }
  } catch (err) {
    console.error('Open-Meteo fallback geocoding error:', err);
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

  // Ambiguity Check 1: Multiple candidates share the exact same short name (e.g. "Springfield", "Cambridge", "Mohanpur")
  const shareSameName = top.name.toLowerCase() === second.name.toLowerCase();

  // Ambiguity Check 2: Runner-up candidate is also a very strong match (within 0.15 relevance of top)
  const isCloseMatch = Math.abs(top.relevance - (second.relevance || 0)) < 0.15;

  // If candidates are ambiguous and not just a city vs its railway station, require user selection
  if (!isSubFacility && (shareSameName || isCloseMatch)) {
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

  // 2. Fallback to BigDataCloud client reverse geocoding
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

  // Final graceful fallback
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
