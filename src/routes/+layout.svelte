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
.add(theme);
    }
    
    // Subscribe to theme changes
    settings.subscribe(($settings) => {
      console.log('Settings changed:', $settings);
      let theme = $settings.app.theme;
      console.log('Current theme:', theme);
      
      if (theme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        console.log('System theme detected:', theme);
      }
      
      console.log('Applying theme:', theme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      console.log('HTML classes:', document.documentElement.classList.toString());
    });
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const currentTheme = settings.get().app.theme;
      if (currentTheme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newTheme);
      }
    });
  });
</script>
{@render children()}
