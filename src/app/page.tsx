import { DashboardTabs } from "@/components/DashboardTabs";
import { getDashboardPayload } from "@/lib/openclaw";
import { getTodayEvents } from "@/lib/calendar";
import { getGmailInbox } from "@/lib/gmail";
import { getPendingTasks } from "@/lib/gtasks";
import { getWeather } from "@/lib/weather";
import { getAiAdvice } from "@/lib/ai-advice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch all data sources in parallel
  const [payload, calendarResult, gmailResult, tasksResult, weatherResult] = await Promise.all([
    getDashboardPayload(),
    getTodayEvents(),
    getGmailInbox(20),
    getPendingTasks(10),
    getWeather(),
  ]);

  // Single AI call: filters emails + generates advice simultaneously
  const aiResult = await getAiAdvice({
    calendarEvents: calendarResult.events,
    rawGmailMessages: gmailResult.messages,
    tasks: tasksResult.tasks,
    weather: weatherResult.ok ? weatherResult.data : null,
  });

  // Apply the AI's email filter to the raw messages
  const filteredMessages = gmailResult.messages.filter((m) =>
    aiResult.importantMessageIds.has(m.id)
  );

  return (
    <main className="dashboard-shell">
      <section className="dashboard-grid">
        <header className="panel panel-header reveal">
          <div>
            <p className="eyebrow">Operational Surface</p>
            <h1>OpenClaw</h1>
          </div>
          <p className="status-chip" data-tone={payload.healthTone} aria-label={payload.statusAriaLabel}>
            <span aria-hidden="true" />
            {payload.statusText}
          </p>
        </header>

        <DashboardTabs
          activeChannelsValue={payload.activeChannelsValue}
          activeChannelsDelta={payload.activeChannelsDelta}
          activeChannelsTone={payload.activeChannelsTone}
          pendingTasksValue={payload.pendingTasksValue}
          pendingTasksDelta={payload.pendingTasksDelta}
          pendingTasksTone={payload.pendingTasksTone}
          gatewayUptimeValue={payload.gatewayUptimeValue}
          gatewayUptimeDelta={payload.gatewayUptimeDelta}
          gatewayUptimeTone={payload.gatewayUptimeTone}
          timeline={payload.timeline}
          activeModel={payload.activeModel}
          modelOptions={payload.modelOptions}
          footerText={payload.footerText}
          calendarResult={calendarResult}
          gmailResult={{ ...gmailResult, messages: filteredMessages }}
          tasksResult={tasksResult}
          weatherResult={weatherResult}
          aiAdviceResult={aiResult}
        />
      </section>
    </main>
  );
}
