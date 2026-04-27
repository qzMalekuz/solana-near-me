import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  ScrollView,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { showMessage } from "react-native-flash-message";
import { StackNavigationProp } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/MaterialIcons";

// Mapbox imports
import MapboxGL from "@rnmapbox/maps";

// Internal imports
import { RootStackParamList } from "../../lib/types";
import {
  SolanaColors,
  Typography,
  Spacing,
} from "../../lib/theme";
import { useAuthorization } from "../../providers/AppProviders";
import { locationService } from "../../lib/services/locationService";
import { Merchant, LocationCoords } from "../../lib/types";
import { UI_CONSTANTS } from "../../lib/utils/constants";
import { logger } from "../../lib/utils/logger";
import { MAPBOX_CONFIG } from "../../lib/config/mapbox";

// Import data
import processedMerchantsData from "../../lib/data/processed_merchants.json";

const FILE_NAME = "Map3DScreen.tsx";

// Set Mapbox access token
MapboxGL.setAccessToken(MAPBOX_CONFIG.ACCESS_TOKEN);

type Map3DScreenNavigationProp = StackNavigationProp<RootStackParamList, "Map">;

interface Props {
  navigation: Map3DScreenNavigationProp;
}

// Merchant processing
const getAllMerchants = (): Merchant[] => {
  try {
    const merchants = Array.isArray(processedMerchantsData)
      ? processedMerchantsData
      : (processedMerchantsData as any)?.merchants || [];

    return merchants.map((merchant: any) => ({
      id:
        merchant.id ||
        merchant._id ||
        `merchant_${Date.now()}_${Math.random()}`,
      name: merchant.name || "Unknown Merchant",
      address: merchant.address || "",
      category: merchant.category || "service",
      latitude: parseFloat(merchant.latitude || merchant.lat || "0"),
      longitude: parseFloat(merchant.longitude || merchant.lng || "0"),
      geopoint: {
        latitude: parseFloat(merchant.latitude || merchant.lat || "0"),
        longitude: parseFloat(merchant.longitude || merchant.lng || "0"),
      },
      geohash: merchant.geohash || "",
      city: merchant.city || "",
      walletAddress:
        merchant.walletAddress ||
        `${merchant.name?.replace(/\s+/g, "")}SolWallet`,
      acceptedTokens: merchant.acceptedTokens || ["SOL", "USDC"],
      rating: merchant.rating || Math.floor(Math.random() * 2) + 4,
      isActive: merchant.isActive !== false,
      isApproved: merchant.isApproved !== false,
      createdAt: merchant.createdAt || new Date().toISOString(),
      updatedAt: merchant.updatedAt || new Date().toISOString(),
      googleMapsLink: merchant.googleMapsLink || "",
    }));
  } catch (error) {
    logger.error(FILE_NAME, "Failed to process merchant data", error);
    return [];
  }
};

const ALL_MERCHANTS = getAllMerchants();

// Enhanced category color mapping for markers
const getCategoryColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    "Food & Drinks": "#FF6B35",
    "Coffee Shop": "#8B4513",
    Restaurant: "#FF4444",
    "Tech Services": "#9C27B0",
    Electronics: "#2196F3",
    Transportation: "#4CAF50",
    Travel: "#FF9800",
    Services: "#607D8B",
    Marketing: "#E91E63",
    Accommodation: "#795548",
    Retail: "#FF5722",
    "Gift Cards": "#F44336",
    Marketplace: "#673AB7",
    Education: "#3F51B5",
    Other: "#9E9E9E",
  };

  if (categoryColors[category]) return categoryColors[category];

  const cat = category.toLowerCase();
  if (cat.includes("food") || cat.includes("restaurant") || cat.includes("cafe")) return categoryColors["Food & Drinks"];
  if (cat.includes("service") || cat.includes("tech")) return categoryColors["Tech Services"];
  if (cat.includes("electronic") || cat.includes("computer")) return categoryColors["Electronics"];
  if (cat.includes("shop") || cat.includes("store") || cat.includes("retail")) return categoryColors["Retail"];
  if (cat.includes("transport") || cat.includes("car")) return categoryColors["Transportation"];
  if (cat.includes("travel") || cat.includes("hotel")) return categoryColors["Travel"];

  return SolanaColors.primary;
};

