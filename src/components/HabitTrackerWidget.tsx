"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "dashboard:habits";
const CHECKED_KEY = "dashboard:habits-checked";

interface Habit {
  id: string;
  label: string;
}

const DEFAULT_HABITS: Habit[] = [
  { id: "water", label: "Drink 8 glasses of water" },
  { id: "exercise", label: "Exercise / move for 30 min" },
  { id: "read", label: "Read for 20 min" },
  { id: "journal", label: "Journal / reflect" },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HabitTrackerWidget() {
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const storedHabits = localStorage.getItem(STORAGE_KEY);
      if (storedHabits) setHabits(JSON.parse(storedHabits));

      const storedChecked = localStorage.getItem(`${CHECKED_KEY}:${todayKey()}`);
      if (storedChecked) setChecked(new Set(JSON.parse(storedChecked)));
    } catch { /* ignore */ }
  }, []);

  function saveHabits(next: Habit[]) {
    setHabits(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function saveChecked(next: Set<string>) {
    setChecked(new Set(next));
    try {
      localStorage.setItem(`${CHECKED_KEY}:${todayKey()}`, JSON.stringify(Array.from(next)));
    } catch { /* ignore */ }
  }

  function toggle(id: string) {
    const next = new Set(checked);
    next.has(id) ? next.delete(id) : next.add(id);
    saveChecked(next);
  }

  function addHabit() {
    const label = newLabel.trim();
    if (!label) return;
    const habit: Habit = { id: `habit-${Date.now()}`, label };
    saveHabits([...habits, habit]);
    setNewLabel("");
  }

  function removeHabit(id: string) {
    saveHabits(habits.filter((h) => h.id !== id));
    const next = new Set(checked);
    next.delete(id);
    saveChecked(next);
  }

  const doneCount = habits.filter((h) => checked.has(h.id)).length;

  return (
    <div className="habits-widget">
      <div className="widget-header">
        <h2>Habits</h2>
        <span className="habits-progress">{doneCount}/{habits.length} today</span>
        <button
          className="habits-edit-btn"
          onClick={() => setEditing((v) => !v)}
          aria-pressed={editing}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <ul className="habits-list">
        {habits.map((habit) => (
          <li key={habit.id} className="habit-item">
            <label className="habit-label">
              <input
                type="checkbox"
                checked={checked.has(habit.id)}
                onChange={() => toggle(habit.id)}
                aria-label={habit.label}
              />
              <span data-done={checked.has(habit.id) ? "true" : "false"}>{habit.label}</span>
            </label>
            {editing && (
              <button
                className="habit-remove-btn"
                onClick={() => removeHabit(habit.id)}
                aria-label={`Remove habit: ${habit.label}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <div className="habit-add-row">
          <input
            className="habit-add-input"
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="New habit…"
            aria-label="New habit name"
          />
          <button className="habit-add-btn" onClick={addHabit}>Add</button>
        </div>
      )}
    </div>
  );
}
