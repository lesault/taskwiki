// Core data model for the portable task planner.
// This whole tree is what gets JSON-serialized into the data island in
// index.html on every save — see persistence.ts.

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';
export type TaskDirection = 'mine' | 'waiting';
export type Priority = 'high' | 'med' | 'low';

export interface ActivityEntry {
  /** ISO 8601 timestamp. */
  at: string;
  /** Short human-readable description, e.g. "Chased Jane", "Marked done". */
  text: string;
}

/**
 * Reserved for a future recurrence feature (deliberately unused in v1 — see
 * plan). Kept on the type now so the shape doesn't need a migration later.
 */
export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
}

export interface Task {
  /** Stable short id, e.g. "t-4f2a". Must stay stable — the LLM scheduling
   *  roundtrip matches responses back to tasks by this id. */
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  direction: TaskDirection;
  /** Who this is delegated to, when direction === 'waiting'. */
  assignee?: string;
  priority: Priority;
  /** Hard due date, ISO date (YYYY-MM-DD). */
  deadline?: string;
  /** Date the scheduler (or the user) has planned to work this, ISO date. */
  plannedDate?: string;
  /** Order within plannedDate, set by the scheduling roundtrip. */
  order?: number;
  durationMins?: number;
  projectId?: string;
  labels: string[];
  /** Freeform: a pasted URL (rendered clickable) or plain reference text. */
  source?: string;
  /** When direction === 'waiting': when to chase if no reply. ISO date. */
  followUpDate?: string;
  /** True while sitting in the Inbox awaiting triage/promotion. */
  inInbox: boolean;
  /** Soft-delete flag — never hard-delete so destructive keyboard actions
   *  under an explicit-save model stay recoverable via undo. */
  deletedAt?: string;
  createdAt: string;
  /** Capped/pruned — see ACTIVITY_LOG_CAP in store.ts — so the file doesn't
   *  grow without bound across the life of the planner. */
  activity: ActivityEntry[];
  recurrence?: Recurrence;
  /** SEQUENCE counters per .ics mode, so re-exporting after an edit makes
   *  calendar apps UPDATE the existing event rather than duplicate it
   *  (same UID, incremented SEQUENCE, refreshed DTSTAMP). */
  icsSequence?: { reminder?: number; block?: number };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  labels: string[];
}

export interface Settings {
  /** 0 = Sunday .. 6 = Saturday. */
  workingDays: number[];
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "17:30"
  defaultDurationMins: number;
  /** IANA name, used only as a label in generated prompts/exports — the
   *  actual .ics events are emitted as floating local time, never converted. */
  timeZoneLabel: string;
  theme: 'light' | 'dark' | 'system';
  backupIntervalSaves: number;
}

export interface AppState {
  /** Bumped on breaking data-shape changes so load() can migrate old files. */
  schemaVersion: number;
  tasks: Task[];
  projects: Project[];
  settings: Settings;
  /** Incremented to mint the next short task/project id. */
  nextIdCounter: number;
  /** Count of in-place/download saves since the last periodic backup nudge. */
  savesSinceBackup: number;
}

export const CURRENT_SCHEMA_VERSION = 1;

export function defaultSettings(): Settings {
  return {
    workingDays: [1, 2, 3, 4, 5],
    workingHoursStart: '09:00',
    workingHoursEnd: '17:30',
    defaultDurationMins: 30,
    timeZoneLabel: Intl.DateTimeFormat().resolvedOptions().timeZone,
    theme: 'system',
    backupIntervalSaves: 20,
  };
}

export function emptyState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    tasks: [],
    projects: [],
    settings: defaultSettings(),
    nextIdCounter: 1,
    savesSinceBackup: 0,
  };
}
