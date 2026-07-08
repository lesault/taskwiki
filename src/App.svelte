<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { meta, appState, save, exportJsonBackup, importJsonBackup, updateSettings } from './lib/store';
  import { motionDuration } from './lib/motion';
  import RecoveryScreen from './components/RecoveryScreen.svelte';
  import QuickAddBar from './components/QuickAddBar.svelte';
  import TodayView from './components/TodayView.svelte';
  import InboxView from './components/InboxView.svelte';
  import AllTasksView from './components/AllTasksView.svelte';
  import ProjectsView from './components/ProjectsView.svelte';
  import TrashView from './components/TrashView.svelte';
  import TaskEditor from './components/TaskEditor.svelte';
  import SchedulePanel from './components/SchedulePanel.svelte';
  import IconCheck from './components/icons/IconCheck.svelte';
  import IconSpinner from './components/icons/IconSpinner.svelte';
  import IconAlertCircle from './components/icons/IconAlertCircle.svelte';
  import IconWarning from './components/icons/IconWarning.svelte';
  import IconCalendar from './components/icons/IconCalendar.svelte';
  import IconHelp from './components/icons/IconHelp.svelte';
  import IconSun from './components/icons/IconSun.svelte';
  import IconMoon from './components/icons/IconMoon.svelte';
  import IconMonitor from './components/icons/IconMonitor.svelte';
  import type { Task } from './lib/types';

  type View = 'today' | 'inbox' | 'all' | 'projects' | 'trash';
  let view = $state<View>('today');
  let editingTaskId = $state<string | null>(null);
  let showSchedule = $state(false);
  let showHelp = $state(false);
  let quickAddBar: QuickAddBar | undefined = $state();
  let importFileInput: HTMLInputElement | undefined = $state();
  let importMessage = $state<string | null>(null);

  const VIEW_LABEL: Record<View, string> = {
    today: 'Today', inbox: 'Inbox', all: 'All tasks', projects: 'Projects', trash: 'Trash',
  };
  const VIEWS: View[] = ['today', 'inbox', 'all', 'projects', 'trash'];

  // Apply the user's theme preference to the document root. 'system' removes
  // the override entirely, letting prefers-color-scheme govern — this must
  // stay reactive to $appState.settings.theme, which only exists once the
  // file has loaded (hence the guard).
  $effect(() => {
    const theme = $appState.settings?.theme;
    if (!theme || theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.dataset.theme = theme;
    }
  });

  function cycleTheme() {
    const order = ['system', 'light', 'dark'] as const;
    const current = $appState.settings.theme;
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateSettings({ theme: next });
  }

  function openEditor(task: Task) {
    editingTaskId = task.id;
  }

  async function doSave() {
    try {
      await save();
    } catch {
      // meta.lastError is already set by save(); the header status badge
      // surfaces it. Nothing further to do here.
    }
  }

  function continueDespiteStaleDownload() {
    // Explicit opt-out of the stale-download lock — see plan: download-save
    // is a data-loss trap, so we block by default, but a hard permanent lock
    // would strand anyone whose browser only supports download-mode saves.
    meta.update((m) => ({ ...m, status: 'dirty' }));
  }

  function triggerImport() {
    importFileInput?.click();
  }
  function handleImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importJsonBackup(String(reader.result));
      importMessage = result.ok ? 'Backup imported.' : `Import failed: ${result.error}`;
      setTimeout(() => (importMessage = null), 3000);
    };
    reader.readAsText(file);
  }

  function isTypingTarget(e: KeyboardEvent): boolean {
    const el = e.target as HTMLElement;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
  }

  function onGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      doSave();
      return;
    }
    if (isTypingTarget(e)) return; // let normal typing through everywhere else

    if (e.key === '/' || e.key.toLowerCase() === 'n') {
      e.preventDefault();
      quickAddBar?.focusInput();
      return;
    }
    if (e.key === '?') {
      showHelp = !showHelp;
      return;
    }
    const idx = parseInt(e.key, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= VIEWS.length) {
      view = VIEWS[idx - 1];
    }
  }
</script>

<svelte:window onkeydown={onGlobalKeydown} />

