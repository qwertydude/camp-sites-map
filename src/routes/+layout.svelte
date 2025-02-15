<script>
  import { onMount } from 'svelte';
  import { settings } from '$lib/stores/settings';
  import "../app.css";

  let { children } = $props();

  onMount(() => {
    console.log('Layout mounted');
    
    // Subscribe to theme changes
    const unsubscribe = settings.subscribe(($settings) => {
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
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e) => {
      const currentSettings = settings.get();
      if (currentSettings.app.theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleThemeChange);
    
    return () => {
      unsubscribe();
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  });
</script>
{@render children()}
