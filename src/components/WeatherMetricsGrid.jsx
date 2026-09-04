import React from 'react';
import { Wind, Compass, Gauge, SunMedium, Sunrise, Sunset } from 'lucide-react';

/**
 * WeatherMetricsGrid Component
 * 
 * Displays a grid of detailed atmospheric condition metrics:
 * Wind Speed & Direction, Humidity, UV Index, Surface Pressure, and Sunrise/Sunset times.
 * 
 * @param {object} props
 * @param {object} props.current - Current weather metrics from weatherService
 * @param {object} props.todayExtremes - Extremes including sunrise, sunset, and UV index
 */
export default function WeatherMetricsGrid({ current, todayExtremes }) {
  if (!current || !todayExtremes) return null;

  // Helper to interpret UV Index risk
  const getUvCategory = (uv) => {
    if (uv <= 2) return { text: 'Low', color: 'text-emerald-400' };
    if (uv <= 5) return { text: 'Moderate', color: 'text-yellow-400' };
    if (uv <= 7) return { text: 'High', color: 'text-amber-400' };
    if (uv <= 10) return { text: 'Very High', color: 'text-rose-400' };
    return { text: 'Extreme', color: 'text-purple-400' };
  };

  const uvInfo = getUvCategory(todayExtremes.uvIndex);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      
      {/* 1. Wind Metrics */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span>Wind Status</span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-white">
            {current.windSpeed} <span className="text-xs font-normal text-slate-400">km/h</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <Compass
              className="w-3.5 h-3.5 text-cyan-400 transition-transform"
              style={{ transform: `rotate(${current.windDirection}deg)` }}
            />
            <span>Direction: {current.windDirection}°</span>
          </div>
        </div>
      </div>

      {/* 2. UV Index */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase">
          <SunMedium className="w-4 h-4 text-amber-400" />
          <span>UV Index</span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-white">
            {todayExtremes.uvIndex} <span className="text-xs font-normal text-slate-400">/ 11</span>
          </div>
          <div className="mt-2 text-xs font-semibold">
            <span className={uvInfo.color}>{uvInfo.text}</span> risk
          </div>
        </div>
      </div>

      {/* 3. Atmospheric Pressure */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase">
          <Gauge className="w-4 h-4 text-teal-400" />
          <span>Pressure</span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-white">
            {current.pressure} <span className="text-xs font-normal text-slate-400">hPa</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {current.pressure > 1013 ? 'High pressure (Fair)' : 'Standard atmospheric'}
          </div>
        </div>
      </div>

      {/* 4. Sunrise & Sunset */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase">
          <Sunrise className="w-4 h-4 text-orange-400" />
          <span>Sun Schedule</span>
        </div>
        <div className="mt-2 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <Sunrise className="w-3.5 h-3.5 text-amber-400" /> Rise
            </span>
            <strong className="text-white font-mono">{todayExtremes.sunrise}</strong>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <Sunset className="w-3.5 h-3.5 text-rose-400" /> Set
            </span>
            <strong className="text-white font-mono">{todayExtremes.sunset}</strong>
          </div>
        </div>
      </div>

    </div>
  );
}

