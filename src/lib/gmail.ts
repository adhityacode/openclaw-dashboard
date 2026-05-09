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

// ── AI email filter ───────────────────────────────────────────────────────────
// Uses a small fast model — classification only, no creativity needed.
export async function filterImportantMessages(messages: GmailMessage[]): Promise<Set<string>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || messages.length === 0) return new Set(messages.map((m) => m.id));

  const list = messages
    .map((m) => `id="${m.id}" | from="${m.from}" | subject="${m.subject}" | snippet="${m.snippet.slice(0, 150)}"`)
    .join("\n");

  const prompt = `You are an email classifier. From the list below, return the IDs of HIGH-SIGNAL messages only.
High-signal: personal messages, work emails, bills, invoices, shipping updates, security alerts, calendar invites, anything requiring a human response.
Low-signal (exclude): newsletters, marketing, promotions, social notifications, automated digests, no-reply bulk mail, app notifications.

Messages:
${list}

Respond with ONLY a raw JSON array of id strings. No explanation, no markdown.
Example: ["id1","id2"]`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 256,
        temperature: 0,
      }),
    });

    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const json = await res.json();
    const raw: string = json.choices?.[0]?.message?.content?.trim() ?? "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array in response");
    const ids = JSON.parse(match[0]) as unknown[];
    return new Set(ids.filter((v): v is string => typeof v === "string"));
  } catch (err) {
    console.warn("[gmail] AI filter failed, showing all:", err);
    return new Set(messages.map((m) => m.id));
  }
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
