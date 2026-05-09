"use client";

import { useEffect, useRef } from "react";
import type { WeatherData, HourlySlot } from "@/lib/weather";

interface Props {
  data: WeatherData | null;
  errorMessage?: string;
}

function isRainCode(code: number): boolean {
  // WMO codes: drizzle 51-57, rain 61-67, rain showers 80-82, thunderstorm 95-99
  return (code >= 51 && code <= 57) || (code >= 61 && code <= 67) ||
         (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
}

function buildAlerts(slots: HourlySlot[]): { icon: string; text: string }[] {
  const upcoming = slots.filter((s) => !s.isCurrent);
  const alerts: { icon: string; text: string }[] = [];

  const rainSlot = upcoming.find((s) => isRainCode(s.code));
  if (rainSlot) {
    alerts.push({ icon: "🌧️", text: `Rain expected at ${rainSlot.hour}` });
  }

  const hotSlot = upcoming.reduce<HourlySlot | null>(
    (max, s) => (s.temp > (max?.temp ?? -Infinity) ? s : max), null
  );
  if (hotSlot && hotSlot.temp >= 35) {
    alerts.push({ icon: "🥵", text: `Very hot at ${hotSlot.hour} — ${hotSlot.temp}°C` });
  } else if (hotSlot && hotSlot.temp >= 30) {
    alerts.push({ icon: "☀️", text: `Hot at ${hotSlot.hour} — ${hotSlot.temp}°C` });
  }

  return alerts;
}

export function WeatherWidget({ data, errorMessage }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const container = scrollRef.current;
    const current = currentRef.current;
    if (!container || !current) return;
    const containerWidth = container.offsetWidth;
    container.scrollLeft = current.offsetLeft - containerWidth / 2 + current.offsetWidth / 2;
  }, []);

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = drag.current.scrollLeft - (e.pageX - el.offsetLeft - drag.current.startX);
  }

  function stopDrag() {
    drag.current.active = false;
    const el = scrollRef.current;
    if (!el) return;
    el.style.cursor = "grab";
    el.style.userSelect = "";
  }

  if (!data) {
    return (
      <div className="weather-widget">
        <div className="widget-header"><h2>Weather</h2></div>
        <p className="widget-empty">{errorMessage ?? "Weather unavailable"}</p>
      </div>
    );
  }

  const alerts = buildAlerts(data.hourlyForecast);

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

      {alerts.length > 0 && (
        <div className="weather-alerts">
          {alerts.map((a) => (
            <p key={a.text} className="weather-alert">
              <span aria-hidden="true">{a.icon}</span>
              {a.text}
            </p>
          ))}
        </div>
      )}

      {data.hourlyForecast.length > 0 && (
        <div className="weather-hourly-wrap">
          <div
            className="weather-hourly"
            ref={scrollRef}
            aria-label="24-hour forecast"
            style={{ cursor: "grab" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            {data.hourlyForecast.map((slot) => (
              <div
                key={slot.hour}
                className="weather-slot"
                data-current={slot.isCurrent ? "true" : "false"}
                ref={slot.isCurrent ? currentRef : undefined}
                aria-current={slot.isCurrent ? "time" : undefined}
              >
                <span className="slot-hour">{slot.hour}</span>
                <span className="slot-emoji" aria-hidden="true">{slot.emoji}</span>
                <span className="slot-temp">{slot.temp}°C</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
