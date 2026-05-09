import type { CalendarEvent } from "@/lib/calendar";
import type { TaskItem } from "@/lib/gtasks";
import type { WeatherData } from "@/lib/weather";

interface Props {
  calendarEvents: CalendarEvent[];
  tasks: TaskItem[];
  weather: WeatherData | null;
}

export function DailySummaryWidget({ calendarEvents, tasks, weather }: Props) {
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const nextEvent = calendarEvents.find((e) => !e.isAllDay);

  const stats: Array<{ label: string; value: string; tone?: "good" | "neutral" | "warning" }> = [
    {
      label: "Events today",
      value: calendarEvents.length === 0 ? "Free day" : String(calendarEvents.length),
      tone: calendarEvents.length === 0 ? "good" : "neutral",
    },
    {
      label: "Pending tasks",
      value: tasks.length === 0 ? "All clear" : String(tasks.length),
      tone: tasks.length === 0 ? "good" : overdueCount > 0 ? "warning" : "neutral",
    },
    ...(weather
      ? [{ label: "Weather", value: `${weather.temperature}°C ${weather.emoji}`, tone: "neutral" as const }]
      : []),
  ];

  return (
    <div className="summary-widget">
      <div className="widget-header">
        <h2>Today at a Glance</h2>
      </div>

      <div className="summary-stats">
        {stats.map((s) => (
          <div key={s.label} className="summary-stat" data-tone={s.tone ?? "neutral"}>
            <span className="summary-value">{s.value}</span>
            <span className="summary-label">{s.label}</span>
          </div>
        ))}
      </div>

      {nextEvent && (
        <p className="summary-next">
          <span className="summary-next-label">Next up</span>
          {nextEvent.startTime} — {nextEvent.title}
        </p>
      )}

      {overdueCount > 0 && (
        <p className="summary-alert" role="alert">
          {overdueCount} overdue task{overdueCount > 1 ? "s" : ""} need attention
        </p>
      )}
    </div>
  );
}
