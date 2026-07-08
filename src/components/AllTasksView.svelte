<script lang="ts">
  import { appState } from '../lib/store';
  import { todayISO } from '../lib/util';
  import TaskRow from './TaskRow.svelte';
  import type { Task } from '../lib/types';

  let { onEdit }: { onEdit: (task: Task) => void } = $props();

  const today = todayISO();

  let search = $state('');
  let statusFilter = $state<'all' | Task['status']>('all');
  let directionFilter = $state<'all' | Task['direction']>('all');
  let priorityFilter = $state<'all' | Task['priority']>('all');
  let projectFilter = $state<'all' | string>('all');

  const visible = $derived(
    $appState.tasks
      .filter((t) => !t.deletedAt && !t.inInbox)
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .filter((t) => directionFilter === 'all' || t.direction === directionFilter)
      .filter((t) => priorityFilter === 'all' || t.priority === priorityFilter)
      .filter((t) => projectFilter === 'all' || t.projectId === projectFilter)
      .filter((t) => !search.trim() || t.title.toLowerCase().includes(search.trim().toLowerCase()) || t.notes.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
  );

  function projectFor(t: Task) {
    return $appState.projects.find((p) => p.id === t.projectId);
  }
</script>

<div class="view">
  <h2>All tasks <span class="count">{visible.length}</span></h2>

  <div class="filters">
    <input type="text" placeholder="Search title/notes…" bind:value={search} />
    <select bind:value={statusFilter}>
      <option value="all">Any status</option>
      <option value="todo">Todo</option>
      <option value="in-progress">In progress</option>
      <option value="blocked">Blocked</option>
      <option value="done">Done</option>
    </select>
    <select bind:value={directionFilter}>
      <option value="all">Mine + waiting</option>
      <option value="mine">Mine</option>
      <option value="waiting">Waiting on someone</option>
    </select>
    <select bind:value={priorityFilter}>
      <option value="all">Any priority</option>
      <option value="high">High</option>
      <option value="med">Medium</option>
      <option value="low">Low</option>
    </select>
    <select bind:value={projectFilter}>
      <option value="all">Any project</option>
      {#each $appState.projects as p (p.id)}
        <option value={p.id}>{p.name}</option>
      {/each}
    </select>
  </div>

  {#if visible.length === 0}
    <p class="empty">No tasks match these filters.</p>
  {:else}
    {#each visible as task (task.id)}
      <TaskRow {task} {today} project={projectFor(task)} {onEdit} />
    {/each}
  {/if}
</div>

<style>
  .view { padding: 12px; }
  .count { font-weight: 400; color: var(--text-dim); font-size: 0.8em; }
  .filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
  .filters input { flex: 1; min-width: 160px; }
  .empty { color: var(--text-dim); padding: 2rem; text-align: center; }
</style>
