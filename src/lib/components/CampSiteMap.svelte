<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { campSitesStore } from '$lib/stores/campSites';
	import { createEventDispatcher } from 'svelte';
	import { getCurrentLocation } from '$lib/utils';
	import { drawRoute } from '$lib/utils';
	import { settings } from '$lib/stores/settings.js';
	import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
	import SitesPanel from '$lib/components/SitesPanel.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import mapboxgl from 'mapbox-gl';
	import 'mapbox-gl/dist/mapbox-gl.css';

	const dispatch = createEventDispatcher();
	const mapboxToken = import.meta.env.PUBLIC_MAPBOX_ACCESS_TOKEN;
	mapboxgl.accessToken = mapboxToken;

	let map;
	let markers = new Map(); // Store markers with site IDs
	let isAddSiteMode = false;
	let selectedSites = [];
	let currentRouteLayer;
	let travelMode = 'foot';
	let isMenuOpen = false;
	let isSitesPanelOpen = false;
	let isSettingsPanelOpen = false;
	let currentStyle = 'mapbox://styles/mapbox/streets-v12'; // Default style


	let isOpen = false;

	function getRouteInfoTemplate(mode, content) {
		return `
			<div class="route-info p-2 bg-transparent">
				<h3 class="font-semibold text-gray-700 dark:text-gray-700 mb-2">Route Information</h3>
				<div class="travel-modes flex gap-2 mt-2 text-lg">
					<button class="travel-mode-btn p-1 rounded-md ${mode === 'foot' ? 'text-blue-800 dark:text-blue-300' : 'bg-transparent text-white'} hover:text-blue-800 " data-mode="foot">
						<i class="${mode === 'foot' ? 'brightness-200' : ''} fa-solid fa-person-walking"></i>
					</button>
					<button class="travel-mode-btn p-1 rounded-md ${mode === 'bike' ? 'text-blue-800 dark:text-blue-300' : 'bg-transparent text-white'} hover:text-blue-800 " data-mode="bike">
						<i class="${mode === 'bike' ? 'brightness-200' : ''} fa-solid fa-bicycle"></i>
					</button>
					<button class="travel-mode-btn p-1 rounded-md ${mode === 'car' ? 'text-blue-800 dark:text-blue-300' : 'bg-transparent text-white'} hover:text-blue-800 " data-mode="car">
						<i class="${mode === 'car' ? 'brightness-200' : ''} fa-solid fa-car"></i>
					</button>
				</div>
				<p class="text-gray-700 dark:text-gray-700">${content}</p>
			</div>
		`;
	}
	let startMarker;
	let endMarker;

	async function initializeMap(position = null) {
		if (!browser) return;

		console.log('initializeMap called');
		const mapElement = document.getElementById('map');
		console.log('Map element dimensions:', mapElement?.getBoundingClientRect());

		try {
			// Use user location if available, otherwise default to Wodonga
			const startLat = position ? position.coords.latitude : -36.114858138524454;
			const startLng = position ? position.coords.longitude : 146.8884086608887;

			console.log('Creating map instance at:', { startLat, startLng });

			if (!map) {
				map = new mapboxgl.Map({
					container: 'map',
					style: currentStyle,
					center: [startLng, startLat],
					zoom: $settings.app.defaultZoomLevel
				});

				console.log('Map created in CampSiteMap:', map);
				dispatch('mapInit', map);
				console.log('Map dispatched');

				// Add navigation controls
				map.addControl(new mapboxgl.NavigationControl({
					position: 'top-right'
				}));

				// Add geolocate control
				const geolocateControl = new mapboxgl.GeolocateControl({
					positionOptions: {
						enableHighAccuracy: true
					},
					trackUserLocation: true
				});
				map.addControl(geolocateControl);

				// Add user location marker if we have it
				if (position) {
					console.log('Adding user location marker');
					const el = document.createElement('div');
					el.className = 'user-location';
					el.style.backgroundColor = '#4A90E2';
					el.style.width = '12px';
					el.style.height = '12px';
					el.style.borderRadius = '50%';
					el.style.border = '2px solid white';

					new mapboxgl.Marker(el)
						.setLngLat([startLng, startLat])
						.addTo(map);
				}
			}
			// Add map click handler
			map.on('click', async (e) => {
				const point = e.lngLat;
				console.log('Map clicked at:', point);

				// Check if command/ctrl key is pressed
				if (!e.originalEvent.metaKey && !e.originalEvent.ctrlKey) {
					return; // Do nothing if command/ctrl is not pressed
				}

				const currentZoom = map.getZoom();
				if (currentZoom < 14) {
					new mapboxgl.Popup({
						className: 'dark:bg-gray-800 dark:text-gray-100'
					})
						.setLngLat(point)
						.setHTML(
							'<div class="add-site-popup dark:bg-gray-800 dark:text-gray-100">' +
								'<p>Please zoom in closer to add a camp site (zoom level must be 14 or greater)</p>' +
								'<p>Current zoom level: ' +
								Math.floor(currentZoom) +
								'</p>' +
								'<p>Tip: Use Cmd/Ctrl + Click to add a site</p>' +
								'</div>'
						)
						.addTo(map);
					return;
				}

				// Create a popup for input
				const popupContent = document.createElement('div');
				popupContent.innerHTML = `
					<div class="add-site-popup dark:bg-gray-800 dark:text-gray-100">
						<h3 class="dark:text-gray-200">Add New Camp Site</h3>
						<input type="text" id="site-title" placeholder="Site Title" 
						class="site-input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
						<textarea id="site-description" placeholder="Site Description" 
						class="site-input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"></textarea>
						<div class="popup-buttons">
						<button id="confirm-add" 
							class="confirm-btn dark:bg-blue-700 dark:hover:bg-blue-800">Add Site</button>
						<button id="cancel-add" 
							class="cancel-btn dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
						</div>
					</div>
					`;

				// Create and show the popup
				const popup = new mapboxgl.Popup({
					className: 'dark:bg-gray-800 dark:text-gray-100',
					maxWidth: '300px'
				})
					.setLngLat(point)
					.setDOMContent(popupContent)
					.addTo(map);

				// Handle form submission
				popupContent.querySelector('#confirm-add').addEventListener('click', async () => {
					const title = popupContent.querySelector('#site-title').value.trim();
					const description = popupContent.querySelector('#site-description').value.trim();

					if (title) {
						const newSite = await campSitesStore.addSite({
							name: title,
							description: description || '',
							latitude: point.lat,
							longitude: point.lng
						});

						if (newSite) {
							popup.remove();
						} else {
							alert('Error adding camp site. Please try again.');
						}
					} else {
						alert('Please enter a title for the camp site');
					}
				});

				// Handle cancellation
				popupContent.querySelector('#cancel-add').addEventListener('click', () => {
					popup.remove();
				});
			});

			// Initialize the store
			let unsubscribe;
			unsubscribe = campSitesStore.initialize();

			// Wait for map to load before adding markers
			map.on('load', () => {
				campSitesStore.subscribe((sites) => {
					updateMarkers(sites);
				});
			});

			console.log('Map initialization complete');
		} catch (error) {
			console.error('Error initializing map:', error);
		}
	}

	function updateMarkers(sites) {
		// Remove existing markers
		for (let marker of markers.values()) {
			marker.remove();
		}
		markers.clear();

		// Add new markers
		sites.forEach((site) => {
			const el = document.createElement('div');
			el.className = 'marker';
			el.innerHTML = '<i class="fa-solid fa-location-dot text-3xl drop-shadow-md"></i>';
			
			const marker = new mapboxgl.Marker(el)
				.setLngLat([site.longitude, site.latitude])
				.setPopup(
					new mapboxgl.Popup({ offset: 25 })
						.setHTML(`
							<div class="popup-content ${$settings.app.theme === 'dark' ? 'dark' : ''}">
								<h3>${site.title}</h3>
								<p>${site.description || 'No description available'}</p>
							</div>
						`)
				)
				.addTo(map);

			markers.set(site.id, marker);
		});
	}

	onMount(async () => {
		if (!browser) return;

		console.log('CampSiteMap onMount called');

		setTimeout(() => {
			if ('geolocation' in navigator) {
				console.log('Requesting user location...');

				// Set a timeout for geolocation request
				const timeoutId = setTimeout(() => {
					console.log('Location request timed out, using default location');
					initializeMap();
				}, 3000);

				navigator.geolocation.getCurrentPosition(
					(position) => {
						clearTimeout(timeoutId);
						console.log('Got user location', position);
						initializeMap(position);
					},
					(error) => {
						clearTimeout(timeoutId);
						console.warn('Geolocation error:', error);
						initializeMap();
					},
					{
						enableHighAccuracy: true,
						timeout: 3000,
						maximumAge: 0
					}
				);
			} else {
				console.log('Geolocation not available');
				initializeMap();
			}
		}, 100);

		// Add global keydown and keyup event listeners
		const handleKeyDown = (e) => {
			if (e.metaKey || e.ctrlKey) {
				isAddSiteMode = true;
			}
		};

		const handleKeyUp = (e) => {
			if (!e.metaKey && !e.ctrlKey) {
				isAddSiteMode = false;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		// Clean up event listeners
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});

	onDestroy(() => {
		if (map) map.remove();
		if (unsubscribe) unsubscribe();
	});

	let unsubscribe;
	// Subscribe to camp sites store
	unsubscribe = campSitesStore.subscribe((sites) => {
		if (browser && map) {
			updateMarkers(sites);
		}
	});

	async function calculateRoute(start, end) {
		const mapboxProfile = {
			foot: 'walking',
			bike: 'cycling',
			car: 'driving'
		}[travelMode];

		const url = `https://api.mapbox.com/directions/v5/mapbox/${mapboxProfile}/${start.lng},${start.lat};${end.lng},${end.lat}?alternatives=true&geometries=geojson&access_token=${mapboxToken}`;

		try {
			const response = await fetch(url);
			const data = await response.json();
			const routesCount = data.routes.length;
			const routeDDList = data.routes.map((route, index) => {
				return `<a href="#" class="route-link" data-index="${index}">Route ${index + 1}: ${Math.round(route.distance / 1000, 1)} km - ${Math.round(route.duration / 60, 1)} min</a>`;
			});

			let routes = routeDDList.join('<br>');
			console.log('routeDDList:', routeDDList);
			console.log('typeof routeDDList:', typeof routeDDList);
			console.log('Is routeDDList an array?', Array.isArray(routeDDList));

			if (routesCount === 0) {
				throw new Error('No routes found');
			}
			console.log('data:', data);
			// Clear existing route
			if (currentRouteLayer) {
				currentRouteLayer.remove();
			}

			// Draw the new route
			currentRouteLayer = await drawRoute(map, data.routes[0].geometry);

			// Add click handler to the route
			currentRouteLayer.on('click', async (e) => {
				const popup = L.popup()
					.setLatLng(e.latlng)
					.setContent(getRouteInfoTemplate(travelMode, routes))
					.openOn(map);

				// Add click handlers for the travel mode buttons after popup is added to DOM
				setTimeout(() => {
					document.querySelectorAll('.travel-mode-btn').forEach((btn) => {
						btn.addEventListener('click', (event) => {
							const mode = event.currentTarget.dataset.mode;
							travelMode = mode;
							calculateRoute(start, end);
						});
					});
				}, 0);
			});

			// Zoom to the route when generated
			map.fitBounds(currentRouteLayer.getBounds());

			// Calculate distance in kilometers
			const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
			const durationInMinutes = Math.round(data.routes[0].duration / 60); // Convert seconds to minutes
			const hours = Math.floor(durationInMinutes / 60);
			const minutes = durationInMinutes % 60;

			// Format the duration string
			let durationString;
			if (hours > 0) {
				durationString = `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
			} else {
				durationString = `${minutes} min${minutes !== 1 ? 's' : ''}`;
			}

			// Show the route information in a popup
			//routes = routeDDList.join('<br>');
			
			const popupContent = document.createElement('div');
			popupContent.innerHTML = getRouteInfoTemplate(travelMode, routes);

			// Add event listener to the popup content
			popupContent.addEventListener('click', async (event) => {
				if (event.target.classList.contains('route-link')) {
					const index = event.target.dataset.index;
					console.log('Clicked route index:', index);
					currentRouteLayer.remove();
					currentRouteLayer = await drawRoute(map, data.routes[index].geometry);
					map.fitBounds(currentRouteLayer.getBounds());
				}
			});

			// Add event listeners to the buttons
			const buttons = popupContent.querySelectorAll('.travel-mode-btn');
			buttons.forEach((button) => {
				button.addEventListener('click', () => {
					const mode = button.dataset.mode;
					console.log('Setting travel mode to:', mode);
					setTravelMode(mode);
				});
			});

			// Create and open the popup
			L.popup()
				.setLatLng([(start.lat + end.lat) / 2, (start.lng + end.lng) / 2])
				.setContent(popupContent)
				.openOn(map);

			// Change existing markers for start and end points with appropriate colors
			if (startMarker) {
				startMarker.setIcon(
					L.divIcon({
						html: '<div style="background-color: green; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
						className: 'start-marker'
					})
				);
			}
			if (endMarker) {
				endMarker.setIcon(
					L.divIcon({
						html: '<div style="background-color: red; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
						className: 'end-marker'
					})
				);
			}
		} catch (error) {
			console.error('Error calculating route:', error);
			alert('Unable to calculate route. Please try again.');
		}
	}

	function setTravelMode(mode) {
		travelMode = mode;

		if (selectedSites.length === 2) {
			calculateRoute(selectedSites[0], selectedSites[1]);
		}
	}

	function switchLayer() {
		const newStyle = currentStyle === 'mapbox://styles/mapbox/streets-v12' 
			? 'mapbox://styles/mapbox/satellite-streets-v12'
			: 'mapbox://styles/mapbox/streets-v12';
		
		map.setStyle(newStyle);
		currentStyle = newStyle;

		// Re-add markers after style change
		map.once('style.load', () => {
			updateMarkers(campSitesStore.get());
		});
	}
	function handleManageSites() {
		isSitesPanelOpen = true;
	}

	function handleOpenSettings() {
		isSettingsPanelOpen = true;
  }

</script>

<div id="map" class="map-container" class:add-site-mode={isAddSiteMode}></div>
<HamburgerMenu
	bind:isOpen={isMenuOpen}
	map={map}
	on:manageSites={handleManageSites}
	on:openSettings={handleOpenSettings}
	on:switchLayer={switchLayer}
/>
<SitesPanel bind:isOpen={isSitesPanelOpen} map={map} />

<SettingsPanel bind:isOpen={isSettingsPanelOpen} />


<style>
	.map-container {
		width: 100%;
		height: 100%;
		cursor: default;
	}

	.map-container.add-site-mode {
		cursor: crosshair;
	}

	/* Leaflet dark mode adjustments */
	:global(.leaflet-popup.dark) {
		--tw-bg-opacity: 1;
		background-color: rgb(31 41 55 / var(--tw-bg-opacity));
	}

	:global(.leaflet-popup.dark .leaflet-popup-content) {
		color: rgb(229 231 235 / var(--tw-text-opacity));
	}

	/* Fade-out animation for layer switching */
	.fade-out {
		animation: fade-out 0.3s;
	}

	@keyframes fade-out {
		0% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
