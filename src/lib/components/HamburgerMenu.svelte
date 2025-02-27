<script>
  import { createEventDispatcher } from 'svelte';
  import { settings } from '$lib/stores/settingsStore.js';
  import { getCurrentLocation } from '$lib/utils.js';
  import Button from './Button.svelte';

  export let map;

  const dispatch = createEventDispatcher();
  let showTemperatures = false;
  let mapType ='map';

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
    mapType = mapType === 'map' ? 'globe' : 'map';
    console.log('Map type:', mapType);
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
      icon="fa-solid fa-location-crosshairs"
    />
    <Button
      variant="menu"
      on:click={handleManageSites}
      title="Manage sites"
      icon="fa-solid fa-list"
      selected={false}
    />
    <Button
      variant="menu"
      on:click={handleSwitchLayer}
      title="Switch Map Layer"
      icon="fa-solid fa-{mapType}"
      selected={false}
    />
    <Button
      variant="menu"
      on:click={handleTemperaturesLayer}
      title={`${showTemperatures ? 'Hide' : 'Show'} Location Temperatures`}
      icon="fa-solid fa-cloud"
      selected={showTemperatures}
    />
    <Button
      variant="menu"
      on:click={handleSettings}
      title="Settings"
      icon="fa-solid fa-gear"
      selected={false}
    />
  </div>
</div>
