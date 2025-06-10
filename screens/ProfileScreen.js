import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import Header from "../components/Header";
import { PARTNER_BASE_URL, COMMON_BASE_URL, APP_VERSION } from "../apiConfig";
import axios from "axios";

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle unauthorized access (401)
  const handleUnauthorized = async () => {
    try {
      // Clear all auth-related data from storage
      await AsyncStorage.multiRemove(['accessToken', 'userData', 'refreshToken']);
      
      // Reset navigation stack to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const storedData = await AsyncStorage.getItem("userData");
      const parsedData = JSON.parse(storedData);

      if (!deviceToken) {
        console.error('Device token not found');
        return;
      }

      // Fetch updated profile data from API with device token
      const response = await axios.post(
        `${COMMON_BASE_URL}/view_profile_detail`,
        {
          user_id: parsedData.user_id,
          device_token: deviceToken
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log('Full API Response:', JSON.stringify(response.data, null, 2));
      if (response.data.st === 1) {
        // Map API response to match existing UI structure
        const userDetails = response.data.Data?.user_details;
        console.log('User Details:', userDetails);
        if (userDetails) {
          const updatedUserData = {
            ...parsedData,
            name: userDetails.name,
            role: userDetails.role,
            dob: userDetails.dob,
            email: userDetails.email || "-",
            mobile: userDetails.mobile_number,
            aadhar_number: userDetails.aadhar_number,
            created_on: formatDateTime(userDetails.created_on),
            updated_on: formatDateTime(userDetails.updated_on),
            created_by: userDetails.created_by,
            updated_by: userDetails.updated_by,
            lastLogin: formatDateTime(userDetails.last_login),
          };

          setUserData(updatedUserData);
        } else {
          console.error('No user details found in API response');
        }
      }
      if (
        response.status === 401 || 
        response.data?.code === 'token_not_valid' ||
        response.data?.detail?.includes('token not valid')
      ) {
        await AsyncStorage.multiRemove(['accessToken', 'userData', 'refreshToken']);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await AsyncStorage.multiRemove(['accessToken', 'userData', 'refreshToken']);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }
    } finally {
      setLoading(false);
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
            const userData = await AsyncStorage.getItem("userData");
            const parsedUserData = JSON.parse(userData);

            const response = await fetch(`${COMMON_BASE_URL}/logout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                user_id: parsedUserData?.user_id,
                role: "partner",
                app: "partner"
              }),
            });

            const data = await response.json();

            if (data.st === 1) {
              await AsyncStorage.multiRemove(['accessToken', 'userData', 'refreshToken']);
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } else {
              // Check for 401 unauthorized in error response
              if (
                response.status === 401 || 
                data.code === 'token_not_valid' ||
                (data.detail && data.detail.includes('token not valid'))
              ) {
                await AsyncStorage.multiRemove(['accessToken', 'userData', 'refreshToken']);
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
                return;
              }
              Alert.alert("Error", data.msg || "Failed to logout. Please try again.");
            }
          } catch (error) {
            console.error("Error during logout:", error);
            // Check for 401 in catch block
            if (
              error.response?.status === 401 || 
              error.response?.data?.code === 'token_not_valid' ||
              error.response?.data?.detail?.includes('token not valid')
            ) {
              await AsyncStorage.multiRemove(['accessToken', 'userData', 'refreshToken']);
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
              return;
            }
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      // Handle date format like "24-Jan-2025"
      const parts = dateString.split("-");
      if (parts.length === 3) {
        return dateString; // Return as is since it's already in the desired format
      }

      // Handle date format like "2025-01-24"
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString || ""; // Return original string if parsing fails
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    try {
      // Handle format like "31 Jan 2025 08:00:25 PM" or "11-Feb-2025 03:46:08 PM"
      const cleanDateString = dateString.replace(/-/g, ' '); // Convert hyphens to spaces
      const parts = cleanDateString.match(/(\d+)\s+(\w+)\s+(\d+)\s+(\d+):(\d+):\d+\s+(AM|PM)/i);
      
      if (parts) {
        const [_, day, month, year, hours, minutes, ampm] = parts;
        return `${day.padStart(2, '0')}-${month}-${year} ${hours}:${minutes} ${ampm}`;
      }

      return dateString; // Return original if parsing fails
    } catch (error) {
      console.error("DateTime formatting error:", error);
      return dateString || ""; // Return original string if parsing fails
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#67B279" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Profile"
        showBack={true}
        showMenu={false}
        rightComponent={
          <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
            <FontAwesome6
              name="arrow-right-from-bracket"
              size={24}
              color="#ff4444"
            />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {userData?.photo ? (
              <Image
                source={{ uri: userData.photo }}
                style={styles.profileImage}
              />
            ) : (
              <View
                style={[
                  styles.profileImagePlaceholder,
                  { backgroundColor: "#67B279" },
                ]}
              >
                <Text style={styles.profileLetterText}>
                  {userData?.name ? userData.name.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.name}>{userData?.name}</Text>
              <Text style={styles.role}>{userData?.role}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <InfoItem icon="phone" label="Mobile" value={userData?.mobile} />
          <InfoItem icon="envelope" label="Email" value={userData?.email} />
          <InfoItem
            icon="map-marker"
            label="Address"
            value={userData?.address}
          />
          <InfoItem
            icon="calendar"
            label="Date of Birth"
            value={userData?.dob}
          />
          <InfoItem
            icon="id-card"
            label="Aadhar Number"
            value={userData?.aadhar_number}
          />

          <InfoItem
            icon="clock-o"
            label="Created On"
            value={userData?.created_on}
          />
          <InfoItem
            icon="user"
            label="Created By"
            value={userData?.created_by || "-"}
          />
          <InfoItem
            icon="refresh"
            label="Updated On"
            value={userData?.updated_on || "-"}
          />
          <InfoItem
            icon="user"
            label="Updated By"
            value={userData?.updated_by || "-"}
          />
          <InfoItem
            icon="clock-o"
            label="Last Login"
            value={userData?.lastLogin || "-"}
          />
        </View>

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
            >
              <FontAwesome6 name="facebook" size={24} color="#1877F2" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://www.instagram.com/menumitra/")
              }
            >
              <FontAwesome6 name="instagram" size={24} color="#E4405F" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://www.youtube.com/@menumitra")
              }
            >
              <FontAwesome6 name="youtube" size={24} color="#FF0000" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://x.com/MenuMitra")}
            >
              <FontAwesome6 name="x-twitter" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <View style={styles.poweredByContainer}>
            <View style={styles.poweredByRow}>
              <FontAwesome name="flash" size={12} color="gray" />
              <Text style={styles.poweredByText}>Powered by</Text>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://www.shekruweb.com")}
            >
              <Text style={styles.companyText}>
                Shekru Labs India Pvt. Ltd.
              </Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>version {APP_VERSION}</Text>
            {/* <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.versionText}>Logout</Text>
            </TouchableOpacity> */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoIcon}>
      <FontAwesome name={icon} size={20} color="#67B279" />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  profileLetterText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },
  role: {
    fontSize: 16,
    color: "#67B279",
    textTransform: "capitalize",
  },
  infoSection: {
    padding: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  infoIcon: {
    width: 40,
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#1F2937",
  },
  logoutButton: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 30,
    borderRadius: 8,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    marginTop: 40,
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    gap: 32,
    marginBottom: 16,
  },
  poweredByContainer: {
    alignItems: "center",
  },
  poweredByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: "#6B7280",
  },
  companyText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginTop: 4,
  },
  versionText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
  },
  headerButton: {
    padding: 8,
  },
});
