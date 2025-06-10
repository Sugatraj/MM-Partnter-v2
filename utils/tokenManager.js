import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from 'expo-constants';

export async function generateAndStoreTokens() {
  try {
    // Generate session token
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let sessionToken = "";
    for (let i = 0; i < 20; i++) {
      sessionToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let pushToken = null;

    // Only try to get push token on mobile devices
    if (Platform.OS !== "web") {
      try {
        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig.extra.eas.projectId,
        });
        pushToken = tokenResult.data;
      } catch (error) {
        console.error("Push token error:", error);
        // Generate a fallback token for mobile
        pushToken = `MOBILE_${Math.random().toString(36).substring(2, 15)}`;
      }
    } else {
      // For web, use a web identifier
      pushToken = `WEB_${Math.random().toString(36).substring(2, 15)}`;
    }

    // Store tokens
    await AsyncStorage.multiSet([
      ["sessionToken", sessionToken],
      ["devicePushToken", pushToken || ""]
    ]);

    console.log("Generated Tokens:", {
      pushToken: pushToken || "Fallback token generated",
      sessionToken,
    });

    return {
      pushToken,
      sessionToken,
    };
  } catch (error) {
    console.error("Token generation error:", error);
    // Generate fallback tokens to ensure login still works
    const fallbackSessionToken = Math.random().toString(36).substring(2, 22);
    const fallbackPushToken = `FALLBACK_${Math.random().toString(36).substring(2, 15)}`;
    
    try {
      await AsyncStorage.multiSet([
        ["sessionToken", fallbackSessionToken],
        ["devicePushToken", fallbackPushToken]
      ]);
    } catch (storageError) {
      console.error("Storage error:", storageError);
    }

    return {
      pushToken: fallbackPushToken,
      sessionToken: fallbackSessionToken
    };
  }
}

// Add a helper function to check if push notifications are needed
export function requiresPushToken() {
  return Platform.OS !== "web";
}

// Add a helper function to validate tokens
export async function validateTokens() {
  try {
    const sessionToken = await AsyncStorage.getItem("sessionToken");
    if (!sessionToken) {
      return false;
    }

    // Only check push token on mobile
    if (Platform.OS !== "web") {
      const pushToken = await AsyncStorage.getItem("devicePushToken");
      if (!pushToken) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error validating tokens:", error);
    return false;
  }
}
