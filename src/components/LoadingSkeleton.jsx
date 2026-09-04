import React from 'react';

/**
 * LoadingSkeleton Component
 * 
 * Renders an animated pulse skeleton placeholder mimicking the layout
 * of the hero weather card, air quality card, and forecast strip.
 * Provides immediate UX feedback to eliminate layout shift during async data fetching.
 */
export default function LoadingSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      
      {/* Top Grid: Hero Weather Card + Air Quality Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Hero Card Placeholder */}
        <div className="lg:col-span-2 rounded-3xl p-8 bg-slate-900/60 border border-slate-800 h-80 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-32 h-4 bg-slate-800 rounded-lg" />
            <div className="w-64 h-10 bg-slate-800 rounded-xl" />
            <div className="w-40 h-4 bg-slate-800 rounded-lg" />
          </div>
          <div className="flex items-center justify-between">
            <div className="w-48 h-20 bg-slate-800 rounded-2xl" />
            <div className="w-24 h-24 bg-slate-800 rounded-2xl" />
          </div>
          <div className="pt-6 border-t border-slate-800 flex justify-between">
            <div className="w-36 h-6 bg-slate-800 rounded-lg" />
            <div className="w-48 h-6 bg-slate-800 rounded-lg" />
          </div>
        </div>

        {/* Right: Air Quality Card Placeholder */}
        <div className="rounded-3xl p-7 bg-slate-900/60 border border-slate-800 h-80 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="w-36 h-5 bg-slate-800 rounded-lg" />
            <div className="w-20 h-6 bg-slate-800 rounded-full" />
          </div>
          <div className="space-y-3 my-4">
            <div className="w-24 h-12 bg-slate-800 rounded-xl" />
            <div className="w-full h-3 bg-slate-800 rounded-full" />
          </div>
          <div className="w-full h-12 bg-slate-800 rounded-xl" />
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800">
            <div className="h-10 bg-slate-800 rounded-lg" />
            <div className="h-10 bg-slate-800 rounded-lg" />
            <div className="h-10 bg-slate-800 rounded-lg" />
            <div className="h-10 bg-slate-800 rounded-lg" />
          </div>
        </div>

      </div>

      {/* Atmospheric Metrics Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
            <div className="w-20 h-4 bg-slate-800 rounded" />
            <div className="w-28 h-7 bg-slate-800 rounded-lg" />
          </div>
        ))}
      </div>

      {/* 5-Day Forecast Skeleton */}
      <div className="rounded-3xl p-6 bg-slate-900/60 border border-slate-800 h-44 flex flex-col justify-between">
        <div className="w-44 h-5 bg-slate-800 rounded-lg mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-slate-800/80 rounded-xl" />
          ))}
        </div>
      </div>

    </div>
  );
}

