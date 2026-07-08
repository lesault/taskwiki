---
name: TaskWiki
description: A single-file, portable task planner — sharp, technical, keyboard-first.
colors:
  ink: "oklch(15% 0.02 290)"
  text: "oklch(34% 0.02 290)"
  text-dim: "oklch(46% 0.02 290)"
  bg: "oklch(99% 0.003 290)"
  surface: "oklch(96.5% 0.005 290)"
  border: "oklch(87% 0.008 290)"
  border-strong: "oklch(62% 0.015 290)"
  accent: "oklch(47% 0.19 293)"
  accent-tint: "oklch(94% 0.03 293)"
  accent-solid: "oklch(56% 0.21 293)"
  accent-solid-hover: "oklch(49% 0.21 293)"
  danger: "oklch(48% 0.19 25)"
  danger-tint: "oklch(94% 0.03 25)"
  success: "oklch(43% 0.11 155)"
  success-tint: "oklch(93% 0.03 155)"
  warn: "oklch(42% 0.14 55)"
  warn-tint: "oklch(94% 0.04 70)"
typography:
  title:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "19-20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace"
    fontSize: "12-13px"
    fontWeight: 500
    lineHeight: 1.4
  data:
    fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-solid}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent-solid-hover}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  chip-neutral:
    backgroundColor: "transparent"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.sm}"
    padding: "2px 7px"
  chip-accent:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "2px 7px"
---

# Design System: TaskWiki

## 1. Overview

**Creative North Star: "The Instrument Panel"**

TaskWiki is built to feel like a precision instrument, not a consumer habit-tracker — dense, legible readouts you scan in a second between other work, controls that respond instantly, and nothing on screen that isn't carrying information. It draws on the same lineage as Linear and Things 3: restrained color, a single clear accent, strong typographic hierarchy through weight and size rather than boxes and shadows, and a dark-mode-native canvas that feels like an editor or terminal rather than a marketing surface.

This system explicitly rejects the generic AI-SaaS look — gradient text, cream/sand backgrounds, hero-metric cards, tiny uppercase tracked eyebrows, glassmorphism — and rejects the cute, bouncy consumer to-do app register (rounded pastel cards, mascots, celebratory confetti). There is no audience to persuade here; it's a private instrument for one person, used dozens of times a day, and every visual decision optimizes for speed-to-scan over decoration.

**Key Characteristics:**
- Dense, legible, dark-mode-native, fully correct in light mode
- One violet accent carrying identity; status colors (danger/success/warn) used only functionally, never decoratively
- Structured metadata (dates, durations, priorities) rendered in monospace, prose rendered in system sans
- Flat by default — elevation exists only for modals, never for routine content
- Every interactive element has a visible keyboard focus ring; keyboard shortcuts are shown as literal `kbd` chips, not buried in a manual

## 2. Colors

The palette is restrained: a single violet hue (293°) carries both the primary accent and every neutral (as a near-imperceptible chroma tint), plus three functional status hues used only where they carry meaning.

### Primary
- **Violet Accent** (`oklch(47% 0.19 293)` light / `oklch(80% 0.11 293)` dark): text, links, focus rings, active-tab state, and the LLM-schedule spotlight border. Tuned per theme so it always reads at ≥7:1 against its background — not the same value doing double duty as a button fill (see the Solid Fill Rule below).
- **Accent Solid Fill** (`oklch(56% 0.21 293)`, fixed across both themes): the *only* color used for primary button backgrounds with white text. Verified at 5.1:1 against white in both themes.

### Neutral
- **Ink** (`oklch(15% 0.02 290)` light / `oklch(97% 0.005 290)` dark): headings, primary interactive text.
- **Text** (`oklch(34% 0.02 290)` / `oklch(84% 0.01 290)`): body copy. 11.5:1 against background in both themes.
- **Text Dim** (`oklch(46% 0.02 290)` / `oklch(66% 0.012 290)`): secondary/meta text, timestamps. Still ≥6:1 against background — "dim" never means "fails AA."
- **Background** (`oklch(99% 0.003 290)` / `oklch(18% 0.01 290)`): the canvas. A near-imperceptible violet tint, not a true neutral gray — ties every surface back to the accent hue without reading as colored.
- **Surface** (`oklch(96.5% 0.005 290)` / `oklch(23% 0.012 290)`): raised panels — the header, quick-add bar, Kanban columns.
- **Border / Border Strong**: hairline dividers (`border`, ~1.4:1, decorative only) vs. input/button boundaries (`border-strong`, ~3.1–3.9:1, meets non-text UI contrast).

