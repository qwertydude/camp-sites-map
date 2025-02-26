export async function getCurrentLocation(map, settings) {
    if (!map) {
        console.error('Map not available');
        return;
    }

    console.log('Map object:', map); // Log the map object to inspect it
    console.log('Settings object:', settings); // Log the settings object to inspect it

    // Check if geolocation is available
    if (!navigator.geolocation) {
        alert('Location services are not supported by your browser');
        return;
    }

    // Add an overlay spinner
    let overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
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

        map.setView([latitude, longitude], settings.app.focusZoomLevel, {
            animate: true,
            duration: 1
        });
        removeOverlay();
    } catch (error) {
        removeOverlay();
        console.log('getCurrentLocation error:', error);

        if (map) {
            alert('Cannot get location. Check your browser address bar if location permission required and try again')
            // L.popup()
            //     .setLatLng(map.getCenter())
            //     .setContent(
            //         'Cannot get location. Check your browser address bar if location permission required and try again'
            //     )
            //     .openOn(map);
        } else {
            console.error('Map is not defined, cannot show popup.');
        }
    }
}

export async function drawRoute(map, routeGeometry) {
  // Create a new source for the route
  const sourceId = 'route-' + Date.now(); // Generate unique ID to prevent conflicts
  
  // Remove existing route source and layer if they exist
  if (map.getLayer('route-layer')) {
    map.removeLayer('route-layer');
  }
  if (map.getSource('route')) {
    map.removeSource('route');
  }
  
  map.addSource('route', {
    type: 'geojson',
    data: routeGeometry
  });

  // Add the line layer to the map
  map.addLayer({
    id: 'route-layer',
    type: 'line',
    source: 'route',
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#4A90E2',
      'line-width': 5,
      'line-opacity': 0.7
    }
  });

  // Create a wrapper object with getBounds method
  const routeLayer = {
    on: (event, callback) => {
      // Add event listener to the route layer
      map.on(event, 'route-layer', callback);
    },
    remove: () => {
      // Remove the route layer and source
      if (map.getLayer('route-layer')) {
        map.removeLayer('route-layer');
      }
      if (map.getSource('route')) {
        map.removeSource('route');
      }
    },
    getBounds: () => {
      // Calculate bounds from route geometry
      const coordinates = routeGeometry.coordinates;
      if (!coordinates || coordinates.length === 0) {
        console.warn('No coordinates in route geometry');
        return null;
      }
      
      // Find the min and max coordinates to create a bounding box
      let minLng = coordinates[0][0];
      let maxLng = coordinates[0][0];
      let minLat = coordinates[0][1];
      let maxLat = coordinates[0][1];
      
      coordinates.forEach(coord => {
        minLng = Math.min(minLng, coord[0]);
        maxLng = Math.max(maxLng, coord[0]);
        minLat = Math.min(minLat, coord[1]);
        maxLat = Math.max(maxLat, coord[1]);
      });
      
      // Return a bounds object compatible with Mapbox's fitBounds
      return [
        [minLng, minLat], // Southwest corner
        [maxLng, maxLat]  // Northeast corner
      ];
    }
  };

  return routeLayer;
}
