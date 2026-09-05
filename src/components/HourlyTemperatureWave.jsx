import React, { useRef, useState } from 'react';
import { convertTemp, renderWeatherIcon } from '../utils/weatherUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * HourlyTemperatureWave Component
 * 
 * Recreates the signature animated temperature curve wave from the reference design:
 * - Computes a smooth cubic bezier SVG curve connecting hourly temperature nodes (up to 24 hours)
 * - Active glowing yellow pill indicator with vertical dotted drop line
 * - Mouse drag-to-scroll and touch swipe for ultra-smooth navigation across the entire 24h trajectory
 * - Left/Right quick scroll arrows
 * - Rain probability badges and weather condition icons
 * 
 * @param {object} props
 * @param {Array} props.hourly - Array of hourly forecasts from weatherService (up to 24 items)
 * @param {string} props.unit - 'C' | 'F'
 */
export default function HourlyTemperatureWave({ hourly, unit = 'C' }) {
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  if (!hourly || hourly.length === 0) return null;

  // Chart layout dimensions
  const chartHeight = 115;
  const paddingX = 40;
  const itemWidth = 78;
  const totalWidth = Math.max(hourly.length * itemWidth + paddingX * 2, 800);

  // Temperature domain calculation
  const temps = hourly.map((h) => h.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = Math.max(maxTemp - minTemp, 4);

  // Compute node coordinates
  const points = hourly.map((item, index) => {
    const x = paddingX + index * itemWidth;
    const normalized = (item.temp - minTemp) / tempRange;
    const y = 28 + (1 - normalized) * (chartHeight - 65);
    return { x, y, ...item };
  });

  // Cubic Bezier curve generator
  const generateSmoothPath = (pts) => {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x},${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  };

  const smoothCurvePath = generateSmoothPath(points);
  const areaPath = `${smoothCurvePath} L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`;
  const activePoint = points[0];

  // Mouse Drag to Scroll Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftState(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const scrollByAmount = (offset) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full relative group">
      
      {/* Subtle Scroll Left Button */}
      <button
        type="button"
        onClick={() => scrollByAmount(-240)}
        aria-label="Scroll left"
        className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-900/80 border border-white/15 text-slate-200 hover:text-white items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity shadow-xl cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Subtle Scroll Right Button */}
      <button
        type="button"
        onClick={() => scrollByAmount(240)}
        aria-label="Scroll right"
        className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-900/80 border border-white/15 text-slate-200 hover:text-white items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity shadow-xl cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Smooth Drag & Scroll Container */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`overflow-x-auto pb-4 pt-2 no-scrollbar scroll-smooth select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div style={{ width: `${totalWidth}px` }} className="relative px-2">
          
          {/* SVG Wave Graphic */}
          <div className="relative" style={{ height: `${chartHeight}px` }}>
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${totalWidth} ${chartHeight}`}
            >
              <defs>
                <linearGradient id="waveStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#facc15" />
                  <stop offset="25%" stopColor="#2dd4bf" />
                  <stop offset="75%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>

                <linearGradient id="waveAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                </linearGradient>

                <filter id="pillGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#facc15" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Dotted horizontal baseline */}
              <line
                x1={paddingX}
                y1={activePoint.y}
                x2={totalWidth - paddingX}
                y2={activePoint.y}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.25"
              />

              {/* Radiant Area fill */}
              <path d={areaPath} fill="url(#waveAreaGradient)" />

              {/* Smooth Bezier Line */}
              <path
                d={smoothCurvePath}
                fill="none"
                stroke="url(#waveStrokeGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Vertical dotted guide on active point */}
              <line
                x1={activePoint.x}
                y1={activePoint.y + 14}
                x2={activePoint.x}
                y2={chartHeight - 4}
                stroke="#facc15"
                strokeWidth="1.5"
                strokeDasharray="2 3"
                strokeOpacity="0.6"
              />

              {/* Node Indicators */}
              {points.map((p, idx) => {
                const isFirst = idx === 0;
                return (
                  <g key={idx}>
                    {isFirst ? (
                      <g transform={`translate(${p.x}, ${p.y})`} filter="url(#pillGlow)">
                        <circle r="14" fill="#facc15" />
                        <text
                          textAnchor="middle"
                          dy="4.5"
                          fontSize="11"
                          fontWeight="bold"
                          fill="#0f172a"
                          fontFamily="system-ui, sans-serif"
                        >
                          {convertTemp(p.temp, unit)}
                        </text>
                      </g>
                    ) : (
                      <g>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill="#2dd4bf"
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={p.y + 18}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="600"
                          fill="#2dd4bf"
                          opacity="0.9"
                        >
                          {convertTemp(p.temp, unit)}°
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Time & Weather Icons Timeline */}
          <div className="flex justify-between items-start mt-2">
            {points.map((item, index) => {
              const isNow = index === 0;
              return (
                <div
                  key={index}
                  style={{ width: `${itemWidth}px` }}
                  className="flex flex-col items-center text-center space-y-1.5 shrink-0"
                >
                  <div className="p-1 rounded-lg">
                    {renderWeatherIcon(item.icon, item.time.includes('05') ? false : true, 'w-6 h-6')}
                  </div>

                  <span
                    className={`text-xs ${
                      isNow
                        ? 'font-extrabold text-white text-sm'
                        : 'text-slate-300 font-medium'
                    }`}
                  >
                    {item.time}
                  </span>

                  {item.rainProb > 0 ? (
                    <span className="text-[10px] text-cyan-400 font-semibold">
                      {item.rainProb}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-transparent select-none">-</span>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
