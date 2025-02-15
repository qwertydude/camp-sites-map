<script>
  import { onMount } from 'svelte';
  import { settings } from '$lib/stores/settings';
  import "../app.css";

  let { children } = $props();

  onMount(() => {
    // Subscribe to theme changes
    settings.subscribe(($settings) => {
      let theme = $settings.app.theme;
      if (theme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    });
  });
</script>
{@render children()}
