<script>
  import { createEventDispatcher } from 'svelte';
  import { settings } from '$lib/stores/settings.js';


  export let isOpen = false;
  const dispatch = createEventDispatcher();

  function handleManageSites() {
    dispatch('manageSites');
    //isOpen = false;
  }

  function handleSettings() {
    dispatch('openSettings');
   // isOpen = false;
  }
</script>
 
<div class="fixed top-0 left-0 z-30 h-full">
  <input id="menu-drawer" type="checkbox" class="hidden" bind:checked={isOpen} />
  
  <div class="relative">
    <label for="menu-drawer" class="btn btn-ghost absolute top-2 left-2 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600 bg-gray-200 dark:bg-gray-700 rounded-md">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" 
              class="dark:stroke-white stroke-black" />
      </svg>
    </label>
  </div>
  
  <div class="fixed top-0 left-0 h-full w-80 transform transition-transform duration-300 ease-in-out {isOpen ? 'translate-x-0' : '-translate-x-full'}">
    <div class="relative w-full h-full bg-white dark:bg-gray-800 shadow-lg">
      <!-- Header -->
      <div class="flex items-center justify-between border-b bg-gray-50 dark:bg-gray-900 px-4 py-3">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Menu</h2>
        <label for="menu-drawer" class="btn btn-ghost btn-sm btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </label>
      </div>
      <!-- Menu Items -->
      <ul class="menu p-4 space-y-2">
      <li>
        <button
          on:click={handleManageSites}
          class="w-full flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
          <span class="ml-3">Manage Sites</span>
        </button>
      </li>
      <li>
        <button
          on:click={handleSettings}
          class="w-full flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
          <span class="ml-3">Settings</span>
        </button>
      </li>
    </ul>
    </div>
  </div>
</div>