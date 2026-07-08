<script lang="ts">
  // Projects grouped by status (a lightweight board — click-to-change status
  // rather than drag-and-drop; full drag-drop Kanban is a deferred
  // fast-follow per the plan, since the core loop doesn't depend on it).
  import { appState, addProject, removeProject, mintId, updateTask, logActivity } from '../lib/store';
  import { todayISO } from '../lib/util';
  import TaskRow from './TaskRow.svelte';
  import IconArrowRight from './icons/IconArrowRight.svelte';
  import IconTrash from './icons/IconTrash.svelte';
  import IconWarning from './icons/IconWarning.svelte';
  import type { Task, TaskStatus } from '../lib/types';

  let { onEdit }: { onEdit: (task: Task) => void } = $props();

  const today = todayISO();
  const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'blocked', 'done'];
  const STATUS_LABEL: Record<TaskStatus, string> = {
    todo: 'Todo', 'in-progress': 'In progress', blocked: 'Blocked', done: 'Done',
  };

  let newProjectName = $state('');
  let selectedProjectId = $state<string | null>(null);
  let confirmingRemove = $state(false);

  $effect(() => {
    if (!selectedProjectId && $appState.projects.length > 0) {
      selectedProjectId = $appState.projects[0].id;
    }
  });

  function selectProject(id: string) {
    selectedProjectId = id;
    confirmingRemove = false;
  }

  function createProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const id = mintId('project');
    addProject({ id, name, description: '', status: 'todo', labels: [] });
    newProjectName = '';
    selectProject(id);
  }

  const selectedProject = $derived($appState.projects.find((p) => p.id === selectedProjectId));

  const projectTasks = $derived(
    $appState.tasks.filter((t) => !t.deletedAt && !t.inInbox && t.projectId === selectedProjectId)
  );
  const incompleteCount = $derived(projectTasks.filter((t) => t.status !== 'done').length);

  function moveStatus(task: Task, status: TaskStatus) {
    updateTask(task.id, { status });
    logActivity(task.id, `Status → ${STATUS_LABEL[status]}`);
  }

  function confirmRemove() {
    if (!selectedProjectId) return;
    removeProject(selectedProjectId);
    selectedProjectId = null; // the $effect above will pick the next project, if any
    confirmingRemove = false;
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
    <div class="tabs-row">
      <div class="tabs">
        {#each $appState.projects as p (p.id)}
          <button class="tab" class:active={p.id === selectedProjectId} onclick={() => selectProject(p.id)}>{p.name}</button>
        {/each}
      </div>
      {#if selectedProject && !confirmingRemove}
        <button class="btn subtle danger" onclick={() => (confirmingRemove = true)}>
          <IconTrash size={13} />Remove project
        </button>
      {/if}
    </div>

    {#if selectedProject && confirmingRemove}
      <div class="confirm-remove">
        <IconWarning size={14} />
        <span>
          Remove <strong>{selectedProject.name}</strong>?
          {#if projectTasks.length > 0}
            Its {projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}
            {#if incompleteCount > 0}(<strong>{incompleteCount} not done</strong>){/if}
            will stay — just unassigned from this project, not deleted.
          {/if}
        </span>
        <button class="btn danger-solid" onclick={confirmRemove}>Confirm remove</button>
        <button class="btn subtle" onclick={() => (confirmingRemove = false)}>Cancel</button>
      </div>
    {/if}

    {#if selectedProjectId}
      <div class="board">
        {#each STATUSES as status (status)}
          <div class="column">
            <h3>{STATUS_LABEL[status]} <span class="col-count">{projectTasks.filter((t) => t.status === status).length}</span></h3>
            {#each projectTasks.filter((t) => t.status === status) as task (task.id)}
              <div class="card">
                <TaskRow {task} {today} {onEdit} />
                <div class="move">
                  {#each STATUSES.filter((s) => s !== status) as target}
                    <button class="btn subtle small" onclick={() => moveStatus(task, target)}>{STATUS_LABEL[target]}<IconArrowRight size={11} /></button>
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
  .view { padding: var(--space-4); }
  .new-project { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); max-width: 420px; }
  .new-project input { flex: 1; }
  .tabs-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
  .tabs { display: flex; gap: var(--space-1); flex-wrap: wrap; }
  .btn.danger { color: var(--danger); }
  .btn.danger:hover { background: var(--danger-tint); border-color: var(--danger); }
  /* Tinted rather than a solid fill — var(--danger) is a *light* color in
     dark mode (tuned for text-on-dark legibility), so pairing it with white
     text as a solid fill would fail contrast there. See the Solid Fill Rule
     in DESIGN.md; this sidesteps needing a whole separate danger-solid
     token pair for one confirm button. */
  .btn.danger-solid { background: var(--danger-tint); border-color: var(--danger); color: var(--danger); font-weight: 600; }
  .btn.danger-solid:hover { opacity: 0.85; }
  .confirm-remove {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    background: var(--danger-tint);
    color: var(--danger);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-3);
    font-size: 13px;
  }
  .confirm-remove span { flex: 1; min-width: 240px; color: var(--text); }
  .confirm-remove strong { color: var(--danger); }
  .board { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
  .column { background: var(--surface); border-radius: var(--radius-lg); padding: var(--space-2); min-height: 100px; }
  .column h3 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
    margin-bottom: var(--space-2);
    display: flex;
    justify-content: space-between;
  }
  .col-count { font-weight: 500; }
  .card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: var(--space-2); }
  .move { display: flex; flex-wrap: wrap; gap: 2px; padding: 0 var(--space-2) var(--space-2); }
  .btn.small { font-size: 11px; padding: 2px 6px; }
  .empty { color: var(--text-dim); padding: var(--space-6) 0; text-align: center; }
  @media (max-width: 900px) { .board { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 520px) { .board { grid-template-columns: 1fr; } }
</style>
