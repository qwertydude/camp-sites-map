<script>
  import { createEventDispatcher } from 'svelte';
  import { settings } from '$lib/stores/settings.js';
  import { getCurrentLocation } from '$lib/utils.js'; // Import the utility function

  export let isOpen = false;
  export let map;
  export let campSiteMap;

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
      class="hamburger-menu
             p-3 mt-2
             text-md
             dark:bg-gray-700
             bg-gray-200
             dark:text-gray-200
             flex items-center justify-center cursor-pointer"
    >
    <i class="fa-solid fa-bars text-sm text-gray-800 dark:text-gray-200"></i>
    </label>

    <div class={`dropdown ${isOpen ? 'block' : 'hidden'} bg-white dark:bg-gray-700 shadow-lg`}>  
      <ul class="menu space-y-2">
        <li>
          <a on:click={gotoCurrentLocation} class="w-full flex items-center p-3 menu-item" title="Go to current location">
            <i class="fa-solid fa-house-user text-md text-gray-800 dark:text-gray-200"></i></a>
        </li>
        <li>
          <a on:click={handleManageSites} class="w-full flex items-center p-3 menu-item" title="Manage sites">
            <i class="fa-solid fa-map text-md text-gray-800 dark:text-gray-200"></i></a>
        </li>
        <li>
          <a on:click={handleSettings} class="w-full flex items-center p-3 menu-item" title="Settings">
            <i class="fa-solid fa-gear text-md text-gray-800 dark:text-gray-200"></i></a>
        </li>
        <li>
          <a on:click={() => campSiteMap.switchLayer()} class="w-full flex items-center p-3 menu-item" title="Switch Map Layer">
            <i class="fa-solid fa-layer-group text-md text-gray-800 dark:text-gray-200"></i>
          </a>
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