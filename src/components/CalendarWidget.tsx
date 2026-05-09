import type { CalendarEvent } from "@/lib/calendar";

interface Props {
  events: CalendarEvent[];
  errorMessage?: string;
}

const TZ = "Asia/Bangkok";

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }); // "Friday, 9 May"
}

function dayLabel(dateStr: string): string {
  // dateStr = "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }); // "Saturday, 10 May"
}

// Google Calendar color palette (colorId → hex)
const GCAL_COLORS: Record<string, string> = {
  "1": "#7986cb", "2": "#33b679", "3": "#8e24aa", "4": "#e67c73",
  "5": "#f6c026", "6": "#f5511d", "7": "#039be5", "8": "#616161",
  "9": "#3f51b5", "10": "#0b8043", "11": "#d60000",
};
const DEFAULT_COLOR = "#039be5";

function eventColor(colorId?: string): string {
  return colorId ? (GCAL_COLORS[colorId] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
}

// Google Calendar deep link
function eventUrl(id: string): string {
  const base = id.split("_")[0];
  const encoded = Buffer.from(base).toString("base64").replace(/=+$/, "");
  return `https://calendar.google.com/calendar/event?eid=${encoded}`;
}

export function CalendarWidget({ events, errorMessage }: Props) {
  // Group events by date
  const grouped = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const key = ev.date || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="cal-widget">
      <div className="cal-header">
        <h2 className="cal-today-label">{todayLabel()}</h2>
        {errorMessage && (
          <span className="cal-error" role="alert">{errorMessage}</span>
        )}
      </div>

      {events.length === 0 && !errorMessage && (
        <p className="cal-empty">No events in the next 7 days</p>
      )}

      <div className="cal-lists-scroll">
        {sortedDates.map((dateStr) => (
          <div key={dateStr} className="cal-day-group">
            <p className="cal-day-label">{dayLabel(dateStr)}</p>
            <ul className="cal-list">
              {grouped[dateStr].map((event) => (
                <li key={event.id} className="cal-event" style={{ borderLeftColor: eventColor(event.colorId) }}>
                  <a href={eventUrl(event.id)} target="_blank" rel="noopener noreferrer" className="cal-event-link">
                    <span className="cal-time">
                      {event.isAllDay
                        ? <span className="cal-allday-badge">All day</span>
                        : <>{event.startTime}{event.endTime && <> &ndash; {event.endTime}</>}</>
                      }
                    </span>
                    <span className="cal-title">{event.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
