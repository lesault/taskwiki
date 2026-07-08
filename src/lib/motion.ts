// Svelte's transition directives don't consult prefers-reduced-motion on
// their own — the CSS `@media (prefers-reduced-motion: reduce)` block in
// app.css catches CSS transitions/animations, but JS-driven Svelte
// transitions (fade/fly/scale) need duration collapsed to ~0 explicitly.
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function motionDuration(ms: number): number {
  return prefersReducedMotion ? 0 : ms;
}

/** Params for a subtle staggered list-item entrance (svelte/transition's fly).
 *  Delay is capped so long lists don't cascade for multiple seconds. */
export function listItemIn(index: number) {
  return {
    y: 6,
    duration: motionDuration(180),
    delay: prefersReducedMotion ? 0 : Math.min(index, 10) * 16,
  };
}
