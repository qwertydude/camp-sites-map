<script>
	import { campSitesStore } from '$lib/stores/campSitesStore';
	import { settings } from '$lib/stores/settingsStore.js';
	import { getCurrentLocation } from '$lib/utils.js';
	import Button from './Button.svelte';

	export let isOpen = false;
	export let map;

	function handleClose() {
		isOpen = false;
	}

	function focusOnSite(site) {
		if (!map) return;

		try {
			let targetMarker;
			map.eachLayer((layer) => {
				if (layer instanceof L.Marker) {
					const latlng = layer.getLatLng();
					if (latlng.lat === site.latitude && latlng.lng === site.longitude) {
						targetMarker = layer;
					}
				}
			});

			map.setView([site.latitude, site.longitude], $settings.app.focusZoomLevel, {
				animate: true,
				duration: 1
			});

			if (targetMarker) {
				setTimeout(() => {
					targetMarker.openPopup();
				}, 1000);
			}
		} catch (error) {
			console.error('Error focusing on site:', error);
		}
	}

	async function deleteSite(site) {
		const confirmed = confirm(`Are you sure you want to delete "${site.name}"?`);
		if (confirmed) {
			await campSitesStore.deleteSite(site.id);
		}
	}

	async function updateSiteName(site, event) {
		const newName = event.target.value.trim();
		if (newName && newName !== site.name) {
			await campSitesStore.updateSite(site.id, { name: newName });
		}
	}

	async function gotoCurrentLocation() {
		await getCurrentLocation(map, $settings);
	}
</script>

<div
	class="fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out {isOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
>
	<div class="h-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg">
		<div class="flex h-full flex-col">
			<!-- Header -->
			<div class="flex items-center justify-between border-b bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 px-4 py-3">
				<h2 class="text-md font-semibold text-gray-800 dark:text-gray-200">Camp Sites</h2>
				<div class="flex items-center space-x-2">
					<Button
						variant="icon"
						size="sm"
						on:click={gotoCurrentLocation}
						title="Go to current location"
						icon="fa-solid fa-location-crosshairs"
					/>
					<Button
						variant="icon"
						size="sm"
						on:click={handleClose}
						title="Close panel"
						icon="fa-solid fa-times"
					/>
				</div>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto">
				{#if $campSitesStore.length === 0}
					<div class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
						<p>No locations saved yet</p>
					</div>
				{:else}
					<div class="divide-y divide-gray-200 dark:divide-gray-700">
						{#each $campSitesStore as site}
							<div class="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
								<div class="flex items-center justify-between">
									<div class="min-w-0 flex-1 pr-2">
										<input
											type="text"
											value={site.name}
											on:blur={(e) => updateSiteName(site, e)}
											class="w-full border-none bg-transparent p-0 font-medium focus:ring-0 text-gray-900 dark:text-gray-100 text-sm"
										/>
										{#if site.description}
											<p class="truncate text-xs text-gray-500 dark:text-gray-400">{site.description}</p>
										{/if}
									</div>
									<div class="flex items-center space-x-2">
										<Button
											variant="icon-blue"
											size="sm"
											on:click={() => focusOnSite(site)}
											title="Focus on site"
											icon="fa-solid fa-location-dot"
											iconColor="text-blue-600 dark:text-blue-500"
											/>
										<Button
											variant="icon-red"
											size="sm"
											on:click={() => deleteSite(site)}
											title="Delete site"
											icon="fa-solid fa-trash"
											iconColor="text-red-600 dark:text-red-500"
											/>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