// Country coordinates for navigation
const COUNTRY_COORDINATES: { [key: string]: [number, number] } = {
  Switzerland: [8.2275, 46.8182],
  Germany: [10.4515, 51.1657],
  France: [2.3522, 46.2276],
  Italy: [12.5674, 41.8719],
  Spain: [-3.7492, 40.4637],
  UK: [-0.1276, 51.5074],
  USA: [-95.7129, 37.0902],
  Canada: [-106.3468, 56.1304],
  Brazil: [-47.8825, -15.7942],
  India: [77.1025, 20.5937],
  China: [104.1954, 35.8617],
  Japan: [138.2529, 36.2048],
  Australia: [133.7751, -25.2744],
  Russia: [105.3188, 61.524],
};

const Map3DScreenContent: React.FC<Props> = React.memo(({ navigation }) => {
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapStyle, setMapStyle] = useState(MAPBOX_CONFIG.STYLES.DARK);
  const [currentZoom, setCurrentZoom] = useState(2);

  const popularCountries = [
    "Switzerland", "Germany", "France", "Italy", "Spain",
    "UK", "USA", "Canada", "Brazil", "India",
    "China", "Japan", "Australia", "Russia",
  ];

  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isRotating = useRef(true);
  const rotHeading = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRotation = useCallback(() => {
    isRotating.current = false;
    if (rotTimer.current) { clearInterval(rotTimer.current); rotTimer.current = null; }
    if (idleTimer.current) { clearTimeout(idleTimer.current); }
    idleTimer.current = setTimeout(() => {
      isRotating.current = true;
      rotTimer.current = setInterval(() => {
        rotHeading.current = (rotHeading.current - 0.25 + 360) % 360;
        cameraRef.current?.setCamera({ heading: rotHeading.current, animationDuration: 60, animationMode: "easeTo" });
      }, 60);
    }, 5000);
  }, []);

  const startRotation = useCallback(() => {
    if (rotTimer.current) return;
    isRotating.current = true;
    rotTimer.current = setInterval(() => {
      rotHeading.current = (rotHeading.current - 0.25 + 360) % 360;
      cameraRef.current?.setCamera({ heading: rotHeading.current, animationDuration: 60, animationMode: "easeTo" });
    }, 60);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    startRotation();
    return () => {
      if (rotTimer.current) clearInterval(rotTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [pulseAnim, startRotation]);

  const { authorization } = useAuthorization();

  // Create GeoJSON for merchant markers
  const markersGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: ALL_MERCHANTS.map((merchant) => ({
      type: "Feature" as const,
      id: merchant.id,
      properties: {
        type: "merchant",
        name: merchant.name,
        category: merchant.category,
        address: merchant.address,
        rating: merchant.rating,
        color: getCategoryColor(merchant.category),
      },
      geometry: {
        type: "Point" as const,
        coordinates: [merchant.longitude, merchant.latitude],
      },
    })),
  }), []);

  const flyToLocation = useCallback((coords: LocationCoords, duration: number = 1200) => {
    cameraRef.current?.setCamera({
      centerCoordinate: [coords.longitude, coords.latitude],
      zoomLevel: 15,
      pitch: 45,
      heading: 0,
      animationDuration: duration,
      animationMode: "flyTo",
    });
  }, []);

  const getUserLocation = useCallback(async () => {
    stopRotation();
    try {
      setLocationLoading(true);
      const cached = locationService.getCachedLocation?.();
      if (cached) {
        setUserLocation(cached);
        flyToLocation(cached, 800);
      }
      const location = await locationService.getCurrentLocation();
      if (location) {
        setUserLocation(location);
        flyToLocation(location, cached ? 600 : 1400);
        return location;
      }
    } catch (error) {
      logger.error(FILE_NAME, "Failed to get user location", error);
    } finally {
      setLocationLoading(false);
    }
    return null;
  }, [flyToLocation, stopRotation]);

  const handleCountryPress = (country: string) => {
    stopRotation();
    const coords = COUNTRY_COORDINATES[country];
    if (coords) {
      cameraRef.current?.flyTo(coords, 2000);
    }
  };

  const onMarkerPress = useCallback(async (event: any) => {
    stopRotation();
    let feature = event;

    if (event?.features && Array.isArray(event.features) && event.features.length > 0) {
      feature = event.features[0];
    }
    if (event?.nativeEvent?.payload) {
      feature = event.nativeEvent.payload;
    }

    const { properties, geometry } = feature || {};
    if (!properties) return;

    // Cluster tapped — zoom in to expand it
    if (properties.cluster) {
      const [lng, lat] = geometry?.coordinates ?? [];
      if (lng !== undefined && lat !== undefined) {
        const currentZoomLevel = await mapRef.current?.getZoom() ?? 2;
        cameraRef.current?.setCamera({
          centerCoordinate: [lng, lat],
          zoomLevel: Math.min(currentZoomLevel + 3, 16),
          animationDuration: 600,
          animationMode: "flyTo",
        });
      }
      return;
    }

    // Individual merchant tapped
    const featureId = feature.id || properties.id;
    const merchant = ALL_MERCHANTS.find((m) => m.id === featureId);
    if (merchant) {
      setSelectedMerchant(merchant);
    }
  }, [stopRotation]);

  const handlePayPress = async () => {
    if (!selectedMerchant) return;

    if (!selectedMerchant.walletAddress || selectedMerchant.walletAddress.trim() === "") {
      showMessage({
        message: "Merchant Not Verified",
        description: "This merchant hasn't set up their wallet address yet",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      const solanaPayUrl = `solana:${selectedMerchant.walletAddress}?amount=0.01&message=${encodeURIComponent(
        `Payment to ${selectedMerchant.name}`
      )}&memo=${encodeURIComponent(`NearMe-${Date.now()}`)}`;

      const walletOptions = [
        {
          name: "Phantom",
          nativeDeepLink: `phantom://browse/${encodeURIComponent(solanaPayUrl)}`,
          universalLink: `https://phantom.app/ul/browse/${encodeURIComponent(solanaPayUrl)}`,
        },
        {
          name: "Solflare",
          nativeDeepLink: `solflare://browse/${encodeURIComponent(solanaPayUrl)}`,
          universalLink: `https://solflare.com/ul/browse/${encodeURIComponent(solanaPayUrl)}`,
        },
        {
          name: "Backpack",
          nativeDeepLink: `backpack://browse/${encodeURIComponent(solanaPayUrl)}`,
          universalLink: `https://backpack.app/ul/browse/${encodeURIComponent(solanaPayUrl)}`,
        },
      ];

      let walletOpened = false;

      try {
        const canOpenSolanaPay = await Linking.canOpenURL(solanaPayUrl);
        if (canOpenSolanaPay) {
          await Linking.openURL(solanaPayUrl);
          walletOpened = true;
        }
      } catch {}

      if (!walletOpened) {
        for (const wallet of walletOptions) {
          try {
            const canOpenNative = await Linking.canOpenURL(wallet.nativeDeepLink);
            if (canOpenNative) {
              await Linking.openURL(wallet.nativeDeepLink);
              walletOpened = true;
              break;
            }
          } catch {
            try {
              const canOpenUniversal = await Linking.canOpenURL(wallet.universalLink);
              if (canOpenUniversal) {
                await Linking.openURL(wallet.universalLink);
                walletOpened = true;
                break;
              }
            } catch {}
          }
        }
      }

      if (!walletOpened) {
        showMessage({
          message: "No Supported Apps Found",
          description: "Please install Phantom, Solflare, or another Solana wallet app to make payments",
          type: "warning",
          duration: 4000,
        });
      }
    } catch (error) {
      showMessage({
        message: "Payment Error",
        description: "Unable to open payment app. Please try again.",
        type: "danger",
        duration: 3000,
      });
    }
  };

  const handleResetNorth = async () => {
    stopRotation();
    rotHeading.current = 0;
    try {
      const center = await mapRef.current?.getCenter();
      const zoom = await mapRef.current?.getZoom();
      cameraRef.current?.setCamera({
        centerCoordinate: center ?? MAPBOX_CONFIG.DEFAULT_CAMERA.centerCoordinate,
        zoomLevel: zoom ?? currentZoom,
        heading: 0,
        pitch: 45,
        animationDuration: 600,
        animationMode: "easeTo",
      });
    } catch {}
  };

  const handleZoomIn = async () => {
    try {
      const zoom = await mapRef.current?.getZoom();
      if (zoom !== undefined) cameraRef.current?.zoomTo(zoom + 1, 300);
    } catch {}
  };

  const handleZoomOut = async () => {
    try {
      const zoom = await mapRef.current?.getZoom();
      if (zoom !== undefined) cameraRef.current?.zoomTo(Math.max(0, zoom - 1), 300);
    } catch {}
  };

  const toggleMapStyle = () => {
    const styles = [
      MAPBOX_CONFIG.STYLES.DARK,
      MAPBOX_CONFIG.STYLES.NAVIGATION_NIGHT,
      MAPBOX_CONFIG.STYLES.SATELLITE,
      MAPBOX_CONFIG.STYLES.OUTDOORS,
    ];
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % styles.length;
    setMapStyle(styles[nextIndex]);
  };

  useEffect(() => {
    locationService.getCurrentLocation().catch(() => {});
  }, []);


  return (
    <View style={styles.container}>
      {/* 3D Map — full screen behind everything */}
      <View style={styles.mapContainer} onTouchStart={stopRotation}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={mapStyle}
          projection="globe"
          attributionEnabled={false}
          logoEnabled={false}
          scaleBarEnabled={false}
          compassEnabled={false}
          onRegionDidChange={async () => {
            try {
              const zoom = await mapRef.current?.getZoom();
              if (zoom !== undefined) setCurrentZoom(zoom);
            } catch {}
          }}
        >
          <MapboxGL.Atmosphere
            style={{
              range: [0.8, 8],
              color: `${SolanaColors.primary}40`,
              spaceColor: "#000814",
              starIntensity: 0.8,
            }}
          />

          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={MAPBOX_CONFIG.DEFAULT_CAMERA.zoomLevel}
            centerCoordinate={MAPBOX_CONFIG.DEFAULT_CAMERA.centerCoordinate}
            pitch={MAPBOX_CONFIG.DEFAULT_CAMERA.pitch}
            heading={MAPBOX_CONFIG.DEFAULT_CAMERA.heading}
            animationDuration={MAPBOX_CONFIG.ANIMATIONS.flyToDuration}
          />

          {userLocation && (
            <MapboxGL.PointAnnotation
              id="userLocation"
              coordinate={[userLocation.longitude, userLocation.latitude]}
            >
              <View style={styles.userLocationMarker}>
                <Animated.View style={[styles.userLocationPulse, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.userLocationDot} />
              </View>
            </MapboxGL.PointAnnotation>
          )}

          <MapboxGL.ShapeSource
            id="markers"
            shape={markersGeoJSON}
            cluster={true}
            clusterRadius={MAPBOX_CONFIG.PERFORMANCE.clusterRadius}
            clusterMaxZoomLevel={MAPBOX_CONFIG.PERFORMANCE.clusterMaxZoom}
            onPress={onMarkerPress}
          >
            <MapboxGL.CircleLayer
              id="clusters"
              filter={["has", "point_count"]}
              style={{
                circleColor: SolanaColors.primary,
                circleRadius: ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
                circleOpacity: 0.8,
                circleStrokeWidth: 2,
                circleStrokeColor: SolanaColors.background.primary,
              }}
            />

            <MapboxGL.SymbolLayer
              id="cluster-count"
              filter={["has", "point_count"]}
              style={{
                textField: "{point_count_abbreviated}",
                textFont: ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                textSize: 12,
                textColor: "#ffffff",
              }}
            />

            <MapboxGL.CircleLayer
              id="unclustered-point-bg"
              filter={["!", ["has", "point_count"]]}
              style={{
                circleColor: ["case", ["has", "color"], ["get", "color"], SolanaColors.primary],
                circleRadius: 12,
                circleOpacity: 0.2,
                circleStrokeWidth: 2,
                circleStrokeColor: ["case", ["has", "color"], ["get", "color"], SolanaColors.primary],
                circleStrokeOpacity: 0.8,
              }}
            />

            <MapboxGL.CircleLayer
              id="unclustered-point"
              filter={["!", ["has", "point_count"]]}
              style={{
                circleColor: ["case", ["has", "color"], ["get", "color"], SolanaColors.primary],
                circleRadius: 6,
                circleOpacity: 1,
                circleStrokeWidth: 1,
                circleStrokeColor: SolanaColors.background.primary,
              }}
            />

            <MapboxGL.SymbolLayer
              id="unclustered-labels"
              filter={["!", ["has", "point_count"]]}
              style={{
                textField: [
                  "case",
                  ["==", ["get", "category"], "Food & Drinks"], "🍕",
                  ["==", ["get", "category"], "Tech Services"], "💻",
                  ["==", ["get", "category"], "Transportation"], "🚗",
                  ["==", ["get", "category"], "Travel"], "✈️",
                  ["==", ["get", "category"], "Services"], "🏢",
                  ["==", ["get", "category"], "Electronics"], "📱",
                  ["==", ["get", "category"], "Retail"], "🛍️",
                  ["==", ["get", "category"], "Gift Cards"], "🎁",
                  ["==", ["get", "category"], "Marketplace"], "🏪",
                  ["==", ["get", "category"], "Accommodation"], "🏨",
                  ["==", ["get", "category"], "Marketing"], "📈",
                  ["==", ["get", "category"], "Education"], "🎓",
                  "🏪",
                ],
                textSize: 12,
                textColor: "#FFFFFF",
                textAllowOverlap: true,
                textIgnorePlacement: true,
                textFont: ["Open Sans Bold", "Arial Unicode MS Bold"],
              }}
            />
          </MapboxGL.ShapeSource>

        </MapboxGL.MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.controlButton, !!userLocation && styles.controlButtonPrimary, !!locationLoading && styles.controlButtonLoading]}
            onPress={getUserLocation}
            activeOpacity={0.75}
            disabled={locationLoading}
          >
            <Icon name={locationLoading ? "refresh" : "my-location"} size={20} color={SolanaColors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn} activeOpacity={0.75}>
            <Icon name="add" size={22} color={SolanaColors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut} activeOpacity={0.75}>
            <Icon name="remove" size={22} color={SolanaColors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={toggleMapStyle} activeOpacity={0.75}>
            <Icon name="layers" size={20} color={SolanaColors.white} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlButton, styles.controlButtonPrimary]} onPress={handleResetNorth} activeOpacity={0.75}>
            <Icon name="explore" size={20} color={SolanaColors.white} />
          </TouchableOpacity>
        </View>

        {/* Header — floats over map */}
        <View style={[styles.header, { top: insets.top + 6 }]}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => { stopRotation(); navigation.navigate("Dashboard", { openSearch: true }); }}
            activeOpacity={0.7}
          >
            <Icon name="search" size={20} color="#9e9e9e" />
            <Text style={styles.searchButtonText}>
              {UI_CONSTANTS.SEARCH_PLACEHOLDER}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.profileButton,
              authorization?.selectedAccount && styles.profileButtonConnected,
            ]}
            onPress={() => navigation.navigate("UserProfile")}
            activeOpacity={0.7}
          >
            <Icon
              name={authorization?.selectedAccount ? "account-balance-wallet" : "person"}
              size={20}
              color={SolanaColors.white}
            />
          </TouchableOpacity>
        </View>

        {/* Country Selector — floats over map below header */}
        <View style={[styles.countrySelector, { top: insets.top + 66 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.countryScrollContent}
            decelerationRate="fast"
            snapToAlignment="center"
          >
            <View style={{ width: 16 }} />
            {popularCountries.map((country) => (
              <TouchableOpacity
                key={country}
                style={styles.countryButton}
                onPress={() => handleCountryPress(country)}
                activeOpacity={0.6}
              >
                <Text style={styles.countryButtonText}>{country}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ width: 16 }} />
          </ScrollView>
        </View>
      </View>

      {/* Merchant Details Sheet */}
      <Modal
        visible={!!selectedMerchant}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedMerchant(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedMerchant(null)}
        />
        <View style={styles.modalContent}>
          {selectedMerchant && (
            <>
              {/* Drag handle */}
              <View style={styles.dragHandle} />

              {/* Header row */}
              <View style={styles.modalHeader}>
                <View style={styles.merchantInfo}>
                  <Text style={styles.merchantName} numberOfLines={2}>{selectedMerchant.name}</Text>
                  <View style={styles.merchantMetaRow}>
                    <Text style={styles.merchantCategory}>{selectedMerchant.category}</Text>
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={11} color={SolanaColors.status.success} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingStars}>{"★".repeat(Math.floor(selectedMerchant.rating || 4))}</Text>
                    <Text style={styles.ratingText}>{selectedMerchant.rating?.toFixed(1) || "4.0"}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedMerchant(null)}>
                  <Icon name="close" size={18} color={SolanaColors.white} />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Details */}
              <View style={styles.merchantDetails}>
                <View style={styles.detailRow}>
                  <Icon name="place" size={16} color={SolanaColors.primary} />
                  <Text style={styles.merchantAddress}>{selectedMerchant.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="account-balance-wallet" size={16} color={SolanaColors.primary} />
                  <Text style={styles.acceptedTokens}>Accepts: {selectedMerchant.acceptedTokens.join(", ")}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.googleMapsButton}
                  onPress={() => { if (selectedMerchant?.googleMapsLink) Linking.openURL(selectedMerchant.googleMapsLink); }}
                  activeOpacity={0.8}
                >
                  <Icon name="directions" size={20} color={SolanaColors.white} />
                  <Text style={styles.googleMapsButtonText}>Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payButton, (!selectedMerchant.walletAddress || selectedMerchant.walletAddress.trim() === "") && styles.payButtonDisabled]}
                  onPress={handlePayPress}
                  activeOpacity={0.8}
                >
                  <Icon name={selectedMerchant.walletAddress?.trim() ? "payment" : "error-outline"} size={20} color={SolanaColors.white} />
                  <Text style={styles.payButtonText}>{selectedMerchant.walletAddress?.trim() ? "Pay Now" : "Not Verified"}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
});

