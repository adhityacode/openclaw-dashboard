"use client";

import { useState } from "react";
import type { CalendarResult } from "@/lib/calendar";
import type { GmailResult } from "@/lib/gmail";
import type { TasksResult } from "@/lib/gtasks";
import type { WeatherResult } from "@/lib/weather";
import type { AiAdviceResult } from "@/lib/ai-advice";
import { KpiCard } from "@/components/KpiCard";
import { QuickActionButton } from "@/components/QuickActionButton";
import { TimelineItem } from "@/components/TimelineItem";
import { CalendarWidget } from "@/components/CalendarWidget";
import { GmailWidget } from "@/components/GmailWidget";
import { TasksWidget } from "@/components/TasksWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { QuickNotesWidget } from "@/components/QuickNotesWidget";
import { HabitTrackerWidget } from "@/components/HabitTrackerWidget";
import { DailySummaryWidget } from "@/components/DailySummaryWidget";
import { AiAdviceWidget } from "@/components/AiAdviceWidget";

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
  gmailResult: GmailResult;
  tasksResult: TasksResult;
  weatherResult: WeatherResult;
  aiAdviceResult: AiAdviceResult;
}

type TabId = "personal" | "openclaw";

export function DashboardTabs(props: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("personal");

  const weatherData = props.weatherResult.ok ? props.weatherResult.data : null;
  const weatherError = props.weatherResult.ok ? undefined : props.weatherResult.error;

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

          {/* Row 1: AI Advice | Daily Summary | Weather */}
          <section className="panel panel-ai-advice reveal" aria-label="AI daily advice">
            <AiAdviceWidget
              advice={props.aiAdviceResult.ok ? props.aiAdviceResult.advice : null}
              errorMessage={props.aiAdviceResult.ok ? undefined : props.aiAdviceResult.error}
            />
          </section>

          <section className="panel panel-daily-sum reveal" aria-label="Daily summary">
            <DailySummaryWidget
              calendarEvents={props.calendarResult.events}
              tasks={props.tasksResult.tasks}
              weather={weatherData}
            />
          </section>

          <section className="panel panel-weather reveal" aria-label="Weather">
            <WeatherWidget data={weatherData} errorMessage={weatherError} />
          </section>

          {/* Row 2: Calendar | Gmail | Tasks+Notes */}
          <section className="panel panel-calendar reveal" aria-label="Today's schedule">
            <CalendarWidget
              events={props.calendarResult.events}
              errorMessage={props.calendarResult.ok ? undefined : props.calendarResult.error}
            />
          </section>

          <section className="panel panel-gmail reveal" aria-label="Gmail inbox">
            <GmailWidget
              messages={props.gmailResult.messages}
              errorMessage={props.gmailResult.ok ? undefined : props.gmailResult.error}
            />
          </section>

          <div className="panel-right-col">
            <section
              className="panel panel-tasks reveal"
              style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              aria-label="Google Tasks"
            >
              <TasksWidget
                tasks={props.tasksResult.tasks}
                errorMessage={props.tasksResult.ok ? undefined : props.tasksResult.error}
              />
            </section>

            <section
              className="panel panel-notes reveal"
              style={{ flexShrink: 0 }}
              aria-label="Quick notes"
            >
              <QuickNotesWidget />
            </section>
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
          <section className="kpi-wrap" aria-label="Key performance indicators">
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

          <section className="panel panel-timeline reveal" aria-label="Activity timeline">
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
              <select id="modelSelect" name="modelSelect" defaultValue={props.activeModel}>
                {props.modelOptions.map((model) => (
                  <option key={model} value={model}>{model}</option>
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
