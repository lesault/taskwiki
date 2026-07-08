<script lang="ts">
  // The LLM scheduling roundtrip: generate a prompt to paste into a
  // corporate LLM, paste its reply back, and review a diff before anything
  // is written. Nothing is applied without an explicit click — the diff
  // surfaces both dropped (omitted) and unknown (hallucinated) ids so a
  // misschedule can't slip through silently.
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { appState, updateTask, logActivity } from '../lib/store';
  import { selectSchedulableTasks, buildSchedulePrompt, parseScheduleResponse, buildScheduleDiff, type ScheduleDiff } from '../lib/schedule';
  import { motionDuration } from '../lib/motion';
  import IconX from './icons/IconX.svelte';
  import IconWarning from './icons/IconWarning.svelte';
  import IconCheck from './icons/IconCheck.svelte';

  let { onClose }: { onClose: () => void } = $props();

  const schedulable = $derived(selectSchedulableTasks($appState));
  const prompt = $derived(buildSchedulePrompt(schedulable, $appState.settings));

  let pasteValue = $state('');
  let diff = $state<ScheduleDiff | null>(null);
  let parseError = $state<string | null>(null);
  let copied = $state(false);
  let applied = $state(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function parseResponse() {
    parseError = null;
    diff = null;
    try {
      const entries = parseScheduleResponse(pasteValue);
      diff = buildScheduleDiff(schedulable, entries, $appState.settings);
    } catch (e) {
      parseError = (e as Error).message;
    }
  }

  function applyDiff() {
    if (!diff) return;
    for (const entry of diff.accepted) {
      updateTask(entry.id, { plannedDate: entry.newPlannedDate, order: entry.newOrder });
      logActivity(entry.id, `Scheduled → ${entry.newPlannedDate} (order ${entry.newOrder}) via LLM roundtrip`);
    }
    applied = true;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && onClose()} transition:fade={{ duration: motionDuration(140) }}>
  <div class="modal wide" transition:scale={{ duration: motionDuration(160), start: 0.97, opacity: 0, easing: quintOut }}>
    <div class="modal-header">
      <h2>Schedule with your corporate LLM</h2>
      <button class="btn subtle icon-only" onclick={onClose} aria-label="Close"><IconX /></button>
    </div>

    <p class="hint">
      {schedulable.length} schedulable task{schedulable.length === 1 ? '' : 's'} included (active, yours,
      triaged, within the scheduling horizon). Notes and source links are deliberately excluded from the prompt.
    </p>

    <h3>1. Copy this prompt into your corporate LLM</h3>
    <textarea rows="8" readonly value={prompt}></textarea>
    <button class="btn primary" onclick={copyPrompt}>{copied ? 'Copied' : 'Copy prompt'}{#if copied}<IconCheck size={13} />{/if}</button>

    <h3>2. Paste the LLM's reply here</h3>
    <textarea rows="6" bind:value={pasteValue} placeholder="Paste the JSON array reply — surrounding prose or code fences are fine, they'll be stripped."></textarea>
    <button class="btn" onclick={parseResponse}>Parse response</button>

    {#if parseError}
      <p class="error"><IconWarning size={14} />{parseError}</p>
    {/if}

    {#if diff}
      <h3>3. Review before applying</h3>

      {#if diff.accepted.length > 0}
        <table class="diff-table">
          <thead><tr><th>Task</th><th>Current</th><th>New plan</th></tr></thead>
          <tbody>
            {#each diff.accepted as e (e.id)}
              <tr>
                <td>{e.title}</td>
                <td class="mono">{e.currentPlannedDate ?? '—'}</td>
                <td class="mono">{e.newPlannedDate} (order {e.newOrder})</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}

      {#if diff.droppedIds.length > 0}
        <p class="warn"><IconWarning size={14} />{diff.droppedIds.length} task(s) were sent but the LLM's reply omitted them — they will NOT be rescheduled: {diff.droppedIds.join(', ')}</p>
      {/if}
      {#if diff.unknownIds.length > 0}
        <p class="warn"><IconWarning size={14} />The reply referenced {diff.unknownIds.length} id(s) that don't match any sent task — ignored: {diff.unknownIds.join(', ')}</p>
      {/if}
      {#if diff.invalid.length > 0}
        <p class="warn"><IconWarning size={14} />{diff.invalid.length} entr{diff.invalid.length === 1 ? 'y is' : 'ies are'} invalid and will be skipped:</p>
        <ul class="invalid-list">
          {#each diff.invalid as inv}<li>{inv.id}: {inv.reason}</li>{/each}
        </ul>
      {/if}

      {#if diff.accepted.length > 0 && !applied}
        <button class="btn primary" onclick={applyDiff}>Apply {diff.accepted.length} accepted change(s)</button>
      {/if}
      {#if applied}
        <p class="success"><IconCheck size={14} />Applied.</p>
      {/if}
    {/if}
  </div>
</div>

<style>
  .modal.wide { max-width: 720px; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; }
  .icon-only { padding: 6px; }
  .hint { color: var(--text-dim); font-size: 13px; }
  h3 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
    margin: var(--space-4) 0 var(--space-2);
  }
  textarea { width: 100%; font-family: var(--mono); font-size: 12px; margin-bottom: var(--space-2); }
  .error, .warn, .success {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 13px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    margin: var(--space-2) 0;
  }
  .error { color: var(--danger); background: var(--danger-tint); }
  .warn { color: var(--warn); background: var(--warn-tint); }
  .success { color: var(--success); background: var(--success-tint); }
  .error :global(svg), .warn :global(svg), .success :global(svg) { flex-shrink: 0; margin-top: 2px; }
  .invalid-list { font-size: 12px; color: var(--text-dim); }
  .diff-table { width: 100%; border-collapse: collapse; margin: var(--space-2) 0; font-size: 13px; }
  .diff-table th {
    text-align: left;
    padding: 4px 8px;
    border-bottom: 1px solid var(--border-strong);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-dim);
  }
  .diff-table td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--border); }
  .diff-table td.mono { font-family: var(--mono); font-size: 12px; }
</style>
