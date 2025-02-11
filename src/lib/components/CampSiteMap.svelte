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
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      L.Marker.prototype.options.icon = defaultIcon;
      
      map = L.map('map', {
        zoomControl: false
      }).setView([startLat, startLng], $settings.app.defaultZoomLevel);

      console.log('Map created in CampSiteMap:', map);
      dispatch('mapInit', map);
      console.log('Map dispatched');

      console.log('Adding zoom control');
      L.control.zoom({
        position: 'topright'
      }).addTo(map);

      console.log('Adding tile layer');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
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

      // Add map click handler
      map.on('click', async (e) => {
        console.log('Map clicked at:', e.latlng);
        
        const currentZoom = map.getZoom();
        if (currentZoom < 14) {
          L.popup()
            .setLatLng(e.latlng)
            .setContent(
              '<div class="add-site-popup">' +
              '<p>Please zoom in closer to add a camp site (zoom level must be 14 or greater)</p>' +
              '<p>Current zoom level: ' + Math.floor(currentZoom) + '</p>' +
              '</div>'
            )
            .openOn(map);
          return;
        }

        // Create a popup for input
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
          <div class="add-site-popup">
            <h3>Add New Camp Site</h3>
            <input type="text" id="site-title" placeholder="Site Title" class="site-input">
            <textarea id="site-description" placeholder="Site Description" class="site-input"></textarea>
            <div class="popup-buttons">
              <button id="confirm-add" class="confirm-btn">Add Site</button>
              <button id="cancel-add" class="cancel-btn">Cancel</button>
            </div>
          </div>
        `;

        // Add event listeners to the buttons
        const popup = L.popup()
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
  });

  onDestroy(() => {
    if (map) map.remove();
    if (unsubscribe) unsubscribe();
  });

  // Subscribe to camp sites store
  campSitesStore.subscribe(sites => {
    if (browser && map && markersLayer) {
      markersLayer.clearLayers();
      sites.forEach(site => {
        L.marker([site.latitude, site.longitude])
          .bindPopup(`
            <strong>${site.name}</strong><br>
            ${site.description ? `<p>${site.description}</p>` : ''}
            <small>Added: ${new Date(site.created_at).toLocaleString()}</small>
          `)
          .addTo(markersLayer);
      });
    }
  });
</script>

<div id="map" class="map-container"></div>

<style>
  .map-container {
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    background: #f0f0f0;
  }
</style>