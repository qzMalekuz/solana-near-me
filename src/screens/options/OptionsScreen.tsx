import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../lib/types";
import { SolanaColors, Typography, Spacing } from "../../lib/theme";
import { Card } from "../../components/ui";
import { UI_CONSTANTS } from "../../lib/utils/constants";
import Icon from "react-native-vector-icons/MaterialIcons";

type OptionsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Options"
>;

interface Props {
  navigation: OptionsScreenNavigationProp;
}

interface OptionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  showArrow?: boolean;
}

const OptionsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const handleBusinessRegistration = () => {
    navigation.navigate("MerchantRegistration");
  };

  const handleProfile = () => {
    navigation.navigate("UserProfile");
  };

  const handleReferrals = () => {
    navigation.navigate("Referral");
  };

  const handleFeedback = () => {
    // In a real app, this would open feedback form or email
    console.log("Feedback pressed");
  };

  const handleGitHub = () => {
    Linking.openURL("https://github.com/solana-labs");
  };

  const handleSolanaInfo = () => {
    Linking.openURL("https://solana.com");
  };

  const accountOptions: OptionItem[] = [
    {
      id: "profile",
      title: "Profile & Wallet",
      description: "Manage your account and wallet settings",
      icon: "person",
      onPress: handleProfile,
      showArrow: true,
    },
    {
      id: "referrals",
      title: "Network Rewards",
      description: "Build your network and earn from every action",
      icon: "group-add",
      onPress: handleReferrals,
      showArrow: true,
    },
  ];

  const businessOptions: OptionItem[] = [
    {
      id: "register",
      title: "Register Your Business",
      description: "Add your business to accept Solana payments",
      icon: "store",
      onPress: handleBusinessRegistration,
      showArrow: true,
    },
  ];

  const supportOptions: OptionItem[] = [
    {
      id: "feedback",
      title: "Send Feedback",
      description: "Help us improve the app",
      icon: "feedback",
      onPress: handleFeedback,
      showArrow: true,
    },
    {
      id: "github",
      title: "GitHub",
      description: "View the source code",
      icon: "code",
      onPress: handleGitHub,
      showArrow: true,
    },
    {
      id: "solana",
      title: "About Solana",
      description: "Learn more about Solana blockchain",
      icon: "info",
      onPress: handleSolanaInfo,
      showArrow: true,
    },
  ];

  const renderOptionSection = (title: string, options: OptionItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.sectionCard}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionItem,
              index < options.length - 1 && styles.optionItemBorder,
            ]}
            onPress={option.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Icon name={option.icon} size={24} color={SolanaColors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            {option.showArrow && (
              <Icon
                name="chevron-right"
                size={24}
                color={SolanaColors.text.secondary}
              />
            )}
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your account and preferences
          </Text>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <Card style={styles.infoCard}>
            <View style={styles.appInfo}>
              <View style={styles.appIcon}>
                <Image
                  source={require("../../../assets/logo3D.png")}
                  style={styles.appIconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.appDetails}>
                <Text style={styles.appName}>NearMe</Text>
                <Text style={styles.appVersion}>Version 1.0.0</Text>
                <Text style={styles.appDescription}>
                  Find and pay merchants with Solana
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Account Options */}
        {renderOptionSection("Account", accountOptions)}

        {/* Business Options */}
        {renderOptionSection("Business", businessOptions)}

        {/* Support Options */}
        {renderOptionSection("Support", supportOptions)}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Solana blockchain</Text>
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Spacing.layout.screenPadding,
    paddingBottom: UI_CONSTANTS.BOTTOM_TAB_HEIGHT + Spacing["2xl"],
  },

  // Header
  header: {
    paddingVertical: Spacing.xl,
    marginTop: Spacing.xl,
  },

  headerTitle: {
    fontSize: Typography.fontSize["2xl"],
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.xs,
  },

  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: SolanaColors.text.secondary,
    fontWeight: Typography.fontWeight.regular,
  },

  // Sections
  section: {
    marginBottom: Spacing["2xl"],
  },

  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: SolanaColors.text.secondary,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  sectionCard: {
    padding: 0,
    backgroundColor: SolanaColors.background.card,
  },

  // App Info Card
  infoCard: {
    padding: Spacing.xl,
    backgroundColor: SolanaColors.background.card,
  },

  appInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  appIcon: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: SolanaColors.background.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },

  appIconImage: {
    width: 120,
    height: 120,
  },

  appIconText: {
    fontSize: 32,
    color: SolanaColors.white,
  },

  appDetails: {
    flex: 1,
  },

  appName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.xs,
  },

  appVersion: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    marginBottom: Spacing.xs,
  },

  appDescription: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },

  // Option Items
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },

  optionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: SolanaColors.border.primary,
  },

  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SolanaColors.background.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },

  optionIconText: {
    fontSize: 20,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.xs,
  },

  optionDescription: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },

  optionArrow: {
    fontSize: 24,
    color: SolanaColors.text.tertiary,
    fontWeight: Typography.fontWeight.light,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },

  footerText: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.tertiary,
    fontWeight: Typography.fontWeight.regular,
  },
});

export default OptionsScreen;
