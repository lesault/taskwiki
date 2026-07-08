<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="2.5" y="4" width="15" height="9.5" rx="1.2" />
  <path d="M7 17h6" />
  <path d="M10 13.5V17" />
</svg>
