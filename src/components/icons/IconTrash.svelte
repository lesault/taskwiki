<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3.5 5.5h13" />
  <path d="M7.5 5.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5" />
  <path d="M5 5.5l.7 10a1 1 0 0 0 1 .9h6.6a1 1 0 0 0 1-.9l.7-10" />
  <path d="M8.3 9v5" />
  <path d="M11.7 9v5" />
</svg>
