import { getTodayEvents } from "@/lib/calendar";
import { getGmailInbox, filterImportantMessages } from "@/lib/gmail";
import { getPendingTasks } from "@/lib/gtasks";
import { getWeather } from "@/lib/weather";
import { getAiAdvice } from "@/lib/ai-advice";
import { CalendarWidget } from "@/components/CalendarWidget";
import { GmailWidget } from "@/components/GmailWidget";
import { TasksWidget } from "@/components/TasksWidget";
import { WeatherWidget } from "@/components/WeatherWidget";
import { QuickNotesWidget } from "@/components/QuickNotesWidget";
import { HabitTrackerWidget } from "@/components/HabitTrackerWidget";
import { DailySummaryWidget } from "@/components/DailySummaryWidget";
import { AiAdviceWidget } from "@/components/AiAdviceWidget";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import { PersonalGrid } from "@/components/PersonalGrid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [calendarResult, gmailResult, tasksResult, weatherResult] = await Promise.all([
    getTodayEvents(),
    getGmailInbox(20),
    getPendingTasks(10),
    getWeather(),
  ]);

  const [importantIds, aiResult] = await Promise.all([
    filterImportantMessages(gmailResult.messages),
    getAiAdvice({
      calendarEvents: calendarResult.events,
      gmailMessages: gmailResult.messages,
      tasks: tasksResult.tasks,
      weather: weatherResult.ok ? weatherResult.data : null,
    }),
  ]);

  const filteredMessages = gmailResult.messages.filter((m) => importantIds.has(m.id));
  const weatherData = weatherResult.ok ? weatherResult.data : null;
  const weatherError = weatherResult.ok ? undefined : weatherResult.error;

  return (
    <main className="dashboard-page">
      <PersonalGrid widgetIds={["weather","ai-advice","daily-sum","tasks","calendar","gmail","whatsapp","notes","habits"]}>

        <section className="panel panel-weather reveal" aria-label="Weather">
          <div className="widget-drag-handle" />
          <WeatherWidget data={weatherData} errorMessage={weatherError} />
        </section>

        <section className="panel panel-ai-advice reveal" aria-label="AI daily advice">
          <div className="widget-drag-handle" />
          <AiAdviceWidget
            advice={aiResult.ok ? aiResult.advice : null}
            errorMessage={aiResult.ok ? undefined : aiResult.error}
          />
        </section>

        <section className="panel panel-daily-sum reveal" aria-label="Daily summary">
          <div className="widget-drag-handle" />
          <DailySummaryWidget
            calendarEvents={calendarResult.events}
            tasks={tasksResult.tasks}
            weather={weatherData}
          />
        </section>

        <section className="panel panel-tasks reveal" aria-label="Google Tasks">
          <div className="widget-drag-handle" />
          <TasksWidget
            tasks={tasksResult.tasks}
            errorMessage={tasksResult.ok ? undefined : tasksResult.error}
          />
        </section>

        <section className="panel panel-calendar reveal" aria-label="Today&apos;s schedule">
          <div className="widget-drag-handle" />
          <CalendarWidget
            events={calendarResult.events}
            errorMessage={calendarResult.ok ? undefined : calendarResult.error}
          />
        </section>

        <section className="panel panel-gmail reveal" aria-label="Gmail inbox">
          <div className="widget-drag-handle" />
          <GmailWidget
            messages={filteredMessages}
            errorMessage={gmailResult.ok ? undefined : gmailResult.error}
          />
        </section>

        <section className="panel panel-whatsapp reveal" aria-label="WhatsApp messages">
          <div className="widget-drag-handle" />
          <WhatsAppWidget />
        </section>

        <section className="panel panel-notes reveal" aria-label="Quick notes">
          <div className="widget-drag-handle" />
          <QuickNotesWidget />
        </section>

        <section className="panel panel-habits reveal" aria-label="Habit tracker">
          <div className="widget-drag-handle" />
          <HabitTrackerWidget />
        </section>

      </PersonalGrid>
    </main>
  );
}
