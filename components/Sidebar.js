import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome6, FontAwesome } from "@expo/vector-icons";
import { Ionicons } from '@expo/vector-icons';
import { COMMON_BASE_URL, APP_VERSION } from "../apiConfig";

const Sidebar = ({ navigation }) => {
  const websiteUrl = 'https://menumitra.com';

  // Debug function to log available routes
  const logNavigationState = () => {
    try {
      const state = navigation.getState();
      console.log('Available routes:', state.routeNames);
      console.log('Current route:', state.routes[state.index].name);
    } catch (error) {
      console.error('Error logging navigation state:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("accessToken");
            const deviceToken = await AsyncStorage.getItem("devicePushToken");
            // Get user data from AsyncStorage
            const userData = await AsyncStorage.getItem("userData");
            const parsedUserData = JSON.parse(userData);

            // Call logout API
            const response = await fetch(`${COMMON_BASE_URL}/logout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                user_id: parsedUserData?.user_id,
                role: "partner",
                app: "partner",
                device_token: deviceToken
              }),
            });

            const data = await response.json();

            if (data.st === 1) {
              // Clear AsyncStorage and navigate to login
              await AsyncStorage.multiRemove([
                "userData", 
                "sessionToken",  // device_sessid
                "devicePushToken"  // fcm_token
              ]);
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } else {
              Alert.alert("Error", data.msg || "Failed to logout. Please try again.");
            }
          } catch (error) {
            console.error("Error during logout:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };


  const navigateToScreen = (screenName) => {
    try {
      console.log(`Attempting to navigate to ${screenName}...`);
      
      switch (screenName) {
        case 'Home':
          navigation.navigate('MainTabs', { screen: 'Home' });
          break;
        case 'ManageOutlets':
          navigation.navigate('MainTabs', { screen: 'ManageOutlets' });
          break;
        case 'ManageOwners':
          navigation.navigate('MainTabs', { screen: 'ManageOwner' });
          break;
        default:
          navigation.navigate('MainTabs', { screen: screenName });
      }
      
      navigation.closeDrawer();
      console.log(`Navigation attempt to ${screenName} completed`);
    } catch (error) {
      console.error(`Error navigating to ${screenName}:`, error);
      logNavigationState();
    }
  };

  const menuItems = [
    {
      label: "Home",
      icon: "house",
      onPress: () => {
        console.log("Home menu item pressed");
        navigateToScreen("Home");
      },
    },
    // {
    //   label: "Manage Outlets",
    //   icon: "building",
    //   onPress: () => {
    //     console.log("Manage Outlets menu item pressed");
    //     navigateToScreen("ManageOutlets");
    //   },
    // },
    // {
    //   label: "Manage Owners",
    //   icon: "users",
    //   onPress: () => {
    //     console.log('Manage Owners menu item pressed');
    //     navigateToScreen('ManageOwners');
    //   },
    // },
    {
      label: "Logout",
      icon: "arrow-right-from-bracket",
      onPress: handleLogout,
      color: "#FF4B4B",
    },
  ];

  // Log available routes when component mounts
  React.useEffect(() => {
    logNavigationState();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MenuMitra Partner</Text>
        <TouchableOpacity
          onPress={() => navigation.closeDrawer()}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome6 name="xmark" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              item.label === "Logout" && styles.logoutButton,
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name={item.icon}
              size={20}
              color={item.color || "#67B279"}
            />
            <View style={styles.menuTextContainer}>
              <Text
                style={[styles.menuText, item.color && { color: item.color }]}
              >
                {item.label}
              </Text>
              {item.description && (
                <Text style={styles.menuDescription}>{item.description}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer Section - Fixed at bottom */}
      <View style={styles.footer}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/menumitra-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>MenuMitra</Text>
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
              )
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome6 name="facebook" size={28} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL("https://www.instagram.com/menumitra/")
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome6 name="instagram" size={28} color="#E4405F" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL("https://www.youtube.com/@menumitra")
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome6 name="youtube" size={28} color="#FF0000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://x.com/MenuMitra")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome6 name="x-twitter" size={28} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.poweredByContainer}>
          <View style={styles.poweredByRow}>
            <FontAwesome name="flash" size={12} color="gray" />
            <Text style={styles.poweredByText}>Powered by</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://www.shekruweb.com")}
            activeOpacity={0.7}
          >
            <Text style={styles.companyText}>Shekru Labs India Pvt. Ltd.</Text>
          </TouchableOpacity>
          
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>version {APP_VERSION}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  menuContainer: {
    padding: 15,
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
    backgroundColor: "#fff",
    width: '100%',
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logo: {
    width: 35,
    height: 35,
  },
  logoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
    marginLeft: 8,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 16,
  },
  poweredByContainer: {
    alignItems: 'center',
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: 'gray',
    marginLeft: 4,
  },
  companyText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginBottom: 4,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 4,
  },
  logoutButton: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 20,
  },
  menuDescription: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },
});

export default Sidebar;
