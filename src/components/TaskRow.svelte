<script lang="ts">
  // Shared single-line task renderer used by Inbox / Today / All-tasks.
  import type { Task, Project } from '../lib/types';
  import { formatDateHuman, isOverdue, isDueToday } from '../lib/util';
  import { updateTask, softDeleteTask, logActivity } from '../lib/store';

  let {
    task,
    today,
    project,
    onEdit,
    onPromote,
  }: {
    task: Task;
    today: string;
    project?: Project;
    onEdit: (task: Task) => void;
    onPromote?: (task: Task) => void;
  } = $props();

  const overdue = $derived(isOverdue(task.deadline, today));
  const dueToday = $derived(isDueToday(task.deadline, today));

  function toggleDone() {
    const next = task.status === 'done' ? 'todo' : 'done';
    updateTask(task.id, { status: next });
    logActivity(task.id, next === 'done' ? 'Marked done' : 'Reopened');
  }

  function del() {
    softDeleteTask(task.id);
    logActivity(task.id, 'Moved to Trash');
  }
</script>

<div class="row" class:done={task.status === 'done'}>
  <button class="check" onclick={toggleDone} aria-label={task.status === 'done' ? 'Reopen task' : 'Mark done'}>
    {task.status === 'done' ? '☑' : '☐'}
  </button>

  <div class="main">
    <button class="title" onclick={() => onEdit(task)}>{task.title}</button>
    <div class="meta">
      {#if task.direction === 'waiting'}
        <span class="badge accent">waiting on {task.assignee ?? '?'}</span>
      {/if}
      {#if project}<span class="badge">{project.name}</span>{/if}
      {#if task.priority === 'high'}<span class="badge danger">high</span>{/if}
      {#if task.deadline}
        <span class="badge" class:danger={overdue} class:warn={dueToday}>
          due {formatDateHuman(task.deadline)}
        </span>
      {/if}
      {#if task.plannedDate}<span class="badge success">planned {formatDateHuman(task.plannedDate)}</span>{/if}
      {#if task.durationMins}<span class="badge">~{task.durationMins}m</span>{/if}
      {#if task.followUpDate}<span class="badge warn">chase {formatDateHuman(task.followUpDate)}</span>{/if}
    </div>
  </div>

  <div class="actions">
    {#if onPromote}
      <button class="btn subtle" onclick={() => onPromote?.(task)} title="Promote to active list">Promote</button>
    {/if}
    <button class="btn subtle" onclick={() => onEdit(task)} title="Edit">Edit</button>
    <button class="btn subtle" onclick={del} title="Move to Trash">🗑</button>
  </div>
</div>

<style>
  .row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
  .row.done .title { text-decoration: line-through; color: var(--text-dim); }
  .check { background: none; border: none; font-size: 16px; padding: 2px; }
  .main { flex: 1; min-width: 0; }
  .title { background: none; border: none; text-align: left; font-size: 14px; color: var(--text-h); padding: 0; }
  .title:hover { text-decoration: underline; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .actions { display: flex; gap: 4px; flex-shrink: 0; }
</style>
