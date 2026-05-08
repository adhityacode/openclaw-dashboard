import type { CalendarEvent } from "@/lib/calendar";

interface Props {
  events: CalendarEvent[];
  errorMessage?: string;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
}

export function CalendarWidget({ events, errorMessage }: Props) {
  const allDayEvents = events.filter((e) => e.isAllDay);
  const timedEvents = events.filter((e) => !e.isAllDay);

  return (
    <div className="cal-widget">
      <div className="cal-header">
        <h2>Today&apos;s Schedule</h2>
        <span className="cal-date">{todayLabel()}</span>
        {errorMessage && (
          <span className="cal-error" role="alert">
            {errorMessage}
          </span>
        )}
      </div>

      {events.length === 0 && !errorMessage && (
        <p className="cal-empty">No events today</p>
      )}

      {allDayEvents.length > 0 && (
        <ul className="cal-list">
          {allDayEvents.map((event) => (
            <li key={event.id} className="cal-event cal-event--allday">
              <span className="cal-time">
                <span className="cal-allday-badge">All day</span>
              </span>
              <span className="cal-title">{event.title}</span>
            </li>
          ))}
        </ul>
      )}

      {timedEvents.length > 0 && (
        <ul className="cal-list">
          {timedEvents.map((event) => (
            <li key={event.id} className="cal-event">
              <span className="cal-time">
                {event.startTime}
                {event.endTime && <> &ndash; {event.endTime}</>}
              </span>
              <span className="cal-title">{event.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
