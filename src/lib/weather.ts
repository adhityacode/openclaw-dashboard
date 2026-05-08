// Uses Open-Meteo (https://open-meteo.com/) — free, no API key required.
// Coordinates default to Bangkok; override via env vars WEATHER_LAT / WEATHER_LON.

export interface WeatherData {
  temperature: number;       // °C current
  feelsLike: number;
  humidity: number;          // %
  windspeed: number;         // km/h
  weatherCode: number;       // WMO code
  description: string;
  emoji: string;
  hourlyForecast: HourlySlot[];
}

export interface HourlySlot {
  hour: string;   // "09:00"
  temp: number;
  emoji: string;
}

export type WeatherResult =
  | { ok: true; data: WeatherData }
  | { ok: false; error: string };

// WMO Weather interpretation codes → human label + emoji
function interpretCode(code: number): { description: string; emoji: string } {
  if (code === 0) return { description: "Clear sky", emoji: "☀️" };
  if (code <= 2) return { description: "Partly cloudy", emoji: "⛅" };
  if (code === 3) return { description: "Overcast", emoji: "☁️" };
  if (code <= 49) return { description: "Foggy", emoji: "🌫️" };
  if (code <= 59) return { description: "Drizzle", emoji: "🌦️" };
  if (code <= 69) return { description: "Rain", emoji: "🌧️" };
  if (code <= 79) return { description: "Snow", emoji: "❄️" };
  if (code <= 84) return { description: "Rain showers", emoji: "🌧️" };
  if (code <= 94) return { description: "Thunderstorm", emoji: "⛈️" };
  return { description: "Severe storm", emoji: "🌩️" };
}

function formatHour(isoString: string, tz: string): string {
  return new Date(isoString).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

export async function getWeather(): Promise<WeatherResult> {
  const lat = process.env.WEATHER_LAT ?? "13.7563";   // Bangkok default
  const lon = process.env.WEATHER_LON ?? "100.5018";
  const tz = process.env.WEATHER_TZ ?? "Asia/Bangkok";

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,weather_code` +
    `&timezone=${encodeURIComponent(tz)}` +
    `&forecast_days=1`;

  try {
    const res = await fetch(url, { next: { revalidate: 900 } }); // cache 15 min
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const cur = json.current;
    const { description, emoji } = interpretCode(cur.weather_code);

    // Build next 6 hourly slots from now
    const nowHour = new Date().getHours();
    const hourlyTimes: string[] = json.hourly.time ?? [];
    const hourlyTemps: number[] = json.hourly.temperature_2m ?? [];
    const hourlyCodes: number[] = json.hourly.weather_code ?? [];

    const hourlyForecast: HourlySlot[] = [];
    for (let i = 0; i < hourlyTimes.length && hourlyForecast.length < 6; i++) {
      const slotHour = new Date(hourlyTimes[i]).getHours();
      if (slotHour < nowHour) continue;
      hourlyForecast.push({
        hour: formatHour(hourlyTimes[i], tz),
        temp: Math.round(hourlyTemps[i]),
        emoji: interpretCode(hourlyCodes[i]).emoji,
      });
    }

    return {
      ok: true,
      data: {
        temperature: Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature),
        humidity: cur.relative_humidity_2m,
        windspeed: Math.round(cur.wind_speed_10m),
        weatherCode: cur.weather_code,
        description,
        emoji,
        hourlyForecast,
      },
    };
  } catch (err) {
    console.warn("[weather] Failed to fetch:", err);
    return { ok: false, error: "Weather data unavailable." };
  }
}
