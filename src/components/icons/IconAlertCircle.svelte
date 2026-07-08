<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
  <circle cx="10" cy="10" r="7.2" />
  <path d="M10 6.5v4" />
  <circle cx="10" cy="13.3" r="0.15" fill="currentColor" stroke-width="1.8" />
</svg>
