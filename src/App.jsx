import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';
import CurrentWeatherCard from './components/CurrentWeatherCard';
import HourlyTemperatureWave from './components/HourlyTemperatureWave';
import ForecastCard from './components/ForecastCard';
import AirQualityCard from './components/AirQualityCard';
import WeatherMetricsGrid from './components/WeatherMetricsGrid';
import LoadingSkeleton from './components/LoadingSkeleton';
import ErrorAlert from './components/ErrorAlert';
import CityManagementModal from './components/CityManagementModal';
import WeatherMap from './components/WeatherMap';
import {
  getCompleteWeatherReport,
  getCompleteWeatherReportByCoords,
  DEFAULT_FAVORITE_CITIES,
  fetchLiveWeatherForCities,
} from './services/weatherService';

/**
 * App Component - Root Orchestrator
 * 
 * Coordinates:
 * - Real-time GPS location fetcher
 * - Favorite City Management modal (persistent in localStorage)
 * - 24-hour smooth draggable temperature wave
 * - Maximum available extended daily predictions (up to 14 days)
 * - Clean photorealistic background themes
 */
export default function App() {
  // ==========================================
  // 1. STATE DECLARATIONS
  // ==========================================

  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentCity, setCurrentCity] = useState('New Delhi');
  const [tempUnit, setTempUnit] = useState('C');
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  // Persistent Favorites state (identity & coordinates only)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('weatherhub_favorites');
      if (!saved) return DEFAULT_FAVORITE_CITIES;
      const parsed = JSON.parse(saved);
      return parsed.map((item) => ({
        id: item.id || `${item.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: item.name,
        latitude: item.latitude ?? (item.name === 'Musari Kudar' ? 22.75 : item.name === 'Jamshedpur' ? 22.8046 : 28.6139),
        longitude: item.longitude ?? (item.name === 'Musari Kudar' ? 86.15 : item.name === 'Jamshedpur' ? 86.2029 : 77.209),
        country: item.country || 'India',
        admin1: item.admin1 || '',
      }));
    } catch {
      return DEFAULT_FAVORITE_CITIES;
    }
  });

  const [favoritesWeather, setFavoritesWeather] = useState({});

  // Sync favorites to localStorage and fetch live weather on-demand
  useEffect(() => {
    localStorage.setItem('weatherhub_favorites', JSON.stringify(favorites));
    if (favorites.length > 0) {
      fetchLiveWeatherForCities(favorites).then((res) => {
        setFavoritesWeather((prev) => ({ ...prev, ...res }));
      });
    }
  }, [favorites]);

  // ==========================================
  // 2. ASYNCHRONOUS DATA FETCHING
  // ==========================================

  /**
   * Fetch weather by city name query
   */
  const fetchWeather = async (targetCity) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const report = await getCompleteWeatherReport(targetCity);
      setWeatherData(report);
      setCurrentCity(report.location.name);
    } catch (error) {
      console.error('Weather fetch failed:', error);
      setErrorMessage(error.message || 'Failed to fetch weather data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Real-time GPS Geolocation Fetcher
   * Requests coordinates from browser and reverse geocodes to user's exact locality
   */
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setIsLoading(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const report = await getCompleteWeatherReportByCoords(latitude, longitude);
          setWeatherData(report);
          setCurrentCity(report.location.name);
        } catch (err) {
          console.error('GPS fetch error:', err);
          setErrorMessage(err.message || 'Failed to fetch weather for your live GPS location.');
        } finally {
          setIsLocating(false);
          setIsLoading(false);
        }
      },
      (geoError) => {
        console.warn('Geolocation error:', geoError);
        setIsLocating(false);
        setIsLoading(false);
        let msg = 'Unable to retrieve your current location.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser or search for a city.';
        }
        setErrorMessage(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ==========================================
  // 3. LIFECYCLE HOOK
  // ==========================================

  useEffect(() => {
    fetchWeather('New Delhi');
  }, []);

  // ==========================================
  // 4. HANDLERS
  // ==========================================

  const handleSearch = (searchedCity) => {
    fetchWeather(searchedCity);
  };

  const handleRefresh = () => {
    if (currentCity) {
      fetchWeather(currentCity);
    }
  };

  const handleToggleUnit = () => {
    setTempUnit((prevUnit) => (prevUnit === 'C' ? 'F' : 'C'));
  };

  const activeTheme = weatherData?.theme || 'night';
  const backgroundUrl = `/backgrounds/${activeTheme}.jpg`;

  return (
    <div className="min-h-screen text-slate-100 relative overflow-x-hidden flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* Dynamic Photorealistic Background Texture */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 -z-30 transform scale-105"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />

      {/* Cinematic Vignette & Ambient Gradient Overlays */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-slate-950/50 to-slate-950/85 -z-20 pointer-events-none" />
      <div className="fixed inset-0 backdrop-blur-[2px] -z-10 pointer-events-none" />

      {/* Cool Floating Navbar with Glowing Border Line Effect */}
      <Navbar
        unit={tempUnit}
        onToggleUnit={handleToggleUnit}
        onRefresh={handleRefresh}
        onLocateMe={handleLocateMe}
        onOpenCityManagement={() => setIsCityModalOpen(true)}
        currentCity={currentCity}
        isLoading={isLoading}
        isLocating={isLocating}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10 flex flex-col justify-between">
        
        {/* Floating Search Bar with Live Location & Popular Cities */}
        <SearchBar
          onSearch={handleSearch}
          onLocateMe={handleLocateMe}
          isLoading={isLoading}
          isLocating={isLocating}
          userCoords={
            weatherData?.location
              ? { latitude: weatherData.location.latitude, longitude: weatherData.location.longitude }
              : null
          }
        />

        {/* State Display Engine */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : errorMessage ? (
          <ErrorAlert errorMessage={errorMessage} onRetry={fetchWeather} />
        ) : weatherData ? (
          <div className="space-y-6 animate-fadeIn">
            
            {/* 1. Hero Weather Header with 'Turn on Location >' option */}
            <CurrentWeatherCard
              data={weatherData}
              unit={tempUnit}
              onLocateMe={handleLocateMe}
            />

            {/* 2. Interactive Weather Map */}
            <WeatherMap
              latitude={weatherData.location.latitude}
              longitude={weatherData.location.longitude}
              cityName={weatherData.location.name}
              weather={weatherData}
              unit={tempUnit}
              favorites={favorites}
              favoritesWeather={favoritesWeather}
              onSelectCity={handleSearch}
              onLocateMe={handleLocateMe}
              isLocating={isLocating}
            />

            {/* 3. Signature Feature: Smooth Draggable 24-Hour Temperature Wave Curve */}
            <div className="glass-card rounded-3xl p-4 sm:p-6 border border-white/10 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  24-Hour Hourly Trajectory
                </span>
                <span className="text-xs text-slate-400">
                  Drag & scroll horizontally to explore
                </span>
              </div>
              <HourlyTemperatureWave
                hourly={weatherData.hourly}
                unit={tempUnit}
                todayExtremes={weatherData.todayExtremes}
              />
            </div>

            {/* 4. Lower Section: Up to 14-Day Extended Daily Forecast + Air Quality Index */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Extended Daily Predictions (Up to 14 Days) */}
              <ForecastCard forecast={weatherData.forecast} unit={tempUnit} />

              {/* Right Column: Air Quality Index Breakdown */}
              <AirQualityCard airQuality={weatherData.airQuality} />
            </div>

            {/* 5. Atmospheric Metrics Grid (Wind Compass, UV Index, Pressure, Sunrise/Sunset) */}
            <WeatherMetricsGrid
              current={weatherData.current}
              todayExtremes={weatherData.todayExtremes}
            />

          </div>
        ) : null}

      </main>

      {/* Favorite Cities & City Management Modal (Matching Reference Design) */}
      <CityManagementModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        onSelectCity={handleSearch}
        currentCity={currentCity}
        unit={tempUnit}
        favorites={favorites}
        setFavorites={setFavorites}
        externalLiveWeather={favoritesWeather}
        onUpdateLiveWeather={(newData) => setFavoritesWeather((prev) => ({ ...prev, ...newData }))}
      />

    </div>
  );
}
