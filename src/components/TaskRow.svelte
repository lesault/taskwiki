<script lang="ts">
  // Shared single-line task renderer used by Inbox / Today / All-tasks.
  import type { Task, Project } from '../lib/types';
  import { formatDateHuman, isOverdue, isDueToday } from '../lib/util';
  import { updateTask, softDeleteTask, logActivity } from '../lib/store';
  import IconSquare from './icons/IconSquare.svelte';
  import IconCheckSquare from './icons/IconCheckSquare.svelte';
  import IconTrash from './icons/IconTrash.svelte';
  import IconArrowRight from './icons/IconArrowRight.svelte';

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
    {#if task.status === 'done'}<IconCheckSquare />{:else}<IconSquare />{/if}
  </button>

  <div class="main">
    <button class="title" onclick={() => onEdit(task)}>{task.title}</button>
    <div class="meta">
      {#if task.direction === 'waiting'}
        <span class="chip accent">waiting on {task.assignee ?? '?'}</span>
      {/if}
      {#if project}<span class="chip">{project.name}</span>{/if}
      {#if task.priority === 'high'}<span class="chip danger">high</span>{/if}
      {#if task.deadline}
        <span class="chip" class:danger={overdue} class:warn={dueToday}>
          due {formatDateHuman(task.deadline)}
        </span>
      {/if}
      {#if task.plannedDate}<span class="chip success">planned {formatDateHuman(task.plannedDate)}</span>{/if}
      {#if task.durationMins}<span class="chip">~{task.durationMins}m</span>{/if}
      {#if task.followUpDate}<span class="chip warn">chase {formatDateHuman(task.followUpDate)}</span>{/if}
    </div>
  </div>

  <div class="actions">
    {#if onPromote}
      <button class="btn subtle" onclick={() => onPromote?.(task)} title="Promote to active list">
        Promote<IconArrowRight size={13} />
      </button>
    {/if}
    <button class="btn subtle" onclick={() => onEdit(task)} title="Edit">Edit</button>
    <button class="btn subtle icon-only" onclick={del} title="Move to Trash" aria-label="Move to Trash">
      <IconTrash />
    </button>
  </div>
</div>

<style>
  .row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 10px;
    border-bottom: 1px solid var(--border);
    transition: background var(--duration-fast) var(--ease-out);
  }
  .row:hover { background: var(--surface); }
  .row:hover .actions { opacity: 1; }
  .row.done .title { text-decoration: line-through; color: var(--text-dim); }
  .check {
    background: none;
    border: none;
    padding: 2px;
    color: var(--text-dim);
    display: flex;
    transition: color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
  }
  .check:hover { color: var(--accent); transform: scale(1.08); }
  .main { flex: 1; min-width: 0; }
  .title {
    background: none;
    border: none;
    text-align: left;
    font-size: 14px;
    color: var(--ink);
    padding: 0;
    transition: color var(--duration-fast) var(--ease-out);
  }
  .title:hover { color: var(--accent); }
  .meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
  .actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-out);
  }
  .actions:focus-within { opacity: 1; }
  .icon-only { padding: 6px; }
  @media (hover: none) {
    /* touch devices have no hover — keep actions reachable */
    .actions { opacity: 1; }
  }
</style>
