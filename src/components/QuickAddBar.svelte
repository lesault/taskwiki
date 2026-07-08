<script lang="ts">
  // One-line quick-add. Default routes new tasks to the Inbox for later
  // review (per user's stated workflow: rushed captures get corrected
  // before hitting the real plan). Two ways to skip the Inbox and go
  // straight to the active list: type the `!!` token, or hold Shift while
  // pressing Enter — both covering the "I had time to enter this carefully"
  // case the user described.
  import { appState, addTask, addProject, mintId } from '../lib/store';
  import { parseQuickAdd } from '../lib/quickadd';
  import { formatDateHuman } from '../lib/util';
  import type { Task } from '../lib/types';

  let value = $state('');
  let inputEl: HTMLInputElement;

  export function focusInput() {
    inputEl?.focus();
  }

  // Live parse preview — shown as chips below the input so the shorthand
  // syntax is never a memory burden: you see what will actually be created
  // before you commit it.
  const preview = $derived(value.trim() ? parseQuickAdd(value) : null);

  /** Resolve a #project tag to an existing project, or create it on the fly.
   *  A silently-dropped #tag (when no project of that name exists yet) would
   *  be a quiet data-loss bug during rushed capture — the whole point of
   *  quick-add is that whatever you typed doesn't get lost. */
  function resolveOrCreateProjectId(tag: string | undefined): string | undefined {
    if (!tag) return undefined;
    const existing = $appState.projects.find((p) => p.name.toLowerCase() === tag.toLowerCase());
    if (existing) return existing.id;
    const id = mintId('project');
    addProject({ id, name: tag, description: '', status: 'todo', labels: [] });
    return id;
  }

  function submit(forceSkipInbox: boolean) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const parsed = parseQuickAdd(trimmed);
    if (!parsed.title) return; // whole input was tokens, nothing to title the task with

    const skipInbox = forceSkipInbox || parsed.skipInbox;
    const id = mintId('task');
    const task: Task = {
      id,
      title: parsed.title,
      notes: '',
      status: 'todo',
      direction: parsed.assignee ? 'waiting' : 'mine',
      assignee: parsed.assignee,
      priority: parsed.priority ?? 'med',
      deadline: parsed.deadline,
      durationMins: parsed.durationMins,
      projectId: resolveOrCreateProjectId(parsed.projectTag),
      labels: [],
      inInbox: !skipInbox,
      createdAt: new Date().toISOString(),
      activity: [{ at: new Date().toISOString(), text: skipInbox ? 'Created (added directly to active list)' : 'Created (in Inbox)' }],
    };
    addTask(task);
    value = '';
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit(e.shiftKey);
    }
  }
</script>

<div class="wrap">
  <div class="bar">
    <input
      type="text"
      bind:this={inputEl}
      bind:value
      onkeydown={onKeydown}
      placeholder="Quick add: title #project !high ~30m @2026-07-15 >Jane   (Shift+Enter or !! = skip Inbox)"
      aria-label="Quick add task"
    />
    <button class="btn primary" onclick={() => submit(false)}>Add</button>
  </div>
  {#if preview}
    <div class="preview">
      <span class="preview-title">{preview.title || '…'}</span>
      {#if preview.assignee}<span class="chip accent">waiting on {preview.assignee}</span>{/if}
      {#if preview.projectTag}<span class="chip">{preview.projectTag}</span>{/if}
      {#if preview.priority === 'high'}<span class="chip danger">high</span>{/if}
      {#if preview.priority === 'low'}<span class="chip">low</span>{/if}
      {#if preview.deadline}<span class="chip">due {formatDateHuman(preview.deadline)}</span>{/if}
      {#if preview.durationMins}<span class="chip">~{preview.durationMins}m</span>{/if}
      {#if preview.skipInbox}<span class="chip success">skips Inbox</span>{/if}
    </div>
  {/if}
</div>

<style>
  .wrap {
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    transition: box-shadow var(--duration-fast) var(--ease-out);
  }
  .wrap:focus-within { box-shadow: inset 0 -2px 0 var(--accent-solid); }
  .bar { display: flex; gap: var(--space-2); padding: var(--space-3); }
  input { flex: 1; }
  .preview {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-1);
    padding: 0 var(--space-3) var(--space-2);
    font-size: 12px;
  }
  .preview-title { color: var(--text-dim); font-style: italic; margin-right: 2px; }
</style>