### Status (functional only — never decorative)
- **Danger** (`oklch(48% 0.19 25)` / `oklch(78% 0.13 25)`): overdue, destructive actions, save errors.
- **Success** (`oklch(43% 0.11 155)` / `oklch(78% 0.12 155)`): planned/scheduled state, successful apply/restore confirmations.
- **Warn** (`oklch(42% 0.14 55)` / `oklch(80% 0.13 70)`): due-today, chase-needed, stale-download banner.

### Named Rules
**The Solid Fill Rule.** Never reuse the text-tint `accent`/`danger`/`success`/`warn` tokens as a solid button background. `accent` is deliberately *light* in dark mode (so it reads as text on a dark canvas) — using it as a fill with white text on top fails contrast outright. Solid fills get their own fixed-across-themes token (`accent-solid`).

**The One Hue Rule.** Every neutral in this system carries the same 290° hue at near-zero chroma. There is no separate "gray" — grays are just very-low-chroma violet, which is what keeps a restrained, single-accent palette feeling cohesive rather than arbitrary.

## 3. Typography

**Body Font:** system-ui (San Francisco / Segoe UI / Roboto — whatever the OS provides)
**Label/Data Font:** ui-monospace (SF Mono / Cascadia Code / Consolas)

**Character:** No custom web fonts are loaded, deliberately — this is a dependency-free, offline-first single file, and native system fonts already read as "technical" on every platform. The pairing does the personality work: prose in the system sans, every piece of *structured data* (dates, durations, priorities, statuses, timestamps, keyboard shortcuts) in mono. That single rule — data is mono, prose is sans — is what makes the interface feel like an instrument rather than a form.

### Hierarchy
- **Title** (600, 19–20px, -0.01em): view headings ("Today", "Inbox"), modal titles.
- **Body** (400, 15px, 1.5 line-height): task titles, notes, prose.
- **Label** (500, 12–13px, mono): section labels ("DUE / PLANNED TODAY"), uppercase with 0.05em tracking.
- **Data/Chip** (500, 11px, mono, 0.01em tracking): chips (priority, project, dates, durations), activity-log timestamps, `kbd` shortcut hints.

### Named Rules
**The Mono-For-Data Rule.** If a piece of UI text is a value someone would search, sort, or paste into a spreadsheet (a date, a duration, an ID-like status, a keyboard key), it's set in mono. If it's a sentence a human wrote, it's set in sans. This is the single typographic decision that carries the "sharp & technical" personality more than any color choice does.

## 4. Elevation

Flat by default — no shadows anywhere in routine content (task rows, chips, buttons, the Kanban board). Depth is conveyed by `surface` vs. `bg` background-color steps, not by shadow. The **only** place elevation appears is modals (task editor, schedule panel, help), which sit above a dimmed backdrop and need to visually separate from the page behind them.

### Shadow Vocabulary
- **Modal** (`box-shadow: 0 20px 48px -12px oklch(0% 0 0 / 0.18), 0 8px 20px -8px oklch(0% 0 0 / 0.12)` light; alpha raised to 0.5/0.35 in dark): the one deliberate elevation moment in the system.
- **Raised** (`0 1px 2px oklch(0% 0 0 / 0.06)`, alpha 0.3 dark): reserved, currently unused — kept as a token for a future subtle card-hover state rather than introduced speculatively into today's flat surfaces.

### Named Rules
**The Flat-By-Default Rule.** If you're reaching for a shadow on a task row, a chip, or a button, stop — depth here comes from the background-color step (`bg` → `surface`), not from a shadow. Shadows are reserved for the one moment something is genuinely floating above the page: a modal.

## 5. Components

