// CRITICAL: Import polyfills FIRST - before any other imports
import "./polyfills";

import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StatusBar as RNStatusBar } from "react-native";
import FlashMessage from "react-native-flash-message";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AppProviders } from "./src/providers/AppProviders";
import { locationService } from "./src/lib/services/locationService";
import { logger } from "./src/lib/utils/logger";
import { initializeFirebase } from "./src/lib/firebase/config";
import { runFirebaseDiagnostics } from "./src/lib/utils/firebaseDiagnostics";
import { LogBox } from "react-native";

LogBox.ignoreAllLogs();

const FILE_NAME = "App.tsx";

export default function App() {
  useEffect(() => {
    logger.info(FILE_NAME, "App starting up");

    // Initialize Firebase first
    const initializeApp = async () => {
      try {
        logger.info(FILE_NAME, "App initialization starting...");

        // Run diagnostics first
        runFirebaseDiagnostics();

        logger.info(FILE_NAME, "Initializing Firebase...");
        const firebaseResult = await initializeFirebase();

        if (firebaseResult.success) {
          logger.info(FILE_NAME, "Firebase initialized successfully");
        } else {
          logger.warn(
            FILE_NAME,
            "Firebase initialization failed",
            firebaseResult.error
          );
          logger.warn(FILE_NAME, "App will use mock data for development");
        }
      } catch (error) {
        logger.error(
          FILE_NAME,
          "Unexpected error during Firebase initialization",
          error
        );
      }
    };

    const requestLocation = async () => {
      try {
        logger.info(FILE_NAME, "Requesting location permission");
        const hasPermission = await locationService.requestLocationPermission();

        if (!hasPermission) {
          logger.warn(
            FILE_NAME,
            "Location permission not granted, showing alert"
          );
          await locationService.showLocationPermissionAlert();
        } else {
          logger.info(FILE_NAME, "Location permission granted");
        }
      } catch (error) {
        logger.error(FILE_NAME, "Location permission error", error);
      }
    };

    // Initialize app components in sequence
    const initializeAppSequence = async () => {
      await initializeApp();
      await requestLocation();
    };

    initializeAppSequence();
  }, []);

  return (
    <AppProviders>
      <StatusBar style="light" backgroundColor="#1a1a1a" />
      <AppNavigator />
      <FlashMessage
        position="bottom"
        style={{ borderRadius: 16, marginHorizontal: 16, marginBottom: 24 }}
        titleStyle={{ fontWeight: '700', fontSize: 15 }}
        textStyle={{ fontSize: 13, opacity: 0.9 }}
        animationDuration={400}
        floating={true}
      />
    </AppProviders>
  );
}
