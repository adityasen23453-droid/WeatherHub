import React, { useState } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

/**
 * SearchBar Component
 * 
 * Manages the user search input for querying city weather and renders quick-selection city chips.
 * 
 * @param {object} props
 * @param {Function} props.onSearch - Callback function invoked with the validated city name
 * @param {boolean} props.isLoading - Flag indicating an ongoing API request
 */
export default function SearchBar({ onSearch, isLoading }) {
  // Local state to store the currently typed text inside the input box
  const [cityInput, setCityInput] = useState('');

  // Popular shortcut cities for quick 1-click weather checking
  const popularCities = ['New Delhi', 'Mumbai', 'Bengaluru', 'London', 'New York', 'Tokyo', 'Paris'];

  /**
   * Form submission handler.
   * Intercepts standard browser form submission, trims whitespace, and triggers parent search.
   * 
   * @param {React.FormEvent} e - Form submission synthetic event
   */
  const handleSubmit = (e) => {
    // Crucial TCS Concept: Prevent the default HTML form submission behavior (page reload)
    e.preventDefault();
    const trimmed = cityInput.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
    }
  };

  /**
   * Clears the input field and resets local state
   */
  const handleClear = () => {
    setCityInput('');
  };

  /**
   * Handles 1-click search from popular city pills
   * @param {string} city - Name of selected popular city
   */
  const handleQuickCityClick = (city) => {
    setCityInput(city);
    onSearch(city);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
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
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="Search any global city (e.g. New Delhi, London, Tokyo, New York)..."
          disabled={isLoading}
          className="w-full pl-12 pr-28 py-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-slate-100 placeholder-slate-400 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all shadow-xl backdrop-blur-sm disabled:opacity-50"
        />

        {/* Clear Button (shown only when text is entered) */}
        {cityInput && !isLoading && (
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
          disabled={!cityInput.trim() || isLoading}
          className="absolute right-2.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Searching</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </>
          )}
        </button>
      </form>

      {/* Quick City Shortcut Chips */}
      <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 font-medium whitespace-nowrap pl-1">Popular:</span>
        {popularCities.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => handleQuickCityClick(city)}
            disabled={isLoading}
            className="px-3 py-1 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-cyan-400 rounded-full transition-all whitespace-nowrap cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}

