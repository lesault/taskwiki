<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
  <rect x="3.5" y="3.5" width="13" height="13" rx="3" fill="currentColor" />
  <path d="M6.2 10.3l2.4 2.4 5.2-5.6" stroke="var(--bg)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
</svg>