const Map3DScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaProvider>
      <Map3DScreenContent navigation={navigation} />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
    gap: 10,
    zIndex: 10,
  },

  searchButton: {
    flex: 1,
    height: 48,
    backgroundColor: "#1e1e1e",
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },

  searchButtonText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: "#9e9e9e",
    fontWeight: Typography.fontWeight.regular,
    marginLeft: 10,
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },

  profileButtonConnected: {
    backgroundColor: `${SolanaColors.primary}CC`,
  },

  countrySelector: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingVertical: 6,
    backgroundColor: "transparent",
    zIndex: 10,
  },

  countryScrollContent: {
    gap: 8,
    alignItems: "center",
  },

  countryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },

  countryButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.1,
  },

  mapContainer: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  userLocationMarker: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  userLocationPulse: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${SolanaColors.primary}30`,
    borderWidth: 1.5,
    borderColor: `${SolanaColors.primary}80`,
  },

  userLocationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: SolanaColors.primary,
    borderWidth: 2.5,
    borderColor: "#ffffff",
    shadowColor: SolanaColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },

  mapControls: {
    position: "absolute",
    right: 16,
    bottom: UI_CONSTANTS.BOTTOM_TAB_HEIGHT + 48,
    gap: 12,
    paddingVertical: 0,
  },

  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(18,18,18,0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 4,
    elevation: 6,
  },

  controlButtonPrimary: {
    backgroundColor: SolanaColors.primary,
    borderColor: `${SolanaColors.primary}60`,
  },

  controlButtonLoading: {
    opacity: 0.6,
  },



  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },

  modalContent: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },

  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 20,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 16,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  merchantInfo: {
    flex: 1,
    paddingRight: 12,
  },

  merchantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },

  merchantMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },

  merchantName: {
    fontSize: 22,
    fontWeight: "700",
    color: SolanaColors.text.primary,
    lineHeight: 28,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${SolanaColors.status.success}22`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },

  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: SolanaColors.status.success,
  },

  merchantCategory: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    fontWeight: "500",
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingStars: {
    color: "#F5A623",
    fontSize: 14,
  },

  ratingText: {
    color: SolanaColors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: "500",
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  merchantDetails: {
    gap: 10,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  merchantAddress: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    lineHeight: 20,
    flex: 1,
  },

  acceptedTokens: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    lineHeight: 20,
    flex: 1,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },

  googleMapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  googleMapsButtonText: {
    color: SolanaColors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: "600",
  },

  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SolanaColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    flex: 1,
  },

  payButtonText: {
    color: SolanaColors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: "700",
  },

  payButtonDisabled: {
    backgroundColor: SolanaColors.status.warning,
    opacity: 0.8,
  },
});

export default Map3DScreen;
