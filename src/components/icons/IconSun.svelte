<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
  <circle cx="10" cy="10" r="3.4" />
  <path d="M10 2.5v2M10 15.5v2M3.5 10h2M14.5 10h2M5.5 5.5l1.4 1.4M13.1 13.1l1.4 1.4M5.5 14.5l1.4-1.4M13.1 6.9l1.4-1.4" />
</svg>