{#if $meta.loadError}
  <RecoveryScreen error={$meta.loadError} rawIsland={$meta.loadErrorRaw} />
{:else}
  {#if $meta.status === 'stale-download'}
    <div class="stale-banner">
      <IconWarning size={18} />
      <div>
        <strong>You just downloaded a new copy of this file.</strong>
        This browser tab is now showing a <strong>stale</strong> version. Close this tab and open the
        downloaded file to keep working safely — further edits here won't be reflected in what you downloaded.
      </div>
      <button class="btn subtle" onclick={continueDespiteStaleDownload}>Continue editing this tab anyway</button>
    </div>
  {/if}

  <header>
    <div class="brand">TaskWiki</div>
    <nav>
      {#each VIEWS as v, i}
        <button class="tab" class:active={view === v} onclick={() => (view = v)}>
          <kbd>{i + 1}</kbd>{VIEW_LABEL[v]}
        </button>
      {/each}
    </nav>
    <div class="header-actions">
      <span class="status" class:error={$meta.status === 'error'}>
        {#if $meta.status === 'saved'}<IconCheck size={14} />Saved
        {:else if $meta.status === 'dirty'}Unsaved changes
        {:else if $meta.status === 'saving'}<IconSpinner size={14} />Saving…
        {:else if $meta.status === 'error'}<IconAlertCircle size={14} />Save failed
        {:else if $meta.status === 'stale-download'}<IconWarning size={14} />Stale copy
        {/if}
      </span>
      <button class="btn" onclick={doSave}>Save<kbd>⌘S</kbd></button>
      <button class="btn subtle" onclick={() => (showSchedule = true)}><IconCalendar size={14} />Schedule…</button>
      <button class="btn subtle" onclick={exportJsonBackup}>Export JSON</button>
      <button class="btn subtle" onclick={triggerImport}>Import JSON</button>
      <input type="file" accept="application/json" bind:this={importFileInput} onchange={handleImportFile} hidden />
      <button class="btn subtle icon-only" onclick={cycleTheme} title="Theme: {$appState.settings.theme}" aria-label="Cycle theme">
        {#if $appState.settings.theme === 'light'}<IconSun />
        {:else if $appState.settings.theme === 'dark'}<IconMoon />
        {:else}<IconMonitor />
        {/if}
      </button>
      <button class="btn subtle icon-only" onclick={() => (showHelp = !showHelp)} aria-label="Help"><IconHelp /></button>
    </div>
  </header>
  {#if importMessage}<p class="import-msg">{importMessage}</p>{/if}

  <QuickAddBar bind:this={quickAddBar} />

  <main>
    {#if view === 'today'}<TodayView onEdit={openEditor} />
    {:else if view === 'inbox'}<InboxView onEdit={openEditor} />
    {:else if view === 'all'}<AllTasksView onEdit={openEditor} />
    {:else if view === 'projects'}<ProjectsView onEdit={openEditor} />
    {:else if view === 'trash'}<TrashView />
    {/if}
  </main>

  {#if editingTaskId}
    <TaskEditor taskId={editingTaskId} onClose={() => (editingTaskId = null)} />
  {/if}
  {#if showSchedule}
    <SchedulePanel onClose={() => (showSchedule = false)} />
  {/if}

  {#if showHelp}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (showHelp = false)} transition:fade={{ duration: motionDuration(140) }}>
      <div class="modal" transition:scale={{ duration: motionDuration(160), start: 0.97, opacity: 0, easing: quintOut }}>
        <h2>Keyboard shortcuts</h2>
        <ul class="shortcuts">
          <li><kbd>/</kbd><kbd>n</kbd> <span>focus quick-add</span></li>
          <li><kbd>Enter</kbd> <span>add to Inbox</span></li>
          <li><kbd>Shift</kbd><kbd>Enter</kbd> <span>add straight to active list (skip Inbox)</span></li>
          <li><kbd>1</kbd>–<kbd>5</kbd> <span>switch views</span></li>
          <li><kbd>⌘S</kbd> <span>save</span></li>
          <li><kbd>Esc</kbd> <span>close a dialog</span></li>
          <li><kbd>?</kbd> <span>toggle this help</span></li>
        </ul>
        <p class="reminder">Remember: this file <strong>is</strong> your data. Don't fork it — editing the same
          planner on two machines (or emailing copies to yourself and editing both) creates divergent copies
          with no merge path. Keep one canonical copy.</p>
        <button class="btn primary" onclick={() => (showHelp = false)}>Close</button>
      </div>
    </div>
  {/if}
{/if}

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
  }
  .brand {
    font-weight: 700;
    font-size: 14px;
    letter-spacing: -0.01em;
    color: var(--ink);
    margin-right: var(--space-2);
  }
  nav { display: flex; gap: 2px; flex-wrap: wrap; }
  .header-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
  .icon-only { padding: 6px; }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--text-dim);
    font-family: var(--mono);
  }
  .status.error { color: var(--danger); }
  .stale-banner {
    background: var(--danger-tint);
    color: var(--danger);
    padding: var(--space-3);
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .stale-banner > :global(svg) { flex-shrink: 0; margin-top: 2px; }
  .stale-banner > div { flex: 1; min-width: 240px; }
  .import-msg { padding: 4px var(--space-3); font-size: 13px; color: var(--text-dim); }
  main { flex: 1; overflow-y: auto; }
  .reminder { font-size: 13px; color: var(--text-dim); }

  kbd {
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    background: var(--bg);
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    padding: 1px 4px;
    line-height: 1.4;
  }
  .tab kbd { background: transparent; border-color: var(--border); }
  .tab.active kbd { border-color: var(--accent); }

  .shortcuts { list-style: none; padding: 0; margin: var(--space-3) 0; display: flex; flex-direction: column; gap: var(--space-2); }
  .shortcuts li { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .shortcuts span { color: var(--text-dim); margin-left: 4px; }
</style>