### Buttons
- **Shape:** 6px radius (`--radius-md`) — sharp enough to read as a tool, not a soft consumer app.
- **Primary:** `accent-solid` background, white text, 6px/12px padding. Used for the single most-committed action in a given context (Save, Apply schedule).
- **Secondary (default `.btn`):** `surface` background, `ink` text, `border-strong` border. Border shifts to `accent` on hover.
- **Subtle (`.btn.subtle`):** transparent until hover, then `surface` background — used for secondary/tertiary actions (Edit, Promote, header utility buttons) so they don't visually compete with the primary action.
- **Hover / Active:** 120ms ease-out background/border transition; `:active` scales to 0.97 for tactile press feedback.
- **Icon buttons:** always paired with `aria-label` when icon-only (close, trash, theme toggle).

### Chips
- **Shape:** 4px radius rectangle (`--radius-sm`) — **never a pill.** Pills read as soft/consumer; a small rectangular label reads as structured metadata, which is what a chip actually represents here (status, priority, date, duration).
- **Typography:** always mono, per the Mono-For-Data Rule.
- **Variants:** neutral (bordered, transparent), and four tinted variants (accent/danger/success/warn) using the tint token as background and the full-strength token as text — never the reverse.

### Cards / Containers
- **Corner style:** 6px (Kanban cards) to 10px (modals).
- **Background:** `surface` for Kanban columns, `bg` for cards nested inside them (so nested containers stay visually distinct without a border-heavy look).
- **Border:** 1px `border` (hairline) around cards; components needing an operable boundary (inputs, `.btn`) use `border-strong` instead.

### Inputs / Fields
- **Style:** 1px `border-strong`, `radius-md`, `bg` background.
- **Hover:** border shifts to `accent`.
- **Focus:** 2px solid `accent-solid` outline, `-1px` offset (sits just inside the border) — paired with the border itself also switching to `accent-solid` for a crisp, unambiguous focus state.
- **Quick-add bar:** its own focus treatment — a 2px `accent-solid` underline (`box-shadow: inset 0 -2px 0`) on the whole bar container, not just the input, since it's the app's single most-used control and deserves a slightly more prominent "you are here."

### Navigation (`.tab`)
- **Style:** transparent by default, `text-dim` label; hover shifts to `surface` background + `ink` text; active state uses `accent-tint` background + `accent` text (never a bottom-border underline — the tint fill is legible at a glance across the whole tab, not just a thin line).
- Shared between the header view-switcher and the Projects tab strip — one component style, not two ad hoc implementations.

### Keyboard hints (`kbd`)
- **Style:** mono, 10px, `bg`-colored chip with `border-strong` border, 3px radius — deliberately small and quiet, sitting beside a label rather than competing with it. Used in the tab bar (`1`–`5`), the Save button (`⌘S`), and the help modal.

## 6. Do's and Don'ts

### Do:
- **Do** set every piece of structured data (dates, durations, priorities, timestamps, shortcut keys) in mono — that's the load-bearing detail of the whole personality.
- **Do** use `accent-solid` (not `accent`) for any solid button fill with white text on top; they are not interchangeable.
- **Do** keep chips as small rectangles (`--radius-sm`), never pills.
- **Do** give every interactive element a visible `:focus-visible` ring — this is a keyboard-first tool, not an afterthought.
- **Do** respect `prefers-reduced-motion` for every transition and Svelte transition directive (see `src/lib/motion.ts`).

### Don't:
- **Don't** use the generic AI-SaaS scaffold: gradient text, cream/sand backgrounds, hero-metric stat cards, tiny uppercase tracked eyebrows above every section, glassmorphism, numbered section markers used decoratively.
- **Don't** reach for a cute/bouncy consumer-app register: rounded pastel cards, mascots, celebratory emoji, confetti. (An earlier draft of the empty state read "Nothing overdue or due today. 🎉" — the 🎉 was removed for exactly this reason.)
- **Don't** use emoji as interface iconography anywhere — they render inconsistently across platforms and read as decorative rather than precise. Every icon in this system is a hand-drawn inline SVG (`src/components/icons/`), stroke-based, sized via a `size` prop, colored via `currentColor`.
- **Don't** add a shadow to routine content (rows, chips, buttons) — depth comes from the `bg`/`surface` step, not elevation. Shadows are reserved for modals only.
- **Don't** use `border-left`/`border-right` as a colored accent stripe on any card, callout, or list item — full borders, background tints, or nothing.
