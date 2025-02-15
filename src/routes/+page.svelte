<script>
  import { browser } from '$app/environment';
  import CampSiteMap from '$lib/components/CampSiteMap.svelte';
  import { onMount } from 'svelte';  // Add this line
  import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
  import SitesPanel from '$lib/components/SitesPanel.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import { settings } from '$lib/stores/settings.js';
  
  
  let mapInstance;
  let isMenuOpen = false;
  let isSitesPanelOpen = false;
  let isSettingsPanelOpen = false;
  let campSiteMap;

  onMount(() => {
    if (browser) {
      settings.initialize();
    }
  });

  function handleMapInit(event) {
    mapInstance = event.detail;
  }

  function handleManageSites() {
    isSitesPanelOpen = true;
    // isMenuOpen = false;  // Removed to keep menu open
  }

  function handleOpenSettings() {
    isSettingsPanelOpen = true;
    // isMenuOpen = false;  // Removed to keep menu open
  }
</script>

<svelte:head>
  <title>Camp Sites Map</title>
  <link 
    rel="stylesheet" 
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
  />
</svelte:head>

<main class="relative h-screen w-screen overflow-hidden">
  <HamburgerMenu 
    bind:isOpen={isMenuOpen}
    map={mapInstance}
    on:manageSites={handleManageSites}
    on:openSettings={handleOpenSettings}
    campSiteMap={campSiteMap}
  />
  
  <CampSiteMap 
    on:mapInit={handleMapInit}
    bind:this={campSiteMap}
  />
  
  <SitesPanel
    bind:isOpen={isSitesPanelOpen}
    map={mapInstance}
  />

  <SettingsPanel
    bind:isOpen={isSettingsPanelOpen}
  />
</main>
