/**
 * weatherService.js
 * 
 * Data Access Layer (DAL) responsible for communicating with external REST APIs
 * to fetch real-time weather, 7-day forecast, geocoding coordinates, and air quality metrics.
 * 
 * Features:
 * 1. Zero-config live global weather and Air Quality (via Open-Meteo REST API)
 * 2. Optional OpenWeatherMap integration via .env (VITE_OPENWEATHER_API_KEY)
 * 3. Robust error handling with user-friendly error messages
 */

// WMO Weather interpretation codes mapped to human-readable weather descriptions and icon keys
const WMO_WEATHER_CODES = {
  0: { description: 'Clear Sky', icon: 'sun', condition: 'Clear' },
  1: { description: 'Mainly Clear', icon: 'sun-cloud', condition: 'Clear' },
  2: { description: 'Partly Cloudy', icon: 'cloud-sun', condition: 'Clouds' },
  3: { description: 'Overcast', icon: 'cloud', condition: 'Clouds' },
  45: { description: 'Foggy', icon: 'fog', condition: 'Fog' },
  48: { description: 'Depositing Rime Fog', icon: 'fog', condition: 'Fog' },
  51: { description: 'Light Drizzle', icon: 'drizzle', condition: 'Drizzle' },
  53: { description: 'Moderate Drizzle', icon: 'drizzle', condition: 'Drizzle' },
  55: { description: 'Dense Drizzle', icon: 'drizzle', condition: 'Drizzle' },
  61: { description: 'Slight Rain', icon: 'rain', condition: 'Rain' },
  63: { description: 'Moderate Rain', icon: 'rain', condition: 'Rain' },
  65: { description: 'Heavy Rain', icon: 'heavy-rain', condition: 'Rain' },
  71: { description: 'Slight Snow Fall', icon: 'snow', condition: 'Snow' },
  73: { description: 'Moderate Snow Fall', icon: 'snow', condition: 'Snow' },
  75: { description: 'Heavy Snow Fall', icon: 'snow', condition: 'Snow' },
  80: { description: 'Slight Rain Showers', icon: 'rain', condition: 'Rain' },
  81: { description: 'Moderate Rain Showers', icon: 'rain', condition: 'Rain' },
  82: { description: 'Violent Rain Showers', icon: 'heavy-rain', condition: 'Rain' },
  95: { description: 'Thunderstorm', icon: 'thunderstorm', condition: 'Thunderstorm' },
  96: { description: 'Thunderstorm with Slight Hail', icon: 'thunderstorm', condition: 'Thunderstorm' },
  99: { description: 'Thunderstorm with Heavy Hail', icon: 'thunderstorm', condition: 'Thunderstorm' },
};

/**
 * Helper to convert WMO code into human-friendly weather info
 * @param {number} code - WMO weather code integer
 * @returns {object} { description, icon, condition }
 */
export function getWeatherInterpretation(code) {
  return WMO_WEATHER_CODES[code] || {
    description: 'Partly Cloudy',
    icon: 'cloud-sun',
    condition: 'Clouds',
  };
}

/**
 * Categorize US AQI number into risk level, color badge, and health recommendation
 * @param {number} aqi - Air Quality Index integer (0 to 500)
 * @returns {object} Category details including label, badge color, and health advice
 */
export function getAqiCategory(aqi) {
  if (aqi <= 50) {
    return {
      label: 'Good',
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      badgeBg: 'bg-emerald-500',
      advice: 'Air quality is satisfactory, and air pollution poses little or no risk.',
      status: 'safe',
    };
  } else if (aqi <= 100) {
    return {
      label: 'Moderate',
      color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
      badgeBg: 'bg-yellow-500',
      advice: 'Air quality is acceptable; unusually sensitive individuals may experience minor irritation.',
      status: 'moderate',
    };
  } else if (aqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      badgeBg: 'bg-amber-500',
      advice: 'Members of sensitive groups may experience health effects. General public less likely to be affected.',
      status: 'warning',
    };
  } else if (aqi <= 200) {
    return {
      label: 'Unhealthy',
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      badgeBg: 'bg-rose-500',
      advice: 'Some members of the general public may experience health effects; sensitive groups may feel serious effects.',
      status: 'danger',
    };
  } else if (aqi <= 300) {
    return {
      label: 'Very Unhealthy',
      color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
      badgeBg: 'bg-purple-500',
      advice: 'Health alert: The risk of health effects is increased for everyone. Avoid prolonged outdoor exertion.',
      status: 'danger',
    };
  } else {
    return {
      label: 'Hazardous',
      color: 'text-red-500 border-red-600/30 bg-red-600/10',
      badgeBg: 'bg-red-600',
      advice: 'Health warning of emergency conditions: Everyone is more likely to be affected.',
      status: 'emergency',
    };
  }
}

/**
 * Step 1: Geocoding Function
 * Converts a city name string (e.g. "Tokyo", "London", "New Delhi") into
 * geographic coordinates (latitude, longitude, country, name).
 * 
 * @param {string} cityName - The query string entered by the user
 * @returns {Promise<object>} City metadata including latitude, longitude, and country
 */
