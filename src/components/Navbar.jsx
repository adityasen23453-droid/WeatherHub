import React, { useState, useEffect } from 'react';
import { CloudSun, Clock, RefreshCw } from 'lucide-react';

/**
 * Navbar Component
 * 
 * Header bar for the WeatherHub application.
 * Provides application branding, live digital clock, unit conversion toggle (°C / °F),
 * and quick link to the candidate's GitHub repository.
 * 
 * @param {object} props
 * @param {string} props.unit - Current temperature unit ('C' or 'F')
 * @param {Function} props.onToggleUnit - Callback to toggle between Celsius and Fahrenheit
 * @param {Function} props.onRefresh - Callback to refresh current city weather
 * @param {boolean} props.isLoading - Whether data is actively being fetched
 */
export default function Navbar({ unit, onToggleUnit, onRefresh, isLoading }) {
  // Local state to store live clock time string
  const [currentTime, setCurrentTime] = useState('');

  // useEffect Hook: Sets up a 1-second interval timer to update the clock display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateTime(); // Initial invocation
    const timerId = setInterval(updateTime, 1000); // Repeat every 1,000 milliseconds

    // Cleanup function: Prevents memory leaks by clearing the timer on unmount
    return () => clearInterval(timerId);
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <CloudSun className="w-6 h-6 text-white animate-pulse-subtle" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">WeatherHub</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                React 19
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Live Weather & Air Quality Intelligence</p>
          </div>
        </div>

        {/* Right Action Bar: Live Clock, Unit Switcher, Refresh, and GitHub */}
        <div className="flex items-center gap-3">
          
          {/* Live Digital Clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">{currentTime || '--:--:--'}</span>
          </div>

          {/* Unit Toggle Button: Switch between Celsius (°C) and Fahrenheit (°F) */}
          <button
            type="button"
            onClick={onToggleUnit}
            title={`Switch to °${unit === 'C' ? 'F' : 'C'}`}
            className="flex items-center bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:text-white cursor-pointer active:scale-95"
          >
            <span className={unit === 'C' ? 'text-cyan-400 font-bold' : 'text-slate-500'}>°C</span>
            <span className="mx-1 text-slate-600">/</span>
            <span className={unit === 'F' ? 'text-cyan-400 font-bold' : 'text-slate-500'}>°F</span>
          </button>

          {/* Refresh Data Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh current weather data"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/adityasen23453-droid/WeatherHub"
            target="_blank"
            rel="noopener noreferrer"
            title="View Source on GitHub"
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>

        </div>
      </div>
    </header>
  );
}
