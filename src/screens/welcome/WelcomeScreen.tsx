import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Image,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../lib/types";
import { SolanaColors, Typography, Spacing } from "../../lib/theme";
import { Button } from "../../components/ui";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/MaterialIcons";

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Welcome"
>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const features = [
  {
    icon: "location-on",
    title: "Discover Nearby",
    description: "Find crypto-friendly merchants around you",
    delay: 500,
  },
  {
    icon: "flash-on",
    title: "Fast Payments",
    description: "Pay with SOL or USDC in seconds",
    delay: 650,
  },
  {
    icon: "stars",
    title: "Earn Rewards",
    description: "Get SOL cashback and NFT badges",
    delay: 800,
  },
];

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // Subtle float animation for the logo
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Hero */}
      <View style={styles.heroSection}>
        <Animated.View
          entering={FadeInDown.duration(700).easing(Easing.out(Easing.cubic))}
          style={logoAnimStyle}
        >
          <Image
            source={require("../../../assets/logo3D.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.cubic))}
          style={styles.title}
        >
          Welcome to NearMe
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.duration(600).delay(350).easing(Easing.out(Easing.cubic))}
          style={styles.subtitle}
        >
          Discover local merchants and pay seamlessly with Solana
        </Animated.Text>
      </View>

      {/* Features */}
      <View style={styles.featuresSection}>
        <Animated.Text
          entering={FadeIn.duration(500).delay(450)}
          style={styles.featuresTitle}
        >
          Why NearMe?
        </Animated.Text>

        <View style={styles.featuresContainer}>
          {features.map((f) => (
            <Animated.View
              key={f.icon}
              entering={FadeInDown.duration(500).delay(f.delay).easing(Easing.out(Easing.cubic))}
              style={styles.featureCard}
            >
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={26} color={SolanaColors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDescription}>{f.description}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <Animated.View
        entering={FadeInUp.duration(600).delay(950).easing(Easing.out(Easing.cubic))}
        style={styles.ctaSection}
      >
        <Button
          title="Start Exploring"
          onPress={() => navigation.navigate("Main")}
          size="large"
          fullWidth
        />
        <TouchableOpacity
          onPress={() => Linking.openURL("https://solana.com")}
          activeOpacity={0.6}
        >
          <Text style={styles.footerText}>Powered by Solana</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SolanaColors.background.primary,
    paddingHorizontal: Spacing.layout.screenPadding,
  },

  // Hero
  heroSection: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SolanaColors.background.secondary,
    borderRadius: 28,
    marginTop: Spacing.lg,
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing["2xl"],
  },

  logoImage: {
    width: 200,
    height: 200,
    marginBottom: Spacing.xl,
  },

  title: {
    fontSize: Typography.fontSize["3xl"],
    fontWeight: Typography.fontWeight.bold,
    color: SolanaColors.secondary,
    textAlign: "center",
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: Typography.fontSize.base,
    color: SolanaColors.text.secondary,
    textAlign: "center",
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    paddingHorizontal: Spacing.lg,
  },

  // Features
  featuresSection: {
    flex: 3,
    justifyContent: "center",
    paddingTop: Spacing["2xl"],
  },

  featuresTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.lg,
  },

  featuresContainer: {
    gap: Spacing.md,
  },

  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SolanaColors.background.card,
    borderRadius: Spacing.borderRadius.xl,
    padding: Spacing.lg,
  },

  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SolanaColors.background.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: SolanaColors.text.primary,
    marginBottom: Spacing.xs,
  },

  featureDescription: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.secondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },

  // CTA
  ctaSection: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },

  footerText: {
    fontSize: Typography.fontSize.sm,
    color: SolanaColors.text.tertiary,
    textAlign: "center",
  },
});

export default WelcomeScreen;
