<script>
	import { onMount, createEventDispatcher, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import mapboxgl from 'mapbox-gl';
	import { settings } from '$lib/stores/settings.js';
	import { campSitesStore } from '$lib/stores/campSitesStore.js';
	import { 
		start, end, startLocationName, endLocationName, 
		activeRouteIndex, routeData, currentRouteLayer,
		travelMode, dialogVisible, dialogContent, dialogTitle, 
		dialogPosition, hasValidRoute, resetRoute, setStart, 
		setEnd, setTravelMode, showRouteDialog, hideRouteDialog 
	} from '$lib/stores/routeStore.js';
	import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
	import SitesPanel from '$lib/components/SitesPanel.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import RouteInfoDialog from '$lib/components/RouteInfoDialog.svelte';
	import Button from '$lib/components/Button.svelte';

	export let mapboxToken;
	export let initialStyle = 'mapbox://styles/mapbox/streets-v12';

	const dispatch = createEventDispatcher();

	let map;
	let markers = new Map(); // Store markers with site IDs
	let selectedSites = [];
	let heatGradientLayerVisible = false;
	let heatGradientLayer = null;
	let temperaturesLayerVisible = false;
	let temperaturesLayer = [];
	let currentStyle = initialStyle;
	let isMenuOpen = true;
	let isSitesPanelOpen = false;
	let isSettingsPanelOpen = false;
	let isAddSiteMode = false;
	let popups = [];

	// Subscribe to store values
	let $start, $end, $startLocationName, $endLocationName;
	let $activeRouteIndex, $routeData, $currentRouteLayer;
	let $travelMode, $dialogVisible, $dialogContent, $dialogTitle, $dialogPosition;
	let $hasValidRoute;

	$: $start, $end, $activeRouteIndex, $routeData, $currentRouteLayer, $travelMode, 
	   $dialogVisible, $dialogContent, $dialogTitle, $dialogPosition;

	const DEFAULT_LAT = -36.114858138524454;
	const DEFAULT_LNG = 146.8884086608887;
	const DEFAULT_STYLE = 'mapbox://styles/mapbox/streets-v12';

	/**
	 * Returns a template for the route information popup.
	 * @param {string} mode - The travel mode.
	 * @param {string} routes - The HTML for the routes.
	 * @param {number} activeIndex - The index of the active route.
	 * @returns {string} The HTML template.
	 */
	function getRouteInfoTemplate(mode, routes, activeIndex) {
		const modeIcons = {
			foot: 'fa-solid fa-person-walking',
			bike: 'fa-solid fa-bicycle',
			car: 'fa-solid fa-car'
		};

		return `
		<div class="route-info">
			<div class="travel-modes">
				<a href="#" class="travel-mode-btn ${mode === 'foot' ? 'active' : ''}" data-mode="foot">
					<i class="${modeIcons.foot}"></i>
					<span>Walk</span>
				</a>
				<a href="#" class="travel-mode-btn ${mode === 'bike' ? 'active' : ''}" data-mode="bike">
					<i class="${modeIcons.bike}"></i>
					<span>Bike</span>
				</a>
				<a href="#" class="travel-mode-btn ${mode === 'car' ? 'active' : ''}" data-mode="car">
					<i class="${modeIcons.car}"></i>
					<span>Drive</span>
				</a>
			</div>
			<div class="route-details">
				<div class="route-endpoints">
					<div class="start-point">${$startLocationName}</div>
					<div class="route-arrow">→</div>
					<div class="end-point">${$endLocationName}</div>
				</div>
				<div class="route-options">
					${routes}
				</div>
			</div>
		</div>
		`;
	}

	/**
	 * Initializes the map with the given position.
	 * If no position is provided, it defaults to Wodonga.
	 * @param {Object} position - The position object containing latitude and longitude.
	 */
	async function initializeMap(position = null) {
		if (!browser) return;

		const mapElement = document.getElementById('map');
		const { startLat, startLng } = getStartCoordinates(position);

		try {
			if (!map) {
				map = createMapInstance(startLat, startLng);
				addMapControls(map);
				addUserLocationMarker(map, position);
				addMapClickHandler(map);
				initializeCampSitesStore();
			}
		} catch (error) {
			console.error('Error initializing map:', error);
		}
	}

	function getStartCoordinates(position) {
		return {
			startLat: position ? position.coords.latitude : DEFAULT_LAT,
			startLng: position ? position.coords.longitude : DEFAULT_LNG
		};
	}

	function createMapInstance(lat, lng) {
		const mapInstance = new mapboxgl.Map({
			container: 'map',
			style: currentStyle,
			projection: 'equirectangular',
			center: [lng, lat],
			zoom: $settings.app.defaultZoomLevel
		});
		dispatch('mapInit', mapInstance);
		return mapInstance;
	}

	function addMapControls(mapInstance) {
		mapInstance.addControl(new mapboxgl.NavigationControl({ position: 'top-right' }));
		const geolocateControl = new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true });
		mapInstance.addControl(geolocateControl);
	}

	function addUserLocationMarker(mapInstance, position) {
		if (position) {
			const el = document.createElement('div');
			el.className = 'user-location';
			el.style.backgroundColor = '#4A90E2';
			el.style.width = '12px';
			el.style.height = '12px';
			el.style.borderRadius = '50%';
			el.style.border = '2px solid white';
			new mapboxgl.Marker(el).setLngLat([position.coords.longitude, position.coords.latitude]).addTo(mapInstance);
		}
	}

	function addMapClickHandler(mapInstance) {
		mapInstance.on('click', async (e) => {
			const point = e.lngLat;
			if (!e.originalEvent.metaKey && !e.originalEvent.ctrlKey) return;
			handleMapClick(mapInstance, point);
		});
	}

	function handleMapClick(mapInstance, point) {
		const currentZoom = mapInstance.getZoom();
		if (currentZoom < 14) {
			showZoomInPopup(mapInstance, point, currentZoom);
			return;
		}
		showAddSitePopup(mapInstance, point);
	}

	function showZoomInPopup(mapInstance, point, currentZoom) {
		new mapboxgl.Popup({ className: $settings.app.theme + '-theme' })
			.setLngLat(point)
			.setHTML(`<div class="add-site-popup dark:bg-gray-800 dark:text-gray-100">
				<p>Please zoom in closer to add a camp site (zoom level must be 14 or greater)</p>
				<p>Current zoom level: ${Math.floor(currentZoom)}</p>
				<p>Tip: Use Cmd/Ctrl + Click to add a site</p>
			</div>`)
			.addTo(mapInstance);
	}

	function showAddSitePopup(mapInstance, point) {
		const popupContent = document.createElement('div');
		popupContent.innerHTML = `
			<div class="add-site-popup dark:bg-gray-800 dark:text-gray-100">
				<h3 class="dark:text-gray-200">Add New Camp Site</h3>
				<input type="text" id="site-title" placeholder="Site Title" class="site-input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
				<textarea id="site-description" placeholder="Site Description" class="site-input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"></textarea>
				<div class="popup-buttons">
					<button id="confirm-add" class="btn confirm-btn">Add Site</button>
					<button id="cancel-add" class="btn cancel-btn">Cancel</button>
				</div>
			</div>
		`;

		const popup = new mapboxgl.Popup({ className: $settings.app.theme + '-theme', maxWidth: '300px' })
			.setLngLat(point)
			.setDOMContent(popupContent)
			.addTo(mapInstance);

		popupContent.querySelector('#confirm-add').addEventListener('click', async () => {
			const title = popupContent.querySelector('#site-title').value.trim();
			const description = popupContent.querySelector('#site-description').value.trim();
			if (title) {
				const newSite = await campSitesStore.addSite({ name: title, description: description || '', latitude: point.lat, longitude: point.lng });
				if (newSite) popup.remove();
				else alert('Error adding camp site. Please try again.');
			} else alert('Please enter a title for the camp site');
		});

		popupContent.querySelector('#cancel-add').addEventListener('click', () => popup.remove());
	}

	function initializeCampSitesStore() {
		let unsubscribe = campSitesStore.initialize();
		map.on('load', () => {
			campSitesStore.subscribe((sites) => updateMarkers(sites));
		});
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

			// Create an empty popup first
			const popup = new mapboxgl.Popup({ className: $settings.app.theme+'-theme' });

			const marker = new mapboxgl.Marker({ color: 'blue', className: 'site-pip', scale: 0.65 })
				.setLngLat([site.longitude, site.latitude])
				.setPopup(popup)
				.addTo(map);

			markers.set(site.id, marker);

			// Set the popup content dynamically when it opens
			popup.on('open', () => {
				// Determine if this should be a start or end button based on current selectedSites
				const isStartButton = selectedSites.length === 0 || selectedSites.length === 2;

				const popupHTML = `
    <div class="popup-content bg-gray-100 dark:bg-gray-700">
      ${site.name ? `<h3 class="text-gray-800 dark:text-gray-100">${site.name}</h3>` : ''}
      ${site.description ? `<p class="text-gray-800 dark:text-gray-100">${site.description}</p>` : ''}
      <div class="popup-buttons">
									<Button size="sm" class="route-btn" id="route-action-btn-${site.id}">
										${isStartButton ? 'Start Route' : 'End Route'}
									</Button>
        </div>
    </div>
    `;

				// Set the HTML content
				popup.setHTML(popupHTML);

				// Add the event listener after the popup content is set
				setTimeout(() => {
					const button = document.getElementById(`route-action-btn-${site.id}`);
					if (button) {
						button.addEventListener('click', () => {
							if (isStartButton) {
								handleSetStart(site, popup);
							} else {
								handleSetEnd(site, popup);
							}
							// Close the popup after action
							popup.remove();
						});
					}
				}, 0);
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
	 * Calculates a route between two points.
	 * @param {Object} startPoint - The start point with lat and lng properties.
	 * @param {Object} endPoint - The end point with lat and lng properties.
	 */
	async function calculateRoute(startPoint, endPoint) {
		if (!startPoint || !endPoint || !startPoint.lat || !startPoint.lng || !endPoint.lat || !endPoint.lng) {
			console.error('Invalid start or end point for route calculation', { startPoint, endPoint });
			return;
		}

		// Store the start and end points for later use
		$start = startPoint;
		$end = endPoint;

		try {
			// Reset active route index to 0 when calculating a new route
			$activeRouteIndex = 0;
			
			// Clear existing route if any
			if ($currentRouteLayer) {
				$currentRouteLayer.remove();
				$currentRouteLayer = null;
			}

			const mapboxProfile = {
				foot: 'walking',
				bike: 'cycling',
				car: 'driving'
			}[$travelMode];

			const url = `https://api.mapbox.com/directions/v5/mapbox/${mapboxProfile}/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?alternatives=true&geometries=geojson&access_token=${mapboxToken}`;

			try {
				const response = await fetch(url);
				$routeData = await response.json();
				
				if (!$routeData || !$routeData.routes || $routeData.routes.length === 0) {
					throw new Error('No routes found');
				}
				
				const routesCount = $routeData.routes.length;
				const routeDDList = $routeData.routes.map((route, index) => {
					const isActive = index === $activeRouteIndex;
					return `<a href="#" class="route-link ${isActive ? 'active-route' : ''}" data-index="${index}">
						Route ${index + 1}: ${Math.round(route.distance / 1000, 1)} km - ${Math.round(route.duration / 60, 1)} min
					</a>`;
				});

				let routes = routeDDList.join('');
				console.log('routeDDList:', routeDDList);
				console.log('typeof routeDDList:', typeof routeDDList);
				console.log('Is routeDDList an array?', Array.isArray(routeDDList));

				if (routesCount === 0) {
					throw new Error('No routes found');
				}
				console.log('routeData:', $routeData);
				
				// Draw the new route
				$currentRouteLayer = await drawRoute(map, $routeData.routes[$activeRouteIndex].geometry);
				console.log('currentRouteLayer:', $currentRouteLayer);

				// Check if currentRouteLayer is defined
				if ($currentRouteLayer) {
					// Add click handler to the route
					$currentRouteLayer.on('click', async (e) => {
						$dialogVisible = true;
						$dialogContent = getRouteInfoTemplate($travelMode, routes, $activeRouteIndex);
						$dialogTitle = 'Route Information';
						$dialogPosition = { top: `${e.point.y}px`, left: `${e.point.x}px` };
					});

					// Zoom to fit the route
					zoomToRouteBounds($currentRouteLayer);

					// Show the route information in a RouteInfoDialog
					$dialogVisible = true;
					$dialogContent = getRouteInfoTemplate($travelMode, routes, $activeRouteIndex);
					$dialogTitle = 'Route Information';
					$dialogPosition = { top: '50%', left: '50%' };
				}
			} catch (error) {
				console.error('Error fetching route:', error);
				throw error;
			}
		} catch (error) {
			console.error('Error calculating route:', error);
		}
	}

	/**
	 * Resets existing routes and markers
	 */
	function resetRouteAndMarkers() {
		// Clear existing route if any
		if ($currentRouteLayer) {
			$currentRouteLayer.remove();
			$currentRouteLayer = null;
		}

		// Close dialog if open
		$dialogVisible = false;
		
		// Reset route data
		$routeData = null;
		$activeRouteIndex = 0;
		startLocationName = '';
		endLocationName = '';
		
		// Reset start and end points
		start = null;
		end = null;
		
		// Reset selected sites and their markers
		if (selectedSites.length > 0) {
			// Get the IDs of the sites that need to be reset
			const sitesToReset = [...selectedSites];
			
			// Clear selected sites array
			selectedSites = [];
			
			// Reset each marker individually to blue
			sitesToReset.forEach(site => {
				const oldMarker = markers.get(site.id);
				if (oldMarker) {
					oldMarker.remove();
					
					// Find the site data in the campSitesStore
					let siteData;
					campSitesStore.subscribe(sites => {
						siteData = sites.find(s => s.id === site.id);
					})();
					
					if (siteData) {
						// Create a new popup
						const popup = new mapboxgl.Popup({ className: $settings.app.theme+'-theme' });
						
						// Create a new blue marker
						const newMarker = new mapboxgl.Marker({ 
							color: 'blue', 
							className: 'site-pip', 
							scale: 0.65 
						})
							.setLngLat([siteData.longitude, siteData.latitude])
							.setPopup(popup)
							.addTo(map);
						
						// Update the markers Map with the new marker
						markers.set(site.id, newMarker);
						
						// Set the popup content dynamically when it opens
						popup.on('open', () => {
							// Determine if this should be a start or end button based on current selectedSites
							const isStartButton = selectedSites.length === 0 || selectedSites.length === 2;
							
							const popupHTML = `
							<div class="popup-content bg-gray-100 dark:bg-gray-700">
								${siteData.name ? `<h3 class="text-gray-800 dark:text-gray-100">${siteData.name}</h3>` : ''}
								${siteData.description ? `<p class="text-gray-800 dark:text-gray-100">${siteData.description}</p>` : ''}
								<div class="popup-buttons">
									<Button size="sm" class="route-btn" id="route-action-btn-${siteData.id}">
										${isStartButton ? 'Start Route' : 'End Route'}
									</Button>
								</div>
							</div>
							`;
							
							// Set the HTML content
							popup.setHTML(popupHTML);
							
							// Add the event listener after the popup content is set
							setTimeout(() => {
								const button = document.getElementById(`route-action-btn-${siteData.id}`);
								if (button) {
									button.addEventListener('click', () => {
										if (isStartButton) {
											handleSetStart(siteData, popup);
										} else {
											handleSetEnd(siteData, popup);
										}
										// Close the popup after action
										popup.remove();
									});
								}
							}, 0);
						});
					}
				}
			});
		}
	}

	/**
	 * Sets the travel mode to the given mode.
	 * @param {string} mode - The travel mode (foot, bike, or car).
	 */
	function handleTravelModeChange(mode) {
		$travelMode = mode;
		// Reset to the first route when changing travel mode
		$activeRouteIndex = 0;

		if ($start && $end) {
			calculateRoute($start, $end);
		}
	}

	/**
	 * Handles the manage sites button click.
	 */
	function handleManageSites() {
		isSitesPanelOpen = true;
	}

	/**
	 * Handles the open settings button click.
	 */
	function handleOpenSettings() {
		isSettingsPanelOpen = true;
	}

	/**
	 * Toggles the temperatures layer on the map.
	 */
	export async function toggleTemperaturesLayer() {
		console.log('toggleTemperaturesLayer called');
		if (!map) {
			console.log('Map not initialized');
			return;
		}

		try {
			console.log('Current cities layer state:', {
				citiesLayerVisible: temperaturesLayerVisible,
				citiesLayer: temperaturesLayer
			});

			if (temperaturesLayerVisible) {
				console.log('Removing temperature markers');
				// Remove temperature markers if they exist
				temperaturesLayer.forEach((layer) => {
					layer.remove();
				});
				temperaturesLayer = [];
			} else {
				console.log('Adding temperature markers');
				// Get cities and towns from the map
				const features = map.queryRenderedFeatures(undefined, {
					layers: ['settlement-major-label', 'settlement-minor-label']
				});

				// Filter out very small settlements to avoid clutter
				const filteredFeatures = features.filter(
					(feature) =>
						['city', 'town'].includes(feature.properties.class) ||
						feature.properties.symbolrank <= 24
				);

				// Remove existing symbol layer for city temperatures
				// Add markers for each city

				var i = 0;
				filteredFeatures.forEach(async (feature) => {
					const [lng, lat] = feature.geometry.coordinates;

					try {
						const response = await fetch(
							`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${openWeatherMapApiKey}&units=metric`
						);
						const data = await response.json();
						const temp = Math.round(data.main.temp);

						// Assign the temperature to the feature properties
						feature.properties.temperature = temp;

						// Create a custom HTML element for the marker
						const markerElement = document.createElement('div');
						markerElement.className = 'marker';
						markerElement.innerHTML = `<div class='temperature-badge'><span class="location temp-below-${getColorForTemperature(temp)}" >${feature.properties.name}</span><span class="temperature">${temp}°C</span></div>`;

						// Create a marker and add it to the map
						temperaturesLayer[i] = new mapboxgl.Marker(markerElement).setLngLat([lng, lat]);
						temperaturesLayer[i].addTo(map);
						i++;
					} catch (error) {
						console.error('Error fetching temperature for city:', error);
					}
				});
			}
			temperaturesLayerVisible = !temperaturesLayerVisible;
			console.log('Cities layer toggled:', {
				citiesLayerVisible: temperaturesLayerVisible,
				citiesLayer: temperaturesLayer
			});
		} catch (error) {
			console.error('Error toggling cities layer:', error);
		}
	}

	/**
	 * Toggles the heat gradient layer on the map.
	 */
	export async function toggleHeatGradientLayer() {
		console.log('toggleWeatherLayer called');
		if (!map) {
			console.log('Map not initialized');
			return;
		}

		try {
			console.log('Current weather layer state:', {
				weatherLayerVisible: heatGradientLayerVisible,
				weatherLayer: heatGradientLayer
			});

			if (heatGradientLayerVisible) {
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
				heatGradientLayer = null;
			} else {
				console.log('Attempting to add weather layer');
				// Wait for the map style to be loaded
				if (!map.isStyleLoaded()) {
					console.log('Waiting for style to load');
					map.once('style.load', () => toggleHeatGradientLayer());
					return;
				}

				// Get current map state
				const zoom = Math.floor(map.getZoom());
				const center = map.getCenter();

				// Convert lat/lng to tile coordinates
				const x = Math.floor(((center.lng + 180) / 360) * Math.pow(2, zoom));
				const y = Math.floor(
					((1 -
						Math.log(
							Math.tan((center.lat * Math.PI) / 180) + 1 / Math.cos((center.lat * Math.PI) / 180)
						) /
						Math.PI) /
						2) *
						Math.pow(2, zoom)
				);

				// Create both template and sample URLs
				const weatherTileUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${openWeatherMapApiKey}`;
				const sampleUrl = `https://tile.openweathermap.org/map/temp_new/${zoom}/${x}/${y}.png?appid=${openWeatherMapApiKey}`;

				console.log('Weather tile URL template:', weatherTileUrl);
				console.log('Sample weather tile URL (current view):', sampleUrl);
				console.log('Current map state:', {
					zoom,
					center: { lat: center.lat, lng: center.lng },
					tileCoords: { x, y }
				});

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
				const firstSymbolId = layers.find((layer) => layer.type === 'symbol')?.id;

				// Then add the layer before any symbols (so it appears below text but above other layers)
				map.addLayer(
					{
						id: 'weather',
						type: 'raster',
						source: 'weather',
						paint: {
							'raster-opacity': 0.7
						}
					},
					firstSymbolId
				); // Insert before first symbol layer to keep text readable
				console.log('Added weather layer');
				heatGradientLayer = true;
			}
			heatGradientLayerVisible = !heatGradientLayerVisible;
			console.log('Weather layer toggled:', {
				weatherLayerVisible: heatGradientLayerVisible,
				weatherLayer: heatGradientLayer
			});
		} catch (error) {
			console.error('Error toggling weather layer:', error);
		}
	}

	/**
	 * Sets the start point for a route.
	 * Also updates the popup for the current marker.
	 * @param {Object} site - The site object containing id, latitude, and longitude.
	 * @param {Object} popup - The popup object associated with the marker.
	 */
	function handleSetStart(site, popup) {
		// Reset existing routes and markers when starting a new route
		resetRouteAndMarkers();
		
		// Now set the new start point
		selectedSites = [{ id: site.id, lat: site.latitude, lng: site.longitude }];
		$startLocationName = site.name || 'Start Location';
		console.log('Route start set:', selectedSites);

		// Remove the old marker
		const oldMarker = markers.get(site.id);
		if (oldMarker) {
			oldMarker.remove();
		}

		// Create a new marker with green color
		const newMarker = new mapboxgl.Marker({
			color: '#4CAF50',
			className: 'site-pip start',
			scale: 0.65
		})
			.setLngLat([site.longitude, site.latitude])
			.setPopup(popup)
			.addTo(map);

		// Update the markers Map with the new marker
		markers.set(site.id, newMarker);

		// Store the start point
		$start = { lat: site.latitude, lng: site.longitude };
	}

	/**
	 * Sets the end point for a route.
	 * Also updates the popup for the current marker.
	 * @param {Object} site - The site object containing id, latitude, and longitude.
	 * @param {Object} popup - The popup object associated with the marker.
	 */
	function handleSetEnd(site, popup) {
		if (selectedSites.length === 1) {
			selectedSites.push({ id: site.id, lat: site.latitude, lng: site.longitude });
			$endLocationName = site.name || 'End Location';
			console.log('Route end set:', selectedSites);

			// Remove the old marker
			const oldMarker = markers.get(site.id);
			if (oldMarker) {
				oldMarker.remove();
			}

			// Create a new marker with red color
			const newMarker = new mapboxgl.Marker({
				color: '#F44336',
				className: 'site-pip end',
				scale: 0.65
			})
				.setLngLat([site.longitude, site.latitude])
				.setPopup(popup)
				.addTo(map);

			// Update the markers Map with the new marker
			markers.set(site.id, newMarker);

			// Store the end point
			$end = { lat: site.latitude, lng: site.longitude };

			// Calculate the route
			calculateRoute($start, $end);
		} else {
			console.error('Cannot set end point without a start point');
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
		const wasWeatherLayerVisible = heatGradientLayerVisible;

		// Remove weather layer if it exists before style change
		if (heatGradientLayerVisible) {
			toggleHeatGradientLayer();
		}

		map.setStyle(newStyle);
		currentStyle = newStyle;

		// Re-add markers and weather layer after style change
		map.once('style.load', () => {
			// Re-add markers
			updateMarkers($campSitesStore);

			// Re-add weather layer if it was visible before
			if (wasWeatherLayerVisible) {
				toggleHeatGradientLayer();
			}
		});
	}

	/**
	 * Zooms the map to fit the route bounds
	 * @param {Object} routeLayer - The route layer object with getBounds method
	 */
	function zoomToRouteBounds(routeLayer) {
		if (routeLayer && routeLayer.getBounds) {
			// Add padding to the bounds for better visibility
			map.fitBounds(routeLayer.getBounds(), {
				padding: 50, // Add 50px padding around the route
				maxZoom: 15, // Limit maximum zoom level
				duration: 1000 // Smooth animation duration in milliseconds
			});
		} else {
			console.warn('Could not zoom to route: routeLayer or getBounds method is undefined');
		}
	}

	/**
	 * Returns the color for the given temperature.
	 * @param {number} temp - The temperature value.
	 * @returns {string} The color class for the temperature.
	 */
	function getColorForTemperature(temp) {
		const colorMap = [
			{ maxTemp: -40 },
			{ maxTemp: -30 },
			{ maxTemp: -20 },
			{ maxTemp: -10 },
			{ maxTemp: 0 },
			{ maxTemp: 10 },
			{ maxTemp: 20 },
			{ maxTemp: 30 },
			{ maxTemp: 40 }
		];
		console.log('Temp:', temp);
		console.log('Color map:', colorMap);
		const match = colorMap.find((entry) => temp <= entry.maxTemp);
		console.log('Color match:', match.maxTemp.toString());

		return match ? match.maxTemp.toString() : 'na'; // Default color
	}
</script>

<div id="map" class="map-container" class:add-site-mode={isAddSiteMode}></div>
<HamburgerMenu
	bind:isOpen={isMenuOpen}
	{map}
	on:manageSites={handleManageSites}
	on:openSettings={handleOpenSettings}
	on:switchLayer={switchLayer}
	on:toggleHeatGradient={toggleHeatGradientLayer}
	on:toggleTemperatures={toggleTemperaturesLayer}
/>
<SitesPanel bind:isOpen={isSitesPanelOpen} {map} />

<SettingsPanel bind:isOpen={isSettingsPanelOpen} />

<RouteInfoDialog
	bind:isVisible={$dialogVisible}
	title={$dialogTitle}
	content={$dialogContent}
	position={$dialogPosition}
	onClose={() => $dialogVisible = false}
	on:modeChange={(e) => {
		handleTravelModeChange(e.detail.mode);
	}}
	on:routeSelect={(e) => {
		const index = e.detail.index;
		if ($currentRouteLayer && $routeData && $routeData.routes && $routeData.routes[index]) {
			$activeRouteIndex = index; // Update the active route index
			$currentRouteLayer.remove();
			drawRoute(map, $routeData.routes[index].geometry).then(layer => {
				$currentRouteLayer = layer;
				zoomToRouteBounds($currentRouteLayer);
				
				// Regenerate the route links with the new active index
				const routeDDList = $routeData.routes.map((route, idx) => {
					const isActive = idx === $activeRouteIndex;
					return `<a href="#" class="route-link ${isActive ? 'active-route' : ''}" data-index="${idx}">
						Route ${idx + 1}: ${Math.round(route.distance / 1000, 1)} km - ${Math.round(route.duration / 60, 1)} min
					</a>`;
				});
				
				// Join the route links
				const routeLinks = routeDDList.join('');
				
				// Update the dialog content to reflect the new active route
				$dialogContent = getRouteInfoTemplate($travelMode, routeLinks, $activeRouteIndex);
			});
		}
	}}
/>
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

	:global(.temperature-badge) {
		font-size: 11px;
		display: inline-block;
		text-align: center;
	}
	:global(.location) {
		color: white;
		background-color: #aaaaaa;
		padding: 5px 5px 5px 8px;
		border-radius: 15px 0 0 15px;
	}
	:global(.temperature) {
		color: white;
		background-color: #777777;
		padding: 5px 8px 5px 5px;
		border-radius: 0 15px 15px 0;
	}

	:global(.temp-below-40) {
		background: #ff3038;
	}

	:global(.temp-below-30) {
		background: #f56048;
	}

	:global(.temp-below-20) {
		background: #fbaa1b;
	}

	:global(.temp-below-10) {
		background: #e8d024;
	}

	:global(.temp-below-0) {
		background: #60bdfa;
	}

	:global(.temp-below--10) {
		background: #1c71f2;
	}

	:global(.temp-below--20) {
		background: #0c51f2;
	}
	:global(.temp-below--30) {
		background: #1122dd;
	}

	:global(.temp-below--40) {
		background: #1122aa;
	}

	:global(.temp-below-na) {
		background: gray;
	}
</style>