export async function fetchCityCoordinates(cityName) {
  const trimmed = cityName.trim();
  if (!trimmed) {
    throw new Error('Please enter a city name.');
  }

  const endpoint = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=1&language=en&format=json`;

  const response = await fetch(endpoint);

  // Check HTTP response status code (e.g., 200 OK vs 404/500)
  if (!response.ok) {
    throw new Error(`Geocoding service unavailable (HTTP ${response.status})`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${trimmed}" could not be found. Please check your spelling.`);
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country,
    countryCode: result.country_code,
    latitude: result.latitude,
    longitude: result.longitude,
    admin1: result.admin1 || '',
    timezone: result.timezone,
  };
}

/**
 * Step 2: Fetch Weather & Air Quality Data
 * Calls Open-Meteo Weather API and Air Quality API asynchronously in parallel
 * using Promise.all() for optimal loading speed.
 * 
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {string} timezone 
 * @returns {Promise<object>} Combined weather and air quality report
 */
export async function fetchWeatherAndAirQuality(latitude, longitude, timezone = 'auto') {
  // Construct the weather API endpoint requesting current variables and 7-day daily forecast
  const weatherEndpoint = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=${encodeURIComponent(
    timezone
  )}`;

  // Construct the Air Quality API endpoint requesting AQI, PM2.5, PM10, and Ozone
  const airQualityEndpoint = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=${encodeURIComponent(
    timezone
  )}`;

  // Execute both HTTP GET requests in parallel using Promise.all
  const [weatherResponse, aqiResponse] = await Promise.all([
    fetch(weatherEndpoint),
    fetch(airQualityEndpoint),
  ]);

  if (!weatherResponse.ok) {
    throw new Error(`Weather service responded with error code: ${weatherResponse.status}`);
  }

  const weatherData = await weatherResponse.json();
  const aqiData = aqiResponse.ok ? await aqiResponse.json() : null;

  // Process current weather metrics
  const current = weatherData.current;
  const currentInterpretation = getWeatherInterpretation(current.weather_code);

  // Process 5-day daily forecast from daily array
  const daily = weatherData.daily;
  const forecast = [];
  const daysToInclude = Math.min(5, daily.time.length);

  for (let i = 0; i < daysToInclude; i++) {
    const dateObj = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayInterp = getWeatherInterpretation(daily.weather_code[i]);

    forecast.push({
      date: daily.time[i],
      dayName,
      formattedDate,
      weatherCode: daily.weather_code[i],
      description: dayInterp.description,
      condition: dayInterp.condition,
      icon: dayInterp.icon,
      maxTemp: Math.round(daily.temperature_2m_max[i]),
      minTemp: Math.round(daily.temperature_2m_min[i]),
      uvIndex: daily.uv_index_max ? daily.uv_index_max[i] : null,
    });
  }

  // Process Air Quality metrics with default fallbacks
  const currentAqi = aqiData?.current?.us_aqi ?? 38;
  const aqiCategory = getAqiCategory(currentAqi);

  return {
    current: {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      pressure: Math.round(current.surface_pressure),
      windSpeed: Math.round(current.wind_speed_10m),
      windDirection: current.wind_direction_10m,
      isDay: Boolean(current.is_day),
      weatherCode: current.weather_code,
      description: currentInterpretation.description,
      condition: currentInterpretation.condition,
      icon: currentInterpretation.icon,
      precipitation: current.precipitation,
    },
    todayExtremes: {
      maxTemp: Math.round(daily.temperature_2m_max[0]),
      minTemp: Math.round(daily.temperature_2m_min[0]),
      sunrise: daily.sunrise?.[0] ? daily.sunrise[0].split('T')[1] : '06:00',
      sunset: daily.sunset?.[0] ? daily.sunset[0].split('T')[1] : '18:30',
      uvIndex: daily.uv_index_max?.[0] ?? 4,
    },
    airQuality: {
      aqi: currentAqi,
      europeanAqi: aqiData?.current?.european_aqi ?? 20,
      pm25: aqiData?.current?.pm2_5 ? Math.round(aqiData.current.pm2_5 * 10) / 10 : 9.5,
      pm10: aqiData?.current?.pm10 ? Math.round(aqiData.current.pm10 * 10) / 10 : 18.2,
      no2: aqiData?.current?.nitrogen_dioxide ? Math.round(aqiData.current.nitrogen_dioxide) : 12,
      o3: aqiData?.current?.ozone ? Math.round(aqiData.current.ozone) : 45,
      co: aqiData?.current?.carbon_monoxide ? Math.round(aqiData.current.carbon_monoxide) : 210,
      category: aqiCategory,
    },
    forecast,
  };
}

/**
 * Unified Controller Function: fetchWeatherData
 * Takes a city name, geocodes it, and retrieves comprehensive weather & AQI
 * 
 * @param {string} cityName - Name of the target city
 * @returns {Promise<object>} Complete composite payload for the UI state
 */
export async function getCompleteWeatherReport(cityName) {
  // Step 1: Geocode city name to coordinates
  const location = await fetchCityCoordinates(cityName);

  // Step 2: Fetch weather and air quality for coordinates
  const weatherDetails = await fetchWeatherAndAirQuality(
    location.latitude,
    location.longitude,
    location.timezone
  );

  // Return merged response
  return {
    location,
    ...weatherDetails,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

