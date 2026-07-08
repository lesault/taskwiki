<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="10" cy="10" r="7.2" />
  <path d="M7.7 7.8a2.3 2.3 0 1 1 3.4 2c-.8.5-1.1.9-1.1 1.7" />
  <circle cx="10" cy="14.2" r="0.15" fill="currentColor" stroke-width="1.8" />
</svg>
