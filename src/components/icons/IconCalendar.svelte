<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="4.5" width="14" height="12" rx="1.6" />
  <path d="M3 8h14" />
  <path d="M6.5 3v3" />
  <path d="M13.5 3v3" />
</svg>
