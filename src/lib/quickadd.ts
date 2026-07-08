// One-line quick-add shorthand parser.
//
// Supported tokens (order-independent, whitespace-separated):
//   @2026-07-15   deadline, ISO date
//   @today / @tomorrow / @+3d   deadline, relative
//   #project-name   project tag (resolved to a Project by the caller)
//   !high / !med / !low  (or !h / !m / !l)   priority
//   ~30m / ~2h   duration estimate
//   >Jane        delegate to Jane — sets direction to "waiting"
//   !!           skip-inbox — add straight to the active list
//
// Anything not recognized as a token stays in the title, in its original
// order, with recognized tokens stripped and whitespace collapsed.
//
// v1 deliberately ships ISO dates + a small relative-keyword set only; full
// natural-language date parsing ("by Friday") is a deferred sub-project —
// see plan.

import type { Priority } from './types';

export interface ParsedQuickAdd {
  title: string;
  deadline?: string; // ISO date YYYY-MM-DD
  projectTag?: string;
  priority?: Priority;
  durationMins?: number;
  assignee?: string;
  skipInbox: boolean;
}

const PROJECT_RE = /#([a-z0-9][a-z0-9-]*)/i;
const PRIORITY_RE = /!(high|med|low|h|m|l)\b/i;
const DURATION_RE = /~(\d+(?:\.\d+)?)(m|h)\b/i;
const DELEGATE_RE = /(^|\s)>([a-z][a-z0-9._-]*)/i;
const SKIP_INBOX_RE = /(^|\s)!!(\s|$)/;
const DEADLINE_RE = /@(\d{4}-\d{2}-\d{2}|today|tomorrow|\+\d+d)\b/i;

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function resolveDeadlineToken(token: string, now: Date): string | undefined {
  const t = token.toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    // Validate it's a real calendar date, not just date-shaped.
    const d = new Date(t + 'T00:00:00');
    if (isNaN(d.getTime())) return undefined;
    return t;
  }
  if (t === 'today') return isoDate(now);
  if (t === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return isoDate(d);
  }
  const rel = /^\+(\d+)d$/.exec(t);
  if (rel) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(rel[1], 10));
    return isoDate(d);
  }
  return undefined;
}

function normalizePriority(raw: string): Priority {
  const t = raw.toLowerCase();
  if (t === 'high' || t === 'h') return 'high';
  if (t === 'low' || t === 'l') return 'low';
  return 'med';
}

export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
  let remaining = input;
  const result: ParsedQuickAdd = { title: '', skipInbox: false };

  const skipMatch = SKIP_INBOX_RE.exec(remaining);
  if (skipMatch) {
    result.skipInbox = true;
    remaining = remaining.replace(SKIP_INBOX_RE, ' ');
  }

  const deadlineMatch = DEADLINE_RE.exec(remaining);
  if (deadlineMatch) {
    const resolved = resolveDeadlineToken(deadlineMatch[1], now);
    if (resolved) result.deadline = resolved;
    remaining = remaining.replace(DEADLINE_RE, ' ');
  }

  const projectMatch = PROJECT_RE.exec(remaining);
  if (projectMatch) {
    result.projectTag = projectMatch[1];
    remaining = remaining.replace(PROJECT_RE, ' ');
  }

  const priorityMatch = PRIORITY_RE.exec(remaining);
  if (priorityMatch) {
    result.priority = normalizePriority(priorityMatch[1]);
    remaining = remaining.replace(PRIORITY_RE, ' ');
  }

  const durationMatch = DURATION_RE.exec(remaining);
  if (durationMatch) {
    const value = parseFloat(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    result.durationMins = Math.round(unit === 'h' ? value * 60 : value);
    remaining = remaining.replace(DURATION_RE, ' ');
  }

  const delegateMatch = DELEGATE_RE.exec(remaining);
  if (delegateMatch) {
    result.assignee = delegateMatch[2];
    remaining = remaining.replace(DELEGATE_RE, ' ');
  }

  result.title = remaining.replace(/\s+/g, ' ').trim();
  return result;
}
