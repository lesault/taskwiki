// LLM scheduling roundtrip: since the app cannot call an AI directly, this
// generates a copy-pasteable prompt for the user's corporate LLM, and
// tolerantly parses whatever comes back.
//
// Design points from the plan (all load-bearing):
//  - Only schedulable tasks are sent (active, undated-or-within-horizon) —
//    sending the whole backlog risks blowing paste/context limits.
//  - Only {id, title, deadline, durationMins, priority} are sent. notes and
//    source are deliberately excluded — they're the sensitive fields.
//  - The prompt anchors on today's date + working days + timezone so day
//    assignments aren't ambiguous.
//  - The parser is tolerant (strips code fences/prose, tolerates trailing
//    commas) because LLMs reliably wrap JSON in explanation text.
//  - Every entry is validated; the diff surfaces DROPPED ids (tasks the LLM
//    omitted) and UNKNOWN ids (hallucinated), not just the accepted changes,
//    so a silent misschedule can't slip through.

import type { AppState, Task, Settings } from './types';

const DEFAULT_HORIZON_DAYS = 14;

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function selectSchedulableTasks(
  state: AppState,
  today: Date = new Date(),
  horizonDays = DEFAULT_HORIZON_DAYS
): Task[] {
  return state.tasks.filter((t) => {
    if (t.deletedAt) return false;
    if (t.status === 'done') return false;
    if (t.direction !== 'mine') return false;
    if (t.inInbox) return false; // not triaged yet — schedule after promotion
    if (!t.deadline) return true;
    const d = new Date(t.deadline + 'T00:00:00');
    return daysBetween(today, d) <= horizonDays;
  });
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function buildSchedulePrompt(
  tasks: Task[],
  settings: Settings,
  today: Date = new Date()
): string {
  const workingDayNames = settings.workingDays.map((d) => WEEKDAY_NAMES[d]).join(', ');
  const payload = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    deadline: t.deadline ?? null,
    durationMins: t.durationMins ?? settings.defaultDurationMins,
    priority: t.priority,
  }));

  return [
    `Today's date is ${isoDate(today)}. My working days are: ${workingDayNames}. My timezone is ${settings.timeZoneLabel} (informational only — plannedDate is just a date, not a time).`,
    '',
    'Schedule this list of tasks based on priority, duration, and deadline. Assign each task a plannedDate (a working day on or after today, on or before its deadline if it has one) and an order (1 = do first) within that date.',
    '',
    'Respond with ONLY a JSON array, no prose, no markdown code fence, no explanation — just the array. Every task id below must appear exactly once. Do not invent ids that are not in the list. Use date format YYYY-MM-DD.',
    '',
    'Format: [{"id": "t-1", "plannedDate": "YYYY-MM-DD", "order": 1}, ...]',
    '',
    'Tasks:',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

export interface ScheduleEntry {
  id: string;
  plannedDate: string;
  order: number;
}

/**
 * Tolerant parse: strips ```json fences, finds the outermost [...] if the
 * model wrapped the array in prose, and drops trailing commas before
 * JSON.parse — all common ways LLMs mangle "just give me JSON".
 */
export function parseScheduleResponse(raw: string): ScheduleEntry[] {
  let text = raw.trim();

  // Strip a ```json ... ``` or ``` ... ``` fence if present.
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenceMatch) text = fenceMatch[1].trim();

  // If there's still prose around the array, grab the outermost brackets.
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    text = text.slice(firstBracket, lastBracket + 1);
  }

  // Tolerate trailing commas before ] or }.
  text = text.replace(/,\s*([\]}])/g, '$1');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Could not parse a JSON array out of the pasted response: ${(e as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Parsed value is not an array.');
  }

  return parsed
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map((e) => ({
      id: String(e.id ?? ''),
      plannedDate: String(e.plannedDate ?? ''),
      order: Number(e.order ?? 0),
    }));
}

export interface ScheduleDiffEntry {
  id: string;
  title: string;
  currentPlannedDate?: string;
  newPlannedDate: string;
  newOrder: number;
}

export interface ScheduleDiff {
  accepted: ScheduleDiffEntry[];
  invalid: { id: string; reason: string }[];
  /** Task ids that were sent to the LLM but absent from its reply. */
  droppedIds: string[];
  /** Ids in the reply that don't correspond to any sent task — hallucinated
   *  or corrupted, either way must not be silently applied. */
  unknownIds: string[];
}

/**
 * Validate every entry against the actual sent tasks and today's/working-day
 * constraints, and produce a diff for user review before anything is
 * written back to the store. Nothing here mutates state — see
 * applyScheduleDiff for the write step, called only after user confirmation.
 */
export function buildScheduleDiff(
  sentTasks: Task[],
  entries: ScheduleEntry[],
  settings: Settings,
  today: Date = new Date()
): ScheduleDiff {
  const byId = new Map(sentTasks.map((t) => [t.id, t]));
  const seenIds = new Set<string>();
  const accepted: ScheduleDiffEntry[] = [];
  const invalid: { id: string; reason: string }[] = [];
  const unknownIds: string[] = [];

  for (const entry of entries) {
    if (!entry.id) continue;
    const task = byId.get(entry.id);
    if (!task) {
      unknownIds.push(entry.id);
      continue;
    }
    seenIds.add(entry.id);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.plannedDate)) {
      invalid.push({ id: entry.id, reason: `plannedDate "${entry.plannedDate}" is not YYYY-MM-DD.` });
      continue;
    }
    const d = new Date(entry.plannedDate + 'T00:00:00');
    if (isNaN(d.getTime())) {
      invalid.push({ id: entry.id, reason: `plannedDate "${entry.plannedDate}" is not a real date.` });
      continue;
    }
    if (daysBetween(today, d) < 0) {
      invalid.push({ id: entry.id, reason: `plannedDate ${entry.plannedDate} is in the past.` });
      continue;
    }
    if (!settings.workingDays.includes(d.getDay())) {
      invalid.push({ id: entry.id, reason: `${entry.plannedDate} (${WEEKDAY_NAMES[d.getDay()]}) is not a configured working day.` });
      continue;
    }
    if (task.deadline) {
      const deadlineD = new Date(task.deadline + 'T00:00:00');
      if (d.getTime() > deadlineD.getTime()) {
        invalid.push({ id: entry.id, reason: `plannedDate ${entry.plannedDate} is after this task's deadline ${task.deadline}.` });
        continue;
      }
    }

    accepted.push({
      id: entry.id,
      title: task.title,
      currentPlannedDate: task.plannedDate,
      newPlannedDate: entry.plannedDate,
      newOrder: entry.order,
    });
  }

  const droppedIds = sentTasks.map((t) => t.id).filter((id) => !seenIds.has(id));

  return { accepted, invalid, droppedIds, unknownIds };
}
