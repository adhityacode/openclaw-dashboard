import { google } from "googleapis";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // "09:00" or "All day"
  endTime: string;   // "10:00" or ""
  isAllDay: boolean;
  location?: string;
  colorId?: string;
}

const TZ = "Asia/Bangkok";

function formatTime(dateTimeStr: string): string {
  return new Date(dateTimeStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function todayBounds(): { timeMin: string; timeMax: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDate = formatter.format(now); // "YYYY-MM-DD"
  const timeMin = new Date(`${localDate}T00:00:00+07:00`).toISOString();
  const timeMax = new Date(`${localDate}T23:59:59+07:00`).toISOString();
  return { timeMin, timeMax };
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_REFRESH_TOKEN,
  } = process.env;

  if (!GOOGLE_REFRESH_TOKEN || GOOGLE_REFRESH_TOKEN === "REPLACE_ME") {
    console.warn(
      "[calendar] GOOGLE_REFRESH_TOKEN not set. " +
      "To get one, run the OAuth flow with the installed-app credential " +
      "(client_id from .env.local) and copy the refresh_token into .env.local."
    );
    return [];
  }

  try {
    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

    const calendar = google.calendar({ version: "v3", auth });
    const { timeMin, timeMax } = todayBounds();

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });

    const items = res.data.items ?? [];

    return items.map((item) => {
      const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
      return {
        id: item.id ?? Math.random().toString(36),
        title: item.summary ?? "(No title)",
        startTime: isAllDay ? "All day" : formatTime(item.start!.dateTime!),
        endTime: isAllDay ? "" : formatTime(item.end!.dateTime!),
        isAllDay,
        location: item.location ?? undefined,
        colorId: item.colorId ?? undefined,
      };
    });
  } catch (err) {
    console.warn("[calendar] Failed to fetch events:", err);
    return [];
  }
}
