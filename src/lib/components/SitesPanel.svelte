<script>
	import { campSitesStore } from '$lib/stores/campSites';
	import { settings } from '$lib/stores/settings.js';

	export let isOpen = false;
	export let map;

	function handleClose() {
		isOpen = false;
	}

	async function getCurrentLocation() {
		if (!map) {
			console.error('Map not available');
			return;
		}

		// Check if geolocation is available
		if (!navigator.geolocation) {
			alert('Location services are not supported by your browser');
			return;
		}

		// Add an overlay spinner
		let overlay = document.createElement('div');
		overlay.className = 'spinner-overlay';
		overlay.innerHTML = '<div class="loading-spinner">Getting your location...</div>';
		document.body.appendChild(overlay);

		// When location is found or error occurs, remove the overlay
		function removeOverlay() {
			if (overlay && document.body.contains(overlay)) {
				document.body.removeChild(overlay);
			}
		}

		// Set a timeout for 5 seconds
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error('timeout'));
				removeOverlay();
			}, 5000);
		});

		try {
			const locationPromise = new Promise((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: true,
					timeout: 5000,
					maximumAge: 0
				});
			});

			const position = await Promise.race([locationPromise, timeoutPromise]);

			const { latitude, longitude } = position.coords;
			localStorage.setItem('lastKnownLocation', JSON.stringify({ latitude, longitude }));

			map.setView([latitude, longitude], $settings.app.focusZoomLevel, {
				animate: true,
				duration: 1
			});
			removeOverlay();
		} catch (error) {
			removeOverlay();

			L.popup()
				.setLatLng(map.getCenter())
				.setContent(
					'Cannot get location. Check your browser address bar if location permission required and try again'
				)
				.openOn(map);
		}
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

			// handleClose();
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
</script>

<div
	class="fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out {isOpen
		? 'translate-x-0'
		: '-translate-x-full'}"
>
	<div class="h-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg">
		<div class="flex h-full flex-col">
			<!-- Header -->
			<div class="flex items-center justify-between border-b bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 px-4 py-3">
				<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Camp Sites</h2>
				<div class="flex items-center space-x-2">
					<button class="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-300" on:click={getCurrentLocation}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
					<button class="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" on:click={handleClose}>×</button>
				</div>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto">
				{#if $campSitesStore.length === 0}
					<div class="p-4 text-center text-gray-500 dark:text-gray-400">
						<p>No locations saved yet</p>
					</div>
				{:else}
					<div class="divide-y">
						{#each $campSitesStore as site}
							<div class="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
								<div class="flex items-center justify-between">
									<div class="min-w-0 flex-1 pr-2">
										<input
											type="text"
											value={site.name}
											on:blur={(e) => updateSiteName(site, e)}
											class="w-full border-none bg-transparent p-0 font-medium focus:ring-0 text-gray-900 dark:text-gray-100"
										/>
										{#if site.description}
											<p class="truncate text-xs text-gray-500 dark:text-gray-400">{site.description}</p>
										{/if}
									</div>
									<div class="flex items-center space-x-2">
										<button
											class="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-500"
											on:click={() => focusOnSite(site)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-5 w-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
													clip-rule="evenodd"
												/>
											</svg>
										</button>
										<button
											class="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-500"
											on:click={() => deleteSite(site)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-5 w-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
													clip-rule="evenodd"
												/>
											</svg>
										</button>
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
