<script lang="ts">
  // Shown instead of the app when the data island failed to parse. Per the
  // plan, we must NEVER silently boot to empty state on a parse failure —
  // doing so would let the next save overwrite a merely-corrupted file with
  // nothing, turning recoverable damage into permanent data loss.
  import { importJsonBackup } from '../lib/store';
  import IconWarning from './icons/IconWarning.svelte';

  let { error, rawIsland }: { error: string; rawIsland: string | null } = $props();

  let jsonPasteValue = $state('');
  let restoreMessage = $state<string | null>(null);

  function tryRestoreFromPaste() {
    const result = importJsonBackup(jsonPasteValue);
    if (result.ok) {
      restoreMessage = 'Restored — reloading the app now.';
      setTimeout(() => window.location.reload(), 600);
    } else {
      restoreMessage = `Could not restore: ${result.error}`;
    }
  }
</script>

<div class="wrap">
  <h1><IconWarning size={22} />This file's data could not be loaded</h1>
  <p>
    The task planner refused to start normally because its embedded data
    could not be parsed. Continuing would risk your next save overwriting
    this file with an empty one — so nothing has been touched.
  </p>
  <p class="error"><strong>Error:</strong> {error}</p>

  <h2>Options</h2>
  <ol>
    <li>
      If you have a recent <code>task-planner-backup-*.json</code> file,
      paste its contents below and click Restore.
    </li>
    <li>
      Otherwise, the raw (unparsed) data is shown below — you can try to
      hand-repair the JSON and paste it back, or copy it out for safekeeping
      before doing anything else.
    </li>
  </ol>

  <label for="restore-paste">Paste a JSON backup to restore:</label>
  <textarea id="restore-paste" rows="6" bind:value={jsonPasteValue}></textarea>
  <button class="btn primary" onclick={tryRestoreFromPaste}>Restore from pasted JSON</button>
  {#if restoreMessage}<p>{restoreMessage}</p>{/if}

  {#if rawIsland}
    <h2>Raw data found in the file (for manual recovery)</h2>
    <textarea rows="12" readonly value={rawIsland}></textarea>
  {/if}
</div>

<style>
  .wrap { max-width: 720px; margin: var(--space-6) auto; padding: 0 var(--space-4); }
  h1 { display: flex; align-items: center; gap: var(--space-2); color: var(--danger); font-size: 20px; }
  h2 { margin-top: var(--space-5); font-size: 15px; }
  .error {
    background: var(--danger-tint);
    color: var(--danger);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    margin-top: var(--space-3);
  }
  textarea {
    width: 100%;
    font-family: var(--mono);
    font-size: 12px;
    margin: var(--space-2) 0;
  }
  ol { padding-left: 1.2rem; color: var(--text); }
  p { margin: var(--space-2) 0; }
</style>
