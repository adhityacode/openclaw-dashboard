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

// Google Calendar deep link for a specific event
function eventUrl(id: string): string {
  // Strip any suffix after the base event ID (Google appends _YYYYMMDDTHHMMSSZ for recurring)
  const base = id.split("_")[0];
  const encoded = Buffer.from(base).toString("base64").replace(/=+$/, "");
  return `https://calendar.google.com/calendar/event?eid=${encoded}`;
}

function EventItem({ event, className }: { event: CalendarEvent; className: string }) {
  return (
    <li className={className}>
      <a
        href={eventUrl(event.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="cal-event-link"
      >
        <span className="cal-time">
          {event.isAllDay
            ? <span className="cal-allday-badge">All day</span>
            : <>{event.startTime}{event.endTime && <> &ndash; {event.endTime}</>}</>
          }
        </span>
        <span className="cal-title">{event.title}</span>
      </a>
    </li>
  );
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
          <span className="cal-error" role="alert">{errorMessage}</span>
        )}
      </div>

      {events.length === 0 && !errorMessage && (
        <p className="cal-empty">No events today</p>
      )}

      <div className="cal-lists-scroll">
        {allDayEvents.length > 0 && (
          <ul className="cal-list">
            {allDayEvents.map((event) => (
              <EventItem key={event.id} event={event} className="cal-event cal-event--allday" />
            ))}
          </ul>
        )}

        {timedEvents.length > 0 && (
          <ul className="cal-list">
            {timedEvents.map((event) => (
              <EventItem key={event.id} event={event} className="cal-event" />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
