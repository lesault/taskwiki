<script lang="ts">
  // Inbox: rushed quick-add captures land here for review/correction before
  // being promoted to the active list — unless the user explicitly skipped
  // the Inbox at capture time (see QuickAddBar).
  import { appState, updateTask, logActivity } from '../lib/store';
  import { todayISO } from '../lib/util';
  import TaskRow from './TaskRow.svelte';

  let { onEdit }: { onEdit: (task: import('../lib/types').Task) => void } = $props();

  const today = todayISO();
  const inboxTasks = $derived($appState.tasks.filter((t) => t.inInbox && !t.deletedAt));

  function promote(task: import('../lib/types').Task) {
    updateTask(task.id, { inInbox: false });
    logActivity(task.id, 'Promoted from Inbox to active list');
  }
</script>

<div class="view">
  <h2>Inbox <span class="count">{inboxTasks.length}</span></h2>
  <p class="hint">Rushed captures land here. Review, correct, then Promote to your active list.</p>
  {#if inboxTasks.length === 0}
    <p class="empty">Inbox is empty.</p>
  {:else}
    {#each inboxTasks as task (task.id)}
      {@const project = $appState.projects.find((p) => p.id === task.projectId)}
      <TaskRow {task} {today} {project} {onEdit} onPromote={promote} />
    {/each}
  {/if}
</div>

<style>
  .view { padding: 12px; }
  .count { font-weight: 400; color: var(--text-dim); font-size: 0.8em; }
  .hint { color: var(--text-dim); font-size: 13px; margin: 4px 0 12px; }
  .empty { color: var(--text-dim); padding: 2rem; text-align: center; }
</style>
