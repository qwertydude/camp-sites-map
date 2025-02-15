<script>
  import { createEventDispatcher } from 'svelte';
  import { settings } from '$lib/stores/settings.js';
  import { getCurrentLocation } from '$lib/utils.js'; // Import the utility function

  export let isOpen = false;
  export let map;

  const dispatch = createEventDispatcher();

  function handleManageSites() {
    dispatch('manageSites');
  }

  function handleSettings() {
    dispatch('openSettings');
  }

  function gotoCurrentLocation() {
    getCurrentLocation(map, $settings); // Call the utility function with map and settings
  }

  function closeMenu() {
    isOpen = false; // Set the menu state to closed
  }
</script>

<div class="fixed top-0 left-2 z-30 h-full">
  <input id="menu-drawer" type="checkbox" class="hidden" bind:checked={isOpen} />
  
  <div class="relative">
    <label 
      for="menu-drawer" 
      class="hamburger-menu hs-dropdown-toggle
             w-11 h-11 p-2 mt-2 rounded-sm 
             bg-gray-100 dark:bg-gray-700
             text-gray-800 dark:text-gray-200
             text-sm
             flex items-center justify-center cursor-pointer"
    >
    <i class="fa-solid fa-bars text-sm"></i>
    </label>

    <div class={`dropdown ${isOpen ? 'block' : 'hidden'} bg-white shadow-lg`}>  
      <ul class="menu space-y-2">
        <li>
          <a on:click={gotoCurrentLocation} class="w-full flex items-center px-3 py-2 menu-item" title="Go to current location"><i class="fa-solid fa-house-user text-sm text-gray-800 dark:text-gray-200"></i></a>
        </li>
        <li>
          <a on:click={handleManageSites} class="w-full flex items-center px-3 py-2 menu-item" title="Manage sites"><i class="fa-solid fa-map text-sm text-gray-800 dark:text-gray-200"></i></a>
        </li>
        <li>
          <a on:click={handleSettings} class="w-full flex items-center px-3 py-2 menu-item" title="Settings"><i class="fa-solid fa-gear text-sm text-gray-800 dark:text-gray-200"></i></a>
        </li>
      </ul>
    </div>
  </div>
</div>


<style>
.close-button {
    background: none;
    color:#888;
    border: none;
    font-size: 1.5em;
    cursor: pointer;
}
</style>