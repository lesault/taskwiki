# TaskWiki

A single-file, portable task planner — in the spirit of TiddlyWiki. The entire app *and* all your data live in one self-contained `.html` file. No server, no database, no browser storage, no config files. Carry it on a USB stick, sync it in a folder, or just keep it on your desktop.

Built for a workflow of triaging tasks out of email, meetings, and assigned projects — including tracking things you've delegated and are waiting on a reply for.

## Getting the app

```bash
npm install
npm run build
```

This produces **`dist/index.html`** — that's the whole app. Move it wherever you want it to live long-term (its data lives inside it, so don't keep rebuilding over the same copy — a fresh build starts empty). Double-click it to open.

## Features

- **Quick-add with shorthand** — type a task with inline tokens and press Enter:
  ```
  Reply to legal re: contract redlines #ContractX !high @2026-07-10 ~20m !!
  ```
  - `#project` — project tag (auto-created if new)
  - `!high` / `!med` / `!low` (or `!h`/`!m`/`!l`) — priority
  - `~30m` / `~2h` — duration estimate
  - `@2026-07-15`, `@today`, `@tomorrow`, `@+3d` — deadline
  - `>Jane` — delegate to Jane (marks the task "waiting on")
  - `!!` or Shift+Enter — skip the Inbox, add straight to the active list
- **Inbox triage** — by default, quick-added tasks land in an Inbox for review/correction before they're promoted to your active list.
- **Today / Agenda view** — "what to work on right now": overdue, due or planned today, waiting-for items needing a chase, and what's coming up.
- **Waiting-for tracking** — delegate a task to someone with a follow-up/chase date, so nothing you're waiting on gets forgotten.
- **Projects board** — group tasks by project, move them between Todo / In progress / Blocked / Done.
- **LLM-assisted scheduling** — since the app can't call an AI directly, it generates a copy-pasteable prompt for your own LLM (e.g. a corporate assistant) to schedule your tasks by priority/duration/deadline. Paste the reply back and review a diff before anything is applied.
- **Calendar export (.ics)** — export a task as a reminder or a time-block, or export a whole day's plan at once, for import into Outlook/Google Calendar/etc.
- **Data safety** — explicit save with a visible saved/unsaved indicator, warns before closing with unsaved changes, and a one-click JSON backup export/import independent of the HTML file itself.

## How saving works

On Save, the app tries to write back to the same file in place (via the File System Access API — supported in Chromium-based browsers). If that's not available, it downloads a new copy instead — in which case, **close the old tab and reopen the newly downloaded file** to keep working safely; the app will warn you and lock further edits in the stale tab until you do.

**This file is your database.** Don't fork it — editing the same planner on two machines, or emailing copies to yourself and editing both, creates divergent copies with no merge path. Keep one canonical copy.

## Development

```bash
npm run dev      # dev server with HMR
npm run check    # type-check (svelte-check + tsc)
npm run build    # produce the single-file dist/index.html
```

Stack: [Svelte 5](https://svelte.dev/) + TypeScript, bundled to a single file via [Vite](https://vite.dev/) and [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile).

### Architecture notes

- App data is stored as JSON inside a `<script type="application/json">` "data island" embedded in the HTML file itself (see `src/lib/persistence.ts`). On save, a pristine copy of the document — captured *before* Svelte ever mounts — has its data island spliced out and replaced; the live, rendered DOM is never serialized.
- Every `<` in the saved JSON is escaped, since `<script>` content is parsed as raw text by the browser and a literal `</script>` inside a note would otherwise truncate the file.
- If the data island fails to parse on load, the app refuses to boot into an empty state (which would risk the next save overwriting real data with nothing) — it shows a recovery screen with the raw data instead.

## License

MIT
