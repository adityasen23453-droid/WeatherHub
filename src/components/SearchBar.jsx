import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  MapPin,
  X,
  Loader2,
  LocateFixed,
  GraduationCap,
  Building2,
  Compass,
  Landmark,
} from 'lucide-react';
import { resolveLocation } from '../services/locationService';

/**
 * SearchBar Component
 * 
 * Manages user search input for querying locations:
 * - Uses dedicated locationService (MapTiler POI primary, Open-Meteo fallback)
 * - Auto-selects on clear/single high-confidence match
 * - Displays an interactive candidate dropdown when multiple strong matches exist
 * - Shows name, administrative context, country, type badge, and coordinates
 * 
 * @param {object} props
 * @param {Function} props.onSearch - Callback invoked with either a query string or a NormalizedLocation
 * @param {Function} props.onLocateMe - Callback for live GPS location lookup
 * @param {boolean} props.isLoading - Flag indicating an ongoing API request
 * @param {boolean} props.isLocating - Flag indicating GPS geolocation in progress
 * @param {{ latitude: number, longitude: number }} [props.userCoords] - Optional proximity bias
 */
export default function SearchBar({
  onSearch,
  onLocateMe,
  isLoading,
  isLocating,
  userCoords,
}) {
  const [cityInput, setCityInput] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [isResolving, setIsResolving] = useState(false);
  const containerRef = useRef(null);

  // Popular shortcut cities for quick 1-click weather checking
  const popularCities = ['New Delhi', 'Mumbai', 'Bengaluru', 'London', 'New York', 'Tokyo', 'Paris'];

  // Close candidate dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setCandidates([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Helper to pick appropriate icon for location type
   */
  const renderTypeIcon = (type) => {
    switch (type) {
      case 'poi':
        return <GraduationCap className="w-4 h-4 text-cyan-300" />;
      case 'region':
        return <Compass className="w-4 h-4 text-purple-300" />;
      case 'address':
        return <Building2 className="w-4 h-4 text-amber-300" />;
      case 'country':
        return <Landmark className="w-4 h-4 text-emerald-300" />;
      default:
        return <MapPin className="w-4 h-4 text-cyan-400" />;
    }
  };

  /**
   * Form submission handler.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = cityInput.trim();
    if (!trimmed || isLoading || isResolving) return;

    setCandidates([]);
    setIsResolving(true);

    try {
      const options = userCoords ? { proximity: userCoords } : {};
      const { directMatch, candidates: matches } = await resolveLocation(trimmed, options);

      if (directMatch) {
        // High confidence / single match -> Select directly
        setCandidates([]);
        onSearch(directMatch);
      } else if (matches && matches.length > 0) {
        // Multiple ambiguous candidates -> Show candidate dropdown
        setCandidates(matches);
      } else {
        // No results -> pass query to parent to trigger user-friendly error alert
        setCandidates([]);
        onSearch(trimmed);
      }
    } catch (err) {
      console.error('Location resolution error:', err);
      onSearch(trimmed);
    } finally {
      setIsResolving(false);
    }
  };

  /**
   * Selecting a candidate from the dropdown
   * @param {import('../services/locationService').NormalizedLocation} candidate
   */
  const handleSelectCandidate = (candidate) => {
    setCityInput(candidate.name);
    setCandidates([]);
    onSearch(candidate);
  };

  /**
   * Clears the input field and resets local state
   */
  const handleClear = () => {
    setCityInput('');
    setCandidates([]);
  };

  /**
   * Handles 1-click search from popular city pills
   * @param {string} city - Name of selected popular city
   */
  const handleQuickCityClick = (city) => {
    setCityInput(city);
    setCandidates([]);
    onSearch(city);
  };

  const isBusy = isLoading || isResolving;

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto mb-8 relative">
      {/* Search Input Form */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        {/* Left Icon: Map Pin */}
        <div className="absolute left-4 text-slate-400 pointer-events-none">
          <MapPin className="w-5 h-5 text-cyan-400" />
        </div>

        {/* Text Input Field */}
        <input
          type="text"
          value={cityInput}
          onChange={(e) => {
            setCityInput(e.target.value);
            if (candidates.length > 0) setCandidates([]);
          }}
          placeholder="Search any city, university, village, or address (e.g. Arka Jain University, Mohanpur, Gamharia)..."
          disabled={isBusy}
          className="w-full pl-12 pr-28 py-3.5 bg-black/35 border border-white/15 rounded-2xl text-slate-100 placeholder-slate-400 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all shadow-2xl backdrop-blur-xl disabled:opacity-50"
        />

        {/* Clear Button (shown only when text is entered) */}
        {cityInput && !isBusy && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-24 text-slate-400 hover:text-white p-1.5 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Submit Search Button */}
        <button
          type="submit"
          disabled={!cityInput.trim() || isBusy}
          className="absolute right-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
        >
          {isBusy ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Searching</span>
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </>
          )}
        </button>
      </form>

      {/* Multiple Candidate Selection Dropdown */}
      {candidates.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950/95 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-2xl z-40 p-2 animate-dropdown max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-white/10 mb-1">
            <span>Multiple matches found — select your location:</span>
            <button
              onClick={() => setCandidates([])}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {candidates.map((cand) => (
              <button
                key={cand.id}
                type="button"
                onClick={() => handleSelectCandidate(cand)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-white/10 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-inner">
                    {renderTypeIcon(cand.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                      <span className="truncate">{cand.name}</span>
                      <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10 shrink-0">
                        {cand.type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {cand.fullName}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {cand.latitude.toFixed(2)}°, {cand.longitude.toFixed(2)}°
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick City Shortcut Chips & Live Location */}
      <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {/* Live GPS Chip */}
        {onLocateMe && (
          <button
            type="button"
            onClick={onLocateMe}
            disabled={isLocating || isBusy}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 hover:text-white rounded-full transition-all whitespace-nowrap cursor-pointer active:scale-95 text-[11px] backdrop-blur-md shadow-md disabled:opacity-50"
            title="Use your real-time GPS location"
          >
            {isLocating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <LocateFixed className="w-3 h-3" />
            )}
            <span>Live Location</span>
          </button>
        )}

        <span className="text-slate-300 font-medium whitespace-nowrap pl-1 text-[11px]">Popular:</span>
        {popularCities.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => handleQuickCityClick(city)}
            disabled={isBusy}
            className="px-3 py-1 bg-black/30 hover:bg-white/15 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white rounded-full transition-all whitespace-nowrap cursor-pointer active:scale-95 disabled:opacity-50 text-[11px] backdrop-blur-md"
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}
