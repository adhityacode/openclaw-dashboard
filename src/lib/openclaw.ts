import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";

type JsonObject = Record<string, unknown>;

type HealthTone = "good" | "neutral" | "warning";

type ExecResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  capturedAt: number;
};

type CacheKey = "health" | "tasks" | "sessions" | "config";

type LastKnownGoodCacheEntry = {
  data: unknown;
  capturedAt: number;
  cachedAt: number;
};

type ResolvedExecResult = ExecResult & {
  stale: boolean;
  staleAgeMs?: number;
};

export interface DashboardTimelineItem {
  time: string;
  title: string;
  description: string;
}

export interface DashboardPayload {
  statusText: string;
  healthTone: HealthTone;
  statusAriaLabel: string;
  activeChannelsValue: string;
  activeChannelsDelta: string;
  activeChannelsTone: "good" | "neutral" | "warning";
  pendingTasksValue: string;
  pendingTasksDelta: string;
  pendingTasksTone: "good" | "neutral" | "warning";
  gatewayUptimeValue: string;
  gatewayUptimeDelta: string;
  gatewayUptimeTone: "good" | "neutral" | "warning";
  timeline: DashboardTimelineItem[];
  modelOptions: string[];
  activeModel: string;
  footerText: string;
}

const OPENCLAW_CLI_PATH = "C:\\nvm4w\\nodejs\\node_modules\\openclaw\\openclaw.mjs";
const OPENCLAW_HEALTH_TIMEOUT_MS = 8000;
const OPENCLAW_TASKS_TIMEOUT_MS = 5000;
const OPENCLAW_SESSIONS_TIMEOUT_MS = 3500;
const OPENCLAW_SESSIONS_LIMIT = 5;
const MAX_TIMELINE_ENTRIES = 6;
const LAST_KNOWN_GOOD_TTL_MS = 3 * 60_000;

const lastKnownGoodCache: Partial<Record<CacheKey, LastKnownGoodCacheEntry>> = {};

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonObject | undefined {
  return isRecord(value) ? value : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function pickString(obj: JsonObject | undefined, keys: string[]): string | undefined {
  if (!obj) {
    return undefined;
  }

  for (const key of keys) {
    const value = asString(obj[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function toTimestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  if (value > 1_000_000_000_000) {
    return value;
  }

  if (value > 1_000_000_000) {
    return value * 1000;
  }

  return undefined;
}

function formatUtcTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(timestamp)) + " UTC";
}

function formatDurationSince(timestamp: number, now: number): string {
  const deltaMs = Math.max(0, now - timestamp);
  const totalMinutes = Math.floor(deltaMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function parseJsonOutput(rawOutput: string): { data?: unknown; error?: string } {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return { error: "empty command output" };
  }

  const parseCandidates: string[] = [trimmed];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    parseCandidates.push(trimmed.slice(start, end + 1));
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    parseCandidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of parseCandidates) {
    try {
      return { data: JSON.parse(candidate) };
    } catch {
      // Try the next candidate.
    }
  }

  return { error: "invalid JSON output" };
}

function getCommandTimeoutMs(command: "health" | "tasks" | "sessions"): number {
  switch (command) {
    case "health":
      return OPENCLAW_HEALTH_TIMEOUT_MS;
    case "tasks":
      return OPENCLAW_TASKS_TIMEOUT_MS;
    case "sessions":
      return OPENCLAW_SESSIONS_TIMEOUT_MS;
  }
}

function updateLastKnownGoodCache(key: CacheKey, result: ExecResult): void {
  if (!result.ok || result.data === undefined) {
    return;
  }

  lastKnownGoodCache[key] = {
    data: result.data,
    capturedAt: result.capturedAt,
    cachedAt: Date.now(),
  };
}

function resolveWithLastKnownGood(key: CacheKey, result: ExecResult, now: number): ResolvedExecResult {
  if (result.ok) {
    updateLastKnownGoodCache(key, result);
    return {
      ...result,
      stale: false,
    };
  }

  const cachedEntry = lastKnownGoodCache[key];
  if (!cachedEntry) {
    return {
      ...result,
      stale: false,
    };
  }

  const staleAgeMs = now - cachedEntry.cachedAt;
  if (staleAgeMs > LAST_KNOWN_GOOD_TTL_MS) {
    return {
      ...result,
      stale: false,
    };
  }

  return {
    ok: true,
    data: cachedEntry.data,
    error: result.error,
    capturedAt: cachedEntry.capturedAt,
    stale: true,
    staleAgeMs,
  };
}

function formatStaleAge(ageMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(ageMs / 60_000));
  if (totalMinutes < 1) {
    return "under 1 minute";
  }

  if (totalMinutes === 1) {
    return "1 minute";
  }

  return `${totalMinutes} minutes`;
}

async function runOpenClawJson(
  command: "health" | "tasks" | "sessions",
  args: string[] = [],
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const capturedAt = Date.now();
    const timeoutMs = getCommandTimeoutMs(command);

    execFile(
      "node",
      [OPENCLAW_CLI_PATH, command, "--json", ...args],
      {
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          const timeoutNote = (error as { killed?: boolean }).killed
            ? ` timed out after ${timeoutMs}ms`
            : "";
          resolve({
            ok: false,
            error: `${command} command failed${timeoutNote}`,
            capturedAt,
          });
          return;
        }

        const parsed = parseJsonOutput(`${stdout}\n${stderr}`);
        if (!parsed.data) {
          resolve({
            ok: false,
            error: `${command} command returned ${parsed.error ?? "unparseable output"}`,
            capturedAt,
          });
          return;
        }

        resolve({
          ok: true,
          data: parsed.data,
          capturedAt,
        });
      },
    );
  });
}

