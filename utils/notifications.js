import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

// Configure notification handler for both foreground and background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export const setupNotifications = async () => {
  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      enableVibrate: true,
      enableLights: true,
      sound: "default", // Use system default sound
    });
  }
};

export const getDeviceToken = async () => {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    // Ensure notifications are properly setup
    await setupNotifications();

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a", // Make sure to use your Expo project ID
    });

    // Store token in AsyncStorage
    await AsyncStorage.setItem("devicePushToken", token.data);
    console.log("Push token:", token.data);

    return token.data;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
};

export const addNotificationListener = (callback) => {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
};

export const addNotificationResponseListener = (callback) => {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
};

export const sendTestNotification = async (deviceToken) => {
  try {
    // First, ensure notifications are set up
    await setupNotifications();

    // Schedule a local notification immediately
    const localNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 MenuMitra Notification",
        body: "This is a test notification",
        data: { screen: "Dashboard" },
        sound: "default",
        priority: "high",
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // null means show immediately
    });

    console.log("Local notification scheduled:", localNotificationId);

    // Also send a push notification
    const pushNotificationData = {
      to: deviceToken,
      title: "🔔 MenuMitra Notification",
      body: "This is a test notification",
      sound: "default",
      priority: "high",
      data: { screen: "Dashboard" },
      channelId: "default",
      android: {
        priority: "high",
        sound: "default",
        vibrate: [0, 250, 250, 250],
        channelId: "default",
        notification: {
          color: "#FF231F7C",
          priority: "high",
        },
      },
    };

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
        "Authorization": "key=YOUR_FCM_SERVER_KEY" // Replace with your FCM server key
      },
      body: JSON.stringify({
        to: deviceToken,
        notification: {
          title: pushNotificationData.title,
          body: pushNotificationData.body,
          sound: "default",
          priority: "high"
        },
        data: pushNotificationData.data
      }),
    });

    const result = await response.json();
    console.log("Push notification result:", result);

    // Store in Firebase
    if (db) {
      await addDoc(collection(db, "partner_notifications"), {
        ...pushNotificationData,
        isRead: false,
        createdAt: serverTimestamp(),
        deviceToken: deviceToken,
        status: result.data?.status === "ok" ? "sent" : "failed",
      });
    }

    return {
      success: true,
      message: "Notifications sent successfully",
      localNotificationId,
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      message: "Failed to send notification",
      error: error.message,
    };
  }
};
