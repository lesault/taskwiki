<script lang="ts">
  // The reminder surface: since a static file can't push notifications when
  // closed, this landing view IS the reminder — "here's what to work on
  // right now" — shown whenever the file is opened.
  import { appState } from '../lib/store';
  import { todayISO, isOverdue, isDueToday } from '../lib/util';
  import { generateBulkDayPlan, downloadIcs } from '../lib/ics';
  import TaskRow from './TaskRow.svelte';
  import type { Task } from '../lib/types';

  let { onEdit }: { onEdit: (task: Task) => void } = $props();

  const today = todayISO();
  let overflowWarning = $state<string | null>(null);

  function exportTodayPlan() {
    const { ics, overflowTaskIds } = generateBulkDayPlan($appState.tasks, today, $appState.settings);
    downloadIcs(ics, `task-planner-plan-${today}.ics`);
    overflowWarning =
      overflowTaskIds.length > 0
        ? `${overflowTaskIds.length} task(s) didn't fit in today's working hours and were left out of the export.`
        : null;
  }

  const active = $derived($appState.tasks.filter((t) => !t.deletedAt && !t.inInbox && t.status !== 'done'));

  const overdue = $derived(
    active.filter((t) => t.direction === 'mine' && isOverdue(t.deadline, today))
  );
  const dueOrPlannedToday = $derived(
    active.filter(
      (t) =>
        t.direction === 'mine' &&
        !isOverdue(t.deadline, today) &&
        (isDueToday(t.deadline, today) || t.plannedDate === today)
    ).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  );
  const waitingNeedsChase = $derived(
    active.filter((t) => t.direction === 'waiting' && t.followUpDate && t.followUpDate <= today)
  );
  // Excludes anything already surfaced above (overdue / due-or-planned-today)
  // — otherwise a task planned for today with a deadline in the next 7 days
  // would show twice, once per section, which reads as double-counted work.
  const upcoming = $derived(
    active.filter((t) => {
      if (t.direction !== 'mine' || !t.deadline) return false;
      if (t.deadline <= today) return false;
      if (t.plannedDate === today) return false;
      const d = new Date(t.deadline + 'T00:00:00');
      const diffDays = Math.round((d.getTime() - Date.now()) / 86_400_000);
      return diffDays <= 7;
    }).sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
  );

  const workOnNow = $derived.by(() => {
    const pool = overdue.length > 0 ? overdue : dueOrPlannedToday;
    if (pool.length === 0) return null;
    const byPriority = { high: 0, med: 1, low: 2 } as const;
    return [...pool].sort((a, b) => {
      const p = byPriority[a.priority] - byPriority[b.priority];
      if (p !== 0) return p;
      return (a.order ?? 99) - (b.order ?? 99);
    })[0];
  });

  function projectFor(t: Task) {
    return $appState.projects.find((p) => p.id === t.projectId);
  }
</script>

<div class="view">
  <div class="header-row">
    <h2>Today</h2>
    <button class="btn" onclick={exportTodayPlan}>📅 Export today's plan as .ics</button>
  </div>
  {#if overflowWarning}<p class="warn">⚠️ {overflowWarning}</p>{/if}

  {#if workOnNow}
    <div class="spotlight">
      <div class="spotlight-label">Work on this right now:</div>
      <TaskRow task={workOnNow} {today} project={projectFor(workOnNow)} {onEdit} />
    </div>
  {:else}
    <p class="empty">Nothing overdue or due today. 🎉</p>
  {/if}

  {#if overdue.length > 0}
    <h3 class="danger">Overdue ({overdue.length})</h3>
    {#each overdue as task (task.id)}
      <TaskRow {task} {today} project={projectFor(task)} {onEdit} />
    {/each}
  {/if}

  <h3>Due / planned today ({dueOrPlannedToday.length})</h3>
  {#if dueOrPlannedToday.length === 0}
    <p class="empty small">Nothing else scheduled for today.</p>
  {:else}
    {#each dueOrPlannedToday as task (task.id)}
      <TaskRow {task} {today} project={projectFor(task)} {onEdit} />
    {/each}
  {/if}

  {#if waitingNeedsChase.length > 0}
    <h3 class="warn">Waiting-for needing a chase ({waitingNeedsChase.length})</h3>
    {#each waitingNeedsChase as task (task.id)}
      <TaskRow {task} {today} project={projectFor(task)} {onEdit} />
    {/each}
  {/if}

  {#if upcoming.length > 0}
    <h3>Upcoming (next 7 days)</h3>
    {#each upcoming as task (task.id)}
      <TaskRow {task} {today} project={projectFor(task)} {onEdit} />
    {/each}
  {/if}
</div>

<style>
  .view { padding: 12px; }
  .header-row { display: flex; justify-content: space-between; align-items: center; }
  .warn { color: var(--warn); font-size: 13px; }
  h3 { margin: 20px 0 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-dim); }
  h3.danger { color: var(--danger); }
  h3.warn { color: var(--warn); }
  .spotlight { border: 1px solid var(--accent); border-radius: 8px; background: var(--accent-bg); margin: 12px 0 20px; }
  .spotlight-label { font-weight: 600; font-size: 13px; padding: 8px 10px 0; color: var(--accent); }
  .empty { color: var(--text-dim); padding: 1rem; }
  .empty.small { padding: 0.5rem 0; font-size: 13px; }
</style>
