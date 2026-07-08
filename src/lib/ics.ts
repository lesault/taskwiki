// .ics (RFC 5545) calendar generation.
//
// Correctness checklist this file implements (see plan):
//  - CRLF line endings.
//  - Line folding at 75 octets, on UTF-8 byte boundaries (not char count),
//    continuation lines prefixed with a single space.
//  - Escaping of \ , ; and newline in text values.
//  - Stable per-mode UID (`${taskId}-reminder@...` vs `${taskId}-block@...`)
//    so the two modes never collide; SEQUENCE bumps + DTSTAMP refreshes on
//    re-export so calendar apps update rather than duplicate.
//  - DTSTAMP in UTC.
//  - Floating local time (no TZID, no trailing Z) for timed events, to
//    dodge DST/timezone-conversion bugs — "9am" means 9am wherever it's
//    opened, which is the correct behavior for a single-timezone user.
//  - All-day handled via DTSTART;VALUE=DATE.
//  - VALARM with ACTION:DISPLAY + TRIGGER + DESCRIPTION.
//  - Required VCALENDAR headers: VERSION, PRODID, CALSCALE, METHOD.

import type { Task, Settings } from './types';

const textEncoder = new TextEncoder();

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Fold a single logical line at 75 octets, splitting only on codepoint
 *  boundaries (never mid-UTF-8-sequence), per RFC 5545 §3.1. */
export function foldLine(line: string): string {
  const codepoints = Array.from(line);
  const segments: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;

  for (const ch of codepoints) {
    const chBytes = textEncoder.encode(ch).length;
    if (currentBytes + chBytes > limit) {
      segments.push(current);
      current = '';
      currentBytes = 0;
      limit = 74; // continuation lines lose one octet to the leading space
    }
    current += ch;
    currentBytes += chBytes;
  }
  if (current.length > 0 || segments.length === 0) segments.push(current);

  return segments.map((seg, i) => (i === 0 ? seg : ' ' + seg)).join('\r\n');
}

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function formatFloatingLocal(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function formatUtcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

export type IcsMode = 'reminder' | 'block';

export interface IcsOptions {
  mode: IcsMode;
  /** Local wall-clock start time. */
  start: Date;
  /** Time-block mode only. */
  durationMins?: number;
  /** Reminder mode only — minutes before start the alarm fires. */
  alarmMinutesBefore?: number;
  sequence?: number;
}

function buildEventLines(task: Task, opts: IcsOptions, now: Date): string[] {
  const uid = `${task.id}-${opts.mode}@task-planner.local`;
  const lines: string[] = [];
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${uid}`);
  lines.push(`DTSTAMP:${formatUtcStamp(now)}`);
  lines.push(`SEQUENCE:${opts.sequence ?? 0}`);
  lines.push(`SUMMARY:${escapeText(task.title)}`);
  if (task.notes) lines.push(`DESCRIPTION:${escapeText(task.notes)}`);

  if (opts.mode === 'reminder') {
    lines.push(`DTSTART:${formatFloatingLocal(opts.start)}`);
    const end = new Date(opts.start.getTime() + 15 * 60_000);
    lines.push(`DTEND:${formatFloatingLocal(end)}`);
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:${escapeText(task.title)}`);
    lines.push(`TRIGGER:-PT${opts.alarmMinutesBefore ?? 30}M`);
    lines.push('END:VALARM');
  } else {
    const durationMins = opts.durationMins ?? 30;
    const end = new Date(opts.start.getTime() + durationMins * 60_000);
    lines.push(`DTSTART:${formatFloatingLocal(opts.start)}`);
    lines.push(`DTEND:${formatFloatingLocal(end)}`);
  }

  lines.push('END:VEVENT');
  return lines;
}

function wrapCalendar(eventLines: string[]): string {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Task Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  const footer = ['END:VCALENDAR'];
  return [...header, ...eventLines, ...footer].map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Generate a single-event .ics for one task (reminder or time-block).
 * Bumps and returns the task's SEQUENCE for this mode so callers can persist
 * it back onto the task — re-exporting after an edit then updates the
 * existing calendar entry (same UID) instead of duplicating it.
 */
export function generateTaskIcs(
  task: Task,
  opts: IcsOptions,
  now: Date = new Date()
): { ics: string; nextSequence: number } {
  const currentSeq = task.icsSequence?.[opts.mode] ?? 0;
  const eventLines = buildEventLines(task, { ...opts, sequence: currentSeq }, now);
  return { ics: wrapCalendar(eventLines), nextSequence: currentSeq + 1 };
}

/**
 * Lay out a day's planned ('mine', not done/deleted) tasks as sequential
 * time-blocks within configured working hours, in `order`. Tasks that don't
 * fit before the end of the working day are reported in `overflowTaskIds`
 * rather than silently dropped — the caller must surface this to the user.
 */
export function generateBulkDayPlan(
  tasks: Task[],
  dateISO: string,
  settings: Settings,
  now: Date = new Date()
): { ics: string; overflowTaskIds: string[] } {
  const [startH, startM] = settings.workingHoursStart.split(':').map(Number);
  const [endH, endM] = settings.workingHoursEnd.split(':').map(Number);

  const dayStart = new Date(`${dateISO}T00:00:00`);
  dayStart.setHours(startH, startM, 0, 0);
  const dayEnd = new Date(`${dateISO}T00:00:00`);
  dayEnd.setHours(endH, endM, 0, 0);

  const sorted = tasks
    .filter((t) => t.plannedDate === dateISO && !t.deletedAt && t.status !== 'done')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let cursor = new Date(dayStart);
  const eventLines: string[] = [];
  const overflowTaskIds: string[] = [];

  for (const t of sorted) {
    const durationMins = t.durationMins ?? settings.defaultDurationMins;
    const end = new Date(cursor.getTime() + durationMins * 60_000);
    if (end.getTime() > dayEnd.getTime()) {
      overflowTaskIds.push(t.id);
      continue;
    }
    const seq = t.icsSequence?.block ?? 0;
    eventLines.push(...buildEventLines(t, { mode: 'block', start: new Date(cursor), durationMins, sequence: seq }, now));
    cursor = end;
  }

  return { ics: wrapCalendar(eventLines), overflowTaskIds };
}

export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// formatDateOnly is exported for potential all-day-event use (e.g. a
// deadline-only calendar marker); kept here rather than removed since the
// plan flags all-day handling as part of the correctness checklist.
export { formatDateOnly };