async function readOpenClawConfig(): Promise<ExecResult> {
  const capturedAt = Date.now();
  const userProfile = asString(process.env.USERPROFILE);
  if (!userProfile) {
    return {
      ok: false,
      error: "OpenClaw config path unavailable",
      capturedAt,
    };
  }

  try {
    const rawConfig = await readFile(`${userProfile}\\.openclaw\\openclaw.json`, "utf8");
    const parsed = parseJsonOutput(rawConfig);
    if (!parsed.data) {
      return {
        ok: false,
        error: "OpenClaw config unreadable",
        capturedAt,
      };
    }

    return {
      ok: true,
      data: parsed.data,
      capturedAt,
    };
  } catch {
    return {
      ok: false,
      error: "OpenClaw config unavailable",
      capturedAt,
    };
  }
}

function buildTimeline(health: JsonObject | undefined, now: number): DashboardTimelineItem[] {
  const events: Array<{ ts: number; title: string; description: string }> = [];

  const healthCapturedAt = toTimestamp(health?.ts);
  if (healthCapturedAt) {
    const durationMs = asNumber(health?.durationMs);
    events.push({
      ts: healthCapturedAt,
      title: "Health probe completed",
      description: durationMs !== undefined ? `Probe completed in ${durationMs}ms.` : "Health probe completed successfully.",
    });
  }

  const eventLoop = asRecord(health?.eventLoop);
  const eventLoopDegraded = asBoolean(eventLoop?.degraded);
  if (eventLoopDegraded === true && healthCapturedAt) {
    events.push({
      ts: healthCapturedAt,
      title: "Event loop degradation detected",
      description: "Health check reported degraded event loop performance.",
    });
  }

  const healthSessionsObject = asRecord(health?.sessions);
  const healthRecentSessions = asArray(healthSessionsObject?.recent) ?? asArray(health?.sessions);
  if (healthRecentSessions) {
    for (const session of healthRecentSessions) {
      const sessionRecord = asRecord(session);
      const updatedAt = toTimestamp(sessionRecord?.updatedAt);
      if (!updatedAt) {
        continue;
      }

      const sessionKey = pickString(sessionRecord, ["key", "sessionId", "id"]);
      events.push({
        ts: updatedAt,
        title: "Health session observed",
        description: sessionKey ? `Session ${sessionKey} reported in health data.` : "A session was reported in health data.",
      });
    }
  }

  const channels = collectChannelObjects(health);
  for (const channel of channels) {
    const channelLabel = pickString(channel, ["name", "id", "key", "channelId", "transport"]);
    const startAt = toTimestamp(channel.lastStartAt);
    if (startAt) {
      events.push({
        ts: startAt,
        title: "Channel started",
        description: channelLabel ? `Channel ${channelLabel} started.` : "A channel started.",
      });
    }

    const connectedAt = toTimestamp(channel.lastConnectedAt);
    if (connectedAt) {
      events.push({
        ts: connectedAt,
        title: "Channel connected",
        description: channelLabel ? `Channel ${channelLabel} connected.` : "A channel connected.",
      });
    }

    const transportActivityAt = toTimestamp(channel.lastTransportActivityAt);
    if (transportActivityAt) {
      events.push({
        ts: transportActivityAt,
        title: "Channel transport activity",
        description: channelLabel
          ? `Channel ${channelLabel} recorded transport activity.`
          : "A channel recorded transport activity.",
      });
    }
  }

  events.sort((a, b) => b.ts - a.ts);

  const deduped = new Set<string>();
  const timeline: DashboardTimelineItem[] = [];
  for (const event of events) {
    const key = `${event.ts}:${event.title}`;
    if (deduped.has(key)) {
      continue;
    }
    deduped.add(key);

    timeline.push({
      time: formatUtcTime(event.ts),
      title: event.title,
      description: event.description,
    });

    if (timeline.length >= MAX_TIMELINE_ENTRIES) {
      break;
    }
  }

  if (timeline.length === 0) {
    timeline.push({
      time: formatUtcTime(now),
      title: "Live timeline unavailable",
      description: "No timestamped entries were available from health data.",
    });
  }

  return timeline;
}

