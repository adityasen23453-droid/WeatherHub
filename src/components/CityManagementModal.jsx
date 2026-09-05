import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  MapPin,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { convertTemp, renderWeatherIcon } from '../utils/weatherUtils';
import {
  fetchCityCoordinates,
  fetchLiveWeatherForCities,
  DEFAULT_FAVORITE_CITIES,
} from '../services/weatherService';

/**
 * CityManagementModal Component
 * 
 * ARCHITECTURE OVERVIEW:
 * -------------------------------------------------------------
 * 1. Persistent Storage (localStorage):
 *    - STRICTLY stores city geographic identities:
 *      { id, name, latitude, longitude, country, admin1 }
 *    - NO static or stale weather numbers (temp, condition, min/max) are persisted.
 * 
 * 2. Volatile Live Data (fetchLiveWeatherForCities):
 *    - Whenever the modal opens or WeatherHub starts, fresh live weather
 *      is queried on-demand from Open-Meteo REST API.
 * -------------------------------------------------------------
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Modal visibility flag
 * @param {Function} props.onClose - Modal close handler
 * @param {Function} props.onSelectCity - City switch callback
 * @param {string} props.currentCity - Currently active city name
 * @param {string} props.unit - 'C' | 'F'
 */
export default function CityManagementModal({
  isOpen,
  onClose,
  onSelectCity,
  currentCity,
  unit = 'C',
}) {
  // =========================================================================
  // 1. PERSISTENT FAVORITES STATE (STRICTLY IDENTITY / COORDINATES ONLY)
  // =========================================================================
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('weatherhub_favorites');
      if (!saved) return DEFAULT_FAVORITE_CITIES;

      const parsed = JSON.parse(saved);
      // Data Sanitizer: Strip any leftover static weather values from old format
      return parsed.map((item) => ({
        id: item.id || `${item.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: item.name,
        latitude: item.latitude ?? (item.name === 'Musari Kudar' ? 22.75 : item.name === 'Jamshedpur' ? 22.8046 : 28.6139),
        longitude: item.longitude ?? (item.name === 'Musari Kudar' ? 86.15 : item.name === 'Jamshedpur' ? 86.2029 : 77.209),
        country: item.country || 'India',
        admin1: item.admin1 || '',
      }));
    } catch {
      return DEFAULT_FAVORITE_CITIES;
    }
  });

  // =========================================================================
  // 2. LIVE ON-DEMAND WEATHER STATE (FETCHED FROM API, NEVER STORED IN LOCALSTORAGE)
  // =========================================================================
  const [liveWeatherMap, setLiveWeatherMap] = useState({});
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Save clean identity list to localStorage whenever favorites change
  useEffect(() => {
    // Only store clean identity object properties
    const cleanList = favorites.map((f) => ({
      id: f.id,
      name: f.name,
      latitude: f.latitude,
      longitude: f.longitude,
      country: f.country,
      admin1: f.admin1,
    }));
    localStorage.setItem('weatherhub_favorites', JSON.stringify(cleanList));
  }, [favorites]);

  /**
   * Fetches fresh, live weather for all favorite cities on-demand
   */
  const refreshFavoritesWeather = useCallback(async (citiesToFetch) => {
    if (!citiesToFetch || citiesToFetch.length === 0) return;
    setIsLoadingLive(true);
    try {
      const freshData = await fetchLiveWeatherForCities(citiesToFetch);
      setLiveWeatherMap((prev) => ({ ...prev, ...freshData }));
    } catch (err) {
      console.warn('Could not refresh favorite cities live weather:', err);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  // Fetch live weather when modal opens
  useEffect(() => {
    if (isOpen && favorites.length > 0) {
      refreshFavoritesWeather(favorites);
    }
  }, [isOpen, favorites, refreshFavoritesWeather]);

  if (!isOpen) return null;

  /**
   * Adds a new city to favorites:
   * 1. Geocode search query to retrieve exact coordinates & identity
   * 2. Store identity into favorites
   * 3. Fetch fresh live weather for this new city immediately
   */
  const handleAddCity = async (e) => {
    e?.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Check if already in favorites list
    if (favorites.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`"${trimmed}" is already in your favorite list.`);
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);

    try {
      // Step 1: Resolve city identity & coordinates via Geocoding API
      const location = await fetchCityCoordinates(trimmed);

      const newCityIdentity = {
        id: `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`,
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        country: location.country,
        admin1: location.admin1,
      };

      // Step 2: Append identity to favorites
      setFavorites((prev) => [newCityIdentity, ...prev]);
      setSearchQuery('');

      // Step 3: Fetch fresh live weather for this new city immediately
      refreshFavoritesWeather([newCityIdentity]);
    } catch (err) {
      setErrorMsg(err.message || 'City could not be found. Please check spelling.');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Removes a city from favorites
   */
  const handleRemoveCity = (cityName, e) => {
    e.stopPropagation();
    setFavorites((prev) => prev.filter((c) => c.name !== cityName));
  };

  /**
   * User clicks a city card:
   * Switch the active dashboard view and close modal
   */
  const handlePickCity = (city) => {
    onSelectCity(city);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-dropdown">
        
        {/* Header matching screenshot: < City management */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-white hover:text-cyan-400 font-semibold text-base transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>City management</span>
          </button>

          {/* Refresh live weather button & count */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshFavoritesWeather(favorites)}
              disabled={isLoadingLive}
              title="Refresh live weather for all favorites"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <span className="text-xs text-slate-400 font-mono">
              {favorites.length} saved
            </span>
          </div>
        </div>

        {/* Search & Add City Bar */}
        <div className="p-4 border-b border-white/10">
          <form onSubmit={handleAddCity} className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city to add to favorites..."
              className="w-full pl-10 pr-12 py-2.5 bg-white/10 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim() || isSearching}
              className="absolute right-1.5 p-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white transition-all disabled:opacity-40 cursor-pointer"
              title="Add city"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </form>

          {errorMsg && (
            <p className="text-xs text-rose-400 mt-2 px-1">{errorMsg}</p>
          )}
        </div>

        {/* List of Favorite City Cards with Fresh Live Data */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {favorites.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No favorite cities added yet. Search above to add one!
            </div>
          ) : (
            favorites.map((city) => {
              const isActive = city.name.toLowerCase() === currentCity.toLowerCase();
              // Retrieve live weather from in-memory API map
              const live =
                liveWeatherMap[city.id] ||
                liveWeatherMap[city.name.toLowerCase()] ||
                null;

              return (
                <div
                  key={city.name}
                  onClick={() => handlePickCity(city)}
                  className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer group hover:scale-[1.01] ${
                    isActive
                      ? 'border-cyan-400/50 bg-gradient-to-r from-blue-950/80 via-slate-900/80 to-slate-900/90 shadow-lg shadow-cyan-500/10'
                      : 'border-white/10 bg-slate-900/70 hover:border-white/20 hover:bg-slate-900/90'
                  }`}
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.95)), url('/backgrounds/night.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center justify-between relative z-10">
                    
                    {/* Left: City Name, Coordinates/Admin & Live Condition */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-lg font-bold text-white tracking-tight">
                          {city.name}
                        </h4>
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        {isActive && (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Live Condition & Extremes (from live API) */}
                      {live ? (
                        <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                          <span>{live.description || live.condition}</span>
                          <span className="text-slate-400">•</span>
                          <span>
                            {convertTemp(live.minTemp, unit)} ~ {convertTemp(live.maxTemp, unit)}°{unit}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1 animate-pulse">
                          Fetching live weather...
                        </p>
                      )}
                    </div>

                    {/* Right: Live Current Temp & Condition Icon & Delete */}
                    <div className="flex items-center gap-3">
                      {live ? (
                        <div className="flex items-center gap-2">
                          <div className="shrink-0 p-1 rounded-lg bg-white/5">
                            {renderWeatherIcon(live.icon, live.isDay, 'w-6 h-6')}
                          </div>
                          <div className="text-3xl font-extrabold text-white font-mono">
                            {convertTemp(live.temp, unit)}°
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-8 rounded-lg bg-white/10 animate-pulse" />
                      )}

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveCity(city.name, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 hover:text-white transition-all cursor-pointer ml-1"
                        title="Remove city"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info showing architectural separation */}
        <div className="px-5 py-2.5 border-t border-white/10 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Persistent Identity • Live Meteorological Data</span>
          </span>
          <span className="text-emerald-400 font-mono text-[10px]">● Live Sync</span>
        </div>

      </div>
    </div>
  );
}
