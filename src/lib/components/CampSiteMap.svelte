<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { campSitesStore } from '$lib/stores/campSites';
	import { createEventDispatcher } from 'svelte';
	import { settings } from '$lib/stores/settings.js';

	const dispatch = createEventDispatcher();

	let L;
	let map;
	let markersLayer;
	let unsubscribe;
	let isAddSiteMode = false;
	let selectedSites = [];
	let routeLayer;
	let travelMode = 'foot';
	let startMarker;
	let endMarker;

	async function calculateRoute(start, end) {
		const url = `https://router.project-osrm.org/route/v1/${travelMode}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
		
		try {
			const response = await fetch(url);
			const data = await response.json();
			
			if (data.code !== 'Ok') {
				throw new Error('Unable to calculate route');
			}
			
			// Clear existing route
			if (routeLayer) {
				routeLayer.remove();
			}
			
			// Draw the new route
			routeLayer = L.geoJSON(data.routes[0].geometry, {
				style: {
					color: '#4A90E2',
					weight: 4,
					opacity: 0.7
				}
			}).addTo(map);
			
			// Zoom to the route when generated
			map.fitBounds(routeLayer.getBounds());
			
			// Calculate distance in kilometers
			const distanceKm = (data.routes[0].distance / 1000).toFixed(2);
			const duration = Math.round(data.routes[0].duration / 60); // Convert seconds to minutes
			
			// Show the route information in a popup
			L.popup()
				.setLatLng([(start.lat + end.lat) / 2, (start.lng + end.lng) / 2])
				.setContent(
					`<div class="route-info dark:bg-gray-800 dark:text-gray-100">
						<h3 class="font-semibold">Route Information</h3>
						<p>Distance: ${distanceKm} km</p>
						<p>Duration: ~${duration} minutes</p>
						<div class="travel-modes">
							<button class="travel-mode-btn" on:click="{() => setTravelMode('foot')}">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M16 2l-2 4h-2l-2 4h-2l-2 4h2l-2 4h2l2-4h2l2-4h2l2-4h-2l2-4h-2z" />
								</svg>
							</button>
							<button class="travel-mode-btn" on:click="{() => setTravelMode('bike')}">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M16 2l-2 4h-2l-2 4h-2l-2 4h2l-2 4h2l2-4h2l2-4h2l2-4h-2l2-4h-2z" />
								</svg>
							</button>
							<button class="travel-mode-btn" on:click="{() => setTravelMode('car')}">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M16 2l-2 4h-2l-2 4h-2l-2 4h2l-2 4h2l2-4h2l2-4h2l2-4h-2l2-4h-2z" />
								</svg>
							</button>
						</div>
					</div>`
				)
				.openOn(map);
				
			// Change existing markers for start and end points with appropriate colors
			if (startMarker) {
				startMarker.setIcon(L.divIcon({ html: '<div style="background-color: green; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>', className: 'start-marker' }));
			}
			if (endMarker) {
				endMarker.setIcon(L.divIcon({ html: '<div style="background-color: red; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>', className: 'end-marker' }));
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

	async function loadLeaflet() {
		if (browser) {
			L = await import('leaflet');
			return L;
		}
	}

	function initializeMap(position = null) {
		if (!browser) return;

		console.log('initializeMap called');
		const mapElement = document.getElementById('map');
		console.log('Map element dimensions:', mapElement?.getBoundingClientRect());

		try {
			// Use user location if available, otherwise default to Sydney
			const startLat = position ? position.coords.latitude : -33.8688;
			const startLng = position ? position.coords.longitude : 151.2093;

			console.log('Creating map instance at:', { startLat, startLng });

			// Fix for default marker icons
			const defaultIcon = L.icon({
				iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
				iconRetinaUrl:
					'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
				shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [1, -34],
				shadowSize: [41, 41]
			});
			L.Marker.prototype.options.icon = defaultIcon;

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
					})
						.addTo(map)
						.bindPopup('Your location')
						.openPopup();
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
              ${selectedSites.some(s => s.id === site.id) ? 'Deselect' : 'Select for Route'}
            </button>
          `
					)
					.addTo(markersLayer);

        // Add click handler for the select button
        marker.on('popupopen', () => {
          setTimeout(() => {
            const btn = document.querySelector('.select-site-btn');
            if (btn) {
              btn.addEventListener('click', () => {
                const isSelected = selectedSites.some(s => s.id === site.id);
                if (isSelected) {
                  selectedSites = selectedSites.filter(s => s.id !== site.id);
                } else {
                  if (selectedSites.length >= 2) {
                    selectedSites.shift(); // Remove the first site if we already have 2
                  }
                  selectedSites = [...selectedSites, { id: site.id, lat: site.latitude, lng: site.longitude }];
                }
                
                // If we have 2 sites selected, calculate the route
                if (selectedSites.length === 2) {
                  calculateRoute(selectedSites[0], selectedSites[1]);
                } else if (routeLayer) {
                  routeLayer.remove(); // Clear the route if we have fewer than 2 sites
                }
                
                marker.closePopup();
              });
            }
          }, 0);
        });
			});
		}
	});
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

	.add-site-popup {
		@apply rounded-lg bg-white p-4 text-gray-900;
	}

	.add-site-popup h3 {
		@apply mb-3 text-lg font-semibold text-gray-800;
	}

	.site-input {
		@apply mb-3 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500;
	}

	.popup-buttons {
		@apply mt-3 flex justify-between;
	}

	.confirm-btn {
		@apply rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700;
	}

	.cancel-btn {
		@apply rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300;
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
