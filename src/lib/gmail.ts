import { google } from "googleapis";

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

export type GmailResult =
  | { ok: true; messages: GmailMessage[] }
  | { ok: false; messages: GmailMessage[]; error: string };

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

function parseHeader(
  headers: Array<{ name?: string | null; value?: string | null }>,
  name: string,
): string {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function getGmailInbox(maxMessages = 20): Promise<GmailResult> {
  if (!process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN === "REPLACE_ME") {
    return { ok: false, messages: [], error: "Google token not configured." };
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: getAuth() });

    const [listRes] = await Promise.all([
      gmail.users.messages.list({
        userId: "me",
        labelIds: ["INBOX"],
        maxResults: maxMessages,
      }),
    ]);

    const items = listRes.data.messages ?? [];

    const messages: GmailMessage[] = await Promise.all(
      items.map(async (item) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: item.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });
        const headers = msg.data.payload?.headers ?? [];
        const isUnread = (msg.data.labelIds ?? []).includes("UNREAD");
        return {
          id: item.id!,
          from: parseHeader(headers, "From"),
          subject: parseHeader(headers, "Subject") || "(No subject)",
          snippet: msg.data.snippet ?? "",
          date: parseHeader(headers, "Date"),
          isUnread,
        };
      }),
    );

    return { ok: true, messages };
  } catch (err) {
    console.warn("[gmail] Failed to fetch inbox:", err);
    return { ok: false, messages: [], error: "Failed to fetch Gmail inbox." };
  }
}
