<script>
  import { createEventDispatcher } from 'svelte';
  import { settings } from '$lib/stores/settings.js';
  import { getCurrentLocation } from '$lib/utils.js';
  import Button from './Button.svelte';

  export let isOpen = false;
  export let map;

  const dispatch = createEventDispatcher();
  let showTemperatures = false;

  function handleManageSites() {
    dispatch('manageSites');
  }

  function handleSettings() {
    dispatch('openSettings');
  }

  function gotoCurrentLocation() {
    getCurrentLocation(map, $settings);
  }

  function closeMenu() {
    isOpen = false;
  }

  function handleSwitchLayer() {
    console.log('handleSwitchLayer called');
    dispatch('switchLayer');
  }

  function handleHeatGradientLayer() {
    dispatch('toggleHeatGradient');
  }

  function handleTemperaturesLayer() {
    showTemperatures = !showTemperatures;
    dispatch('toggleTemperatures');
  }
</script>

<div class="fixed top-10 left-5 z-30 h-full">
  <input id="menu-drawer" type="checkbox" class="hidden" bind:checked={isOpen} />

  <div class="relative">
    <label 
      for="menu-drawer" 
      class="hamburger-menu p-3 mt-2 text-md dark:bg-gray-700 bg-gray-200 dark:text-gray-200 flex items-center justify-center cursor-pointer"
    >
      <i class="fa-solid fa-bars text-sm text-gray-800 dark:text-gray-200"></i>
    </label>

    <div class={`dropdown ${isOpen ? 'block' : 'hidden'} bg-white dark:bg-gray-700 shadow-lg`}>  
      <ul class="menu space-y-2 cursor-pointer">
        <li>
          <Button
            variant="menu"
            fullWidth
            on:click={gotoCurrentLocation}
            title="Go to current location"
            icon="fa-solid fa-house-user"
          />
        </li>
        <li>
          <Button
            variant="menu"
            fullWidth
            on:click={handleManageSites}
            title="Manage sites"
            icon="fa-solid fa-map"
          />
        </li>
        <li>
          <Button
            variant="menu"
            fullWidth
            on:click={handleSettings}
            title="Settings"
            icon="fa-solid fa-gear"
          />
        </li>
        <li>
          <Button
            variant="menu"
            fullWidth
            on:click={handleSwitchLayer}
            title="Switch Map Layer"
            icon="fa-solid fa-layer-group"
          />
        </li>
        <li>
          <Button
            variant="menu"
            fullWidth
            on:click={handleTemperaturesLayer}
            title={`${showTemperatures ? 'Hide' : 'Show'} Location Temperatures`}
            icon="fa-solid fa-cloud"
          />
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