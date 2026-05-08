import type { WeatherData } from "@/lib/weather";

interface Props {
  data: WeatherData | null;
  errorMessage?: string;
}

export function WeatherWidget({ data, errorMessage }: Props) {
  if (!data) {
    return (
      <div className="weather-widget">
        <div className="widget-header"><h2>Weather</h2></div>
        <p className="widget-empty">{errorMessage ?? "Weather unavailable"}</p>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <div className="widget-header">
        <h2>Weather</h2>
      </div>

      <div className="weather-current">
        <span className="weather-emoji" aria-hidden="true">{data.emoji}</span>
        <div className="weather-main">
          <span className="weather-temp">{data.temperature}°C</span>
          <span className="weather-desc">{data.description}</span>
        </div>
        <div className="weather-details">
          <span>Feels {data.feelsLike}°C</span>
          <span>{data.humidity}% humidity</span>
          <span>{data.windspeed} km/h wind</span>
        </div>
      </div>

      {data.hourlyForecast.length > 0 && (
        <div className="weather-hourly" aria-label="Hourly forecast">
          {data.hourlyForecast.map((slot) => (
            <div key={slot.hour} className="weather-slot">
              <span className="slot-hour">{slot.hour}</span>
              <span className="slot-emoji" aria-hidden="true">{slot.emoji}</span>
              <span className="slot-temp">{slot.temp}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
