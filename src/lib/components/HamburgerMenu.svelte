<script>
  import { createEventDispatcher } from 'svelte';
  import { settings } from '$lib/stores/settings.js';
  import { getCurrentLocation } from '$lib/utils.js';
  import Button from './Button.svelte';

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

<div class="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-30 w-full bg-white dark:bg-gray-700 shadow-lg">
  <div class="flex justify-center gap-2 py-0">
    <Button
      variant="menu"
      on:click={gotoCurrentLocation}
      title="Go to current location"
      icon="fa-solid fa-house-user"
    />
    <Button
      variant="menu"
      on:click={handleManageSites}
      title="Manage sites"
      icon="fa-solid fa-map"
    />
    <Button
      variant="menu"
      on:click={handleSettings}
      title="Settings"
      icon="fa-solid fa-gear"
    />
    <Button
      variant="menu"
      on:click={handleSwitchLayer}
      title="Switch Map Layer"
      icon="fa-solid fa-layer-group"
    />
    <Button
      variant="menu"
      on:click={handleTemperaturesLayer}
      title={`${showTemperatures ? 'Hide' : 'Show'} Location Temperatures`}
      icon="fa-solid fa-cloud"
    />
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