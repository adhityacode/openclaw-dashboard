// Daily advice — uses a capable model focused purely on actionable briefing.
// Email filtering is handled separately in gmail.ts.
// Requires GROQ_API_KEY in .env.local.

import type { CalendarEvent } from "@/lib/calendar";
import type { GmailMessage } from "@/lib/gmail";
import type { TaskItem } from "@/lib/gtasks";
import type { WeatherData } from "@/lib/weather";

export interface AiAdviceContext {
  calendarEvents: CalendarEvent[];
  gmailMessages: GmailMessage[];   // already filtered — only important ones
  tasks: TaskItem[];
  weather: WeatherData | null;
}

export type AiAdviceResult =
  | { ok: true; advice: string }
  | { ok: false; error: string };

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(ctx: AiAdviceContext): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  });
  const dateStr = now.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Bangkok",
  });

  const weatherStr = ctx.weather
    ? `${ctx.weather.description}, ${ctx.weather.temperature}°C (feels like ${ctx.weather.feelsLike}°C), humidity ${ctx.weather.humidity}%, wind ${ctx.weather.windspeed} km/h`
    : "unavailable";

  const calendarStr = ctx.calendarEvents.length > 0
    ? ctx.calendarEvents.map((e) => {
        const time = e.isAllDay ? "All day" : `${e.startTime}–${e.endTime}`;
        return `  • [${time}] ${e.title}${e.location ? ` @ ${e.location}` : ""}`;
      }).join("\n")
    : "  • No events today";

  const tasksStr = ctx.tasks.length > 0
    ? ctx.tasks.map((t) => {
        const flag = t.isOverdue ? " ⚠ OVERDUE" : t.due ? ` (due ${t.due.slice(0, 10)})` : "";
        return `  • ${t.title}${flag} [${t.listTitle}]`;
      }).join("\n")
    : "  • No pending tasks";

  const emailStr = ctx.gmailMessages.length > 0
    ? ctx.gmailMessages.map((m) =>
        `  • from="${m.from}" | subject="${m.subject}" | snippet="${m.snippet.slice(0, 150)}"`
      ).join("\n")
    : "  • No important emails";

  return `You are a sharp personal assistant. Current time: ${timeStr}, ${dateStr}.

Write exactly 3–5 bullet points as a daily playbook for the user.

Rules:
- Ground every bullet in the actual data — no generic advice.
- Lead with the most time-sensitive item (overdue tasks, imminent meetings, weather impact).
- If an important email relates to a task or meeting, connect them explicitly.
- Be specific: name the event, task, or sender. Each bullet ≤ 20 words.
- Tone: warm, direct, no fluff.
- Use • as the bullet character. No headers, no markdown bold.

<weather>
${weatherStr}
</weather>

<calendar>
${calendarStr}
</calendar>

<tasks>
${tasksStr}
</tasks>

<important_emails>
${emailStr}
</important_emails>

Respond with ONLY the bullet list. No preamble, no JSON, no explanation.`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main export ───────────────────────────────────────────────────────────────

export async function getAiAdvice(ctx: AiAdviceContext): Promise<AiAdviceResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, error: "GROQ_API_KEY not configured." };

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
          max_tokens: 400,
          temperature: 0.2,
        }),
        next: { revalidate: 0 },
      });

      if (res.status === 429 && attempt < 2) continue;
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = await res.json();
      const advice: string = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!advice || !advice.includes("•")) throw new Error("Missing or malformed advice");

      return { ok: true, advice };
    } catch (err) {
      if (attempt === 2) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[ai-advice] Final failure:", err);
        return { ok: false, error: `AI advice unavailable: ${msg}` };
      }
    }
  }

  return { ok: false, error: "AI advice unavailable." };
}
