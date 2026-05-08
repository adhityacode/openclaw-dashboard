import type { TaskItem } from "@/lib/gtasks";

interface Props {
  tasks: TaskItem[];
  errorMessage?: string;
}

function formatDue(due: string): string {
  const d = new Date(due);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function TasksWidget({ tasks, errorMessage }: Props) {
  const overdue = tasks.filter((t) => t.isOverdue);
  const upcoming = tasks.filter((t) => !t.isOverdue);

  return (
    <div className="tasks-widget">
      <div className="widget-header">
        <h2>Tasks</h2>
        {tasks.length > 0 && (
          <span className="tasks-count">{tasks.length} pending</span>
        )}
        {errorMessage && (
          <span className="cal-error" role="alert">{errorMessage}</span>
        )}
      </div>

      {tasks.length === 0 && !errorMessage && (
        <p className="widget-empty">All clear — no pending tasks</p>
      )}

      {overdue.length > 0 && (
        <ul className="tasks-list">
          {overdue.map((t) => (
            <li key={t.id} className="task-item task-item--overdue">
              <span className="task-title">{t.title}</span>
              <span className="task-meta">
                {t.due && <span className="task-due overdue-label">Overdue · {formatDue(t.due)}</span>}
                <span className="task-list-tag">{t.listTitle}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {upcoming.length > 0 && (
        <ul className="tasks-list">
          {upcoming.map((t) => (
            <li key={t.id} className="task-item">
              <span className="task-title">{t.title}</span>
              <span className="task-meta">
                {t.due && <span className="task-due">{formatDue(t.due)}</span>}
                <span className="task-list-tag">{t.listTitle}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
