import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { showMessage } from "react-native-flash-message";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RootStackParamList } from "../../lib/types";
import { SolanaColors, Typography, Spacing } from "../../lib/theme";
import { Button, TextInput } from "../../components/ui";
import { locationService } from "../../lib/services/locationService";
import { LocationCoords } from "../../lib/types";
import { MerchantService } from "../../lib/firebase/services";
import { encodeGeohash } from "../../lib/utils/geohash";
import { logger } from "../../lib/utils/logger";

type MerchantRegistrationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MerchantRegistration"
>;

interface Props {
  navigation: MerchantRegistrationScreenNavigationProp;
}

const FILE_NAME = "MerchantRegistrationScreen";

const MerchantRegistrationScreen: React.FC<Props> = ({ navigation }) => {
  const [registrationMode, setRegistrationMode] = useState<"auto" | "manual">(
    "auto"
  );
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    category: "",
    walletAddress: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    googleMapsLink: "",
  });
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [fetchingFromMaps, setFetchingFromMaps] = useState(false);
  const [autoFillSuccess, setAutoFillSuccess] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Get current location when component mounts
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      logger.info(
        FILE_NAME,
        "Getting current location for merchant registration"
      );

      if (!locationService.getHasPermission()) {
        const granted = await locationService.requestLocationPermission();
        if (!granted) {
          logger.warn(FILE_NAME, "Location permission denied");
          showMessage({
            message: "Location Required",
            description:
              "Location access is required to register your business.",
            type: "warning",
            duration: 3000,
          });
          return;
        }
      }

      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);
      logger.info(
        FILE_NAME,
        "Location captured for merchant registration",
        currentLocation
      );
    } catch (error) {
      logger.error(FILE_NAME, "Error getting location:", error);
      showMessage({
        message: "Location Error",
        description: "Could not get your current location. Please try again.",
        type: "danger",
        duration: 3000,
      });
    } finally {
      setGettingLocation(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Function to extract place ID from Google Maps URL
  const extractPlaceIdFromUrl = (url: string): string | null => {
    try {
      // Handle different Google Maps URL formats
      const patterns = [
        /place_id:([a-zA-Z0-9_-]+)/,
        /data=.*!1s([a-zA-Z0-9_-]+)!/,
        /maps\/place\/.*\/([a-zA-Z0-9_-]+)/,
        /ftid=([a-zA-Z0-9_-]+)/,
        // Handle shortened goo.gl URLs - extract the ID part
        /goo\.gl\/([a-zA-Z0-9_-]+)/,
        /maps\.app\.goo\.gl\/([a-zA-Z0-9_-]+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }

      // If no pattern matches, try to extract any alphanumeric ID from the URL
      const genericMatch = url.match(/([a-zA-Z0-9_-]{10,})/);
      if (genericMatch) return genericMatch[1];

      return null;
    } catch (error) {
      logger.error(FILE_NAME, "Error extracting place ID:", error);
      return null;
    }
  };

  // Improved place ID extraction for resolved URLs
  const extractPlaceIdFromResolvedUrl = async (
    url: string
  ): Promise<string | null> => {
    try {
      // Enhanced patterns for Google Maps URLs
      const patterns = [
        // Standard place_id parameter
        /[?&]place_id=([a-zA-Z0-9_-]{20,})/,
        // Data encoded URLs
        /data=.*!1s([a-zA-Z0-9_-]{20,})/,
        /data=.*!3m1!4b1!4m\d+!3m\d+!1s([a-zA-Z0-9_-]{20,})/,
        // FTID format
        /ftid=([a-zA-Z0-9_-]{20,})/,
        // Place URL with coordinates and place ID
        /@[^/]*\/data=.*!1s([a-zA-Z0-9_-]{20,})/,
        // Hex encoded place references
        /0x[a-f0-9]+:0x[a-f0-9]+.*!1s([a-zA-Z0-9_-]{20,})/,
        // Direct place ID in URL path
        /\/place\/[^/]*\/([a-zA-Z0-9_-]{20,})/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1] && match[1].length >= 20) {
          return match[1];
        }
      }

      return null;
    } catch (error) {
      logger.error(
        FILE_NAME,
        "Error extracting place ID from resolved URL:",
        error
      );
      return null;
    }
  };

  // Fetch place details from Google Places API
  const fetchPlaceDetailsFromAPI = async (placeId: string) => {
    try {
      const API_KEY = "AIzaSyAlbJEjGnDwzIwRJJomimekdLD3z7WxrRs"; // Your existing API key

      // Using Google Places API (New) - Place Details endpoint
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask":
              "id,displayName,formattedAddress,location,types,nationalPhoneNumber,websiteUri,editorialSummary,businessStatus",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Places API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Transform the new API response to match our expected format
      return {
        place_id: data.id,
        name: data.displayName?.text,
        formatted_address: data.formattedAddress,
        geometry: {
          location: {
            lat: data.location?.latitude,
            lng: data.location?.longitude,
          },
        },
        types: data.types || [],
        formatted_phone_number: data.nationalPhoneNumber,
        website: data.websiteUri,
        editorial_summary: {
          overview: data.editorialSummary?.overview,
        },
        business_status: data.businessStatus,
      };
    } catch (error) {
      logger.error(FILE_NAME, "Error fetching place details from API:", error);
      throw new Error(
        "Failed to fetch business details. Please check your internet connection and try again."
      );
    }
  };

  // Map Google place types to our categories
  const mapGoogleTypesToCategory = (types: string[]): string => {
    const categoryMap: { [key: string]: string } = {
      restaurant: "Restaurant",
      food: "Restaurant",
      meal_takeaway: "Restaurant",
      meal_delivery: "Restaurant",
      cafe: "Coffee Shop",
      bakery: "Bakery",
      bar: "Bar",
      night_club: "Entertainment",
      store: "Retail",
      clothing_store: "Retail",
      electronics_store: "Electronics",
      book_store: "Retail",
      grocery_or_supermarket: "Grocery",
      supermarket: "Grocery",
      gas_station: "Gas Station",
      hospital: "Healthcare",
      dentist: "Healthcare",
      doctor: "Healthcare",
      pharmacy: "Healthcare",
      bank: "Financial",
      atm: "Financial",
      lodging: "Hotel",
      tourist_attraction: "Entertainment",
      gym: "Fitness",
      beauty_salon: "Beauty",
      hair_care: "Beauty",
      spa: "Beauty",
      car_repair: "Automotive",
      car_dealer: "Automotive",
      gas_station: "Gas Station",
      laundry: "Services",
      dry_cleaning: "Services",
    };

    // Find the first matching category
    for (const type of types) {
      if (categoryMap[type]) {
        return categoryMap[type];
      }
    }

    // Default fallback
    return "Business";
  };

  // Generate a description based on business name and types
  const generateDescription = (name?: string, types?: string[]): string => {
    if (!name) return "";

    const businessType = types?.[0] || "business";
    const typeDescriptions: { [key: string]: string } = {
      restaurant: "offering delicious dining experiences",
      cafe: "serving great coffee and light meals",
      store: "providing quality products and services",
      bar: "offering drinks and entertainment",
      gas_station: "providing fuel and convenience items",
      hospital: "providing healthcare services",
      bank: "offering financial services",
      lodging: "providing comfortable accommodations",
    };

    const description =
      typeDescriptions[businessType] || "serving the community";
    return `${name} is a local business ${description}. Visit us for excellent service and quality.`;
  };

  // Function to fetch business details from Google Places API
  const fetchBusinessDetailsFromMaps = async (mapsUrl: string) => {
    setFetchingFromMaps(true);
    setAutoFillSuccess(false);

    try {
      logger.info(FILE_NAME, "Fetching business details from Google Maps URL");

      // Step 1: Resolve shortened URLs and extract place ID
      let resolvedUrl = mapsUrl;

      // Handle shortened URLs by following redirects
      if (mapsUrl.includes("maps.app.goo.gl") || mapsUrl.includes("goo.gl")) {
        try {
          const response = await fetch(mapsUrl, {
            method: "HEAD",
            redirect: "follow",
          });
          resolvedUrl = response.url;
          logger.info(FILE_NAME, "Resolved shortened URL:", resolvedUrl);
        } catch (redirectError) {
          logger.warn(
            FILE_NAME,
            "Could not resolve shortened URL, using original"
          );
        }
      }

      // Step 2: Extract place ID using improved patterns
      const placeId = await extractPlaceIdFromResolvedUrl(resolvedUrl);

      if (!placeId) {
        throw new Error(
          "Could not extract place ID from URL. Please ensure you're using a valid Google Maps place URL."
        );
      }

      logger.info(FILE_NAME, "Extracted place ID:", placeId);

      // Step 3: Fetch business details using Google Places API
      const businessData = await fetchPlaceDetailsFromAPI(placeId);

      // Step 4: Auto-fill form data with real business information
      setFormData((prev) => ({
        ...prev,
        name: businessData.name || prev.name,
        address: businessData.formatted_address || prev.address,
        category: mapGoogleTypesToCategory(businessData.types || []),
        description:
          businessData.editorial_summary?.overview ||
          generateDescription(businessData.name, businessData.types),
        contactPhone: businessData.formatted_phone_number || prev.contactPhone,
        googleMapsLink: mapsUrl,
      }));

      // Set location from real business data
      if (businessData.geometry?.location) {
        setLocation({
          latitude: businessData.geometry.location.lat,
          longitude: businessData.geometry.location.lng,
        });
      }

      setAutoFillSuccess(true);

      showMessage({
        message: "Success! 🎉",
        description: "Business details fetched successfully from Google Maps",
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      logger.error(FILE_NAME, "Error fetching business details:", error);
      showMessage({
        message: "Fetch Failed",
        description:
          "Could not fetch business details. Please check the URL and try again.",
        type: "warning",
        duration: 4000,
      });
    } finally {
      setFetchingFromMaps(false);
    }
  };

  // Handle Google Maps URL input in auto mode
  const handleMapsUrlInput = (url: string) => {
    updateFormData("googleMapsLink", url);

    // Reset previous state
    setAutoFillSuccess(false);

    // Auto-fetch when URL looks valid
    if (
      url &&
      (url.includes("maps.google.com") ||
        url.includes("goo.gl") ||
        url.includes("maps.app.goo.gl") ||
        url.includes("google.com/maps"))
    ) {
      // Debounce the fetch to avoid too many requests
      const timeoutId = setTimeout(() => {
        fetchBusinessDetailsFromMaps(url);
      }, 1500); // Increased debounce time

      return () => clearTimeout(timeoutId);
    }
  };

  const validateForm = () => {
    if (!formData.walletAddress.trim()) {
      showMessage({
        message: "Validation Error",
        description: "Wallet address is required",
        type: "warning",
        duration: 3000,
      });
      return false;
    }

    if (registrationMode === "auto") {
      // For auto mode, we only need Google Maps URL and wallet address
      if (!formData.googleMapsLink.trim()) {
        showMessage({
          message: "Validation Error",
          description: "Google Maps URL is required for auto registration",
          type: "warning",
          duration: 3000,
        });
        return false;
      }
      if (!autoFillSuccess) {
        showMessage({
          message: "Validation Error",
          description:
            "Please wait for business details to be fetched from Google Maps",
          type: "warning",
          duration: 3000,
        });
        return false;
      }
    } else {
      // For manual mode, check all required fields
      if (!formData.name.trim()) {
        showMessage({
          message: "Validation Error",
          description: "Business name is required",
          type: "warning",
          duration: 3000,
        });
        return false;
      }
      if (!formData.address.trim()) {
        showMessage({
          message: "Validation Error",
          description: "Address is required",
          type: "warning",
          duration: 3000,
        });
        return false;
      }
      if (!formData.category.trim()) {
        showMessage({
          message: "Validation Error",
          description: "Category is required",
          type: "warning",
          duration: 3000,
        });
        return false;
      }
      if (!location) {
        showMessage({
          message: "Validation Error",
          description: "Location is required",
          type: "warning",
          duration: 3000,
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    logger.info(FILE_NAME, "Submitting merchant registration");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const merchantData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        category: formData.category.trim(),
        latitude: location!.latitude,
        longitude: location!.longitude,
        geopoint: {
          latitude: location!.latitude,
          longitude: location!.longitude,
        },
        geohash: encodeGeohash(location!.latitude, location!.longitude),
        city: "Bangalore", // Default city for now, could be improved with reverse geocoding
        walletAddress: formData.walletAddress.trim(),
        acceptedTokens: ["SOL", "USDC"],
        isActive: false, // Will be activated after approval
        isApproved: false, // Requires admin approval
        rating: 0,
        description: formData.description.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(formData.contactEmail.trim() && {
          contactEmail: formData.contactEmail.trim(),
        }),
        ...(formData.contactPhone.trim() && {
          contactPhone: formData.contactPhone.trim(),
        }),
        ...(formData.googleMapsLink.trim() && {
          googleMapsLink: formData.googleMapsLink.trim(),
        }),
      };

      await MerchantService.addMerchant(merchantData);
      logger.info(FILE_NAME, "Merchant registration submitted successfully");

      showMessage({
        message: "Registration Submitted",
        description:
          "Your business registration has been submitted for review. You will be notified once approved.",
        type: "success",
        duration: 4000,
        onPress: () => navigation.goBack(),
      });

      // Navigate back after a short delay
      setTimeout(() => navigation.goBack(), 2000);
    } catch (error) {
      logger.error(FILE_NAME, "Error registering merchant:", error);
      showMessage({
        message: "Registration Error",
        description: "Failed to submit registration. Please try again.",
        type: "danger",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderLocationCard = () => (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <MaterialIcons
          name="location-on"
          size={24}
          color={SolanaColors.primary}
        />
        <Text style={styles.locationTitle}>Business Location</Text>
        <Text style={styles.requiredBadge}>Required</Text>
      </View>

      {gettingLocation ? (
        <View style={styles.locationContent}>
          <ActivityIndicator size="small" color={SolanaColors.primary} />
          <Text style={styles.locationStatusText}>
            Getting your location...
          </Text>
        </View>
      ) : location ? (
        <View style={styles.locationContent}>
          <View style={styles.locationSuccessContainer}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={SolanaColors.status.success}
            />
            <Text style={styles.locationSuccessText}>
              Location captured successfully
            </Text>
          </View>
          <Text style={styles.locationCoords}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={getCurrentLocation}
          >
            <MaterialIcons
              name="refresh"
              size={16}
              color={SolanaColors.text.secondary}
            />
            <Text style={styles.retryButtonText}>Update Location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.locationContent}>
          <View style={styles.locationErrorContainer}>
            <MaterialIcons
              name="error"
              size={20}
              color={SolanaColors.status.error}
            />
            <Text style={styles.locationErrorText}>Location not found</Text>
          </View>
          <Text style={styles.locationHelpText}>
            We need your location to help customers find your business
          </Text>
          <TouchableOpacity
            style={styles.getLocationButton}
            onPress={getCurrentLocation}
          >
            <MaterialIcons
              name="my-location"
              size={20}
              color={SolanaColors.white}
            />
            <Text style={styles.getLocationButtonText}>
              Get Current Location
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          registrationMode === "auto" && styles.activeTabButton,
        ]}
        onPress={() => setRegistrationMode("auto")}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="auto-fix-high"
          size={20}
          color={
            registrationMode === "auto"
              ? SolanaColors.white
              : SolanaColors.text.secondary
          }
        />
        <Text
          style={[
            styles.tabButtonText,
            registrationMode === "auto" && styles.activeTabButtonText,
          ]}
        >
          Auto
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          registrationMode === "manual" && styles.activeTabButton,
        ]}
        onPress={() => setRegistrationMode("manual")}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="edit"
          size={20}
          color={
            registrationMode === "manual"
              ? SolanaColors.white
              : SolanaColors.text.secondary
          }
        />
        <Text
          style={[
            styles.tabButtonText,
            registrationMode === "manual" && styles.activeTabButtonText,
          ]}
        >
          Manual
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAutoModeContent = () => (
    <>
      {/* Google Maps URL Input */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Business Google Maps Link</Text>
        <TextInput
          label="Google Maps URL"
          placeholder="Paste your Google Maps link here..."
          value={formData.googleMapsLink}
          onChangeText={handleMapsUrlInput}
          containerStyle={styles.inputContainer}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Manual Fetch Button */}
        {formData.googleMapsLink && !fetchingFromMaps && !autoFillSuccess && (
          <TouchableOpacity
            style={styles.fetchButton}
            onPress={() =>
              fetchBusinessDetailsFromMaps(formData.googleMapsLink)
            }
            activeOpacity={0.7}
          >
            <MaterialIcons name="search" size={20} color={SolanaColors.white} />
            <Text style={styles.fetchButtonText}>Fetch Business Details</Text>
          </TouchableOpacity>
        )}

        {fetchingFromMaps && (
          <View style={styles.fetchingIndicator}>
            <ActivityIndicator size="small" color={SolanaColors.primary} />
            <Text style={styles.fetchingText}>
              Fetching business details...
            </Text>
          </View>
        )}

        {autoFillSuccess && (
          <View style={styles.successIndicator}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={SolanaColors.status.success}
            />
            <Text style={styles.successText}>
              Business details fetched successfully!
            </Text>
          </View>
        )}
      </View>

      {/* Auto-filled Business Preview */}
      {autoFillSuccess && (
        <View style={styles.businessPreview}>
          <Text style={styles.previewTitle}>
            Business Details (Auto-filled)
          </Text>
          <View style={styles.previewContent}>
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>Name:</Text>
              <Text style={styles.previewValue}>{formData.name}</Text>
            </View>
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>Category:</Text>
              <Text style={styles.previewValue}>{formData.category}</Text>
            </View>
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>Address:</Text>
              <Text style={styles.previewValue}>{formData.address}</Text>
            </View>
            {formData.description && (
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Description:</Text>
                <Text style={styles.previewValue}>{formData.description}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Wallet Address - Required for both modes */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Payment Setup</Text>
        <TextInput
          label="Solana Wallet Address"
          placeholder="Paste your Solana wallet address"
          value={formData.walletAddress}
          onChangeText={(value) => updateFormData("walletAddress", value)}
          containerStyle={styles.inputContainer}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </>
  );

  const renderManualModeContent = () => (
    <>
      {/* Location Section - Top Priority for Manual Mode */}
      {renderLocationCard()}

      {/* Business Information */}
      {renderFormSection(
        "Business Information",
        <>
          <TextInput
            label="Business Name"
            placeholder="Enter your business name"
            value={formData.name}
            onChangeText={(value) => updateFormData("name", value)}
            containerStyle={styles.inputContainer}
          />

          <TextInput
            label="Category"
            placeholder="e.g., Coffee Shop, Restaurant, Retail"
            value={formData.category}
            onChangeText={(value) => updateFormData("category", value)}
            containerStyle={styles.inputContainer}
          />

          <TextInput
            label="Business Address"
            placeholder="Enter your full business address"
            value={formData.address}
            onChangeText={(value) => updateFormData("address", value)}
            containerStyle={styles.inputContainer}
            multiline
          />

          <TextInput
            label="Description (Optional)"
            placeholder="Tell customers about your business"
            value={formData.description}
            onChangeText={(value) => updateFormData("description", value)}
            containerStyle={styles.inputContainer}
            multiline
          />
        </>
      )}

      {/* Payment Information */}
      {renderFormSection(
        "Payment Setup",
        <TextInput
          label="Solana Wallet Address"
          placeholder="Paste your Solana wallet address"
          value={formData.walletAddress}
          onChangeText={(value) => updateFormData("walletAddress", value)}
          containerStyle={styles.inputContainer}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      {/* Contact Information */}
      {renderFormSection(
        "Contact Information (Optional)",
        <>
          <TextInput
            label="Contact Email"
            placeholder="your@email.com"
            value={formData.contactEmail}
            onChangeText={(value) => updateFormData("contactEmail", value)}
            containerStyle={styles.inputContainer}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="Contact Phone"
            placeholder="+91-XXXXXXXXXX"
            value={formData.contactPhone}
            onChangeText={(value) => updateFormData("contactPhone", value)}
            containerStyle={styles.inputContainer}
            keyboardType="phone-pad"
          />

          <TextInput
            label="Google Maps Link"
            placeholder="https://maps.app.goo.gl/..."
            value={formData.googleMapsLink}
            onChangeText={(value) => updateFormData("googleMapsLink", value)}
            containerStyle={styles.inputContainer}
            keyboardType="url"
            autoCapitalize="none"
          />
        </>
      )}
    </>
  );

  const renderFormSection = (title: string, children: React.ReactNode) => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={SolanaColors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Business</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <MaterialIcons name="store" size={48} color={SolanaColors.primary} />
          <Text style={styles.heroTitle}>Join NearMe</Text>
          <Text style={styles.heroSubtitle}>
            {registrationMode === "auto"
              ? "Paste your Google Maps link and wallet address - we'll handle the rest!"
              : "Start accepting crypto payments and reach customers in your area"}
          </Text>
        </View>

        {/* Tab Selector */}
        {renderTabSelector()}

        {/* Conditional Content Based on Mode */}
        {registrationMode === "auto"
          ? renderAutoModeContent()
          : renderManualModeContent()}

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Button
            title={loading ? "Submitting..." : "Submit Registration"}
            onPress={handleSubmit}
            disabled={
              loading ||
              (registrationMode === "auto" && !autoFillSuccess) ||
              (registrationMode === "manual" && !location)
            }
            loading={loading}
            variant="primary"
          />

          <Text style={styles.submitNote}>
            {registrationMode === "auto"
              ? "Your business details will be auto-filled from Google Maps. Just add your wallet address!"
              : "Your registration will be reviewed and you'll be notified once approved"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SolanaColors.background.primary,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.layout.screenPadding,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: SolanaColors.border.secondary,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SolanaColors.background.secondary,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
  },

  headerSpacer: {
    width: 40,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Spacing.layout.screenPadding,
    paddingTop: Spacing.xl,
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    marginBottom: Spacing["2xl"],
  },

  heroTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  heroSubtitle: {
    fontSize: Typography.fontSize.base,
    color: SolanaColors.text.secondary,
    textAlign: "center",
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    paddingHorizontal: Spacing.lg,
  },

  // Location Card
  locationCard: {
    backgroundColor: SolanaColors.background.card,
    borderRadius: Spacing.borderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing["2xl"],
    borderWidth: 2,
    borderColor: SolanaColors.primary + "20",
  },

  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  locationTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
    marginLeft: Spacing.sm,
    flex: 1,
  },

  requiredBadge: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: SolanaColors.status.error,
    backgroundColor: SolanaColors.status.error + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.sm,
  },

  locationContent: {
    alignItems: "center",
  },

  locationStatusText: {
    fontSize: Typography.fontSize.base,
    color: SolanaColors.text.secondary,
    marginLeft: Spacing.sm,
  },

  locationSuccessContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },

  locationSuccessText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: SolanaColors.status.success,
    marginLeft: Spacing.sm,
  },

  locationCoords: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.tertiary,
    fontFamily: "monospace",
    marginBottom: Spacing.md,
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },

  retryButtonText: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    marginLeft: Spacing.xs,
  },

  locationErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },

  locationErrorText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: SolanaColors.status.error,
    marginLeft: Spacing.sm,
  },

  locationHelpText: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },

  getLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SolanaColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.lg,
  },

  getLocationButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: SolanaColors.white,
    marginLeft: Spacing.sm,
  },

  // Form Sections
  formSection: {
    marginBottom: Spacing["3xl"],
  },

  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.xl,
  },

  inputContainer: {
    marginBottom: Spacing.xl,
  },

  // Tab Selector
  tabSelector: {
    flexDirection: "row",
    backgroundColor: SolanaColors.background.secondary,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing["2xl"],
    marginHorizontal: Spacing.xs,
  },

  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    gap: Spacing.sm,
  },

  activeTabButton: {
    backgroundColor: SolanaColors.primary,
    shadowColor: SolanaColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  tabButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: SolanaColors.text.secondary,
  },

  activeTabButtonText: {
    color: SolanaColors.white,
    fontWeight: Typography.fontWeight.bold,
  },

  // Auto Mode Styles
  fetchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SolanaColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },

  fetchButtonText: {
    color: SolanaColors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },

  fetchingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: SolanaColors.primary + "10",
    borderRadius: Spacing.borderRadius.md,
    gap: Spacing.sm,
  },

  fetchingText: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.primary,
    fontWeight: Typography.fontWeight.medium,
  },

  successIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: SolanaColors.status.success + "15",
    borderRadius: Spacing.borderRadius.md,
    gap: Spacing.sm,
  },

  successText: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.status.success,
    fontWeight: Typography.fontWeight.medium,
  },

  businessPreview: {
    backgroundColor: SolanaColors.background.card,
    borderRadius: Spacing.borderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: SolanaColors.status.success + "30",
  },

  previewTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },

  previewContent: {
    gap: Spacing.md,
  },

  previewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },

  previewLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.secondary,
    minWidth: 80,
  },

  previewValue: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.primary,
    flex: 1,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },

  // Submit Section
  submitSection: {
    marginTop: Spacing.xl,
    marginBottom: Spacing["2xl"],
  },

  submitNote: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
});

export default MerchantRegistrationScreen;
