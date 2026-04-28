// Mapbox Configuration
import MapboxGL from '@rnmapbox/maps';

const TOKEN = process.env.MAPBOX_ACCESS_TOKEN ?? '';

MapboxGL.setAccessToken(TOKEN);

export const MAPBOX_CONFIG = {
  ACCESS_TOKEN: TOKEN,
  
  // Default map settings
  DEFAULT_CAMERA: {
    centerCoordinate: [20.0, 20.0], // Global center showing the 3D globe
    zoomLevel: 2,
    pitch: 40,
    heading: 0,
  },
  
  // Map style URLs (you can customize these) - Using dark mode for Solana theme
  STYLES: {
    DARK: 'mapbox://styles/mapbox/dark-v11', // Primary dark theme for Solana
    SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
    STREETS: 'mapbox://styles/mapbox/streets-v12',
    OUTDOORS: 'mapbox://styles/mapbox/outdoors-v12',
    NAVIGATION_DAY: 'mapbox://styles/mapbox/navigation-day-v1',
    NAVIGATION_NIGHT: 'mapbox://styles/mapbox/navigation-night-v1', // Alternative dark theme
  },
  
  // Performance settings
  PERFORMANCE: {
    enableClustering: true,
    clusterRadius: 50,
    clusterMaxZoom: 14,
    maxZoomLevel: 18,
    minZoomLevel: 2,
  },
  
  // Animation settings
  ANIMATIONS: {
    flyToDuration: 2000,
    easingFunction: 'easeInOutQuad',
  },
};

export default MAPBOX_CONFIG;