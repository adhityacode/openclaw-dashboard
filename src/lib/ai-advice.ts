// Single Groq call that does two jobs at once:
//   1. Filters raw inbox messages down to important ones (returns kept IDs)
//   2. Generates daily advice bullets based on all context
//
// Requires GROQ_API_KEY in .env.local.

import type { CalendarEvent } from "@/lib/calendar";
import type { GmailMessage } from "@/lib/gmail";
import type { TaskItem } from "@/lib/gtasks";
import type { WeatherData } from "@/lib/weather";

export interface AiAdviceContext {
  calendarEvents: CalendarEvent[];
  rawGmailMessages: GmailMessage[];   // unfiltered — AI decides what's important
  tasks: TaskItem[];
  weather: WeatherData | null;
}

export type AiAdviceResult =
  | { ok: true; advice: string; importantMessageIds: Set<string> }
  | { ok: false; error: string; importantMessageIds: Set<string> };

function buildPrompt(ctx: AiAdviceContext): string {
  const lines: string[] = [];

  lines.push(
    "You are a personal assistant. You will receive the user's daily context and do TWO things:\n" +
    "1. Filter the inbox: from the email list, return the IDs of genuinely important messages " +
    "(personal, work, bills, shipping, security alerts, anything requiring action). " +
    "Exclude newsletters, marketing, promotions, social notifications, automated digests, no-reply bulk mail, spam.\n" +
    "2. Write 3–5 short, actionable advice bullets to help the user navigate their day. " +
    "Be specific, practical, and warm. Reference the emails, tasks, and calendar where relevant.\n"
  );

  if (ctx.weather) {
    lines.push(`Weather: ${ctx.weather.description}, ${ctx.weather.temperature}°C ` +
      `(feels like ${ctx.weather.feelsLike}°C), humidity ${ctx.weather.humidity}%, wind ${ctx.weather.windspeed} km/h.`);
  }

  if (ctx.calendarEvents.length > 0) {
    lines.push(`\nCalendar (${ctx.calendarEvents.length} event(s) today):`);
    for (const e of ctx.calendarEvents) {
      const time = e.isAllDay ? "All day" : `${e.startTime}–${e.endTime}`;
      lines.push(`  - ${time}: ${e.title}${e.location ? ` @ ${e.location}` : ""}`);
    }
  } else {
    lines.push("\nCalendar: No events today.");
  }

  if (ctx.tasks.length > 0) {
    const overdue = ctx.tasks.filter((t) => t.isOverdue);
    const upcoming = ctx.tasks.filter((t) => !t.isOverdue).slice(0, 5);
    lines.push(`\nTasks (${ctx.tasks.length} pending, ${overdue.length} overdue):`);
    for (const t of [...overdue, ...upcoming]) {
      const tag = t.isOverdue ? " [OVERDUE]" : t.due ? ` (due ${t.due.slice(0, 10)})` : "";
      lines.push(`  - ${t.title}${tag} [${t.listTitle}]`);
    }
  } else {
    lines.push("\nTasks: No pending tasks.");
  }

  if (ctx.rawGmailMessages.length > 0) {
    lines.push(`\nInbox (${ctx.rawGmailMessages.length} messages — filter these):`);
    for (const m of ctx.rawGmailMessages) {
      lines.push(`  - id=${m.id} | from=${m.from} | subject=${m.subject} | snippet=${m.snippet.slice(0, 100)}`);
    }
  } else {
    lines.push("\nInbox: Empty.");
  }

  lines.push(`
Respond with ONLY valid JSON in this exact shape, no markdown, no explanation:
{
  "importantIds": ["id1", "id2"],
  "advice": "• bullet one\\n• bullet two\\n• bullet three"
}`);

  return lines.join("\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getAiAdvice(ctx: AiAdviceContext): Promise<AiAdviceResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const fallbackIds = new Set(ctx.rawGmailMessages.map((m) => m.id));

  if (!apiKey) {
    return { ok: false, error: "GROQ_API_KEY not configured.", importantMessageIds: fallbackIds };
  }

  const prompt = buildPrompt(ctx);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(attempt * 2000);

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 600,
          temperature: 0.7,
        }),
        next: { revalidate: 0 },
      });

      if (res.status === 429 && attempt < 2) continue;
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = await res.json();
      const raw: string = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!raw) throw new Error("Empty response from Groq");

      // Extract JSON even if model wraps it in backticks
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object in response");

      const parsed = JSON.parse(match[0]) as { importantIds?: unknown; advice?: unknown };

      const importantIds = Array.isArray(parsed.importantIds)
        ? new Set(parsed.importantIds.filter((v): v is string => typeof v === "string"))
        : fallbackIds;

      const advice = typeof parsed.advice === "string" && parsed.advice.trim()
        ? parsed.advice.trim()
        : null;

      if (!advice) throw new Error("Missing advice in response");

      return { ok: true, advice, importantMessageIds: importantIds };
    } catch (err) {
      if (attempt === 2) {
        console.warn("[ai-advice] Failed:", err);
        return { ok: false, error: "AI advice unavailable.", importantMessageIds: fallbackIds };
      }
    }
  }

  return { ok: false, error: "AI advice unavailable.", importantMessageIds: fallbackIds };
}
