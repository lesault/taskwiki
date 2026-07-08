<script lang="ts">
  import { meta, save, exportJsonBackup, importJsonBackup } from './lib/store';
  import RecoveryScreen from './components/RecoveryScreen.svelte';
  import QuickAddBar from './components/QuickAddBar.svelte';
  import TodayView from './components/TodayView.svelte';
  import InboxView from './components/InboxView.svelte';
  import AllTasksView from './components/AllTasksView.svelte';
  import ProjectsView from './components/ProjectsView.svelte';
  import TrashView from './components/TrashView.svelte';
  import TaskEditor from './components/TaskEditor.svelte';
  import SchedulePanel from './components/SchedulePanel.svelte';
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

  const statusLabel = $derived.by(() => {
    switch ($meta.status) {
      case 'saved': return '✅ Saved';
      case 'dirty': return '● Unsaved changes';
      case 'saving': return '⏳ Saving…';
      case 'error': return `❌ Save failed: ${$meta.lastError}`;
      case 'stale-download': return '⚠️ Stale copy — see banner';
    }
  });
</script>

<svelte:window onkeydown={onGlobalKeydown} />

{#if $meta.loadError}
  <RecoveryScreen error={$meta.loadError} rawIsland={$meta.loadErrorRaw} />
{:else}
  {#if $meta.status === 'stale-download'}
    <div class="stale-banner">
      <strong>⚠️ You just downloaded a new copy of this file.</strong>
      This browser tab is now showing a <strong>stale</strong> version. Close this tab and open the
      downloaded file to keep working safely — further edits here won't be reflected in what you downloaded.
      <button class="btn subtle" onclick={continueDespiteStaleDownload}>Continue editing this tab anyway (risk losing these edits)</button>
    </div>
  {/if}

  <header>
    <nav>
      {#each VIEWS as v, i}
        <button class="btn subtle" class:active={view === v} onclick={() => (view = v)}>{i + 1}. {VIEW_LABEL[v]}</button>
      {/each}
    </nav>
    <div class="header-actions">
      <span class="status" class:error={$meta.status === 'error'}>{statusLabel}</span>
      <button class="btn" onclick={doSave}>Save (⌘S)</button>
      <button class="btn subtle" onclick={() => (showSchedule = true)}>🗓 Schedule…</button>
      <button class="btn subtle" onclick={exportJsonBackup}>Export JSON backup</button>
      <button class="btn subtle" onclick={triggerImport}>Import JSON backup</button>
      <input type="file" accept="application/json" bind:this={importFileInput} onchange={handleImportFile} hidden />
      <button class="btn subtle" onclick={() => (showHelp = !showHelp)}>?</button>
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
    <div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && (showHelp = false)}>
      <div class="modal">
        <h2>Keyboard shortcuts</h2>
        <ul>
          <li><code>/</code> or <code>n</code> — focus quick-add</li>
          <li><code>Enter</code> — add task to Inbox &nbsp; <code>Shift+Enter</code> — add straight to active list (skip Inbox)</li>
          <li><code>1</code>–<code>5</code> — switch views (Today / Inbox / All tasks / Projects / Trash)</li>
          <li><code>⌘S</code> / <code>Ctrl+S</code> — save</li>
          <li><code>Esc</code> — close a dialog</li>
          <li><code>?</code> — toggle this help</li>
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
  header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
  nav { display: flex; gap: 4px; flex-wrap: wrap; }
  nav .active { background: var(--accent-bg); color: var(--accent); }
  .header-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .status { font-size: 13px; color: var(--text-dim); }
  .status.error { color: var(--danger); }
  .stale-banner { background: var(--danger-bg); color: var(--danger); padding: 10px 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .import-msg { padding: 4px 12px; font-size: 13px; color: var(--text-dim); }
  main { flex: 1; overflow-y: auto; }
  .reminder { font-size: 13px; color: var(--text-dim); }
</style>
