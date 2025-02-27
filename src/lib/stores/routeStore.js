import { writable, derived } from 'svelte/store';

// Create the base stores
export const start = writable(null);
export const end = writable(null);
export const startLocationName = writable('');
export const endLocationName = writable('');
export const activeRouteIndex = writable(0);
export const routeData = writable(null);
export const currentRouteLayer = writable(null);
export const travelMode = writable('foot'); // foot, bike, car
export const dialogVisible = writable(false);
export const dialogContent = writable('');
export const dialogTitle = writable('Route Information');
export const dialogPosition = writable({ top: '50%', left: '50%' });

// Derived store to check if we have valid start and end points
export const hasValidRoute = derived(
  [start, end],
  ([$start, $end]) => $start && $end && $start.lat && $start.lng && $end.lat && $end.lng
);

// Reset route and markers
export function resetRoute() {
  start.set(null);
  end.set(null);
  startLocationName.set('');
  endLocationName.set('');
  activeRouteIndex.set(0);
  routeData.set(null);
  
  // Note: We don't reset the currentRouteLayer here because
  // it needs to be removed from the map first, which should be
  // handled in the component
}

// Set start point
export function setStart(point, name = '') {
  start.set(point);
  startLocationName.set(name || 'Start Location');
}

// Set end point
export function setEnd(point, name = '') {
  end.set(point);
  endLocationName.set(name || 'End Location');
}

// Set travel mode
export function setTravelMode(mode) {
  travelMode.set(mode);
  activeRouteIndex.set(0); // Reset to first route when changing mode
}

// Show route dialog
export function showRouteDialog(content, title = 'Route Information', position = { top: '50%', left: '50%' }) {
  dialogContent.set(content);
  dialogTitle.set(title);
  dialogPosition.set(position);
  dialogVisible.set(true);
}

// Hide route dialog
export function hideRouteDialog() {
  dialogVisible.set(false);
}
