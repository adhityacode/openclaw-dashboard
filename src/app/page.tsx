import { KpiCard } from "@/components/KpiCard";
import { QuickActionButton } from "@/components/QuickActionButton";
import { TimelineItem } from "@/components/TimelineItem";
import { getDashboardPayload } from "@/lib/openclaw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const payload = await getDashboardPayload();

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

        <section className="kpi-wrap" aria-label="Key performance indicators">
          <KpiCard
            label="Active Channels"
            value={payload.activeChannelsValue}
            delta={payload.activeChannelsDelta}
            tone={payload.activeChannelsTone}
          />
          <KpiCard
            label="Pending Tasks"
            value={payload.pendingTasksValue}
            delta={payload.pendingTasksDelta}
            tone={payload.pendingTasksTone}
          />
          <KpiCard
            label="Gateway Uptime"
            value={payload.gatewayUptimeValue}
            delta={payload.gatewayUptimeDelta}
            tone={payload.gatewayUptimeTone}
          />
        </section>

        <section className="panel panel-timeline reveal" aria-label="Activity timeline">
          <div className="section-head">
            <h2>Activity Timeline</h2>
            <p>Live signal trail from orchestrator and gateway services.</p>
          </div>
          <ol className="timeline-list">
            {payload.timeline.map((event) => (
              <TimelineItem
                key={`${event.time}-${event.title}`}
                time={event.time}
                title={event.title}
                description={event.description}
              />
            ))}
          </ol>
        </section>

        <aside className="panel panel-side reveal" aria-label="Quick actions and model controls">
          <div className="section-head">
            <h2>Quick Actions</h2>
            <p>Immediate controls for on-call response.</p>
          </div>
          <div className="quick-actions">
            <QuickActionButton label="Run Diagnostics" />
            <QuickActionButton label="Sync Gateways" />
            <QuickActionButton label="Create Incident" />
          </div>

          <div className="model-block">
            <label htmlFor="modelSelect">Active Model</label>
            <select id="modelSelect" name="modelSelect" defaultValue={payload.activeModel}>
              {payload.modelOptions.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <footer className="panel panel-footer reveal">
          <p>{payload.footerText}</p>
        </footer>
      </section>
    </main>
  );
}
