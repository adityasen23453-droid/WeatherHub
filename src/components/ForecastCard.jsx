import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, CloudRain } from 'lucide-react';
import { convertTemp, renderWeatherIcon } from '../utils/weatherUtils';

/**
 * ForecastCard Component
 * 
 * Extended daily predictions matching the reference design:
 * - Up to 14-day forecast with smooth vertical scrolling
 * - Date, day label, high-definition weather icon, condition description, and min/max temperatures
 * - Quick toggle between 7-day compact view and full 14-day extended view
 * 
 * @param {object} props
 * @param {Array} props.forecast - Array of daily forecast items from weatherService
 * @param {string} props.unit - Current temperature unit ('C' or 'F')
 */
export default function ForecastCard({ forecast, unit }) {
  const [showAllDays, setShowAllDays] = useState(false);

  if (!forecast || forecast.length === 0) return null;

  // By default show 7 days, or expand to full 14 days
  const visibleForecast = showAllDays ? forecast : forecast.slice(0, 7);

  return (
    <div className="glass-card rounded-3xl p-5 sm:p-7 border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-cyan-400">
          <Calendar className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Extended Daily Outlook
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {forecast.length}-day predictions
        </span>
      </div>

      {/* Smooth Vertical Scrollable Forecast List */}
      <div className="divide-y divide-white/5 space-y-0.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar scroll-smooth">
        {visibleForecast.map((day, index) => {
          const dateParts = day.date.split('-');
          const monthDay = dateParts.length >= 3 ? `${dateParts[1]}/${dateParts[2]}` : day.formattedDate;

          return (
            <div
              key={day.date}
              className="py-2.5 px-2 rounded-xl flex items-center justify-between hover:bg-white/5 transition-all duration-200"
            >
              {/* Left: Date & Day Name */}
              <div className="flex items-center gap-3 w-32 sm:w-36 shrink-0">
                <span className="text-xs font-mono text-slate-400">{monthDay}</span>
                <span className="text-sm font-semibold text-white truncate">
                  {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day.dayName}
                </span>
              </div>

              {/* Center: Weather Icon + Description */}
              <div className="flex items-center gap-2 flex-1 justify-start px-2">
                <div className="shrink-0">
                  {renderWeatherIcon(day.icon, true, 'w-6 h-6')}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs text-slate-200 font-medium truncate max-w-[140px]">
                    {day.description}
                  </span>
                  {day.precipitationProb !== null && day.precipitationProb > 0 && (
                    <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-0.5">
                      <CloudRain className="w-2.5 h-2.5" />
                      {day.precipitationProb}% rain
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Min and Max Temp */}
              <div className="flex items-center justify-end gap-3 text-sm font-bold w-24 shrink-0 text-right">
                <span className="text-slate-400 font-mono font-normal">
                  {convertTemp(day.minTemp, unit)}°
                </span>
                <span className="text-white font-mono">
                  {convertTemp(day.maxTemp, unit)}°
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / Collapse 14 Days Button */}
      {forecast.length > 7 && (
        <div className="pt-3 mt-2 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => setShowAllDays((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer active:scale-95 border border-white/10"
          >
            <span>{showAllDays ? 'Show 7 Days' : `Show All ${forecast.length} Days`}</span>
            {showAllDays ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

    </div>
  );
}
