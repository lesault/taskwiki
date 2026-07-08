<script lang="ts">
  // Projects grouped by status (a lightweight board — click-to-change status
  // rather than drag-and-drop; full drag-drop Kanban is a deferred
  // fast-follow per the plan, since the core loop doesn't depend on it).
  import { appState, addProject, mintId, updateTask, logActivity } from '../lib/store';
  import { todayISO } from '../lib/util';
  import TaskRow from './TaskRow.svelte';
  import type { Task, TaskStatus } from '../lib/types';

  let { onEdit }: { onEdit: (task: Task) => void } = $props();

  const today = todayISO();
  const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'blocked', 'done'];
  const STATUS_LABEL: Record<TaskStatus, string> = {
    todo: 'Todo', 'in-progress': 'In progress', blocked: 'Blocked', done: 'Done',
  };

  let newProjectName = $state('');
  let selectedProjectId = $state<string | null>(null);

  $effect(() => {
    if (!selectedProjectId && $appState.projects.length > 0) {
      selectedProjectId = $appState.projects[0].id;
    }
  });

  function createProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const id = mintId('project');
    addProject({ id, name, description: '', status: 'todo', labels: [] });
    newProjectName = '';
    selectedProjectId = id;
  }

  const projectTasks = $derived(
    $appState.tasks.filter((t) => !t.deletedAt && !t.inInbox && t.projectId === selectedProjectId)
  );

  function moveStatus(task: Task, status: TaskStatus) {
    updateTask(task.id, { status });
    logActivity(task.id, `Status → ${STATUS_LABEL[status]}`);
  }
</script>

<div class="view">
  <h2>Projects</h2>

  <div class="new-project">
    <input type="text" placeholder="New project name…" bind:value={newProjectName} onkeydown={(e) => e.key === 'Enter' && createProject()} />
    <button class="btn" onclick={createProject}>Add project</button>
  </div>

  {#if $appState.projects.length === 0}
    <p class="empty">No projects yet — add one above.</p>
  {:else}
    <div class="tabs">
      {#each $appState.projects as p (p.id)}
        <button class="btn subtle" class:active={p.id === selectedProjectId} onclick={() => (selectedProjectId = p.id)}>{p.name}</button>
      {/each}
    </div>

    {#if selectedProjectId}
      <div class="board">
        {#each STATUSES as status (status)}
          <div class="column">
            <h3>{STATUS_LABEL[status]}</h3>
            {#each projectTasks.filter((t) => t.status === status) as task (task.id)}
              <div class="card">
                <TaskRow {task} {today} {onEdit} />
                <div class="move">
                  {#each STATUSES.filter((s) => s !== status) as target}
                    <button class="btn subtle small" onclick={() => moveStatus(task, target)}>→ {STATUS_LABEL[target]}</button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .view { padding: 12px; }
  .new-project { display: flex; gap: 8px; margin-bottom: 12px; }
  .new-project input { flex: 1; }
  .tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
  .tabs .active { background: var(--accent-bg); color: var(--accent); }
  .board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .column { background: var(--bg-raised); border-radius: 8px; padding: 8px; min-height: 100px; }
  .column h3 { font-size: 12px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 6px; }
  .card { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px; }
  .move { display: flex; flex-wrap: wrap; gap: 2px; padding: 0 6px 6px; }
  .btn.small { font-size: 11px; padding: 2px 6px; }
  .empty { color: var(--text-dim); padding: 2rem; text-align: center; }
  @media (max-width: 800px) { .board { grid-template-columns: 1fr; } }
</style>
