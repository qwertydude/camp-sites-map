<script>
  import { settings } from '$lib/stores/settings.js';
    
  export let isOpen = false;

  function handleClose() {
    isOpen = false;
  }

  function updateZoomLevel(setting, event) {
    const value = parseInt(event.target.value);
    if (!isNaN(value)) {
      settings.updateAppOption(setting, value);
    }
  }

  function updateTheme(event) {
    settings.changeTheme(event.target.value);
  }
</script>

<div class="fixed inset-y-0 left-0 w-80 shadow-lg transform transition-transform duration-300 ease-in-out z-50 
  {isOpen ? 'translate-x-0' : '-translate-x-full'}
  bg-white dark:bg-gray-800 
  text-gray-900 dark:text-gray-100">
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="px-4 py-3 border-b flex items-center justify-between 
      bg-gray-50 dark:bg-gray-700 
      border-gray-200 dark:border-gray-600">
      <h2 class="text-lg font-semibold">Settings</h2>
      <button class="p-1 
        text-gray-600 dark:text-gray-300 
        hover:bg-gray-100 dark:hover:bg-gray-600 
        rounded" on:click={handleClose}>×</button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 space-y-4">
        <div class="space-y-2">
          <h3 class="font-medium text-gray-700 dark:text-gray-300">Theme</h3>
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400">Select Theme</label>
            <select
              value={$settings.app.theme}
              on:change={updateTheme}
              class="mt-1 w-full rounded 
                border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-700 
                text-gray-900 dark:text-gray-100
                shadow-sm 
                focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose your preferred theme</p>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="font-medium text-gray-700 dark:text-gray-300">Zoom Levels</h3>
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400">Default Zoom</label>
            <input 
              type="range" 
              min="10" 
              max="20" 
              value={$settings.app.defaultZoomLevel} 
              on:input={(e) => updateZoomLevel('defaultZoomLevel', e)}
              class="w-full h-2 
                bg-gray-200 dark:bg-gray-600 
                rounded-lg 
                appearance-none 
                cursor-pointer"
            />
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {$settings.app.defaultZoomLevel}
            </span>
          </div>

          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400">Focus Zoom</label>
            <input 
              type="range" 
              min="10" 
              max="20" 
              value={$settings.app.focusZoomLevel} 
              on:input={(e) => updateZoomLevel('focusZoomLevel', e)}
              class="w-full h-2 
                bg-gray-200 dark:bg-gray-600 
                rounded-lg 
                appearance-none 
                cursor-pointer"
            />
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {$settings.app.focusZoomLevel}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
