<script>
	import { browser } from '$app/environment';
	import CampSiteMap from '$lib/components/CampSiteMap.svelte';
	import { onMount } from 'svelte'; 
	import { settings } from '$lib/stores/settingsStore.js';

	let mapInstance;

	onMount(() => {
		if (browser) {
			settings.initialize();
		}
	});

	function handleMapInit(event) {
		mapInstance = event.detail;
	}


</script>

<svelte:head>
	<title>Camp Sites Map</title>
</svelte:head>

<main class="relative h-screen w-screen overflow-hidden">
	<CampSiteMap 
		on:mapInit={handleMapInit} 
		mapboxToken="pk.eyJ1IjoieW91ci1tYXBib3gtdXNlcm5hbWUiLCJhIjoieW91ci1tYXBib3gtdG9rZW4ifQ.your-mapbox-token-signature" 
	/>
</main>
