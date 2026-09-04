import React from 'react';
import { Calendar } from 'lucide-react';
import { convertTemp, renderWeatherIcon } from '../utils/weatherUtils';

/**
 * ForecastCard Component
 * 
 * Renders the 5-day daily forecast strip showing weather conditions,
 * dynamic weather icons, and high/low temperature forecasts.
 * 
 * @param {object} props
 * @param {Array} props.forecast - Array of daily forecast items from weatherService
 * @param {string} props.unit - Current temperature unit ('C' or 'F')
 */
export default function ForecastCard({ forecast, unit }) {
  if (!forecast || forecast.length === 0) return null;

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-800 mt-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-cyan-400">
          <Calendar className="w-5 h-5" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            5-Day Extended Forecast
          </h3>
        </div>
        <span className="text-xs text-slate-400">Daily outlook</span>
      </div>

      {/* Forecast Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
        {forecast.map((day, index) => (
          <div
            key={day.date}
            className={`p-4 rounded-2xl border transition-all flex sm:flex-col items-center justify-between sm:justify-center text-center gap-2 ${
              index === 0
                ? 'bg-cyan-950/20 border-cyan-500/30 shadow-md shadow-cyan-500/5'
                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* Day name & Date */}
            <div className="text-left sm:text-center">
              <div className="text-sm font-bold text-white flex items-center gap-1 sm:justify-center">
                {day.dayName}
                {index === 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block sm:hidden" />
                )}
              </div>
              <div className="text-[11px] text-slate-400">{day.formattedDate}</div>
            </div>

            {/* Weather Condition Icon */}
            <div className="my-1 p-2 rounded-xl bg-slate-800/50">
              {renderWeatherIcon(day.icon, true, 'w-8 h-8')}
            </div>

            {/* Condition Description */}
            <div className="text-xs text-slate-300 font-medium truncate max-w-[120px] hidden sm:block">
              {day.description}
            </div>

            {/* Min / Max Temperature Bar */}
            <div className="text-right sm:text-center">
              <div className="flex items-center gap-2 sm:justify-center text-sm font-bold">
                <span className="text-rose-400">{convertTemp(day.maxTemp, unit)}°</span>
                <span className="text-slate-600 font-normal">/</span>
                <span className="text-blue-400">{convertTemp(day.minTemp, unit)}°</span>
              </div>
              <div className="text-[10px] text-slate-400 sm:hidden">
                {day.description}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

