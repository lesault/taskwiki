// Reactive app store: wraps AppState, tracks dirty/saved status, and
// orchestrates saving through the persistence engine (persistence.ts).
//
// This module owns the "what should happen when the user hits save" policy;
// persistence.ts owns the low-level mechanics (serialize/splice/write).

import { writable, get } from 'svelte/store';
import type { AppState, Task, Project, ActivityEntry } from './types';
import { emptyState } from './types';
import {
  captureShell,
  loadInitialState,
  buildDocumentToSave,
  fsAccessAvailable,
  pickSaveHandle,
  getCachedHandle,
  writeToHandle,
  downloadAsFile,
  suggestFilename,
  type SaveMode,
} from './persistence';

/** Cap on per-task activity log length — see plan: "the carry-anywhere file
 *  must not grow without bound." Oldest entries are pruned first. */
export const ACTIVITY_LOG_CAP = 30;

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'stale-download';

interface StoreMeta {
  status: SaveStatus;
  lastSavedAt: string | null;
  lastError: string | null;
  saveMode: SaveMode;
  /** Load failed to parse — recovery UI should be shown instead of the app. */
  loadError: string | null;
  loadErrorRaw: string | null;
}

// Captured once, before Svelte mounts. See main.ts.
let shell: string | null = null;
export function initShell() {
  shell = captureShell();
}

export const appState = writable<AppState>(emptyState());
export const meta = writable<StoreMeta>({
  status: 'saved',
  lastSavedAt: null,
  lastError: null,
  saveMode: fsAccessAvailable() ? 'in-place' : 'download',
  loadError: null,
  loadErrorRaw: null,
});

export function initFromDocument() {
  const result = loadInitialState();
  if (!result.ok) {
    meta.update((m) => ({
      ...m,
      loadError: result.error ?? 'Unknown load error',
      loadErrorRaw: result.rawIsland ?? null,
    }));
    // Deliberately do NOT set appState — the UI must show the recovery
    // screen and refuse to let a save happen until the user resolves this,
    // otherwise the next save would overwrite a merely-corrupted file with
    // an empty one.
    return;
  }
  appState.set(result.state);
}

function markDirty() {
  meta.update((m) => (m.status === 'stale-download' ? m : { ...m, status: 'dirty' }));
}

// --- Mutation helpers (all mark dirty) ---------------------------------

export function mintId(prefix: 'task' | 'project'): string {
  let id = '';
  appState.update((s) => {
    const n = s.nextIdCounter;
    id = `${prefix === 'task' ? 't' : 'p'}-${n.toString(36)}`;
    return { ...s, nextIdCounter: n + 1 };
  });
  markDirty();
  return id;
}

export function addTask(task: Task) {
  appState.update((s) => ({ ...s, tasks: [...s.tasks, task] }));
  markDirty();
}

export function updateTask(id: string, patch: Partial<Task>) {
  appState.update((s) => ({
    ...s,
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));
  markDirty();
}

export function logActivity(id: string, text: string) {
  appState.update((s) => ({
    ...s,
    tasks: s.tasks.map((t) => {
      if (t.id !== id) return t;
      const entry: ActivityEntry = { at: new Date().toISOString(), text };
      const activity = [...t.activity, entry].slice(-ACTIVITY_LOG_CAP);
      return { ...t, activity };
    }),
  }));
  markDirty();
}

/** Soft-delete: sets deletedAt rather than removing the task, so an undo
 *  buffer / Trash view can restore it. See plan: destructive keyboard
 *  actions + explicit-save is otherwise dangerous. */
export function softDeleteTask(id: string) {
  updateTask(id, { deletedAt: new Date().toISOString() });
}

export function restoreTask(id: string) {
  updateTask(id, { deletedAt: undefined });
}

export function updateSettings(patch: Partial<AppState['settings']>) {
  appState.update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  markDirty();
}

export function addProject(project: Project) {
  appState.update((s) => ({ ...s, projects: [...s.projects, project] }));
  markDirty();
}

export function updateProject(id: string, patch: Partial<Project>) {
  appState.update((s) => ({
    ...s,
    projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }));
  markDirty();
}

/** Removes the project itself, but never the tasks in it — they're just
 *  unassigned (projectId cleared), not deleted. A project is an
 *  organizational label; the tasks are the data worth protecting. */
export function removeProject(id: string) {
  appState.update((s) => ({
    ...s,
    projects: s.projects.filter((p) => p.id !== id),
    tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
  }));
  markDirty();
}

// --- Save orchestration -------------------------------------------------

/**
 * Save the current state. Must be called from a user-gesture context
 * (click/keydown) the first time, since showSaveFilePicker requires
 * transient activation. Tries in-place save via a cached (or newly granted)
 * file handle; falls back to download if the API is unavailable or the
 * handle write fails.
 */
export async function save(): Promise<void> {
  if (shell === null) {
    throw new Error('save() called before initShell() — no pristine shell captured.');
  }
  const m = get(meta);
  if (m.loadError) {
    throw new Error('Cannot save while the loaded file has an unresolved data error.');
  }

  meta.update((mm) => ({ ...mm, status: 'saving' }));
  const state = get(appState);

  // Bump/rotate the periodic-backup counter as part of every save; the UI
  // layer watches this to decide when to nudge the user for a JSON backup.
  const nextState: AppState = { ...state, savesSinceBackup: state.savesSinceBackup + 1 };
  appState.set(nextState);

  const html = buildDocumentToSave(shell, nextState);

  try {
    let handle = getCachedHandle();
    if (!handle && fsAccessAvailable()) {
      handle = await pickSaveHandle(suggestFilename());
    }

    if (handle) {
      await writeToHandle(handle, html);
      meta.update((mm) => ({
        ...mm,
        status: 'saved',
        saveMode: 'in-place',
        lastSavedAt: new Date().toISOString(),
        lastError: null,
      }));
      return;
    }

    // No handle available (API unsupported, or user hasn't granted one) —
    // fall back to download. This leaves the CURRENT TAB showing a now-stale
    // copy, so we lock further edits behind an explicit "stale-download"
    // status until the user reloads from the freshly downloaded file.
    downloadAsFile(html, suggestFilename());
    meta.update((mm) => ({
      ...mm,
      status: 'stale-download',
      saveMode: 'download',
      lastSavedAt: new Date().toISOString(),
      lastError: null,
    }));
  } catch (e) {
    meta.update((mm) => ({
      ...mm,
      status: 'error',
      lastError: (e as Error).message,
    }));
    throw e;
  }
}

/** Explicit JSON-only export — independent recovery path even if the HTML
 *  shell itself is ever destroyed. */
export function exportJsonBackup(): void {
  const state = get(appState);
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  a.href = url;
  a.download = `task-planner-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  appState.update((s) => ({ ...s, savesSinceBackup: 0 }));
}

export function importJsonBackup(json: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json) as AppState;
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) {
      return { ok: false, error: 'File does not look like a task-planner backup.' };
    }
    appState.set(parsed);
    markDirty();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// --- Unsaved-changes guard ----------------------------------------------

export function installUnsavedChangesGuard() {
  window.addEventListener('beforeunload', (e) => {
    const m = get(meta);
    if (m.status === 'dirty' || m.status === 'saving') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
