import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  build: {
    // Single-file build: everything (JS, CSS, assets) inlined into one HTML file.
    // No external chunks, no code splitting — this file has to stand alone.
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
})
