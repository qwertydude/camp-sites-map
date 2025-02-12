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

        map.setView([latitude, longitude], settings.app.focusZoomLevel, {
            animate: true,
            duration: 1
        });
        removeOverlay();
    } catch (error) {
        removeOverlay();
        console.log('getCurrentLocation error:', error);

        if (map) {
            L.popup()
                .setLatLng(map.getCenter())
                .setContent(
                    'Cannot get location. Check your browser address bar if location permission required and try again'
                )
                .openOn(map);
        } else {
            console.error('Map is not defined, cannot show popup.');
        }
    }
}
