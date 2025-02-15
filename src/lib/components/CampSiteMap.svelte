<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { campSitesStore } from '$lib/stores/campSites';
	import { createEventDispatcher } from 'svelte';
	import { settings } from '$lib/stores/settings.js';

	const dispatch = createEventDispatcher();
	const mapboxToken = import.meta.env.PUBLIC_MAPBOX_ACCESS_TOKEN;

	let L;
	let map;
	let markersLayer;
	let unsubscribe;
	let isAddSiteMode = false;
	let selectedSites = [];
	let routeLayer;
	let selectedRoute = 0;
	let currentRouteIndex = 0;
	let travelMode = 'foot';
	let startMarker;
	let endMarker;

	async function loadLeaflet() {
		if (browser) {
			L = await import('leaflet');
			return L;
		}
	}

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

			const sitePip = L.divIcon({
				className: 'site-pip',
				html: '<i class="fa-solid fa-location-dot text-3xl drop-shadow-md"></i>'
			});

			L.Marker.prototype.options.icon = sitePip;

			if (!map) {
				map = L.map('map', {
					zoomControl: false
				}).setView([startLat, startLng], $settings.app.defaultZoomLevel);

				console.log('Map created in CampSiteMap:', map);
				dispatch('mapInit', map);
				console.log('Map dispatched');

				console.log('Adding zoom control');
				L.control
					.zoom({
						position: 'topright'
					})
					.addTo(map);

				console.log('Adding tile layer');
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: ' OpenStreetMap contributors'
				}).addTo(map);

				// Add user location marker if we have it
				if (position) {
					console.log('Adding user location marker');
					L.circle([startLat, startLng], {
						color: '#4A90E2',
						fillColor: '#4A90E2',
						fillOpacity: 0.15,
						radius: position.coords.accuracy
					}).addTo(map);

					L.marker([startLat, startLng], {
						icon: L.divIcon({
							html: '<div style="background-color: #4A90E2; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
							className: 'user-location-marker'
						})
					}).addTo(map);
					// .bindPopup('Your location')
					// .openPopup();
				}

				// Initialize markers layer
				markersLayer = L.layerGroup().addTo(map);
			}
			// Add map click handler
			map.on('click', async (e) => {
				console.log('Map clicked at:', e.latlng);

				// Check if command/ctrl key is pressed
				if (!e.originalEvent.metaKey && !e.originalEvent.ctrlKey) {
					return; // Do nothing if command/ctrl is not pressed
				}

				const currentZoom = map.getZoom();
				if (currentZoom < 14) {
					L.popup({
						className: 'dark:bg-gray-800 dark:text-gray-100'
					})
						.setLatLng(e.latlng)
						.setContent(
							'<div class="add-site-popup dark:bg-gray-800 dark:text-gray-100">' +
								'<p>Please zoom in closer to add a camp site (zoom level must be 14 or greater)</p>' +
								'<p>Current zoom level: ' +
								Math.floor(currentZoom) +
								'</p>' +
								'<p>Tip: Use Cmd/Ctrl + Click to add a site</p>' +
								'</div>'
						)
						.openOn(map);
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

				// Add event listeners to the buttons
				const popup = L.popup({
					className: 'dark:bg-gray-800 dark:text-gray-100',
					minWidth: 250,
					maxWidth: 300
				})
					.setLatLng(e.latlng)
					.setContent(popupContent)
					.openOn(map);

				// Handle form submission
				popupContent.querySelector('#confirm-add').addEventListener('click', async () => {
					const title = popupContent.querySelector('#site-title').value.trim();
					const description = popupContent.querySelector('#site-description').value.trim();

					if (title) {
						const newSite = await campSitesStore.addSite({
							name: title,
							description: description || '',
							latitude: e.latlng.lat,
							longitude: e.latlng.lng
						});

						if (newSite) {
							map.closePopup();
						} else {
							alert('Error adding camp site. Please try again.');
						}
					} else {
						alert('Please enter a title for the camp site');
					}
				});

				// Handle cancellation
				popupContent.querySelector('#cancel-add').addEventListener('click', () => {
					map.closePopup();
				});
			});

			// Initialize the store
			unsubscribe = campSitesStore.initialize();

			console.log('Map initialization complete');
		} catch (error) {
			console.error('Error initializing map:', error);
		}
	}

	onMount(async () => {
		if (!browser) return;

		console.log('CampSiteMap onMount called');
		await loadLeaflet();

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

	// Subscribe to camp sites store
	campSitesStore.subscribe((sites) => {
		if (browser && map && markersLayer) {
			markersLayer.clearLayers();
			sites.forEach((site) => {
				const marker = L.marker([site.latitude, site.longitude])
					.bindPopup(
						`
                        <strong>${site.name}</strong><br>
                        ${site.description ? `<p>${site.description}</p>` : ''}
                        <small>Added: ${new Date(site.created_at).toLocaleString()}</small>
                        <br>
                        <button class="select-site-btn mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">
                          <span class="button-label start"></span>
                        </button>
          `
					)
					.addTo(markersLayer);

				// Add a tooltip to show site tile when hovered
				marker.bindTooltip(site.name, { offset: [10, -2], direction: 'top' });

				// Add click handler for the select button
				marker.on('popupopen', () => {
					const btn = document.querySelector('.select-site-btn');
					const buttonLabel = btn.querySelector('.button-label');

					// Update button label based on selected sites
					if (selectedSites.length === 0) {
						buttonLabel.classList.add('start');
						buttonLabel.classList.remove('end');
					} else if (selectedSites.length === 1) {
						buttonLabel.classList.remove('start');
						buttonLabel.classList.add('end');
					} else if (selectedSites.length === 2) {
						buttonLabel.classList.add('start');
						buttonLabel.classList.remove('end');
					}

					if (btn) {
						btn.addEventListener('click', () => {
							const isSelected = selectedSites.some((s) => s.id === site.id);
							if (isSelected) {
								selectedSites = selectedSites.filter((s) => s.id !== site.id);
								marker.getElement().classList.remove('start', 'end');
								buttonLabel.classList.add('start');
								buttonLabel.classList.remove('end');
							} else {
								// Clear existing route and markers if we already have a route
								if (selectedSites.length === 2) {
									// Clear the route
									if (routeLayer) {
										routeLayer.remove();
									}
									// Clear all start/end classes
									document.querySelectorAll('.site-pip').forEach((pip) => {
										pip.classList.remove('start', 'end');
									});
									// Reset selected sites
									selectedSites = [];
								}

								if (selectedSites.length >= 2) {
									selectedSites.shift(); // Remove the first site if we already have 2
								}
								selectedSites = [
									...selectedSites,
									{ id: site.id, lat: site.latitude, lng: site.longitude }
								];

								// Add start or end class based on selection
								if (selectedSites.length === 1) {
									marker.getElement().classList.add('start');
									buttonLabel.classList.remove('start');
									buttonLabel.classList.add('end');
								} else if (selectedSites.length === 2) {
									marker.getElement().classList.add('end');
									buttonLabel.classList.add('start');
									buttonLabel.classList.remove('end');
								}
							}

							// If we have 2 sites selected, calculate the route
							if (selectedSites.length === 2) {
								calculateRoute(selectedSites[0], selectedSites[1]);
							// } else if (routeLayer) {
							// 	routeLayer.remove(); // Clear the route if we have fewer than 2 sites
							}

							marker.closePopup();
						});
					}
				});
			});
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
			const routeDDList = data.routes.map((route, index) =>
				`Route ${index + 1}: ${Math.round(route.distance / 1000, 1)} km - ${Math.round(route.duration / 60, 1)} min`
			);

//			console.log('selectedRoute:', selectedRoute);
			console.log('routeDDList:', routeDDList);
			console.log('typeof routeDDList:', typeof routeDDList);
			console.log('Is routeDDList an array?', Array.isArray(routeDDList));

			if (routesCount === 0) {
				throw new Error('No routes found');
			}
			console.log('data:', data);
			// Clear existing route
			if (routeLayer) {
				routeLayer.remove();
			}

			// Draw the new route
			routeLayer = L.geoJSON(data.routes[selectedRoute].geometry, {
				style: {
					color: '#4A90E2',
					weight: 4,
					opacity: 0.7
				}
			}).addTo(map);

			// Add click handler to the route
			routeLayer.on('click', (e) => {
				const popup = L.popup()
					.setLatLng(e.latlng)
					.setContent(
						`
						<div class="route-info p-2">
							<h3 class="font-semibold text-gray-700 dark:text-gray-700 mb-2">Route Information</h3>
							<div class="travel-modes flex gap-2 mt-2">
								<button class="travel-mode-btn p-1 rounded-md ${travelMode === 'foot' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'} hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors" data-mode="foot">
									<i class="${travelMode === 'foot' ? 'brightness-200' : ''} fa-solid fa-person-walking"></i>
								</button>
								<button class="travel-mode-btn p-1 rounded-md ${travelMode === 'bike' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'} hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors" data-mode="bike">
									<i class="${travelMode === 'bike' ? 'brightness-200' : ''} fa-solid fa-bicycle"></i>
								</button>
								<button class="travel-mode-btn p-1 rounded-md ${travelMode === 'car' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'} hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors" data-mode="car">
									<i class="${travelMode === 'car' ? 'brightness-200' : ''} fa-solid fa-car"></i>
								</button>
							</div>
							<p class="text-gray-700 dark:text-gray-700">${routeDDList[selectedRoute]}</p>
						</div>
					`
					)
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
			map.fitBounds(routeLayer.getBounds());

			// Calculate distance in kilometers
			const distanceKm = (data.routes[selectedRoute].distance / 1000).toFixed(1);
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
			let routes = routeDDList.join('<br>');
			
			const popupContent = document.createElement('div');
			popupContent.innerHTML = `
				<div class="route-info bg-white dark:bg-gray-800">
					<h3 class="font-semibold text-gray-700 dark:text-gray-700 mb-2">Route Information</h3>
          <div class="travel-modes flex gap-2 mt-2">
              <button class="travel-mode-btn p-1 rounded-md ${travelMode === 'foot' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'} hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors" data-mode="foot">
                  <i class="${travelMode === 'foot' ? 'brightness-200' : ''} fa-solid fa-person-walking"></i>
              </button>
              <button class="travel-mode-btn p-1 rounded-md ${travelMode === 'bike' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'} hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors" data-mode="bike">
                  <i class="${travelMode === 'bike' ? 'brightness-200' : ''} fa-solid fa-bicycle"></i>
              </button>
              <button class="travel-mode-btn p-1 rounded-md ${travelMode === 'car' ? 'bg-blue-500 dark:bg-blue-600 text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'} hover:bg-blue-500 dark:hover:bg-blue-500 transition-colors" data-mode="car">
                  <i class="${travelMode === 'car' ? 'brightness-200' : ''} fa-solid fa-car"></i>
              </button>
          </div>
					<p class="text-gray-700 dark:text-gray-700">${routes}</p>
				</div>
			`;

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
</script>

<div id="map" class="map-container" class:add-site-mode={isAddSiteMode}></div>

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

</style>
