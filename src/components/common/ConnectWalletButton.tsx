import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { showMessage } from "react-native-flash-message";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useAuthorization } from "../../providers/AppProviders";
import { SolanaColors, Typography, Spacing } from "../../lib/theme";
import { logger } from "../../lib/utils/logger";

const FILE_NAME = "ConnectWalletButton.tsx";

export function ConnectWalletButton() {
  const { authorization, connect, disconnect, isConnecting } =
    useAuthorization();

  const handlePress = async () => {
    if (authorization) {
      try {
        logger.info(FILE_NAME, "Disconnecting wallet");
        await disconnect();
        showMessage({
          message: "Wallet Disconnected",
          description: "Your wallet has been disconnected",
          type: "danger",
          style: { backgroundColor: "#c0392b" },
          titleStyle: { color: "#ffffff", fontWeight: "700" },
          textStyle: { color: "#ffffff" },
          duration: 2500,
          animated: true,
        });
      } catch (error) {
        logger.error(FILE_NAME, "Failed to disconnect wallet", error);
        showMessage({
          message: "Error",
          description: "Failed to disconnect from wallet",
          type: "danger",
          duration: 3000,
        });
      }
    } else {
      try {
        logger.info(FILE_NAME, "Connecting wallet");
        await connect();
        showMessage({
          message: "Wallet Connected",
          description: "Your wallet has been successfully connected",
          type: "success",
          backgroundColor: "#27ae60",
          duration: 2500,
          icon: "success",
          animated: true,
        });
      } catch (error) {
        logger.error(FILE_NAME, "Failed to connect wallet", error);
        showMessage({
          message: "Connection Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to connect to wallet",
          type: "danger",
          duration: 3000,
        });
      }
    }
  };

  const getButtonContent = () => {
    if (isConnecting) {
      return {
        icon: "refresh" as const,
        text: "Connecting...",
        style: styles.connecting,
      };
    }

    if (authorization) {
      return {
        icon: "link-off" as const,
        text: "Disconnect Wallet",
        style: styles.connected,
      };
    }

    return {
      icon: "account-balance-wallet" as const,
      text: "Connect Wallet",
      style: styles.disconnected,
    };
  };

  const buttonContent = getButtonContent();

  return (
    <TouchableOpacity
      style={[styles.button, buttonContent.style]}
      onPress={handlePress}
      disabled={isConnecting}
    >
      <Icon
        name={buttonContent.icon}
        size={20}
        color={SolanaColors.white}
        style={styles.buttonIcon}
      />
      <Text style={styles.buttonText}>{buttonContent.text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    alignItems: "center",
    marginVertical: Spacing.sm,
    flexDirection: "row",
    justifyContent: "center",
  },
  connected: {
    backgroundColor: SolanaColors.status.error,
  },
  disconnected: {
    backgroundColor: SolanaColors.primary,
  },
  connecting: {
    backgroundColor: SolanaColors.secondary,
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonText: {
    color: SolanaColors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
