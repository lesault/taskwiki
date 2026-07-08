<script lang="ts">
  // One-line quick-add. Default routes new tasks to the Inbox for later
  // review (per user's stated workflow: rushed captures get corrected
  // before hitting the real plan). Two ways to skip the Inbox and go
  // straight to the active list: type the `!!` token, or hold Shift while
  // pressing Enter — both covering the "I had time to enter this carefully"
  // case the user described.
  import { appState, addTask, addProject, mintId } from '../lib/store';
  import { parseQuickAdd } from '../lib/quickadd';
  import type { Task } from '../lib/types';

  let value = $state('');
  let inputEl: HTMLInputElement;

  export function focusInput() {
    inputEl?.focus();
  }

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

<style>
  .bar { display: flex; gap: 8px; padding: 10px; border-bottom: 1px solid var(--border); background: var(--bg-raised); }
  input { flex: 1; }
</style>
