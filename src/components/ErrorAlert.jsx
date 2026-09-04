import React from 'react';
import { AlertCircle, RotateCcw, MapPin } from 'lucide-react';

/**
 * ErrorAlert Component
 * 
 * Displays an intuitive error card whenever a city search fails, coordinates cannot be found,
 * or network request fails. Includes instant retry and fallback suggestions.
 * 
 * @param {object} props
 * @param {string} props.errorMessage - Descriptive message describing the error
 * @param {Function} props.onRetry - Callback function to retry the search or load default city
 */
export default function ErrorAlert({ errorMessage, onRetry }) {
  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 sm:p-8 rounded-3xl bg-rose-950/20 border border-rose-500/30 text-rose-200 glass-card">
      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
        
        {/* Error Alert Icon */}
        <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
          <AlertCircle className="w-8 h-8" />
        </div>

        {/* Message & Actions */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">
            Unable to Load Weather Data
          </h3>
          <p className="text-sm text-rose-200/80 mb-4 leading-relaxed">
            {errorMessage || 'An unexpected error occurred while communicating with the weather services.'}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            {/* Retry Button */}
            <button
              type="button"
              onClick={() => onRetry('New Delhi')}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to New Delhi</span>
            </button>

            {/* Quick London Button */}
            <button
              type="button"
              onClick={() => onRetry('London')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Try London</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

