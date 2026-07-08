# Product

## Register

product

## Users

A solo knowledge worker managing their own task list — capturing to-dos while triaging email, during meetings (including from AI-generated meeting transcripts), and from assigned projects with their own subtasks. They also delegate tasks to others and need to track what they're waiting on. Usage is bursty and keyboard-driven: quick capture in the middle of something else, a glance at "what do I work on right now," occasional deeper sessions to triage the Inbox, plan projects, or run a scheduling pass through a corporate LLM via copy/paste. Speed and low friction matter more than visual flourish — this is a tool used dozens of times a day, not admired.

## Product Purpose

TaskWiki is a single-file, self-contained task planner (TiddlyWiki-style: no server, database, or browser storage — the HTML file *is* the data) for personal task management with deadline tracking, delegated "waiting-for" tracking, lightweight project/board organization, an LLM-assisted scheduling roundtrip, and calendar export. Success looks like: capture takes under a few seconds, "what to work on now" is answerable at a glance, and the user never loses trust in the file's data integrity.

## Brand Personality

Sharp, technical, precise — IDE/terminal-adjacent. Dense information handled with a calm hand: restraint and hierarchy, not decoration. Dark-mode-native. Confidence expressed through clarity and typographic precision rather than color, gradients, or ornament. Feels built *by* a power user *for* a power user.

## Anti-references

- Generic AI-SaaS landing-page aesthetic: gradient text, cream/sand backgrounds, hero-metric cards, tiny uppercase tracked eyebrows, glassmorphism, numbered section markers.
- Cute/bouncy consumer to-do apps (playful mascots, rounded pastel cards, celebratory confetti-style flourishes) — this is closer to Linear/Things 3/a well-made CLI than to a consumer habit-tracker.
- Anything that reads as trying to sell or market itself. There's no audience to persuade — it's a private tool for one person.

## Design Principles

1. **Speed over decoration** — every visual choice should reduce time-to-scan and time-to-capture, not add delight for its own sake.
2. **Density with clarity** — pack real information (statuses, dates, priorities, projects) without becoming noisy; hierarchy comes from type weight, color, and spacing, not boxes-around-everything.
3. **Keyboard is a first-class citizen** — visual design must make keyboard affordances (focus rings, shortcut hints) as legible as mouse affordances, since the app is designed to be driven without a mouse.
4. **Trustworthy persistence, made visible** — save state and data safety are part of the interface's job, not just plumbing; the user should always be able to tell at a glance whether their data is safe.
5. **Dark-mode-native, light-mode-correct** — the app is designed for dark first (matches the technical/IDE personality) while remaining fully correct and equally considered in light mode.

## Accessibility & Inclusion

WCAG AA: body text ≥4.5:1 contrast against its background, large text ≥3:1. Respect `prefers-reduced-motion`. No status, priority, or state should be conveyed by color alone — always pair with text, icon, or shape. Fully keyboard-navigable, with visible focus states throughout.
