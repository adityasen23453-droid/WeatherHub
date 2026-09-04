import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';
import CurrentWeatherCard from './components/CurrentWeatherCard';
import AirQualityCard from './components/AirQualityCard';
import WeatherMetricsGrid from './components/WeatherMetricsGrid';
import ForecastCard from './components/ForecastCard';
import LoadingSkeleton from './components/LoadingSkeleton';
import ErrorAlert from './components/ErrorAlert';
import { getCompleteWeatherReport } from './services/weatherService';

/**
 * App Component - Root Orchestrator
 * 
 * Manages the top-level application state using React 19 hooks (useState, useEffect),
 * coordinates asynchronous REST API calls, and handles conditional UI rendering
 * (loading skeletons, error alerts, and populated weather dashboards).
 */
export default function App() {
  // ==========================================
  // 1. STATE DECLARATIONS (React useState Hook)
  // ==========================================

  // weatherData: Holds the active weather, AQI, and forecast payload returned by the API
  const [weatherData, setWeatherData] = useState(null);

  // isLoading: Boolean flag to track whether an asynchronous fetch request is pending
  const [isLoading, setIsLoading] = useState(true);

  // errorMessage: Stores any error string encountered during fetching (null if healthy)
  const [errorMessage, setErrorMessage] = useState(null);

  // currentCity: Name of the current active city being displayed (default: 'New Delhi')
  const [currentCity, setCurrentCity] = useState('New Delhi');

  // tempUnit: Active temperature scale ('C' for Celsius, 'F' for Fahrenheit)
  const [tempUnit, setTempUnit] = useState('C');

  // ==========================================
  // 2. ASYNCHRONOUS DATA FETCHING LOGIC
  // ==========================================

  /**
   * fetchWeather
   * 
   * Asynchronously queries coordinates, weather, and air quality metrics for a given city name.
   * Utilizes try/catch/finally to guarantee that loading flags are consistently reset.
   * 
   * @param {string} targetCity - The city to look up
   */
  const fetchWeather = async (targetCity) => {
    // Set loading indicator to true before firing the network request
    setIsLoading(true);
    // Clear any leftover error message from previous attempts
    setErrorMessage(null);

    try {
      // Await the asynchronous controller function from weatherService
      const report = await getCompleteWeatherReport(targetCity);
      // On success, update weatherData and record the active city name
      setWeatherData(report);
      setCurrentCity(report.location.name);
    } catch (error) {
      // On failure, record the readable error message
      console.error('Weather fetch failed:', error);
      setErrorMessage(error.message || 'Failed to fetch weather data. Please try again.');
    } finally {
      // Regardless of success or failure, turn off the loading skeleton
      setIsLoading(false);
    }
  };

  // ==========================================
  // 3. LIFECYCLE HOOK (React useEffect Hook)
  // ==========================================

  /**
   * useEffect with an empty dependency array `[]`.
   * Triggers once immediately when the App component mounts into the real DOM.
   * Loads the default starting city ('New Delhi') so the user isn't greeted with a blank screen.
   */
  useEffect(() => {
    fetchWeather('New Delhi');
  }, []); // Empty dependency array ensures this effect runs exactly once on mount

  // ==========================================
  // 4. EVENT HANDLERS
  // ==========================================

  /**
   * Handler for user city search submissions from SearchBar
   * @param {string} searchedCity 
   */
  const handleSearch = (searchedCity) => {
    fetchWeather(searchedCity);
  };

  /**
   * Handler to refresh the currently viewed city
   */
  const handleRefresh = () => {
    if (currentCity) {
      fetchWeather(currentCity);
    }
  };

  /**
   * Toggles the temperature scale between Celsius and Fahrenheit
   */
  const handleToggleUnit = () => {
    setTempUnit((prevUnit) => (prevUnit === 'C' ? 'F' : 'C'));
  };

  // ==========================================
  // 5. JSX RENDERING
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white relative overflow-hidden">
      
      {/* Ambient background glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navigation Bar */}
      <Navbar
        unit={tempUnit}
        onToggleUnit={handleToggleUnit}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Search Bar with Popular City Chips */}
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {/* Conditional Rendering State Engine */}
        {isLoading ? (
          // 1. Loading State: Display animated skeleton placeholders
          <LoadingSkeleton />
        ) : errorMessage ? (
          // 2. Error State: Display alert banner with retry buttons
          <ErrorAlert errorMessage={errorMessage} onRetry={fetchWeather} />
        ) : weatherData ? (
          // 3. Success State: Display full dynamic dashboard
          <div className="space-y-6">
            
            {/* Top Row: Hero Current Weather Card + Air Quality Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CurrentWeatherCard data={weatherData} unit={tempUnit} />
              </div>
              <div className="lg:col-span-1">
                <AirQualityCard airQuality={weatherData.airQuality} />
              </div>
            </div>

            {/* Middle Row: Atmospheric Metrics Grid (Wind, UV, Pressure, Sun) */}
            <WeatherMetricsGrid
              current={weatherData.current}
              todayExtremes={weatherData.todayExtremes}
            />

            {/* Bottom Row: 5-Day Extended Daily Forecast */}
            <ForecastCard forecast={weatherData.forecast} unit={tempUnit} />

          </div>
        ) : null}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400 bg-slate-950/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Built for <strong className="text-slate-300">TCS Technical Interview Excellence</strong> — Project 2
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Powered by React 19 • Tailwind CSS • Open-Meteo REST API</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