function collectChannelObjects(health: JsonObject | undefined): JsonObject[] {
  const channels: JsonObject[] = [];

  const healthChannels = asRecord(health?.channels);
  if (healthChannels) {
    for (const value of Object.values(healthChannels)) {
      const channel = asRecord(value);
      if (channel) {
        channels.push(channel);
      }
    }
  }

  return channels;
}

function extractListRecords(data: unknown, candidateKeys: string[]): JsonObject[] {
  const arraysToInspect: unknown[][] = [];

  if (Array.isArray(data)) {
    arraysToInspect.push(data);
  }

  const root = asRecord(data);
  if (root) {
    for (const key of candidateKeys) {
      const direct = asArray(root[key]);
      if (direct) {
        arraysToInspect.push(direct);
      }

      const nestedRecord = asRecord(root[key]);
      if (nestedRecord) {
        for (const nestedKey of candidateKeys) {
          const nestedArray = asArray(nestedRecord[nestedKey]);
          if (nestedArray) {
            arraysToInspect.push(nestedArray);
          }
        }
      }
    }
  }

  const records: JsonObject[] = [];
  for (const list of arraysToInspect) {
    for (const item of list) {
      const record = asRecord(item);
      if (record) {
        records.push(record);
      }
    }
  }

  return records;
}

