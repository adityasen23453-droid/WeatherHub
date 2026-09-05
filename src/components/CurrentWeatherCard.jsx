import React from 'react';
import { MapPin } from 'lucide-react';
import { convertTemp, renderWeatherIcon } from '../utils/weatherUtils';

/**
 * CurrentWeatherCard Component
 * 
 * Implements the clean, high-impact hero header directly modeled on the reference design:
 * - Prominent City Title with location pin
 * - Quick PM2.5 air quality badge
 * - Weather condition headline ("Cloudy", "Clear", "Rain")
 * - Dynamic temperature range & feels-like indicator ("25 ~ 32°C  Feels like 33°C")
 * - Ultra-large minimalist temperature number ("28°C")
 * - Floating glowing weather condition icon
 * 
 * @param {object} props
 * @param {object} props.data - Composite weather data payload
 * @param {string} props.unit - 'C' | 'F'
 */
export default function CurrentWeatherCard({ data, unit, onLocateMe }) {
  if (!data || !data.current) return null;

  const { location, current, todayExtremes, airQuality } = data;

  return (
    <div className="w-full text-center sm:text-left pt-2 pb-4">
      {/* Top Location Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white/90">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight drop-shadow-md">
              {location.name}
            </h1>
            {location.admin1 && (
              <span className="text-xl sm:text-2xl text-slate-300/80 font-normal">
                , {location.admin1}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-slate-300/80 mt-1">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>{location.country} • Updated at {data.lastUpdated}</span>
            </div>
            {onLocateMe && (
              <button
                type="button"
                onClick={onLocateMe}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium cursor-pointer transition-colors"
              >
                Turn on Location &gt;
              </button>
            )}
          </div>
        </div>

        {/* Small PM 2.5 Badge (matching reference design) */}
        {airQuality && (
          <div className="flex justify-center sm:justify-end">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-xs text-slate-200 shadow-lg">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">PM 2.5</span>
              <strong className="text-white font-bold">{airQuality.pm25}</strong>
              <span className={`w-2 h-2 rounded-full ${airQuality.category.badgeBg}`} />
            </div>
          </div>
        )}
      </div>

      {/* Main Condition & Temp Section */}
      <div className="mt-8 flex flex-col items-center sm:items-start">
        {/* Weather Condition Name */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-white drop-shadow">
          {current.description}
        </h2>

        {/* Temperature Range & Feels Like (e.g. 25 ~ 32°C  Feels like 33°C) */}
        <p className="text-sm sm:text-base text-slate-300 mt-1 drop-shadow font-medium">
          {convertTemp(todayExtremes.minTemp, unit)} ~ {convertTemp(todayExtremes.maxTemp, unit)}°{unit}
          <span className="mx-2 text-slate-400">•</span>
          Feels like {convertTemp(current.feelsLike, unit)}°{unit}
        </p>

        {/* Huge Hero Temperature & Condition Icon */}
        <div className="mt-4 flex items-center justify-center sm:justify-start gap-8">
          <div className="flex items-baseline">
            <span className="text-7xl sm:text-9xl font-black text-white tracking-tighter drop-shadow-2xl">
              {convertTemp(current.temperature, unit)}
            </span>
            <span className="text-4xl sm:text-6xl font-light text-cyan-300 ml-1 drop-shadow-lg">
              °{unit}
            </span>
          </div>

          {/* Floating animated condition icon */}
          <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl animate-pulse-subtle">
            {renderWeatherIcon(current.icon, current.isDay, 'w-16 h-16 sm:w-20 sm:h-20')}
          </div>
        </div>
      </div>
    </div>
  );
}
