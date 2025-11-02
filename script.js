// Weather Dashboard client script
// Replace the API key below with your OpenWeatherMap API key
const API_KEY = 'YOUR_API_KEY_HERE';

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

async function fetchWeather(city) {
  try {
    const cw = await fetchCurrent(city);
    renderCurrent(cw);

    const fc = await fetchForecast(city);
    renderForecast(fc);
  } catch (err) {
    alert('Could not fetch weather. Check console for details.');
    console.error(err);
  }
}

async function fetchCurrent(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Current weather fetch failed');
  return res.json();
}

async function fetchForecast(city) {
  // 5 day / 3 hour forecast endpoint
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Forecast fetch failed');
  const data = await res.json();
  // Group into daily summaries
  return summarizeDailyForecast(data.list);
}

function summarizeDailyForecast(list) {
  // list: array of 3-hour forecasts. Group by date (YYYY-MM-DD)
  const days = {};
  list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!days[date]) days[date] = [];
    days[date].push(item);
  });
  // Take a representative item for each day (e.g., midday or the first)
  const summaries = Object.keys(days).map(date => {
    const items = days[date];
    // Try to find item close to 12:00
    let rep = items.find(i => i.dt_txt.includes('12:00:00')) || items[Math.floor(items.length/2)];
    const temps = items.map(i => i.main.temp);
    const avgTemp = (temps.reduce((a,b)=>a+b,0))/temps.length;
    return {
      date,
      icon: rep.weather[0].icon,
      desc: rep.weather[0].description,
      temp: Math.round(avgTemp),
    };
  });
  // Return next 5 entries (including today)
  return summaries.slice(0,5);
}

function renderCurrent(data) {
  EL.currentSection.classList.remove('hidden');
  EL.currentCity.textContent = `${data.name}, ${data.sys?.country || ''}`;
  EL.currentTemp.textContent = `${Math.round(data.main.temp)}°C`;
  EL.currentDesc.textContent = capitalize(data.weather[0].description);
  EL.currentDetails.innerHTML = '';
  const details = [
    ['Feels like', `${Math.round(data.main.feels_like)}°C`],
    ['Humidity', `${data.main.humidity}%`],
    ['Wind', `${Math.round(data.wind.speed)} m/s`],
  ];
  details.forEach(([k,v]) => {
    const li = document.createElement('li');
    li.textContent = `${k}: ${v}`;
    EL.currentDetails.appendChild(li);
  });
}

function renderForecast(list) {
  EL.forecastSection.classList.remove('hidden');
  EL.forecastCards.innerHTML = '';
  list.forEach(day => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="small">${formatDateShort(day.date)}</div>
      <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.desc}" width="60" height="60" />
      <div class="big">${day.temp}°C</div>
      <div class="small">${capitalize(day.desc)}</div>
    `;
    EL.forecastCards.appendChild(card);
  });
}

function capitalize(s){ return s && s[0].toUpperCase() + s.slice(1) }

function formatDateShort(isoDate){
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { weekday: 'short', month:'short', day:'numeric' });
}