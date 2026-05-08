"use client";

import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "dashboard:quick-notes";

export function QuickNotesWidget() {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      setNotes(localStorage.getItem(STORAGE_KEY) ?? "");
    } catch {
      // localStorage unavailable
    }
  }, []);

  function handleChange(value: string) {
    setNotes(value);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, value);
        setSaved(true);
      } catch {
        // ignore
      }
    }, 600);
  }

  function handleClear() {
    setNotes("");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setSaved(false);
  }

  return (
    <div className="notes-widget">
      <div className="widget-header">
        <h2>Quick Notes</h2>
        <div className="notes-actions">
          {saved && <span className="notes-saved">Saved</span>}
          {notes && (
            <button className="notes-clear-btn" onClick={handleClear} aria-label="Clear notes">
              Clear
            </button>
          )}
        </div>
      </div>
      <textarea
        className="notes-textarea"
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Jot something down…"
        aria-label="Quick notes"
        rows={6}
      />
    </div>
  );
}
