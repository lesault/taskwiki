import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { initShell, initFromDocument, installUnsavedChangesGuard } from './lib/store';

// Order matters: the shell MUST be captured before Svelte mounts anything
// into #app, or every future save would bake rendered DOM into the file.
initShell();
initFromDocument();
installUnsavedChangesGuard();

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