function normalizeStatus(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

function derivePendingTasksInfo(taskData: unknown): {
  value: string;
  delta: string;
  tone: "good" | "neutral" | "warning";
} {
  const tasks = extractListRecords(taskData, ["tasks", "items", "entries"]);
  if (tasks.length > 0) {
    let hasExplicitStatus = false;
    const pendingCount = tasks.filter((task) => {
      const status = normalizeStatus(pickString(task, ["status", "state"]));
      if (status) {
        hasExplicitStatus = true;
      }

      return status === "running" || status === "queued";
    }).length;

    const totalCount = hasExplicitStatus ? pendingCount : tasks.length;
    const delta = hasExplicitStatus
      ? `Counted ${pendingCount} running or queued tasks from tasks output.`
      : `Using total task count from tasks output (${tasks.length}).`;

    return {
      value: String(totalCount),
      delta,
      tone: totalCount > 0 ? "neutral" : "good",
    };
  }

  const taskRoot = asRecord(taskData);
  const byStatus = asRecord(taskRoot?.byStatus);
  const running = asNumber(byStatus?.running);
  const queued = asNumber(byStatus?.queued);
  if (running !== undefined || queued !== undefined) {
    const pending = (running ?? 0) + (queued ?? 0);
    return {
      value: String(pending),
      delta: `Using task summary counts: running ${running ?? 0}, queued ${queued ?? 0}.`,
      tone: pending > 0 ? "neutral" : "good",
    };
  }

  const total = asNumber(taskRoot?.total) ?? asNumber(taskRoot?.count);
  if (total !== undefined) {
    return {
      value: String(total),
      delta: `Using task summary total count (${total}).`,
      tone: total > 0 ? "neutral" : "good",
    };
  }

  return {
    value: "Unavailable",
    delta: "Task queue metrics unavailable.",
    tone: "warning",
  };
}

function pickModelValue(value: unknown): string | undefined {
  const direct = asString(value);
  if (direct) {
    return direct;
  }

  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return pickString(record, ["primary", "active", "default", "model", "modelId", "id", "name"]);
}

function readConfiguredDefaultModel(config: JsonObject | undefined): string | undefined {
  const agents = asRecord(config?.agents);
  const defaults = asRecord(agents?.defaults);

  return (
    pickModelValue(defaults?.model) ??
    pickModelValue(defaults?.primaryModel) ??
    pickModelValue(defaults?.activeModel) ??
    pickModelValue(config?.model)
  );
}

function deriveModelInfo(
  sessionsData: unknown,
  config: JsonObject | undefined,
): { activeModel: string; modelOptions: string[]; source: "sessions" | "config" | "unavailable" } {
  const modelSet = new Set<string>();
  const sessions = extractListRecords(sessionsData, ["recent", "sessions", "items"]);

  let recentActiveModel: string | undefined;
  let recentActiveModelTimestamp = -1;
  for (const session of sessions) {
    const modelCandidate = pickString(session, ["activeModel", "model", "modelId", "profile"]);
    if (!modelCandidate) {
      continue;
    }

    modelSet.add(modelCandidate);
    const updatedAt = toTimestamp(session.updatedAt) ?? 0;
    if (!recentActiveModel || updatedAt > recentActiveModelTimestamp) {
      recentActiveModel = modelCandidate;
      recentActiveModelTimestamp = updatedAt;
    }
  }

  const configuredDefaultModel = readConfiguredDefaultModel(config);
  if (configuredDefaultModel) {
    modelSet.add(configuredDefaultModel);
  }

  const activeModel = recentActiveModel ?? configuredDefaultModel ?? "Unavailable";
  if (modelSet.size === 0) {
    return {
      activeModel,
      modelOptions: ["Unavailable"],
      source: "unavailable",
    };
  }

  if (!modelSet.has(activeModel)) {
    modelSet.add(activeModel);
  }

  if (activeModel !== "Unavailable" && !modelSet.has(activeModel)) {
    console.warn(`[openclaw] activeModel "${activeModel}" not found in modelOptions`);
  }

  return {
    activeModel,
    modelOptions: Array.from(modelSet),
    source: recentActiveModel ? "sessions" : "config",
  };
}

export async function getDashboardPayload(): Promise<DashboardPayload> {
  const now = Date.now();
  const [liveHealthResult, liveTasksResult, liveSessionsResult, liveConfigResult] = await Promise.all([
    runOpenClawJson("health"),
    runOpenClawJson("tasks"),
    runOpenClawJson("sessions", ["--limit", String(OPENCLAW_SESSIONS_LIMIT)]),
    readOpenClawConfig(),
  ]);

  const healthResult = resolveWithLastKnownGood("health", liveHealthResult, now);
  const tasksResult = resolveWithLastKnownGood("tasks", liveTasksResult, now);
  const sessionsResult = resolveWithLastKnownGood("sessions", liveSessionsResult, now);
  const configResult = resolveWithLastKnownGood("config", liveConfigResult, now);

  const health = asRecord(healthResult.data);
  const config = asRecord(configResult.data);

  const healthOk = asBoolean(health?.ok);
  const eventLoopDegraded = asBoolean(asRecord(health?.eventLoop)?.degraded) ?? false;
  const staleSources = [
    healthResult.stale ? "health" : undefined,
    tasksResult.stale ? "tasks" : undefined,
    sessionsResult.stale ? "sessions" : undefined,
    configResult.stale ? "config" : undefined,
  ].filter((value): value is CacheKey => value !== undefined);
  const hasStaleFallback = staleSources.length > 0;

  let statusText = "Operational data unavailable";
  let healthTone: HealthTone = "warning";
  if (hasStaleFallback) {
    statusText = "Using recent cached data";
    healthTone = eventLoopDegraded || healthOk === false ? "warning" : "neutral";
  } else if (healthResult.ok && healthOk === true) {
    if (eventLoopDegraded) {
      statusText = "Performance degradation detected";
      healthTone = "warning";
    } else {
      statusText = "All systems nominal";
      healthTone = "good";
    }
  } else if (healthResult.ok && healthOk === false) {
    statusText = "Issues detected by health check";
    healthTone = "warning";
  } else if (tasksResult.ok || sessionsResult.ok || configResult.ok) {
    statusText = "Partial live data available";
    healthTone = "neutral";
  }

  const channels = collectChannelObjects(health);
  let activeChannelsValue = "Unavailable";
  let activeChannelsDelta = "OpenClaw channel metrics unavailable.";
  let activeChannelsTone: "good" | "neutral" | "warning" = "warning";
  if (channels.length > 0) {
    const runningCount = channels.filter((channel) => {
      const running = asBoolean(channel.running);
      if (running === true) {
        return true;
      }

      const state = pickString(channel, ["state", "statusState", "healthState"]);
      return state === "running" || state === "linked" || state === "healthy";
    }).length;

    activeChannelsValue = String(runningCount);
    activeChannelsDelta = runningCount > 0 ? "Derived from running channel states." : "No active channels reported.";
    activeChannelsTone = runningCount > 0 ? "good" : "neutral";
  }

  const pendingTasks = tasksResult.ok
    ? derivePendingTasksInfo(tasksResult.data)
    : { value: "Unavailable", delta: "Task queue metrics unavailable.", tone: "warning" as const };

  const channelStartTimes = channels
    .map((channel) => toTimestamp(channel.lastStartAt))
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);

  const channelConnectedTimes = channels
    .map((channel) => toTimestamp(channel.lastConnectedAt))
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);

  let gatewayUptimeValue = "Unavailable";
  let gatewayUptimeDelta = "Channel start timestamps unavailable.";
  let gatewayUptimeTone: "good" | "neutral" | "warning" = "warning";
  if (channelStartTimes.length > 0) {
    const startedAt = channelStartTimes[0];
    gatewayUptimeValue = formatDurationSince(startedAt, now);
    gatewayUptimeDelta = `Online since ${formatUtcTime(startedAt)}.`;
    gatewayUptimeTone = "good";
  } else if (channelConnectedTimes.length > 0) {
    const connectedAt = channelConnectedTimes[0];
    gatewayUptimeValue = formatDurationSince(connectedAt, now);
    gatewayUptimeDelta = `Connected since ${formatUtcTime(connectedAt)}.`;
    gatewayUptimeTone = "good";
  }

  const timeline = buildTimeline(health, now);
  const modelInfo = deriveModelInfo(sessionsResult.data, config);

  const failureNotes = [
    !liveHealthResult.ok && !healthResult.stale ? liveHealthResult.error : undefined,
    !liveTasksResult.ok && !tasksResult.stale ? liveTasksResult.error : undefined,
    !liveSessionsResult.ok && !sessionsResult.stale ? liveSessionsResult.error : undefined,
    !liveConfigResult.ok && !configResult.stale ? liveConfigResult.error : undefined,
  ]
    .filter((note): note is string => typeof note === "string" && note.length > 0)
    .join(" | ");

  const staleNotes = [
    healthResult.stale
      ? `health fallback from ${formatStaleAge(healthResult.staleAgeMs ?? 0)} ago`
      : undefined,
    tasksResult.stale
      ? `tasks fallback from ${formatStaleAge(tasksResult.staleAgeMs ?? 0)} ago`
      : undefined,
    sessionsResult.stale
      ? `sessions fallback from ${formatStaleAge(sessionsResult.staleAgeMs ?? 0)} ago`
      : undefined,
    configResult.stale
      ? `config fallback from ${formatStaleAge(configResult.staleAgeMs ?? 0)} ago`
      : undefined,
  ]
    .filter((note): note is string => typeof note === "string" && note.length > 0)
    .join(" | ");

  let footerText = "OpenClaw dashboard using health and tasks CLI data; model sourced from recent sessions or local config.";
  if (!healthResult.ok && !tasksResult.ok && modelInfo.source === "unavailable" && failureNotes) {
    footerText = `OpenClaw live data unavailable: ${failureNotes}.`;
  } else if (staleNotes && failureNotes) {
    footerText = `OpenClaw dashboard using stale cached data for ${staleSources.join(", ")}; ${staleNotes}. Live refresh issues: ${failureNotes}.`;
  } else if (staleNotes) {
    footerText = `OpenClaw dashboard using stale cached data for ${staleSources.join(", ")}; ${staleNotes}.`;
  } else if (failureNotes) {
    footerText = `OpenClaw dashboard using partial data sources (health, tasks, sessions, config): ${failureNotes}.`;
  }

  return {
    statusText,
    healthTone,
    statusAriaLabel: `System status ${statusText.toLowerCase()}`,
    activeChannelsValue,
    activeChannelsDelta,
    activeChannelsTone,
    pendingTasksValue: pendingTasks.value,
    pendingTasksDelta: pendingTasks.delta,
    pendingTasksTone: pendingTasks.tone,
    gatewayUptimeValue,
    gatewayUptimeDelta,
    gatewayUptimeTone,
    timeline,
    modelOptions: modelInfo.modelOptions,
    activeModel: modelInfo.activeModel,
    footerText,
  };
}
