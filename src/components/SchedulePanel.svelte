<script lang="ts">
  // The LLM scheduling roundtrip: generate a prompt to paste into a
  // corporate LLM, paste its reply back, and review a diff before anything
  // is written. Nothing is applied without an explicit click — the diff
  // surfaces both dropped (omitted) and unknown (hallucinated) ids so a
  // misschedule can't slip through silently.
  import { appState, updateTask, logActivity } from '../lib/store';
  import { selectSchedulableTasks, buildSchedulePrompt, parseScheduleResponse, buildScheduleDiff, type ScheduleDiff } from '../lib/schedule';

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
<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && onClose()}>
  <div class="modal wide">
    <div class="modal-header">
      <h2>Schedule with your corporate LLM</h2>
      <button class="btn subtle" onclick={onClose} aria-label="Close">✕</button>
    </div>

    <p class="hint">
      {schedulable.length} schedulable task{schedulable.length === 1 ? '' : 's'} included (active, yours,
      triaged, within the scheduling horizon). Notes and source links are deliberately excluded from the prompt.
    </p>

    <h3>1. Copy this prompt into your corporate LLM</h3>
    <textarea rows="8" readonly value={prompt}></textarea>
    <button class="btn primary" onclick={copyPrompt}>{copied ? 'Copied!' : 'Copy prompt'}</button>

    <h3>2. Paste the LLM's reply here</h3>
    <textarea rows="6" bind:value={pasteValue} placeholder="Paste the JSON array reply — surrounding prose or code fences are fine, they'll be stripped."></textarea>
    <button class="btn" onclick={parseResponse}>Parse response</button>

    {#if parseError}
      <p class="error">{parseError}</p>
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
                <td>{e.currentPlannedDate ?? '—'}</td>
                <td>{e.newPlannedDate} (order {e.newOrder})</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}

      {#if diff.droppedIds.length > 0}
        <p class="warn">⚠️ {diff.droppedIds.length} task(s) were sent but the LLM's reply omitted them — they will NOT be rescheduled: {diff.droppedIds.join(', ')}</p>
      {/if}
      {#if diff.unknownIds.length > 0}
        <p class="warn">⚠️ The reply referenced {diff.unknownIds.length} id(s) that don't match any sent task — ignored: {diff.unknownIds.join(', ')}</p>
      {/if}
      {#if diff.invalid.length > 0}
        <p class="warn">⚠️ {diff.invalid.length} entr{diff.invalid.length === 1 ? 'y is' : 'ies are'} invalid and will be skipped:</p>
        <ul class="invalid-list">
          {#each diff.invalid as inv}<li>{inv.id}: {inv.reason}</li>{/each}
        </ul>
      {/if}

      {#if diff.accepted.length > 0 && !applied}
        <button class="btn primary" onclick={applyDiff}>Apply {diff.accepted.length} accepted change(s)</button>
      {/if}
      {#if applied}
        <p class="success">✅ Applied.</p>
      {/if}
    {/if}
  </div>
</div>

<style>
  .modal.wide { max-width: 720px; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; }
  .hint { color: var(--text-dim); font-size: 13px; }
  h3 { font-size: 13px; margin: 14px 0 6px; }
  textarea { width: 100%; font-family: var(--mono); font-size: 12px; margin-bottom: 6px; }
  .error { color: var(--danger); font-size: 13px; }
  .warn { color: var(--warn); font-size: 13px; }
  .success { color: var(--success); font-size: 13px; }
  .invalid-list { font-size: 12px; color: var(--text-dim); }
  .diff-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
  .diff-table th, .diff-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--border); }
</style>
