import React from 'react';
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog,
  CloudDrizzle,
} from 'lucide-react';

/**
 * Converts Celsius temperature to current chosen unit (Celsius or Fahrenheit)
 * @param {number} celsius - Temperature in Celsius
 * @param {'C' | 'F'} unit - Target unit
 * @returns {number} Formatted temperature integer
 */
export function convertTemp(celsius, unit = 'C') {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return '--';
  if (unit === 'F') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

/**
 * Returns dynamic Lucide icon component according to weather condition and time of day
 * @param {string} iconKey - Standardized icon key from weatherService
 * @param {boolean} isDay - True if daytime at location, false if nighttime
 * @param {string} className - Tailwind CSS classes for sizing and colors
 * @returns {React.ReactElement}
 */
export function renderWeatherIcon(iconKey, isDay = true, className = 'w-10 h-10') {
  switch (iconKey) {
    case 'sun':
      return isDay ? (
        <Sun className={`${className} text-amber-400`} />
      ) : (
        <Moon className={`${className} text-indigo-300`} />
      );
    case 'sun-cloud':
      return isDay ? (
        <CloudSun className={`${className} text-amber-300`} />
      ) : (
        <CloudMoon className={`${className} text-slate-300`} />
      );
    case 'cloud-sun':
      return isDay ? (
        <CloudSun className={`${className} text-cyan-300`} />
      ) : (
        <CloudMoon className={`${className} text-slate-400`} />
      );
    case 'cloud':
      return <Cloud className={`${className} text-slate-300`} />;
    case 'rain':
      return <CloudRain className={`${className} text-cyan-400`} />;
    case 'heavy-rain':
      return <CloudRain className={`${className} text-blue-500`} />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-teal-300`} />;
    case 'thunderstorm':
      return <CloudLightning className={`${className} text-yellow-400`} />;
    case 'snow':
      return <Snowflake className={`${className} text-sky-200`} />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} />;
    default:
      return isDay ? (
        <Sun className={`${className} text-amber-400`} />
      ) : (
        <Moon className={`${className} text-indigo-300`} />
      );
  }
}

/**
 * Generates dynamic backdrop gradients for the main weather card based on condition & day/night
 * @param {string} condition - Weather condition (Clear, Clouds, Rain, Thunderstorm, Snow, Fog)
 * @param {boolean} isDay - Day or night flag
 * @returns {string} Tailwind CSS gradient classes
 */
export function getHeroGradient(condition = 'Clear', isDay = true) {
  if (!isDay) {
    return 'from-slate-900 via-indigo-950/80 to-slate-900 border-indigo-500/20';
  }

  switch (condition) {
    case 'Clear':
      return 'from-sky-900/60 via-blue-900/40 to-slate-900 border-sky-500/20';
    case 'Clouds':
      return 'from-slate-800/80 via-slate-900/60 to-slate-900 border-slate-700/30';
    case 'Rain':
    case 'Drizzle':
      return 'from-cyan-950/80 via-blue-950/60 to-slate-900 border-cyan-500/20';
    case 'Thunderstorm':
      return 'from-purple-950/80 via-slate-900/80 to-slate-900 border-purple-500/30';
    case 'Snow':
      return 'from-blue-950/60 via-slate-900/60 to-slate-900 border-blue-400/20';
    default:
      return 'from-slate-900 via-slate-900 to-slate-950 border-slate-800';
  }
}

