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
  .view { padding: 12px; }
  .count { font-weight: 400; color: var(--text-dim); font-size: 0.8em; }
  .row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
  .title { flex: 1; }
  .deleted-at { color: var(--text-dim); font-size: 12px; }
  .empty { color: var(--text-dim); padding: 2rem; text-align: center; }
</style>
