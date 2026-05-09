'use client';

import { useEffect, useState } from 'react';
import { WhatsAppMessage } from '@/lib/whatsapp';

function timeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatSender(msg: WhatsAppMessage): string {
  if (msg.isGroup && msg.groupName) return msg.groupName;
  return msg.fromName || msg.from;
}

export default function WhatsAppWidget() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/whatsapp/messages');
        const data = await res.json();
        if (data.ok) setMessages(data.messages);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30_000);
    // Tick every minute to keep relative times fresh
    const tick = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => {
      clearInterval(interval);
      clearInterval(tick);
    };
  }, []);

  // Deduplicate by sender — show only latest message per sender
  const latestBySender = messages.reduce<Map<string, WhatsAppMessage>>((acc, msg) => {
    const key = msg.isGroup ? (msg.groupName ?? msg.from) : msg.from;
    if (!acc.has(key) || acc.get(key)!.timestamp < msg.timestamp) {
      acc.set(key, msg);
    }
    return acc;
  }, new Map());

  const chats = Array.from(latestBySender.values()).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <section className="widget whatsapp-widget reveal">
      <div className="widget-header">
        <span className="widget-icon">💬</span>
        <h2 className="widget-title">WhatsApp</h2>
      </div>
      <div className="whatsapp-list">
        {loading ? (
          <p className="wa-empty">Loading…</p>
        ) : chats.length === 0 ? (
          <div className="wa-empty-state">
            <p className="wa-empty">No messages yet.</p>
            <p className="wa-hint">
              Messages will appear here once the OpenClaw agent forwards them to the dashboard webhook.
            </p>
          </div>
        ) : (
          chats.map((msg) => (
            <div key={msg.from + msg.timestamp} className="wa-chat-item">
              <div className="wa-avatar">{formatSender(msg).charAt(0).toUpperCase()}</div>
              <div className="wa-chat-body">
                <div className="wa-chat-header">
                  <span className="wa-sender">{formatSender(msg)}</span>
                  <span className="wa-time">{timeAgo(msg.timestamp)}</span>
                </div>
                <p className="wa-preview">{msg.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
