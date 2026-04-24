import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { LocationCoords, LocationError } from '../types';
import { logger } from '../utils/logger';

const FILE_NAME = 'locationService.ts';

class LocationService {
  private hasPermission = false;
  private cachedLocation: LocationCoords | null = null;

  getCachedLocation(): LocationCoords | null {
    return this.cachedLocation;
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      logger.info(FILE_NAME, 'Requesting location permission');
      
      // First check if we already have permission
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      if (currentStatus === 'granted') {
        this.hasPermission = true;
        logger.info(FILE_NAME, 'Location permission already granted');
        return true;
      }
      
      // Request permission if not already granted
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.hasPermission = status === 'granted';
      
      logger.info(FILE_NAME, 'Location permission result', { 
        status, 
        granted: this.hasPermission 
      });
      
      return this.hasPermission;
    } catch (error) {
      logger.error(FILE_NAME, 'Error requesting location permission', error);
      this.hasPermission = false;
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationCoords> {
    logger.info(FILE_NAME, 'Getting current location');
    
    if (!this.hasPermission) {
      logger.warn(FILE_NAME, 'No location permission, requesting');
      const granted = await this.requestLocationPermission();
      if (!granted) {
        const error: LocationError = {
          code: 1,
          message: 'Location permission denied'
        };
        logger.error(FILE_NAME, 'Location permission denied', error);
        throw error;
      }
    }

    const servicesEnabled = await this.checkLocationServicesEnabled();
    if (!servicesEnabled) {
      const error: LocationError = {
        code: 2,
        message: 'Location services are disabled'
      };
      logger.error(FILE_NAME, 'Location services disabled', error);
      throw error;
    }

    try {
      logger.debug(FILE_NAME, 'Fetching location with high accuracy');
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: LocationCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      this.cachedLocation = coords;

      logger.info(FILE_NAME, 'Location fetched successfully', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: location.coords.accuracy
      });

      return coords;
    } catch (error) {
      logger.error(FILE_NAME, 'Error getting current location', error);
      
      const locationError: LocationError = {
        code: 3,
        message: error instanceof Error ? error.message : 'Failed to get location'
      };
      throw locationError;
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const deg2rad = (deg: number): number => deg * (Math.PI / 180);
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    
    logger.debug(FILE_NAME, 'Distance calculated', {
      from: { lat1, lon1 },
      to: { lat2, lon2 },
      distance
    });
    
    return distance;
  }

  async showLocationPermissionAlert(): Promise<boolean> {
    logger.info(FILE_NAME, 'Showing location permission alert');
    
    return new Promise((resolve) => {
      Alert.alert(
        'Location Permission Required',
        'This app needs access to your location to find nearby merchants. Please enable location services in your device settings.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              logger.debug(FILE_NAME, 'User cancelled location permission alert');
              resolve(false);
            },
          },
          {
            text: 'Settings',
            onPress: async () => {
              logger.debug(FILE_NAME, 'User chose to open settings');
              try {
                await Location.requestForegroundPermissionsAsync();
                const { status } = await Location.getForegroundPermissionsAsync();
                const granted = status === 'granted';
                this.hasPermission = granted;
                
                logger.info(FILE_NAME, 'Permission status after settings', { granted });
                resolve(granted);
              } catch (error) {
                logger.error(FILE_NAME, 'Error after opening settings', error);
                resolve(false);
              }
            },
          },
        ]
      );
    });
  }

  getHasPermission(): boolean {
    return this.hasPermission;
  }

  async checkLocationPermission(): Promise<boolean> {
    try {
      logger.debug(FILE_NAME, 'Checking current location permission status');
      const { status } = await Location.getForegroundPermissionsAsync();
      this.hasPermission = status === 'granted';
      
      logger.debug(FILE_NAME, 'Current location permission status', {
        status,
        granted: this.hasPermission
      });
      
      return this.hasPermission;
    } catch (error) {
      logger.error(FILE_NAME, 'Error checking location permission', error);
      this.hasPermission = false;
      return false;
    }
  }

  async checkLocationServicesEnabled(): Promise<boolean> {
    try {
      logger.debug(FILE_NAME, 'Checking if location services are enabled');
      const enabled = await Location.hasServicesEnabledAsync();
      
      logger.debug(FILE_NAME, 'Location services status', { enabled });
      return enabled;
    } catch (error) {
      logger.error(FILE_NAME, 'Error checking location services', error);
      return false;
    }
  }
}

export const locationService = new LocationService(); 