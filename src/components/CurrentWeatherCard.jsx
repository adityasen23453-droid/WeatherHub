import React from 'react';
import { MapPin, ArrowUp, ArrowDown, Droplets, Wind, Eye } from 'lucide-react';
import { convertTemp, renderWeatherIcon, getHeroGradient } from '../utils/weatherUtils';

/**
 * CurrentWeatherCard Component
 * 
 * Displays the hero weather card with location information, current temperature,
 * dynamic weather condition icons, min/max range, feels-like metric, and ambient gradient backdrops.
 * 
 * @param {object} props
 * @param {object} props.data - Composite weather object from weatherService
 * @param {string} props.unit - Current temperature unit ('C' or 'F')
 */
export default function CurrentWeatherCard({ data, unit }) {
  if (!data || !data.current) return null;

  const { location, current, todayExtremes, lastUpdated } = data;
  const gradientClass = getHeroGradient(current.condition, current.isDay);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br ${gradientClass} border shadow-2xl glass-card transition-all duration-500`}
    >
      {/* Top Bar: Location details and Day/Night badge */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Current Location</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {location.name}
            {location.admin1 ? <span className="text-lg sm:text-2xl text-slate-400 font-normal">, {location.admin1}</span> : ''}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {location.country} • Updated at {lastUpdated}
          </p>
        </div>

        {/* Day / Night Indicator Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
          <span className={`w-2 h-2 rounded-full ${current.isDay ? 'bg-amber-400 animate-pulse' : 'bg-indigo-400'}`} />
          <span>{current.isDay ? 'Daytime' : 'Nighttime'}</span>
        </div>
      </div>

      {/* Center Hero Section: Large Temperature & Condition Icon */}
      <div className="my-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        
        {/* Main Temperature Display */}
        <div className="flex items-baseline">
          <span className="text-6xl sm:text-8xl font-black text-white tracking-tighter">
            {convertTemp(current.temperature, unit)}
          </span>
          <span className="text-3xl sm:text-5xl font-light text-cyan-400 ml-1">
            °{unit}
          </span>
        </div>

        {/* Condition Icon and Label */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
          <div className="p-3 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
            {renderWeatherIcon(current.icon, current.isDay, 'w-12 h-12 sm:w-16 sm:h-16')}
          </div>
          <div className="sm:text-right">
            <span className="text-lg sm:text-xl font-bold text-white block">
              {current.description}
            </span>
            <span className="text-xs text-slate-400">
              Feels like {convertTemp(current.feelsLike, unit)}°{unit}
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Row: Today's High/Low and quick micro-stats */}
      <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-300">
        
        {/* High / Low Temperature Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
            <ArrowUp className="w-3.5 h-3.5 text-rose-400" />
            <span>High: <strong className="text-white">{convertTemp(todayExtremes.maxTemp, unit)}°{unit}</strong></span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
            <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
            <span>Low: <strong className="text-white">{convertTemp(todayExtremes.minTemp, unit)}°{unit}</strong></span>
          </div>
        </div>

        {/* Quick Micro-Metrics */}
        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span>{current.humidity}% Humidity</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span>{current.windSpeed} km/h Wind</span>
          </div>
        </div>

      </div>
    </div>
  );
}

