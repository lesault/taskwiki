<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { appState, updateTask, logActivity, softDeleteTask, mintId, addProject } from '../lib/store';
  import { generateTaskIcs, downloadIcs } from '../lib/ics';
  import { motionDuration } from '../lib/motion';
  import IconX from './icons/IconX.svelte';
  import IconCalendar from './icons/IconCalendar.svelte';
  import type { Task, TaskStatus, TaskDirection, Priority } from '../lib/types';

  let { taskId, onClose }: { taskId: string; onClose: () => void } = $props();

  const task = $derived($appState.tasks.find((t) => t.id === taskId));

  // Local editable copies — committed on blur/change, not on every keystroke,
  // to keep the activity log free of keystroke-level noise.
  let title = $state('');
  let notes = $state('');
  let newProjectName = $state('');
  let sourceInput = $state('');
  let labelsInput = $state('');

  $effect(() => {
    if (task) {
      title = task.title;
      notes = task.notes;
      sourceInput = task.source ?? '';
      labelsInput = task.labels.join(', ');
    }
  });

  function commitTitle() {
    if (task && title.trim() && title !== task.title) updateTask(task.id, { title: title.trim() });
  }
  function commitNotes() {
    if (task && notes !== task.notes) updateTask(task.id, { notes });
  }
  function commitSource() {
    if (task) updateTask(task.id, { source: sourceInput.trim() || undefined });
  }
  function commitLabels() {
    if (task) updateTask(task.id, { labels: labelsInput.split(',').map((l) => l.trim()).filter(Boolean) });
  }

  function setStatus(e: Event) {
    const status = (e.target as HTMLSelectElement).value as TaskStatus;
    if (task) { updateTask(task.id, { status }); logActivity(task.id, `Status → ${status}`); }
  }
  function setDirection(e: Event) {
    const direction = (e.target as HTMLSelectElement).value as TaskDirection;
    if (task) { updateTask(task.id, { direction }); logActivity(task.id, `Direction → ${direction}`); }
  }
  function setPriority(e: Event) {
    const priority = (e.target as HTMLSelectElement).value as Priority;
    if (task) updateTask(task.id, { priority });
  }
  function setDeadline(e: Event) {
    if (task) updateTask(task.id, { deadline: (e.target as HTMLInputElement).value || undefined });
  }
  function setPlannedDate(e: Event) {
    if (task) updateTask(task.id, { plannedDate: (e.target as HTMLInputElement).value || undefined });
  }
  function setFollowUp(e: Event) {
    if (task) updateTask(task.id, { followUpDate: (e.target as HTMLInputElement).value || undefined });
  }
  function setDuration(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (task) updateTask(task.id, { durationMins: isNaN(v) ? undefined : v });
  }
  function setAssignee(e: Event) {
    if (task) updateTask(task.id, { assignee: (e.target as HTMLInputElement).value.trim() || undefined });
  }
  function setProject(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    if (task) updateTask(task.id, { projectId: v || undefined });
  }

  function createProjectInline() {
    const name = newProjectName.trim();
    if (!name || !task) return;
    const id = mintId('project');
    addProject({ id, name, description: '', status: 'todo', labels: [] });
    updateTask(task.id, { projectId: id });
    newProjectName = '';
  }

  function deleteTask() {
    if (!task) return;
    softDeleteTask(task.id);
    logActivity(task.id, 'Moved to Trash');
    onClose();
  }

  function exportIcsReminder() {
    if (!task) return;
    const start = new Date(`${task.deadline ?? task.plannedDate ?? new Date().toISOString().slice(0, 10)}T09:00:00`);
    const { ics, nextSequence } = generateTaskIcs(task, { mode: 'reminder', start, alarmMinutesBefore: 30 });
    downloadIcs(ics, `${task.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}-reminder.ics`);
    updateTask(task.id, { icsSequence: { ...task.icsSequence, reminder: nextSequence } });
  }
  function exportIcsBlock() {
    if (!task) return;
    const start = new Date(`${task.plannedDate ?? task.deadline ?? new Date().toISOString().slice(0, 10)}T09:00:00`);
    const { ics, nextSequence } = generateTaskIcs(task, { mode: 'block', start, durationMins: task.durationMins ?? 30 });
    downloadIcs(ics, `${task.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}-block.ics`);
    updateTask(task.id, { icsSequence: { ...task.icsSequence, block: nextSequence } });
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if task}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && onClose()} transition:fade={{ duration: motionDuration(140) }}>
    <div class="modal" transition:scale={{ duration: motionDuration(160), start: 0.97, opacity: 0, easing: quintOut }}>
      <div class="modal-header">
        <input class="title-input" type="text" bind:value={title} onblur={commitTitle} placeholder="Task title" />
        <button class="btn subtle icon-only" onclick={onClose} aria-label="Close"><IconX /></button>
      </div>

      <div class="grid">
        <label>Status
          <select value={task.status} onchange={setStatus}>
            <option value="todo">Todo</option>
            <option value="in-progress">In progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>Priority
          <select value={task.priority} onchange={setPriority}>
            <option value="high">High</option>
            <option value="med">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>Direction
          <select value={task.direction} onchange={setDirection}>
            <option value="mine">Mine to do</option>
            <option value="waiting">Waiting on someone</option>
          </select>
        </label>
        {#if task.direction === 'waiting'}
          <label>Assignee
            <input type="text" value={task.assignee ?? ''} onchange={setAssignee} placeholder="Who?" />
          </label>
          <label>Chase on
            <input type="date" value={task.followUpDate ?? ''} onchange={setFollowUp} />
          </label>
        {/if}
        <label>Deadline
          <input type="date" value={task.deadline ?? ''} onchange={setDeadline} />
        </label>
        <label>Planned date
          <input type="date" value={task.plannedDate ?? ''} onchange={setPlannedDate} />
        </label>
        <label>Duration (mins)
          <input type="text" inputmode="numeric" value={task.durationMins ?? ''} onchange={setDuration} placeholder="30" />
        </label>
        <label>Project
          <select value={task.projectId ?? ''} onchange={setProject}>
            <option value="">None</option>
            {#each $appState.projects as p (p.id)}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="new-project-inline">
        <input type="text" placeholder="…or create new project" bind:value={newProjectName} onkeydown={(e) => e.key === 'Enter' && createProjectInline()} />
        <button class="btn subtle" onclick={createProjectInline}>Create + assign</button>
      </div>

      <label class="block">Labels (comma-separated)
        <input type="text" bind:value={labelsInput} onblur={commitLabels} placeholder="e.g. urgent, client-x" />
      </label>

      <label class="block">Source (pasted link or reference text)
        <input type="text" bind:value={sourceInput} onblur={commitSource} placeholder="Paste an email URL, or type a reference like 'Re: Budget — Jane, 3 Jul'" />
      </label>
      {#if task.source}
        {#if /^https?:\/\//i.test(task.source)}
          <a href={task.source} target="_blank" rel="noreferrer" class="source-link">Open source ↗</a>
        {/if}
      {/if}

      <label class="block">Notes
        <textarea rows="4" bind:value={notes} onblur={commitNotes} placeholder="Context, details…"></textarea>
      </label>

      <div class="ics-actions">
        <button class="btn" onclick={exportIcsReminder}><IconCalendar />Export reminder .ics</button>
        <button class="btn" onclick={exportIcsBlock}><IconCalendar />Export time-block .ics</button>
      </div>

      <div class="activity">
        <h3>Activity</h3>
        {#if task.activity.length === 0}
          <p class="empty">No activity yet.</p>
        {:else}
          <ul>
            {#each [...task.activity].reverse() as entry}
              <li><span class="at">{new Date(entry.at).toLocaleString()}</span> — {entry.text}</li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="footer">
        <button class="btn subtle danger" onclick={deleteTask}>Move to Trash</button>
        <button class="btn primary" onclick={onClose}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-header { display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-3); }
  .title-input { flex: 1; font-size: 16px; font-weight: 600; border: 1px solid transparent; background: none; padding: 4px 6px; border-radius: var(--radius-sm); }
  .title-input:hover { border-color: var(--border); }
  .icon-only { padding: 6px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); margin-bottom: var(--space-3); }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-dim); }
  label.block { margin-bottom: var(--space-3); }
  .new-project-inline { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
  .new-project-inline input { flex: 1; }
  .source-link { display: inline-block; margin: -6px 0 var(--space-3); font-size: 13px; color: var(--accent); }
  textarea { width: 100%; resize: vertical; font-family: inherit; }
  .ics-actions { display: flex; gap: var(--space-2); margin: var(--space-3) 0; }
  .activity { margin-top: var(--space-4); border-top: 1px solid var(--border); padding-top: var(--space-3); }
  .activity h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-2); color: var(--text-dim); }
  .activity ul { list-style: none; padding: 0; margin: 0; max-height: 140px; overflow-y: auto; }
  .activity li { font-size: 12px; color: var(--text-dim); padding: 3px 0; }
  .activity .at { color: var(--text); font-family: var(--mono); font-size: 11px; }
  .empty { color: var(--text-dim); font-size: 13px; }
  .footer { display: flex; justify-content: space-between; margin-top: var(--space-4); }
  .btn.danger { color: var(--danger); }
  .btn.danger:hover { background: var(--danger-tint); border-color: var(--danger); }
</style>
