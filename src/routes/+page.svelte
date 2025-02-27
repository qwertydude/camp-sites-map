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
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
		crossorigin=""
	/>
</svelte:head>

<main class="relative h-screen w-screen overflow-hidden">
	<CampSiteMap on:mapInit={handleMapInit} />
</main>
