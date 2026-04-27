import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../lib/types";
import { SolanaColors, Typography, Spacing } from "../../lib/theme";
import { Card, Button } from "../../components/ui";

import { locationService } from "../../lib/services/locationService";
import { UI_CONSTANTS } from "../../lib/utils/constants";
import { Merchant, LocationCoords } from "../../lib/types";
import Icon from "react-native-vector-icons/MaterialIcons";
import { showMessage } from "react-native-flash-message";

// Import processed merchants directly for optimal performance
import processedMerchantsData from "../../lib/data/processed_merchants.json";

type MerchantListScreenNavigationProp = StackNavigationProp<RootStackParamList, "Dashboard">;
type MerchantListScreenRouteProp = RouteProp<RootStackParamList, "Dashboard">;

interface Props {
  navigation: MerchantListScreenNavigationProp;
  route: MerchantListScreenRouteProp;
}

// Process all merchants globally once
const getAllMerchants = (): Merchant[] => {
  try {
    let merchantsArray: Merchant[] = [];
    if (Array.isArray(processedMerchantsData)) {
      merchantsArray = processedMerchantsData;
    } else if (
      processedMerchantsData &&
      typeof processedMerchantsData === "object"
    ) {
      merchantsArray = (processedMerchantsData as any).merchants || [];
    }

    return merchantsArray
      .filter(
        (merchant: any) =>
          merchant.latitude &&
          merchant.longitude &&
          !isNaN(merchant.latitude) &&
          !isNaN(merchant.longitude) &&
          merchant.name
      )
      .map((merchant: any) => ({
        name: merchant.name,
        latitude: merchant.latitude,
        longitude: merchant.longitude,
        category: merchant.category || "Other",
        address: merchant.address || "",
        description: merchant.description || "",
        acceptedTokens: merchant.acceptedTokens || ["SOL"],
        googleMapsLink: merchant.googleMapsLink || "",
        id: merchant.id || merchant.name,
        rating: merchant.rating || 0,
        // Additional required properties for Merchant interface
        geopoint: {
          latitude: merchant.latitude,
          longitude: merchant.longitude,
        },
        geohash: merchant.geohash || "",
        city: merchant.city || "",
        walletAddress: merchant.walletAddress || "",
        featured: merchant.featured || false,
        verified: merchant.verified || false,
        profileImage: merchant.profileImage || "",
        isActive: merchant.isActive || true,
        isApproved: merchant.isApproved || true,
        createdAt: merchant.createdAt || new Date(),
        updatedAt: merchant.updatedAt || new Date(),
      }));
  } catch (error) {
    console.error("Failed to process merchants", error);
    return [];
  }
};

const ALL_MERCHANTS = getAllMerchants();

const MerchantListScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayedCount, setDisplayedCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (route?.params?.openSearch) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [route?.params?.openSearch]);

  // Use all merchants directly
  const merchants = ALL_MERCHANTS;

  // Get user location on mount
  React.useEffect(() => {
    const getUserLocation = async () => {
      try {
        const hasPermission = locationService.getHasPermission();
        if (hasPermission) {
          const location = await locationService.getCurrentLocation();
          setUserLocation(location);
        }
      } catch (error) {
        console.log("Could not get user location:", error);
      }
    };

    getUserLocation();
  }, []);

  // Optimized search, filtering, and pagination
  const { filteredMerchants, displayedMerchants } = useMemo(() => {
    let filtered = merchants;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = merchants.filter(
        (merchant) =>
          merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          merchant.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          merchant.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Add distance calculation and sort if location is available
    if (userLocation) {
      filtered = filtered
        .map((merchant) => ({
          ...merchant,
          distance: locationService.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            merchant.latitude,
            merchant.longitude
          ),
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    // Apply pagination - only show displayedCount items
    const displayed = filtered.slice(0, displayedCount);

    return {
      filteredMerchants: filtered,
      displayedMerchants: displayed,
    };
  }, [merchants, userLocation, searchQuery, displayedCount]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleMerchantPress = (merchant: Merchant) => {
    // Show coming soon toast instead of navigating
    showMessage({
      message: "Coming Soon!",
      description: "Payment feature is under development. Stay tuned!",
      type: "info",
      duration: 3000,
      icon: "info",
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Reset pagination
      setDisplayedCount(20);

      // Refresh user location
      const hasPermission = locationService.getHasPermission();
      if (hasPermission) {
        const location = await locationService.getCurrentLocation();
        setUserLocation(location);
      }
    } catch (error) {
      console.log("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (
      isLoadingMore ||
      displayedMerchants.length >= filteredMerchants.length
    ) {
      return;
    }

    setIsLoadingMore(true);

    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedCount((prev) =>
        Math.min(prev + 20, filteredMerchants.length)
      );
      setIsLoadingMore(false);
    }, 300);
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return "";
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const renderMerchantItem = ({ item: merchant }: { item: Merchant }) => (
    <Card style={styles.merchantCard} shadow={true}>
      <TouchableOpacity
        onPress={() => handleMerchantPress(merchant)}
        activeOpacity={0.7}
      >
        <View style={styles.merchantHeader}>
          <View style={styles.merchantInfo}>
            <Text style={styles.merchantName}>{merchant.name}</Text>
            <Text style={styles.merchantCategory}>{merchant.category}</Text>
            <Text style={styles.merchantAddress}>
              <Icon
                name="location-on"
                size={14}
                color={SolanaColors.text.secondary}
              />{" "}
              {merchant.address}
            </Text>
          </View>
          <View style={styles.merchantMeta}>
            {(merchant as any).distance && (
              <Text style={styles.distanceText}>
                {formatDistance((merchant as any).distance)}
              </Text>
            )}
            {merchant.rating && (
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>
                  {merchant.rating.toFixed(1)}
                </Text>
                <Icon name="star" size={16} color="#FFD700" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.merchantFooter}>
          <View style={styles.tokensContainer}>
            <Text style={styles.tokensLabel}>Accepts: </Text>
            {merchant.acceptedTokens.map((token, index) => (
              <Text key={token} style={styles.tokenText}>
                {token}
                {index < merchant.acceptedTokens.length - 1 && ", "}
              </Text>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={SolanaColors.primary} />
        <Text style={styles.loadingText}>Loading more merchants...</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.merchantsTitle}>All Merchants</Text>
          <Text style={styles.headerSubtitle}>
            {filteredMerchants.length} merchants worldwide
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={SolanaColors.text.secondary} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search merchants, categories..."
            placeholderTextColor={SolanaColors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Icon
                name="close"
                size={20}
                color={SolanaColors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {displayedMerchants.length > 0 ? (
        <FlatList
          data={displayedMerchants}
          renderItem={renderMerchantItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: UI_CONSTANTS.BOTTOM_TAB_HEIGHT + Spacing["3xl"] },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[SolanaColors.button.primary]}
              tintColor={SolanaColors.button.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          getItemLayout={(data, index) => ({
            length: 160, // Approximate item height
            offset: 160 * index,
            index,
          })}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon
            name={searchQuery.trim() ? "search-off" : "store"}
            size={48}
            color={SolanaColors.text.secondary}
          />
          <Text style={styles.emptyTitle}>
            {searchQuery.trim() ? "No results found" : "No merchants found"}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery.trim()
              ? `No merchants match "${searchQuery}". Try different keywords.`
              : "Check back later or try refreshing the list"}
          </Text>
          {searchQuery.trim() ? (
            <Button
              title="Clear Search"
              onPress={clearSearch}
              variant="outline"
              style={styles.refreshButton}
            />
          ) : (
            <Button
              title="Refresh"
              onPress={handleRefresh}
              variant="outline"
              style={styles.refreshButton}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SolanaColors.background.primary,
  },

  // Clean header design
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.layout.screenPadding,
    paddingVertical: Spacing.lg,
    backgroundColor: SolanaColors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: SolanaColors.border.primary,
  },

  headerContent: {
    flex: 1,
  },

  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    fontWeight: Typography.fontWeight.regular,
  },

  searchButton: {
    width: 48,
    height: 48,
    borderRadius: Spacing.borderRadius.lg,
    backgroundColor: SolanaColors.background.secondary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: SolanaColors.shadow.light,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  searchButtonText: {
    fontSize: 20,
    color: SolanaColors.text.primary,
  },

  // Merchant card - clean Airbnb-style design
  merchantCard: {
    marginBottom: Spacing.lg,
    padding: 0,
    backgroundColor: SolanaColors.background.card,
  },

  merchantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },

  merchantInfo: {
    flex: 1,
  },

  merchantName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.xs,
  },

  merchantCategory: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.primary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },

  merchantAddress: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
  },

  merchantMeta: {
    alignItems: "flex-end",
  },

  distanceText: {
    fontSize: Typography.fontSize.xs,
    color: SolanaColors.primary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  ratingText: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
    marginRight: Spacing.xs,
  },

  ratingStars: {
    fontSize: Typography.fontSize.sm,
    color: "#FFD700",
  },

  merchantDescription: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },

  merchantFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },

  tokensContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  tokensLabel: {
    fontSize: Typography.fontSize.xs,
    color: SolanaColors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },

  tokenText: {
    fontSize: Typography.fontSize.xs,
    color: SolanaColors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SolanaColors.status.success,
    marginRight: Spacing.xs,
  },

  statusText: {
    fontSize: Typography.fontSize.xs,
    color: SolanaColors.status.success,
    fontWeight: Typography.fontWeight.medium,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },

  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  emptyText: {
    fontSize: Typography.fontSize.base,
    color: SolanaColors.text.secondary,
    textAlign: "center",
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },

  refreshButton: {
    paddingHorizontal: Spacing["2xl"],
  },

  // Merchants section styles
  merchantsSection: {
    paddingHorizontal: Spacing.layout.screenPadding,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },

  merchantsTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
    marginTop: Spacing.md,
  },

  merchantsSubtitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: SolanaColors.text.secondary,
    marginBottom: Spacing.md,
  },

  // Search styles
  searchContainer: {
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.layout.screenPadding,
  },

  // List container
  listContainer: {
    paddingHorizontal: Spacing.layout.screenPadding,
  },

  // Loading footer
  loadingFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    paddingBottom: Spacing["3xl"], // Extra padding to ensure visibility above bottom nav
    backgroundColor: SolanaColors.background.primary,
    borderTopWidth: 1,
    borderTopColor: SolanaColors.border.primary,
  },

  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    marginLeft: Spacing.sm,
  },

  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SolanaColors.background.secondary,
    borderRadius: Spacing.borderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: SolanaColors.shadow.light,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: SolanaColors.text.primary,
    marginLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
  },

  clearButton: {
    padding: Spacing.xs,
  },
});

export default MerchantListScreen;
