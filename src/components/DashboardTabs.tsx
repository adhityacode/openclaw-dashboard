"use client";

import { useState } from "react";
import type { CalendarResult } from "@/lib/calendar";
import { KpiCard } from "@/components/KpiCard";
import { QuickActionButton } from "@/components/QuickActionButton";
import { TimelineItem } from "@/components/TimelineItem";
import { CalendarWidget } from "@/components/CalendarWidget";

export interface DashboardTabsProps {
  // OpenClaw data
  activeChannelsValue: string;
  activeChannelsDelta: string;
  activeChannelsTone: "good" | "neutral" | "warning";
  pendingTasksValue: string;
  pendingTasksDelta: string;
  pendingTasksTone: "good" | "neutral" | "warning";
  gatewayUptimeValue: string;
  gatewayUptimeDelta: string;
  gatewayUptimeTone: "good" | "neutral" | "warning";
  timeline: Array<{ time: string; title: string; description: string }>;
  activeModel: string;
  modelOptions: string[];
  footerText: string;
  // Personal data
  calendarResult: CalendarResult;
}

type TabId = "personal" | "openclaw";

export function DashboardTabs(props: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("personal");

  return (
    <div className="dashboard-tabs">
      {/* ── Tab bar ─────────────────────────────────── */}
      <div className="tab-bar" role="tablist" aria-label="Dashboard views">
        <button
          role="tab"
          id="tab-personal"
          aria-controls="tabpanel-personal"
          aria-selected={activeTab === "personal"}
          className="tab-btn"
          data-active={activeTab === "personal" ? "true" : "false"}
          onClick={() => setActiveTab("personal")}
        >
          Personal Dashboard
        </button>
        <button
          role="tab"
          id="tab-openclaw"
          aria-controls="tabpanel-openclaw"
          aria-selected={activeTab === "openclaw"}
          className="tab-btn"
          data-active={activeTab === "openclaw" ? "true" : "false"}
          onClick={() => setActiveTab("openclaw")}
        >
          OpenClaw Dashboard
        </button>
      </div>

      {/* ── Personal tab panel ───────────────────────── */}
      <div
        role="tabpanel"
        id="tabpanel-personal"
        aria-labelledby="tab-personal"
        className="tab-content"
        hidden={activeTab !== "personal"}
      >
        <div className="personal-grid">
          <section
            className="panel panel-calendar reveal"
            aria-label="Today's schedule"
          >
            <CalendarWidget
              events={props.calendarResult.events}
              errorMessage={props.calendarResult.ok ? undefined : props.calendarResult.error}
            />
          </section>

          <div className="panel coming-soon-card reveal">
            <p className="eyebrow">Coming Soon</p>
            <p>
              More personal widgets — Gmail inbox, tasks, weather, and more.
            </p>
          </div>
        </div>
      </div>

      {/* ── OpenClaw tab panel ───────────────────────── */}
      <div
        role="tabpanel"
        id="tabpanel-openclaw"
        aria-labelledby="tab-openclaw"
        className="tab-content"
        hidden={activeTab !== "openclaw"}
      >
        <div className="openclaw-grid">
          <section
            className="kpi-wrap"
            aria-label="Key performance indicators"
          >
            <KpiCard
              label="Active Channels"
              value={props.activeChannelsValue}
              delta={props.activeChannelsDelta}
              tone={props.activeChannelsTone}
            />
            <KpiCard
              label="Pending Tasks"
              value={props.pendingTasksValue}
              delta={props.pendingTasksDelta}
              tone={props.pendingTasksTone}
            />
            <KpiCard
              label="Gateway Uptime"
              value={props.gatewayUptimeValue}
              delta={props.gatewayUptimeDelta}
              tone={props.gatewayUptimeTone}
            />
          </section>

          <section
            className="panel panel-timeline reveal"
            aria-label="Activity timeline"
          >
            <div className="section-head">
              <h2>Activity Timeline</h2>
              <p>Live signal trail from orchestrator and gateway services.</p>
            </div>
            <ol className="timeline-list">
              {props.timeline.map((event, index) => (
                <TimelineItem
                  key={`${index}-${event.time}-${event.title}`}
                  time={event.time}
                  title={event.title}
                  description={event.description}
                />
              ))}
            </ol>
          </section>

          <aside
            className="panel panel-side reveal"
            aria-label="Quick actions and model controls"
          >
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
              {/* Uncontrolled: model selection is display-only until a model-switching API is added */}
              <select
                id="modelSelect"
                name="modelSelect"
                defaultValue={props.activeModel}
              >
                {props.modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </aside>

          <footer className="panel panel-footer reveal">
            <p>{props.footerText}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
