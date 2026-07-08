<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M10 3.2 L17.5 16.3 A1 1 0 0 1 16.6 17.8 H3.4 A1 1 0 0 1 2.5 16.3 Z" />
  <path d="M10 8.2v3.6" />
  <circle cx="10" cy="14.4" r="0.15" fill="currentColor" stroke-width="1.8" />
</svg>
