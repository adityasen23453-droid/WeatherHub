import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Compass,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  ChevronDown,
  Check,
  Star,
  MapPin,
} from 'lucide-react';
import { convertTemp, getWeatherEmoji } from '../utils/weatherUtils';

/**
 * Supported MapTiler Map Styles
 * Default: Satellite Hybrid (photorealistic aerial imagery with roads, borders, and labels)
 */
const MAP_STYLES = {
  satellite: {
    id: 'satellite',
    name: 'Satellite Hybrid',
    maptilerId: 'hybrid',
    badge: 'Default',
    description: 'High-definition satellite imagery with roads & labels',
  },
  streets: {
    id: 'streets',
    name: 'Streets',
    maptilerId: 'streets-v2',
    description: 'High-contrast clean navigation map',
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    maptilerId: 'dataviz-dark',
    description: 'Cinematic dark theme matching WeatherHub',
  },
};

/**
 * Pure helper to compute MapTiler or OSM style URL outside component render
 */
function getMapStyleSpec(styleKey, apiKey, useOsmFallback) {
  if (useOsmFallback || !apiKey) {
    return {
      version: 8,
      sources: {
        'osm-raster-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-raster-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };
  }

  const styleDef = MAP_STYLES[styleKey] || MAP_STYLES.satellite;
  return `https://api.maptiler.com/maps/${styleDef.maptilerId}/style.json?key=${apiKey}`;
}

/**
 * WeatherMap Component
 * 
 * Production MapLibre GL JS + MapTiler integration:
 * - 100% StrictMode safe with comprehensive lifecycle and cancellation guards
 * - Default style: MapTiler Satellite Hybrid
 * - Dynamic weather-aware city marker with radar pulse ring
 * - Polished dark popup displaying City, Temp, Condition, Feels Like
 * - Favorite city markers with direct click-to-sync navigation
 * - MapLibre built-in Navigation & Fullscreen controls
 * - Live GPS position integration
 * - Smooth camera flyTo animations (city-level zoom: 11)
 * - Graceful fallback & error states
 * 
 * @param {object} props
 * @param {number} props.latitude - Current city latitude
 * @param {number} props.longitude - Current city longitude
 * @param {string} props.cityName - Current city name
 * @param {object} props.weather - Live weather object from Open-Meteo
 * @param {'C' | 'F'} props.unit - Temperature unit
 * @param {Array<object>} props.favorites - Persistent favorite cities
 * @param {object} props.favoritesWeather - Map of city IDs to fresh weather data
 * @param {Function} props.onSelectCity - City switch handler
 * @param {Function} props.onLocateMe - GPS trigger handler
 * @param {boolean} props.isLocating - GPS pending flag
 */
export default function WeatherMap({
  latitude,
  longitude,
  cityName = 'Selected Location',
  weather,
  unit = 'C',
  favorites = [],
  favoritesWeather = {},
  onSelectCity,
  onLocateMe,
  isLocating = false,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const isMountedRef = useRef(false);
  const currentAppliedStyleRef = useRef('satellite');
  const isSwitchingStyleRef = useRef(false);

  // Cancellation handles
  const rafIdRef = useRef(null);
  const timerIdRef = useRef(null);

  // Markers refs
  const currentMarkerRef = useRef(null);
  const currentPopupRef = useRef(null);
  const favoriteMarkersRef = useRef([]);

  // Environment MapTiler API Key
  const envKey = import.meta.env.VITE_MAPTILER_API_KEY || '';
  const [apiKey, setApiKey] = useState(envKey);
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [useOsmFallback, setUseOsmFallback] = useState(false);

  // MapTiler Satellite Hybrid is DEFAULT style
  const [activeStyleKey, setActiveStyleKey] = useState('satellite');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Derived effective error
  const effectiveError = mapError || (!apiKey && !useOsmFallback ? 'MISSING_API_KEY' : null);

  // Coordinate validation
  const hasValidCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  // =========================================================================
  // 1. INITIALIZE MAPLIBRE INSTANCE (ONLY ONCE PER MOUNT, CLEANED UP PROPERLY)
  // =========================================================================
  useEffect(() => {
    isMountedRef.current = true;

    if (!mapContainerRef.current) return;
    if (!hasValidCoords) return;
    if (!apiKey && !useOsmFallback) return;

    let mapInstance = null;

    try {
      const initialStyle = getMapStyleSpec('satellite', apiKey, useOsmFallback);
      currentAppliedStyleRef.current = useOsmFallback ? 'osm' : 'satellite';

      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: initialStyle,
        center: [longitude, latitude],
        zoom: 11, // Sensible city-level starting zoom
        pitch: 20,
        bearing: 0,
        attributionControl: false,
      });

      // Built-in Navigation Control (Zoom In, Zoom Out, Compass)
      try {
        const navControl = new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
        });
        mapInstance.addControl(navControl, 'top-right');
      } catch (err) {
        console.warn('NavigationControl error:', err);
      }

      // Built-in Fullscreen Control (Using default container safely)
      try {
        const fsControl = new maplibregl.FullscreenControl();
        mapInstance.addControl(fsControl, 'top-right');
      } catch (err) {
        console.warn('FullscreenControl error:', err);
      }

      // Attribution Control
      try {
        const attrControl = new maplibregl.AttributionControl({
          compact: true,
        });
        mapInstance.addControl(attrControl, 'bottom-right');
      } catch (err) {
        console.warn('AttributionControl error:', err);
      }

      // Fast responsive load handlers - don't wait for heavy tile downloads to dismiss spinner
      let hasReportedLoaded = false;
      const markReady = () => {
        if (!isMountedRef.current || !mapRef.current) return;
        if (!hasReportedLoaded) {
          hasReportedLoaded = true;
          setMapLoaded(true);
          try {
            mapRef.current?.resize();
          } catch {
            // Safe ignore
          }
        }
      };

      mapInstance.once('style.load', markReady);
      mapInstance.once('styledata', markReady);
      mapInstance.once('load', markReady);

      // Instant resize on next frame safely guarded
      rafIdRef.current = requestAnimationFrame(() => {
        if (isMountedRef.current && mapRef.current) {
          try {
            mapRef.current.resize();
          } catch {
            // Safe ignore
          }
        }
      });

      // Safety timeout: dismiss loading overlay in at most 800ms
      timerIdRef.current = setTimeout(markReady, 800);

      mapInstance.on('error', (e) => {
        if (!isMountedRef.current) return;
        console.warn('MapLibre notice:', e);
        if (e?.error?.status === 401 || e?.error?.status === 403) {
          setMapError('INVALID_API_KEY');
        }
      });

      mapRef.current = mapInstance;
    } catch (err) {
      console.error('Failed to initialize MapLibre GL:', err);
      if (isMountedRef.current) {
        setMapError('INIT_FAILED');
      }
    }

    return () => {
      isMountedRef.current = false;

      // Cancel animation frames
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Cancel timeouts
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }

      // Clean up markers and popups
      if (currentPopupRef.current) {
        try { currentPopupRef.current.remove(); } catch { /* ignore */ }
        currentPopupRef.current = null;
      }
      if (currentMarkerRef.current) {
        try { currentMarkerRef.current.remove(); } catch { /* ignore */ }
        currentMarkerRef.current = null;
      }
      favoriteMarkersRef.current.forEach((m) => {
        try { m.remove(); } catch { /* ignore */ }
      });
      favoriteMarkersRef.current = [];

      // Fully destroy map instance
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch {
          // Safe ignore
        }
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, useOsmFallback]);

  // =========================================================================
  // 2. SWITCH STYLES ON-THE-FLY (ONLY WHEN STYLE ACTUALLY CHANGES)
  // =========================================================================
  useEffect(() => {
    if (!isMountedRef.current || !mapRef.current) return;

    const nextStyle = useOsmFallback ? 'osm' : activeStyleKey;

    // Do NOT call setStyle if the style has not changed
    if (nextStyle === currentAppliedStyleRef.current) {
      return;
    }

    currentAppliedStyleRef.current = nextStyle;
    isSwitchingStyleRef.current = true;

    try {
      const styleSpec = getMapStyleSpec(activeStyleKey, apiKey, useOsmFallback);
      mapRef.current.setStyle(styleSpec);

      mapRef.current.once('style.load', () => {
        if (!isMountedRef.current || !mapRef.current) return;
        isSwitchingStyleRef.current = false;
        // Re-render markers after style finishes loading
        renderAllMarkers();
      });
    } catch (err) {
      console.warn('Failed to switch style:', err);
      isSwitchingStyleRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStyleKey, useOsmFallback]);

  // =========================================================================
  // 3. SYNCHRONIZE CAMERA (FLYTO) WHEN CITY COORDINATES CHANGE
  // =========================================================================
  useEffect(() => {
    if (!isMountedRef.current || !mapRef.current || !hasValidCoords) return;

    try {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 11,
        speed: 1.4,
        curve: 1.2,
        essential: true,
      });
    } catch (err) {
      console.warn('Camera flyTo notice:', err);
    }
  }, [latitude, longitude, hasValidCoords]);

  // =========================================================================
  // 4. RENDER ALL MARKERS (CURRENT CITY + FAVORITES)
  // =========================================================================
  const renderAllMarkers = useCallback(() => {
    if (!isMountedRef.current || !mapRef.current || isSwitchingStyleRef.current) return;
    if (!hasValidCoords) return;

    // Clean up previous marker and popup
    if (currentPopupRef.current) {
      try { currentPopupRef.current.remove(); } catch { /* ignore */ }
      currentPopupRef.current = null;
    }
    if (currentMarkerRef.current) {
      try { currentMarkerRef.current.remove(); } catch { /* ignore */ }
      currentMarkerRef.current = null;
    }

    const currentTemp = weather?.current?.temperature;
    const feelsLike = weather?.current?.feelsLike;
    const condition = weather?.current?.condition || 'Clear';
    const conditionEmoji = getWeatherEmoji(condition);
    const displayTemp = convertTemp(currentTemp, unit);
    const displayFeelsLike = convertTemp(feelsLike, unit);

    // Polished Dark Popup
    const popupHTML = `
      <div class="px-4 py-3 bg-slate-950/95 text-white rounded-2xl border border-cyan-500/40 backdrop-blur-2xl shadow-2xl font-sans min-w-[160px] animate-fadeIn">
        <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-2">
          <div class="font-bold text-sm text-white tracking-wide truncate max-w-[130px]">${cityName}</div>
          <span class="text-lg">${conditionEmoji}</span>
        </div>
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-2xl font-black text-cyan-300 tracking-tight">${displayTemp}°${unit}</span>
          <span class="text-xs font-semibold text-slate-300">${condition}</span>
        </div>
        ${
          feelsLike !== undefined
            ? `<div class="text-[11px] text-slate-400 font-medium">Feels like ${displayFeelsLike}°${unit}</div>`
            : ''
        }
      </div>
    `;

    try {
      const popup = new maplibregl.Popup({
        offset: 35,
        closeButton: true,
        closeOnClick: false,
        className: 'weather-map-popup',
      }).setHTML(popupHTML);

      // Custom Weather-Aware Marker DOM Element
      const el = document.createElement('div');
      el.className = 'group cursor-pointer flex flex-col items-center select-none';
      el.innerHTML = `
        <div class="relative flex flex-col items-center transition-transform duration-300 transform group-hover:scale-110">
          <!-- Floating Weather Bubble -->
          <div class="glass-card bg-slate-950/90 text-white px-3 py-1.5 rounded-2xl shadow-2xl border border-cyan-500/40 backdrop-blur-xl flex flex-col items-center min-w-[120px]">
            <div class="flex items-center gap-1.5 font-bold">
              <span class="text-sm">${conditionEmoji}</span>
              <span class="text-sm text-cyan-300 tracking-tight">${displayTemp}°${unit}</span>
              <span class="text-[11px] font-medium text-slate-300 ml-0.5 truncate max-w-[80px]">• ${condition}</span>
            </div>
            <div class="text-[11px] font-semibold text-white tracking-wide truncate max-w-[120px] mt-0.5">
              ${cityName}
            </div>
          </div>
          <!-- Arrow Notch -->
          <div class="w-2.5 h-2.5 bg-slate-950 border-r border-b border-cyan-500/40 transform rotate-45 -mt-1"></div>
          <!-- Pin & Pulse Ring -->
          <div class="relative mt-1 flex items-center justify-center">
            <div class="absolute w-7 h-7 rounded-full bg-cyan-400/35 animate-ping"></div>
            <div class="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 border-2 border-white shadow-xl flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
        </div>
      `;

      if (!isMountedRef.current || !mapRef.current) return;

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(mapRef.current);

      currentMarkerRef.current = marker;
      currentPopupRef.current = popup;
    } catch (err) {
      console.warn('Error creating current city marker:', err);
    }

    // Render favorite cities markers
    favoriteMarkersRef.current.forEach((m) => {
      try { m.remove(); } catch { /* ignore */ }
    });
    favoriteMarkersRef.current = [];

    if (!favorites || favorites.length === 0) return;

    favorites.forEach((city) => {
      if (
        typeof city.latitude !== 'number' ||
        typeof city.longitude !== 'number' ||
        isNaN(city.latitude) ||
        isNaN(city.longitude)
      ) {
        return;
      }

      // Avoid duplicate marker if this favorite is currently selected
      const isSelected =
        Math.abs(city.latitude - latitude) < 0.001 &&
        Math.abs(city.longitude - longitude) < 0.001;

      if (isSelected) return;

      const cached =
        favoritesWeather[city.id] ||
        favoritesWeather[city.name.toLowerCase()] ||
        null;

      const favTemp = cached?.temp !== undefined ? convertTemp(cached.temp, unit) : null;
      const favCondition = cached?.condition || '';
      const favEmoji = cached ? getWeatherEmoji(favCondition) : '⭐';

      const favEl = document.createElement('div');
      favEl.className = 'group cursor-pointer flex flex-col items-center select-none';
      favEl.innerHTML = `
        <div class="relative flex flex-col items-center transition-all duration-300 transform group-hover:scale-110">
          <div class="bg-slate-950/85 hover:bg-slate-900 text-slate-200 px-2.5 py-1 rounded-xl shadow-xl border border-amber-500/40 backdrop-blur-md flex items-center gap-1.5">
            <span class="text-xs text-amber-400">★</span>
            <span class="text-xs font-semibold tracking-tight text-white">${city.name}</span>
            ${
              favTemp !== null
                ? `<span class="text-xs font-bold text-amber-300">${favEmoji} ${favTemp}°</span>`
                : ''
            }
          </div>
          <div class="w-1.5 h-1.5 bg-slate-950 border-r border-b border-amber-500/40 transform rotate-45 -mt-1"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-950 shadow-md mt-0.5"></div>
        </div>
      `;

      // Click favorite marker: Select city, update dashboard, fly camera without reloading
      favEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectCity) {
          onSelectCity(city);
        }
      });

      if (!isMountedRef.current || !mapRef.current) return;

      try {
        const favMarker = new maplibregl.Marker({
          element: favEl,
          anchor: 'bottom',
        })
          .setLngLat([city.longitude, city.latitude])
          .addTo(mapRef.current);

        favoriteMarkersRef.current.push(favMarker);
      } catch (err) {
        console.warn('Error adding favorite marker:', err);
      }
    });
  }, [latitude, longitude, cityName, weather, unit, favorites, favoritesWeather, onSelectCity, hasValidCoords]);

  // Update markers when map is loaded or when weather/city data updates
  useEffect(() => {
    if (mapLoaded) {
      renderAllMarkers();
    }
  }, [mapLoaded, renderAllMarkers]);

  const handleApplyCustomKey = (e) => {
    e.preventDefault();
    if (tempKeyInput.trim()) {
      setApiKey(tempKeyInput.trim());
      setUseOsmFallback(false);
      setMapError(null);
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl p-4 sm:p-6 relative w-full transition-all">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-inner">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-100 flex items-center gap-2">
              Interactive Weather Map
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Satellite Hybrid
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {cityName} •{' '}
              {hasValidCoords
                ? `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`
                : 'Coordinates loading...'}
            </p>
          </div>
        </div>

        {/* Top Controls: Favorites Indicator & Style Switcher [ Satellite Hybrid ▼ ] */}
        <div className="flex items-center gap-2">
          {favorites.length > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl"
              title={`${favorites.length} saved favorite cities on map`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{favorites.length} Favorites</span>
            </div>
          )}

          {/* Style Switcher Floating Dropdown: [ Satellite Hybrid ▼ ] */}
          <div className="relative">
            <button
              onClick={() => setIsStyleDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-100 border border-white/15 backdrop-blur-md shadow-lg transition-all"
              title="Switch map style"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>{useOsmFallback ? 'OpenStreetMap' : MAP_STYLES[activeStyleKey]?.name || 'Satellite Hybrid'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isStyleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-950/95 border border-white/20 shadow-2xl p-1.5 z-30 backdrop-blur-xl animate-dropdown">
                {/* 1. Satellite Hybrid — DEFAULT */}
                {/* 2. Streets */}
                {/* 3. Dark */}
                {Object.values(MAP_STYLES).map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setActiveStyleKey(style.id);
                      setIsStyleDropdownOpen(false);
                      setUseOsmFallback(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                      activeStyleKey === style.id && !useOsmFallback
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{style.name}</span>
                        {style.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200">
                            {style.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{style.description}</div>
                    </div>
                    {activeStyleKey === style.id && !useOsmFallback && (
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                  </button>
                ))}

                <div className="my-1 border-t border-white/10" />

                <button
                  onClick={() => {
                    setUseOsmFallback(true);
                    setIsStyleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                    useOsmFallback
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div>
                    <div>OpenStreetMap</div>
                    <div className="text-[10px] text-slate-400">Public fallback tiles</div>
                  </div>
                  {useOsmFallback && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Canvas Viewport */}
      <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[520px] rounded-2xl overflow-hidden border border-white/10 shadow-inner">
        
        {/* MapLibre DOM Target */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Sleek Non-Blocking Loading Indicator */}
        {!effectiveError && (
          <div
            className={`absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 transition-all duration-700 pointer-events-none ${
              mapLoaded ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
            }`}
          >
            <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-200 font-medium tracking-wide">
              Loading Satellite Hybrid Imagery...
            </p>
          </div>
        )}

        {/* Missing API Key / Error Screen */}
        {effectiveError && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-base font-bold text-white mb-1">
              {effectiveError === 'MISSING_API_KEY'
                ? 'Map Configuration Missing'
                : 'MapTiler Authentication Error'}
            </h4>

            <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed">
              {effectiveError === 'MISSING_API_KEY'
                ? 'Map configuration is missing. Add VITE_MAPTILER_API_KEY to your environment.'
                : 'Unable to authenticate with MapTiler. Please check your VITE_MAPTILER_API_KEY.'}
            </p>

            {/* Quick Live Preview Input */}
            <form
              onSubmit={handleApplyCustomKey}
              className="flex items-center gap-2 max-w-sm w-full mb-4"
            >
              <input
                type="text"
                placeholder="Paste MapTiler API key..."
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-xs font-semibold text-white transition-all shadow-md"
              >
                Apply
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setUseOsmFallback(true);
                  setMapError(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Preview with OpenStreetMap
              </button>

              <a
                href="https://cloud.maptiler.com/"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition-colors flex items-center gap-1.5"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Current Location GPS Button on Map */}
        {onLocateMe && (
          <div className="absolute top-[135px] right-3 z-10">
            <button
              onClick={onLocateMe}
              disabled={isLocating}
              className={`w-[29px] h-[29px] rounded-lg bg-slate-900/85 hover:bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-white/15 backdrop-blur-md flex items-center justify-center shadow-lg transition-all ${
                isLocating ? 'animate-spin opacity-60' : ''
              }`}
              title="Locate my position via GPS"
              aria-label="Locate my position via GPS"
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-950/85 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md text-[11px] text-slate-300 flex items-center gap-3 z-10 shadow-lg pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm"></span>
            <span>Current City</span>
          </div>
          {favorites.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm"></span>
              <span>Favorites ({favorites.length})</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
