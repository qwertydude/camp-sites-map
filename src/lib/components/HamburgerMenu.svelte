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
  
  <div class="relative hs-dropdown">
    <label 
      for="menu-drawer" 
      class="hamburger-menu hs-dropdown-toggle
             w-11 h-11 p-2 mt-2 ml-2rounded-sm 
             bg-gray-200 
             text-gray-700
             dark:bg-gray-800 
             transition-colors duration-200 
             flex items-center justify-center cursor-pointer"
    >
      <ion-icon name="menu" size="small"></ion-icon>
    </label>

    <div class={`hs-dropdown-menu ${isOpen ? 'block' : 'hidden'} bg-white shadow-lg`}>  
      <ul class="menu space-y-2">
        <li>
          <a on:click={gotoCurrentLocation} class="w-full flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150 menu-item" title="Go to current location"><ion-icon name="home" size="small"></ion-icon></a>
        </li>
        <li>
          <a on:click={handleManageSites} class="w-full flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150 menu-item" title="Manage sites"><ion-icon name="map" size="small"></ion-icon></a>
        </li>
        <li>
          <a on:click={handleSettings} class="w-full flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150 menu-item" title="Settings"><ion-icon name="settings" size="small"></ion-icon></a>
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