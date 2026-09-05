import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Clock,
  RefreshCw,
  MapPin,
  LocateFixed,
  Bookmark,
  Sparkles,
  Loader2,
} from 'lucide-react';

/**
 * Navbar Component
 * 
 * High-aesthetic floating navigation bar:
 * - Radiant multi-color border glow line effect
 * - Gradient typography and glowing status indicators
 * - Live GPS Geolocation button ("Locate Me")
 * - Favorite City Management trigger button
 * - °C / °F unit toggle and real-time seconds digital clock
 * 
 * @param {object} props
 * @param {string} props.unit - 'C' | 'F'
 * @param {Function} props.onToggleUnit - Unit toggle callback
 * @param {Function} props.onRefresh - Refresh current city callback
 * @param {Function} props.onLocateMe - Live GPS geolocation trigger callback
 * @param {Function} props.onOpenCityManagement - Open City Management modal callback
 * @param {string} props.currentCity - Currently active city
 * @param {boolean} props.isLoading - Loading state
 * @param {boolean} props.isLocating - Geolocation fetching state
 */
export default function Navbar({
  unit,
  onToggleUnit,
  onRefresh,
  onLocateMe,
  onOpenCityManagement,
  currentCity = 'New Delhi',
  isLoading,
  isLocating,
}) {
  const [currentTime, setCurrentTime] = useState('');

  // Clock interval effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateTime();
    const timerId = setInterval(updateTime, 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 pb-2 backdrop-blur-xl transition-all">
      {/* Floating Pill Container with Glowing Gradient Border Line Effect */}
      <div className="max-w-6xl mx-auto rounded-2xl sm:rounded-full bg-slate-950/70 border border-white/15 p-1.5 sm:px-5 sm:py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-wrap items-center justify-between gap-3 relative before:absolute before:-inset-[1px] before:rounded-2xl sm:before:rounded-full before:bg-gradient-to-r before:from-cyan-500/30 before:via-blue-500/10 before:to-purple-500/30 before:-z-10 before:pointer-events-none">
        
        {/* Left: Brand Logo with Glowing Accent */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-float">
              <CloudSun className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-950 animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                WeatherHub
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-400/30 uppercase tracking-widest">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live City Pill & City Management Trigger */}
        <div className="flex items-center gap-2">
          
          {/* Active City Indicator Button */}
          <button
            type="button"
            onClick={onOpenCityManagement}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:border-cyan-400/40 active:scale-95 group"
            title="Open City Management & Favorites"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-bounce" />
            <span className="max-w-[110px] sm:max-w-[160px] truncate">{currentCity}</span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(Change)</span>
          </button>

          {/* Favorite Cities Management Button (with icon) */}
          <button
            type="button"
            onClick={onOpenCityManagement}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600/30 to-cyan-500/30 hover:from-blue-600/40 hover:to-cyan-500/40 border border-cyan-400/30 text-cyan-200 hover:text-white text-xs font-semibold transition-all shadow-md cursor-pointer active:scale-95"
            title="Manage Favorite Cities"
          >
            <Bookmark className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden md:inline">Favorites</span>
          </button>

          {/* Live GPS "Locate Me" Button */}
          <button
            type="button"
            onClick={onLocateMe}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 hover:text-white text-xs font-semibold transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            title="Use current GPS live location"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span className="hidden sm:inline">Locating...</span>
              </>
            ) : (
              <>
                <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Live GPS</span>
              </>
            )}
          </button>

        </div>

        {/* Right: Digital Clock, Unit Switcher, and Refresh Button */}
        <div className="flex items-center gap-2">
          
          {/* Live Digital Clock */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-200 bg-white/10 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{currentTime || '--:--:--'}</span>
          </div>

          {/* Unit Toggle Button (°C / °F) */}
          <button
            type="button"
            onClick={onToggleUnit}
            title={`Switch to °${unit === 'C' ? 'F' : 'C'}`}
            className="flex items-center bg-white/10 hover:bg-white/15 border border-white/15 hover:border-cyan-400/40 text-slate-200 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:text-white cursor-pointer active:scale-95 shadow-inner"
          >
            <span className={unit === 'C' ? 'text-cyan-400 font-black' : 'text-slate-400'}>°C</span>
            <span className="mx-1 text-slate-500 font-normal">/</span>
            <span className={unit === 'F' ? 'text-cyan-400 font-black' : 'text-slate-400'}>°F</span>
          </button>

          {/* Refresh Current Weather Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh current weather data"
            className="p-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/25 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

        </div>

      </div>
    </header>
  );
}
