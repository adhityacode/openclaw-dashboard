import type { GmailMessage } from "@/lib/gmail";

interface Props {
  messages: GmailMessage[];
  errorMessage?: string;
}

function formatFrom(from: string): string {
  // Extract display name if present: "Name <email>" → "Name"
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.split("@")[0];
}

export function GmailWidget({ messages, errorMessage }: Props) {
  return (
    <div className="gmail-widget">
      <div className="widget-header">
        <h2>Gmail</h2>
        {errorMessage && (
          <span className="cal-error" role="alert">{errorMessage}</span>
        )}
      </div>

      {messages.length === 0 && !errorMessage && (
        <p className="widget-empty">Inbox is empty</p>
      )}

      <ul className="gmail-list">
        {messages.map((msg) => (
          <li key={msg.id} className="gmail-item" data-unread={msg.isUnread ? "true" : "false"}>
            <span className="gmail-from">{formatFrom(msg.from)}</span>
            <span className="gmail-subject">{msg.subject}</span>
            <span className="gmail-snippet">{msg.snippet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
