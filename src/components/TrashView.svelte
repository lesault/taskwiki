<script lang="ts">
  // Soft-deleted tasks live here rather than being hard-deleted, so a
  // destructive keyboard action under an explicit-save model stays
  // recoverable (see plan: "delete is soft-delete with undo").
  import { appState, restoreTask, logActivity } from '../lib/store';

  const trashed = $derived($appState.tasks.filter((t) => t.deletedAt));

  function restore(id: string) {
    restoreTask(id);
    logActivity(id, 'Restored from Trash');
  }
</script>

<div class="view">
  <h2>Trash <span class="count">{trashed.length}</span></h2>
  {#if trashed.length === 0}
    <p class="empty">Trash is empty.</p>
  {:else}
    {#each trashed as task (task.id)}
      <div class="row">
        <span class="title">{task.title}</span>
        <span class="deleted-at">deleted {new Date(task.deletedAt!).toLocaleString()}</span>
        <button class="btn" onclick={() => restore(task.id)}>Restore</button>
      </div>
    {/each}
  {/if}
</div>

<style>
  .view { padding: var(--space-4); max-width: 900px; }
  .count { font-weight: 400; color: var(--text-dim); font-size: 0.8em; }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-2);
    border-bottom: 1px solid var(--border);
    transition: background var(--duration-fast) var(--ease-out);
  }
  .row:hover { background: var(--surface); }
  .title { flex: 1; color: var(--text); }
  .deleted-at { color: var(--text-dim); font-size: 11px; font-family: var(--mono); }
  .empty { color: var(--text-dim); padding: var(--space-6) 0; text-align: center; }
</style>
