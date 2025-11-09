// Weather Dashboard client script using National Weather Service API
// No API key needed! But we need a User-Agent header

const USER_AGENT = 'WeatherDashboard/1.0 (kshitij.gupta@live.com)'; // Replace with your contact info

const EL = {
  form: document.getElementById('search-form'),
  input: document.getElementById('city-input'),
  currentSection: document.getElementById('current-weather'),
  currentCity: document.getElementById('current-city'),
  currentTemp: document.getElementById('current-temp'),
  currentDesc: document.getElementById('current-desc'),
  currentDetails: document.getElementById('current-details'),
  forecastSection: document.getElementById('forecast'),
  forecastCards: document.getElementById('forecast-cards'),
};

EL.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = EL.input.value.trim();
  if (!city) return;
  fetchWeather(city);
});

// Add event listener for location button
document.getElementById('location-btn').addEventListener('click', async () => {
  const btn = document.getElementById('location-btn');
  
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }

  // Add loading state
  btn.classList.add('loading');
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
      } catch (err) {
        alert('Could not fetch weather for your location. ' + err.message);
        console.error(err);
      } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    },
    (error) => {
      btn.classList.remove('loading');
      btn.disabled = false;
      
      let message = 'Could not get your location. ';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          message += 'Please allow location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          message += 'Location information unavailable.';
          break;
        case error.TIMEOUT:
          message += 'Location request timed out.';
          break;
        default:
          message += 'An unknown error occurred.';
      }
      alert(message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
});

// New function to fetch weather directly from coordinates
async function fetchWeatherByCoords(lat, lon) {
  try {
    // Get city name from coordinates for display
    const locationName = await reverseGeocode(lat, lon);
    
    // Get NWS grid info from coordinates
    const gridInfo = await fetchGridInfo(lat, lon);
    
    // Fetch forecast data
    const forecast = await fetchForecast(gridInfo);
    
    renderCurrent(forecast, locationName, { lat, lon });
    renderForecast(forecast.properties.periods);
    
    // Optional: Update input field with location name
    EL.input.value = locationName;
  } catch (err) {
    throw err;
  }
}

// New function for reverse geocoding (coords to city name)
async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  
  // Extract city and state
  const city = data.address.city || data.address.town || data.address.village || data.address.county;
  const state = data.address.state;
  return state ? `${city}, ${state}` : city || 'Your Location';
}

async function fetchWeather(city) {
  try {
    // Step 1: Geocode the city to get lat/lon
    const coords = await geocodeCity(city);
    
    // Step 2: Get NWS grid info from coordinates
    const gridInfo = await fetchGridInfo(coords.lat, coords.lon);
    
    // Step 3: Fetch forecast data
    const forecast = await fetchForecast(gridInfo);
    
    renderCurrent(forecast, city, coords);
    renderForecast(forecast.properties.periods);
  } catch (err) {
    alert('Could not fetch weather. ' + err.message);
    console.error(err);
  }
}

// Use a free geocoding service to convert city name to coordinates
async function geocodeCity(city) {
  // Using Nominatim (OpenStreetMap's geocoder - free, no API key)
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)},USA&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data || data.length === 0) {
    throw new Error('City not found. Try adding state (e.g., "Seattle, WA")');
  }
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name
  };
}

// Get NWS grid information from coordinates
async function fetchGridInfo(lat, lon) {
  const url = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Location outside US. NWS API only covers US locations.');
    }
    throw new Error('Failed to get grid info');
  }
  const data = await res.json();
  return data.properties;
}

// Fetch forecast from NWS
async function fetchForecast(gridInfo) {
  const url = gridInfo.forecast;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) throw new Error('Forecast fetch failed');
  return res.json();
}

function renderCurrent(forecast, cityName, coords) {
  EL.currentSection.classList.remove('hidden');
  
  const current = forecast.properties.periods[0];
  
  EL.currentCity.textContent = cityName;
  EL.currentTemp.textContent = `${current.temperature}°${current.temperatureUnit}`;
  EL.currentDesc.textContent = current.shortForecast;
  
  EL.currentDetails.innerHTML = '';
  const details = [
    ['Conditions', current.detailedForecast],
    ['Wind', current.windSpeed + ' ' + current.windDirection],
    ['Period', current.name],
  ];
  details.forEach(([k,v]) => {
    const li = document.createElement('li');
    li.textContent = `${k}: ${v}`;
    EL.currentDetails.appendChild(li);
  });
}

function renderForecast(periods) {
  EL.forecastSection.classList.remove('hidden');
  EL.forecastCards.innerHTML = '';
  
  // NWS returns 12-hour periods, take up to 10 periods (5 days)
  const forecastPeriods = periods.slice(0, 10);
  
  forecastPeriods.forEach(period => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="small">${period.name}</div>
      <img src="${period.icon}" alt="${period.shortForecast}" width="60" height="60" />
      <div class="big">${period.temperature}°${period.temperatureUnit}</div>
      <div class="small">${period.shortForecast}</div>
    `;
    EL.forecastCards.appendChild(card);
  });
}