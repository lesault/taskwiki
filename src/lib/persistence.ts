// Persistence engine — the self-save mechanism that makes this app a
// portable, dependency-free single HTML file.
//
// Design constraints (see plan's "Persistence engine" section for the why):
//  1. Never serialize the live, Svelte-rendered DOM. State lives only in a
//     JSON data island; we splice fresh JSON into a *pristine* copy of the
//     document captured before Svelte ever mounted.
//  2. `<script type="application/json">` is an HTML raw-text element — the
//     browser does not escape `<` inside it. Every `<` must be escaped to
//     `<` before writing, or a task note containing the literal string
//     "</script>" truncates and corrupts the file.
//  3. A JSON-parse failure on load must never boot to empty state — that
//     would let the next save overwrite a merely-corrupted file with
//     nothing, turning recoverable damage into permanent loss.
//  4. In-place save (File System Access API) needs a user gesture and a
//     granted handle; it may be unavailable (older browser, non-file
//     context, policy). Download-save is the fallback, but it leaves the
//     open tab pointing at a now-stale copy — callers must lock editing
//     after a download-save (see staleAfterDownload below).

import { CURRENT_SCHEMA_VERSION, emptyState, type AppState } from './types';

const DATA_ISLAND_ID = 'app-data';
const START_MARKER = '<!--DATA-START-->';
const END_MARKER = '<!--DATA-END-->';

export interface LoadResult {
  ok: boolean;
  state: AppState;
  /** Present when ok === false: the raw, unparsed island text, so the UI can
   *  show it for manual recovery instead of silently discarding it. */
  rawIsland?: string;
  error?: string;
}

/**
 * Capture a pristine copy of the whole document, taken BEFORE Svelte mounts
 * into #app. This is the shell every save re-uses. Must be called exactly
 * once, at the very top of main.ts, before `mount(App, ...)`.
 */
export function captureShell(): string {
  const appEl = document.getElementById('app');
  if (appEl && appEl.childNodes.length > 0) {
    // Defensive: if this ever fires, something mounted into #app before we
    // captured the shell, and every future save would bake rendered nodes
    // into the file. Fail loudly rather than silently corrupting saves.
    throw new Error(
      'captureShell() called after #app already has content — shell would not be pristine.'
    );
  }
  return document.documentElement.outerHTML;
}

/**
 * Read the data island out of the *live* document at startup (not the
 * captured shell — the live DOM is what the browser actually parsed from
 * disk). Returns a structured result so callers can distinguish "empty file,
 * start fresh" from "corrupted file, do not touch".
 */
export function loadInitialState(): LoadResult {
  const island = document.getElementById(DATA_ISLAND_ID);
  if (!island) {
    return {
      ok: false,
      state: emptyState(),
      error: 'No #app-data element found in document — unexpected document shape.',
    };
  }

  const raw = island.textContent ?? '';
  const trimmed = raw.trim();

  // A brand-new, never-saved copy of the shell ships with `{}` as a
  // placeholder body — that's a legitimate "start fresh" case, not corruption.
  if (trimmed === '' || trimmed === '{}') {
    return { ok: true, state: emptyState() };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      state: emptyState(),
      rawIsland: raw,
      error: `Data island failed to parse as JSON: ${(e as Error).message}`,
    };
  }

  const migrated = migrate(parsed);
  if (migrated === null) {
    return {
      ok: false,
      state: emptyState(),
      rawIsland: raw,
      error: 'Data island parsed as JSON but does not look like a valid app state.',
    };
  }

  return { ok: true, state: migrated };
}

/** Very small migration shim — extend as schemaVersion increments. */
function migrate(parsed: unknown): AppState | null {
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Partial<AppState>;
  if (!Array.isArray(obj.tasks) || !Array.isArray(obj.projects)) return null;

  if (obj.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return obj as AppState;
  }

  // No prior versions exist yet; once they do, translate here and bump
  // schemaVersion on the returned object. For now, accept anything that has
  // the right shape and stamp the current version.
  return { ...emptyState(), ...obj, schemaVersion: CURRENT_SCHEMA_VERSION } as AppState;
}

/**
 * Serialize state to a string safe to embed inside
 * <script type="application/json">. Escaping every `<` to `<` is the
 * load-bearing line in this whole module — see file header point 2.
 */
export function serializeState(state: AppState): string {
  return JSON.stringify(state).replace(/</g, '\\u003c');
}

/**
 * Splice fresh data into a pristine shell via a bounded string replacement
 * between the DATA-START/DATA-END markers. Never touches the live DOM.
 */
export function buildDocumentToSave(shell: string, state: AppState): string {
  const startIdx = shell.indexOf(START_MARKER);
  const endIdx = shell.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      'DATA-START/DATA-END markers not found in captured shell — refusing to save to avoid corrupting the file.'
    );
  }
  const before = shell.slice(0, startIdx);
  const after = shell.slice(endIdx + END_MARKER.length);
  const dataJson = serializeState(state);
  const newIsland = `${START_MARKER}<script id="${DATA_ISLAND_ID}" type="application/json">${dataJson}</script>${END_MARKER}`;

  // outerHTML never includes the doctype — restore it.
  return `<!doctype html>\n${before}${newIsland}${after}`;
}

// --- Save targets -----------------------------------------------------

export type SaveMode = 'in-place' | 'download' | 'unavailable';

export function fsAccessAvailable(): boolean {
  return typeof (window as any).showSaveFilePicker === 'function';
}

let cachedHandle: FileSystemFileHandle | null = null;

/**
 * Ask the user (via a user-gesture-triggered picker) for a file to save
 * in-place into, and cache the handle for subsequent saves this session.
 * Must be called from within a click/keydown handler — the API requires
 * transient user activation.
 */
export async function pickSaveHandle(suggestedName: string): Promise<FileSystemFileHandle | null> {
  if (!fsAccessAvailable()) return null;
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [{ description: 'HTML file', accept: { 'text/html': ['.html'] } }],
    });
    cachedHandle = handle;
    return handle;
  } catch (e) {
    // AbortError = user cancelled the picker; treat as "no handle yet",
    // not as an error to surface.
    if ((e as Error).name === 'AbortError') return null;
    throw e;
  }
}

export function getCachedHandle(): FileSystemFileHandle | null {
  return cachedHandle;
}

/**
 * Write `html` to the given handle. Uses createWritable()/close(), which
 * Chromium implements as a swap-on-close — more atomic than a raw truncate,
 * though a bad write can still corrupt the file since it IS the database.
 * The periodic JSON backup (see store.ts) is the real safety net for that.
 */
export async function writeToHandle(handle: FileSystemFileHandle, html: string): Promise<void> {
  const writable = await (handle as any).createWritable();
  await writable.write(html);
  await writable.close();
}

/**
 * Download `html` as a new file. This is a data-loss trap if the UI doesn't
 * react to it: the open tab still holds the STALE copy after this call, so
 * the caller (store.ts) MUST set a "stale after download" flag and lock
 * further edits until the user reopens the freshly downloaded file.
 */
export function downloadAsFile(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Suggest a filename that sorts/reads sensibly; callers may override. */
export function suggestFilename(base = 'task-planner'): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${base}-${stamp}.html`;
}
