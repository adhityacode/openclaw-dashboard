import { DashboardTabs } from "@/components/DashboardTabs";
import { getDashboardPayload } from "@/lib/openclaw";
import { getTodayEvents } from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [payload, calendarResult] = await Promise.all([
    getDashboardPayload(),
    getTodayEvents(),
  ]);

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
        />
      </section>
    </main>
  );
}
