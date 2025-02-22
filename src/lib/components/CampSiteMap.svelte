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
	const openWeatherMapApiKey = import.meta.env.PUBLIC_OPENWEATHER_API_KEY;
	mapboxgl.accessToken = mapboxToken;

	let map;
	let markers = new Map(); // Store markers with site IDs
	let isAddSiteMode = false;
	let selectedSites = [];
	let weatherLayerVisible = false;
	let weatherLayer = null;
	let currentRouteLayer;
	let travelMode = 'foot';
	let isMenuOpen = false;
	let isSitesPanelOpen = false;
	let isSettingsPanelOpen = false;
	let currentStyle = 'mapbox://styles/mapbox/streets-v12'; // Default style
	let isOpen = false;
	let popups = [];
	

	/**
	 * Returns a template for the route information popup.
	 * @param {string} mode - The travel mode (foot, bike, or car).
	 * @param {string} content - The content to display in the popup.
	 * @returns {string} The HTML template for the popup.
	 */
	function getRouteInfoTemplate(mode, content) {
		return `
			<div class="route-info p-2 bg-transparent">
				<h3 class="font-semibold text-gray-700 dark:text-gray-700 mb-2">Route Information</h3>
				<div class="travel-modes flex gap-2 mt-2 text-lg">
					<button 
						class="travel-mode-btn inline-flex items-center justify-center transition-colors duration-200 focus:outline-none rounded-md p-2 
						${mode === 'foot' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}"
						data-mode="foot"
						title="Walking"
					>
						<i class="fa-solid fa-person-walking"></i>
					</button>
					<button 
						class="travel-mode-btn inline-flex items-center justify-center transition-colors duration-200 focus:outline-none rounded-md p-2
						${mode === 'bike' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}"
						data-mode="bike"
						title="Cycling"
					>
						<i class="fa-solid fa-bicycle"></i>
					</button>
					<button 
						class="travel-mode-btn inline-flex items-center justify-center transition-colors duration-200 focus:outline-none rounded-md p-2
						${mode === 'car' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}"
						data-mode="car"
						title="Driving"
					>
						<i class="fa-solid fa-car"></i>
					</button>
				</div>
				<p class="text-gray-700 dark:text-gray-700">${content}</p>
			</div>
		`;
	}
	let startMarker;
	let endMarker;

	/**
	 * Initializes the map with the given position.
	 * If no position is provided, it defaults to Wodonga.
	 * @param {Object} position - The position object containing latitude and longitude.
	 */
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
				map.addControl(
					new mapboxgl.NavigationControl({
						position: 'top-right'
					})
				);

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

					new mapboxgl.Marker(el).setLngLat([startLng, startLat]).addTo(map);
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
						className: 'dark:bg-gray-800 dark:text-gray-100 p-5'
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

	/**
	 * Updates the markers on the map based on the given sites.
	 * @param {Array} sites - The array of site objects.
	 */
	function updateMarkers(sites) {
		// Remove existing markers
		for (let marker of markers.values()) {
			marker.remove();
		}
		markers.clear();

		// Add new markers
		sites.forEach((site) => {
			const el = document.createElement('div');
			el.className = 'site-pip-container';
			el.innerHTML = '<i class="fa-solid fa-location-dot text-3xl drop-shadow-md site-pip"></i>';
console.log('selectedSites', selectedSites)
			const popup = new mapboxgl.Popup()
				.setHTML(
					`
							<div class="popup-content ${$settings.app.theme === 'dark' ? 'dark' : ''}">
							${site.name ? `<h3>${site.name}</h3>` : ''}
							${site.description ? `<p>${site.description}</p>` : ''}
							<div class="popup-buttons">
								${selectedSites.length === 0 || selectedSites[0].id !== site.id ? 
									`<button class="route-btn start-route" data-variant="route-start">Start Route</button>` : 
									''}
								${selectedSites.length === 1 && selectedSites[0].id === site.id ? 
									`<button class="route-btn end-route" data-variant="route-end">End Route</button>` : 
									''}
							</div>
						</div>
					`
				)

			const marker = new mapboxgl.Marker({color:'blue',className:'site-pip'})
				.setLngLat([site.longitude, site.latitude])
				.setPopup(popup)
				.addTo(map);

			markers.set(site.id, marker);

			popup.on('open', (marker) => {
					console.log('Popup opened for site:', site.name);
					const startRoute = document.querySelector('.start-route');
					const endRoute = document.querySelector('.end-route');

					console.log(startRoute, endRoute);
					// Add click handlers
					if (startRoute) {
						startRoute.addEventListener('click', () => {
							console.log('Start route button clicked');
							setRouteStart(site, popup);
						});
					}
					if (endRoute) {
						endRoute.addEventListener('click', () => {
							console.log('End route button clicked');
							setRouteEnd(site, popup);
						});
					}
				});	
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

	/**
	 * Calculates the route between the given start and end points.
	 * @param {Object} start - The start point object containing latitude and longitude.
	 * @param {Object} end - The end point object containing latitude and longitude.
	 */
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
				const popupContent = document.createElement('div');
				popupContent.innerHTML = getRouteInfoTemplate(travelMode, routes);

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

				// Create and open the popup
				new mapboxgl.Popup().setLngLat(e.lngLat).setDOMContent(popupContent).addTo(map);
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
			new mapboxgl.Popup()
				.setLngLat([(start.lat + end.lat) / 2, (start.lng + end.lng) / 2])
				.setDOMContent(popupContent)
				.addTo(map);

			// Change existing markers for start and end points with appropriate colors
			if (startMarker) {
				startMarker.setIcon(document.createElement('div'));
			}
			if (endMarker) {
				endMarker.setIcon(document.createElement('div'));
			}
		} catch (error) {
			console.error('Error calculating route:', error);
			alert('Unable to calculate route. Please try again.');
		}
	}

	/**
	 * Sets the travel mode to the given mode.
	 * @param {string} mode - The travel mode (foot, bike, or car).
	 */
	function setTravelMode(mode) {
		travelMode = mode;

		if (selectedSites.length === 2) {
			calculateRoute(selectedSites[0], selectedSites[1]);
		}
	}

	/**
	 * Switches the map layer to the satellite or street view.
	 */
	function switchLayer() {
		const newStyle =
			currentStyle === 'mapbox://styles/mapbox/streets-v12'
				? 'mapbox://styles/mapbox/satellite-streets-v12'
				: 'mapbox://styles/mapbox/streets-v12';

		// Save the current weather layer state
		const wasWeatherLayerVisible = weatherLayerVisible;

		// Remove weather layer if it exists before style change
		if (weatherLayerVisible) {
			toggleWeatherLayer();
		}

		map.setStyle(newStyle);
		currentStyle = newStyle;

		// Re-add markers and weather layer after style change
		map.once('style.load', () => {
			// Re-add markers
			updateMarkers($campSitesStore);

			// Re-add weather layer if it was visible before
			if (wasWeatherLayerVisible) {
				toggleWeatherLayer();
			}
		});
	}
	/**
	 * Handles the manage sites button click.
	 */
	function handleManageSites() {
		isSitesPanelOpen = true;
	}

	export async function toggleWeatherLayer() {
		console.log('toggleWeatherLayer called');
		if (!map) {
			console.log('Map not initialized');
			return;
		}

		try {
			console.log('Current weather layer state:', { weatherLayerVisible, weatherLayer });

			if (weatherLayerVisible) {
				console.log('Attempting to remove weather layer');
				// Check if the layer exists before trying to remove it
				if (map.getLayer('weather')) {
					console.log('Removing weather layer');
					map.removeLayer('weather');
				}
				// Check if the source exists before trying to remove it
				if (map.getSource('weather')) {
					console.log('Removing weather source');
					map.removeSource('weather');
				}
				weatherLayer = null;
			} else {
				console.log('Attempting to add weather layer');
				// Wait for the map style to be loaded
				if (!map.isStyleLoaded()) {
					console.log('Waiting for style to load');
					map.once('style.load', () => toggleWeatherLayer());
					return;
				}

				// Get current map state
				const zoom = Math.floor(map.getZoom());
				const center = map.getCenter();
				
				// Convert lat/lng to tile coordinates
				const x = Math.floor((center.lng + 180) / 360 * Math.pow(2, zoom));
				const y = Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

				// Create both template and sample URLs
				const weatherTileUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${openWeatherMapApiKey}`;
				const sampleUrl = `https://tile.openweathermap.org/map/temp_new/${zoom}/${x}/${y}.png?appid=${openWeatherMapApiKey}`;
				
				console.log('Weather tile URL template:', weatherTileUrl);
				console.log('Sample weather tile URL (current view):', sampleUrl);
				console.log('Current map state:', { zoom, center: { lat: center.lat, lng: center.lng }, tileCoords: { x, y } });

				map.addSource('weather', {
					type: 'raster',
					tiles: [weatherTileUrl],
					tileSize: 256,
					minzoom: 0,
					maxzoom: 22
				});
				console.log('Added weather source');

				// Get the first symbol layer ID
				const layers = map.getStyle().layers;
				const firstSymbolId = layers.find(layer => layer.type === 'symbol')?.id;

				// Then add the layer before any symbols (so it appears below text but above other layers)
				map.addLayer({
					id: 'weather',
					type: 'raster',
					source: 'weather',
					paint: {
						'raster-opacity': 0.7
					}
				}, firstSymbolId); // Insert before first symbol layer to keep text readable
				console.log('Added weather layer');
				weatherLayer = true;
			}
			weatherLayerVisible = !weatherLayerVisible;
			console.log('Weather layer toggled:', { weatherLayerVisible, weatherLayer });
		} catch (error) {
			console.error('Error toggling weather layer:', error);
		}
	}

	/**
	 * Handles the open settings button click.
	 */
	function handleOpenSettings() {
		isSettingsPanelOpen = true;
	}

	/**
	 * Initializes the route start with the given site.
	 * Updates the selected sites and changes the marker color to green.
	 * Also updates the popup for the current marker.
	 * @param {Object} site - The site object containing id, latitude, and longitude.
	 * @param {Object} popup - The popup object associated with the marker.
	 */
	function setRouteStart(site, popup) {
		selectedSites = [{ id: site.id, lat: site.latitude, lng: site.longitude }];
		console.log('Route start set:', selectedSites);
		
		// Remove the old marker
		const oldMarker = markers.get(site.id);
		if (oldMarker) {
			oldMarker.remove();
		}
		
		// Create a new marker with green color
		const newMarker = new mapboxgl.Marker({ 
			color: '#4CAF50',
			className: 'site-pip start'
		})
			.setLngLat([site.longitude, site.latitude])
			.setPopup(popup)
			.addTo(map);
		
		// Update the markers Map with the new marker
		markers.set(site.id, newMarker);
	}

	/**
	 * Initializes the route end with the given site.
	 * Updates the selected sites and changes the marker color to orange.
	 * Also updates the popup for the current marker.
	 * @param {Object} site - The site object containing id, latitude, and longitude.
	 * @param {Object} popup - The popup object associated with the marker.
	 */
	function setRouteEnd(site, popup) {
		if (selectedSites.length === 1) {
			selectedSites.push({ id: site.id, lat: site.latitude, lng: site.longitude });
			console.log('Route end set:', selectedSites);
			
			// Remove the old marker
			const oldMarker = markers.get(site.id);
			if (oldMarker) {
				oldMarker.remove();
			}
			
			// Create a new marker with orange color
			const newMarker = new mapboxgl.Marker({ 
				color: '#FF9800',
				className: 'site-pip end'
			})
				.setLngLat([site.longitude, site.latitude])
				.setPopup(popup)
				.addTo(map);
			
			// Update the markers Map with the new marker
			markers.set(site.id, newMarker);
			
			// Calculate the route
			calculateRoute(selectedSites[0], selectedSites[1]);
		}
	}
</script>

<div id="map" class="map-container" class:add-site-mode={isAddSiteMode}></div>
<HamburgerMenu
	bind:isOpen={isMenuOpen}
	{map}
	on:manageSites={handleManageSites}
	on:openSettings={handleOpenSettings}
	on:switchLayer={switchLayer}
	on:toggleWeather={toggleWeatherLayer}
/>
<SitesPanel bind:isOpen={isSitesPanelOpen} {map} />

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



	:global(.mapboxgl-popup-content) {
		padding: 10px 15px;
		border-radius: 8px;
	}

	:global(.popup-content) {
		color: #1f2937;
	}

	:global(.popup-content.dark) {
		color: #e5e7eb;
	}

	:global(.mapboxgl-popup-content h3) {
		margin: 0 0 10px 0;
		font-size: 1.1em;
		font-weight: 600;
	}

	:global(.mapboxgl-popup-content p) {
		margin: 0;
		font-size: 0.9em;
	}

	:global(.add-site-popup) {
		padding: 15px;
	}

	:global(.site-input) {
		width: 100%;
		margin: 8px 0;
		padding: 8px;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
	}

	:global(.popup-buttons) {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}

	:global(.confirm-btn, .cancel-btn) {
		padding: 6px 12px;
		border-radius: 4px;
		cursor: pointer;
	}

	:global(.mapboxgl-popup-close-button) {
		padding: 0 4px;
	}

</style>
