import React from 'react';
import { Wind, ShieldAlert, HeartPulse, Info } from 'lucide-react';

/**
 * AirQualityCard Component
 * 
 * Visualizes the real-time Air Quality Index (AQI) score, EPA safety category,
 * health recommendation message, and granular particulate pollutant breakdown (PM2.5, PM10, etc.).
 * 
 * @param {object} props
 * @param {object} props.airQuality - AQI metrics object from weatherService
 */
export default function AirQualityCard({ airQuality }) {
  if (!airQuality) return null;

  const { aqi, pm25, pm10, no2, o3, category } = airQuality;

  // Calculate percentage for visual progress meter (clamped between 0% and 100%, based on 300 scale)
  const aqiPercentage = Math.min(Math.round((aqi / 300) * 100), 100);

  return (
    <div className="glass-card glass-card-hover rounded-3xl p-6 sm:p-7 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
      
      {/* Card Header: Icon & Category Badge */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Wind className="w-5 h-5" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Air Quality Index (AQI)
            </h3>
          </div>
          
          {/* Safety Category Badge with dynamic colors */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${category.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${category.badgeBg}`} />
            {category.label}
          </span>
        </div>

        {/* AQI Score & Visual Meter */}
        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-white">{aqi}</span>
            <span className="text-xs text-slate-400 font-medium">US AQI Standard</span>
          </div>

          {/* Color-Coded Progress Bar Gauge */}
          <div className="w-full bg-slate-800/80 rounded-full h-2.5 mt-3 overflow-hidden border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${category.badgeBg}`}
              style={{ width: `${aqiPercentage}%` }}
            />
          </div>
          
          {/* Meter Scale Indicators */}
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>0 Good</span>
            <span>100 Moderate</span>
            <span>200 Unhealthy</span>
            <span>300+ Hazardous</span>
          </div>
        </div>

        {/* Health Advisory Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
          <HeartPulse className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {category.advice}
          </p>
        </div>
      </div>

      {/* Pollutant Micro-Grid (PM2.5, PM10, NO2, O3) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
        
        {/* PM 2.5 Fine Particles */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">PM 2.5</div>
          <div className="text-base font-bold text-white mt-0.5">{pm25} <span className="text-[10px] font-normal text-slate-400">μg/m³</span></div>
        </div>

        {/* PM 10 Coarse Particles */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">PM 10</div>
          <div className="text-base font-bold text-white mt-0.5">{pm10} <span className="text-[10px] font-normal text-slate-400">μg/m³</span></div>
        </div>

        {/* Nitrogen Dioxide (NO2) */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">NO₂</div>
          <div className="text-base font-bold text-white mt-0.5">{no2} <span className="text-[10px] font-normal text-slate-400">μg/m³</span></div>
        </div>

        {/* Ozone (O3) */}
        <div className="bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Ozone (O₃)</div>
          <div className="text-base font-bold text-white mt-0.5">{o3} <span className="text-[10px] font-normal text-slate-400">μg/m³</span></div>
        </div>

      </div>
    </div>
  );
}

