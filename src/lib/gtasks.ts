import { google } from "googleapis";

export interface TaskItem {
  id: string;
  title: string;
  due?: string;   // ISO date string or undefined
  listTitle: string;
  isOverdue: boolean;
}

export type TasksResult =
  | { ok: true; tasks: TaskItem[] }
  | { ok: false; tasks: TaskItem[]; error: string };

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export async function getPendingTasks(maxPerList = 10): Promise<TasksResult> {
  if (!process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN === "REPLACE_ME") {
    return { ok: false, tasks: [], error: "Google token not configured." };
  }

  try {
    const tasksApi = google.tasks({ version: "v1", auth: getAuth() });
    const listsRes = await tasksApi.tasklists.list({ maxResults: 10 });
    const lists = listsRes.data.items ?? [];

    const now = Date.now();
    const allTasks: TaskItem[] = [];

    await Promise.all(
      lists.map(async (list) => {
        const res = await tasksApi.tasks.list({
          tasklist: list.id!,
          showCompleted: false,
          showHidden: false,
          maxResults: maxPerList,
        });
        for (const t of res.data.items ?? []) {
          if (!t.title?.trim()) continue;
          const due = t.due ?? undefined;
          const isOverdue = due ? new Date(due).getTime() < now : false;
          allTasks.push({
            id: t.id!,
            title: t.title,
            due,
            listTitle: list.title ?? "Tasks",
            isOverdue,
          });
        }
      }),
    );

    // Sort: overdue first, then by due date, then undated
    allTasks.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.due && b.due) return new Date(a.due).getTime() - new Date(b.due).getTime();
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });

    return { ok: true, tasks: allTasks };
  } catch (err) {
    console.warn("[gtasks] Failed to fetch tasks:", err);
    return { ok: false, tasks: [], error: "Failed to fetch Google Tasks." };
  }
}
