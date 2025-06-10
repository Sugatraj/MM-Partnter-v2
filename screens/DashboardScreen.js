import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  RefreshControl,
  Clipboard,
  TextInput,
  FlatList,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { sendTestNotification } from "../utils/notifications";
import Header from "../components/Header";
import { PARTNER_BASE_URL, COMMON_BASE_URL, APP_VERSION } from "../apiConfig";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { checkForUpdates } from '../services/updateService';
import ManageRestaurants from "./ManageRestaurants";
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import axiosInstance from '../services/axiosConfig';
import { Picker } from '@react-native-picker/picker';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [totalOwners, setTotalOwners] = useState(0);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tokens, setTokens] = useState({ pushToken: "", sessionToken: "" });
  const [userData, setUserData] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Load fresh data when component mounts and when screen comes into focus
  useEffect(() => {
    // loadCounts();
    loadTokens();
    refreshRestaurants();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // loadCounts();
      refreshRestaurants();
    }, [])
  );

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedData = await AsyncStorage.getItem("userData");
        const parsedData = JSON.parse(storedData);
        console.log("Retrieved userData:", parsedData);
        setUserData(parsedData);
      } catch (error) {
        console.error("Error loading userData:", error);
      }
    };
    loadUserData();
  }, []);

  // useEffect(() => {
  //   const checkUpdates = async () => {
  //     if (!__DEV__) {
  //       await checkForUpdates(true); // Pass true to make the check silent
  //     }
  //   };
    
  //   // Check for updates when dashboard loads
  //   checkUpdates();
  // }, []);

  const loadTokens = async () => {
    try {
      const pushToken = await AsyncStorage.getItem("devicePushToken");
      const sessionToken = await AsyncStorage.getItem("sessionToken");
      setTokens({ pushToken, sessionToken });
    } catch (error) {
      console.error("Error loading tokens:", error);
    }
  };

  const showTokens = async () => {
    try {
      const pushToken = await AsyncStorage.getItem("devicePushToken");
      const sessionToken = await AsyncStorage.getItem("sessionToken");

      Alert.alert(
        "Device Tokens",
        `Push Token:\n${pushToken}\n\nSession Token:\n${sessionToken}`,
        [
          {
            text: "Copy",
            onPress: () => {
              const tokenText = `Push Token: ${pushToken}\nSession Token: ${sessionToken}`;
              Clipboard.setString(tokenText);
              Alert.alert("Success", "Tokens copied to clipboard!");
              console.log("Tokens:", tokenText);
            },
          },
          {
            text: "Close",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("Error showing tokens:", error);
      Alert.alert("Error", "Failed to load tokens");
    }
  };

  const handleNotificationPress = async () => {
    try {
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      if (!deviceToken) {
        Alert.alert("Error", "Device token not found");
        return;
      }

      const result = await sendTestNotification(deviceToken);

      if (result.success) {
        console.log("Notification sent successfully");
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      console.error("Notification error:", error);
      Alert.alert("Error", "Failed to send notification");
    }
  };
  

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // loadCounts().finally(() => setRefreshing(false));
  }, []);

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      (restaurant.name || "").toLowerCase().includes(query) ||
      (restaurant.mobile || "").toLowerCase().includes(query) ||
      (restaurant.outlet_code || "").toLowerCase().includes(query) ||
      (restaurant.ownerName || "").toLowerCase().includes(query)
    );

    const matchesStatus = filterStatus === 'all' ? true : 
      filterStatus === 'open' ? restaurant.isOpen === true : 
      restaurant.isOpen === false;

    const matchesActive = filterActive === 'all' ? true :
      filterActive === 'active' ? restaurant.outlet_status === true :
      restaurant.outlet_status === false;

    const matchesType = filterType === 'all' ? true :
      filterType === 'test' ? restaurant.account_type === 'test' :
      restaurant.account_type === 'live';

    return matchesSearch && matchesStatus && matchesActive && matchesType;
  });

  const renderItem = ({ item, index }) => {
    const capitalizeFirst = (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const handleCall = () => {
      if (item.mobile) {
        Linking.openURL(`tel:${item.mobile}`);
      }
    };

    return (
      <TouchableOpacity 
        style={[
          styles.card,
          index === restaurants.length - 1 && styles.lastCard
        ]}
        onPress={() => {
          console.log('Navigating to ViewRestaurant with:', {
            restaurantId: item.id,
            outlet_code: item.outlet_code,
            owner_id: item.owner_id
          });
          navigation.navigate('RestaurantStack', {
            screen: 'ViewRestaurant',
            params: {
              restaurantId: item.id,
              outlet_code: item.outlet_code,
              owner_id: item.owner_id,
              outlet_id: item.id
            }
          });
        }}
      >
        <View style={styles.cardContent}>
          {/* Outlet Name */}
          <View style={styles.outletNameRow}>
            <Text style={styles.outletName}>{capitalizeFirst(item.name)}</Text>
          </View>

          {/* Owner Name */}
          <View style={styles.ownerRow}>
            <FontAwesome name="user-o" size={16} color="#666" />
            <Text style={styles.ownerName}>{capitalizeFirst(item.ownerName)}</Text>
          </View>

          {/* Status and Call Button Row */}
          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.statusText,
                { color: item.isOpen === true ? "#28a745" : "#000" }
              ]}
            >
              {item.isOpen === true ? "Open" : "Closed"}
            </Text>
            <TouchableOpacity onPress={handleCall} style={styles.callButton}>
              <View style={styles.callButtonContent}>
                <FontAwesome name="phone" size={18} color="#67B279" />
                <Text style={styles.callButtonText}>Call</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const refreshRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the access token from AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      const parsedUserData = JSON.parse(userData);
      const accessToken = parsedUserData?.access_token;

      if (!accessToken) {
        throw new Error('Access token not found');
      }

      // Make the API call with authorization header
      const response = await axiosInstance.get(
        `${PARTNER_BASE_URL}/manage/restaurant/list`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log("Restaurant List API Response:", response.data);

      // Check if we have data in the response
      if (response.data.data && Array.isArray(response.data.data)) {
        const transformedData = response.data.data.map((restaurant) => ({
          id: restaurant.outlet_id,
          outlet_code: restaurant.outlet_code,
          owner_id: restaurant.owner_id,
          name: restaurant.name,
          mobile: restaurant.mobile,
          outlet_status: restaurant.outlet_status,
          ownerName: restaurant.owner_name,
          isOpen: restaurant.is_open,
          fssainumber: restaurant.fssainumber,
          gstnumber: restaurant.gstnumber
        }));

        console.log("Transformed Restaurant Data:", transformedData);
        setRestaurants(transformedData);
      } else {
        setError("No restaurants found");
      }
    } catch (err) {
      console.error("API Error:", err);
      if (
        err.response?.status === 401 ||
        err.response?.data?.code === "token_not_valid" ||
        err.response?.data?.detail?.includes("token not valid")
      ) {
        // Handle unauthorized access - usually redirect to login
        await handleUnauthorized();
      } else if (err.message === 'Access token not found') {
        // Handle missing token - redirect to login
        await handleUnauthorized();
      } else {
        setError(err.message || "Failed to load restaurants");
      }
    } finally {
      setLoading(false);
    }
  };

  const FilterSection = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterRow}>
        {/* Status Filter Dropdown */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.pickerWrapper}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterStatus}
                onValueChange={(value) => setFilterStatus(value)}
                style={styles.picker}
                dropdownIconColor="#666"
                mode="dropdown"
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Open" value="open" />
                <Picker.Item label="Closed" value="closed" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Active/Inactive Filter Dropdown */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Outlet</Text>
          <View style={styles.pickerWrapper}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterActive}
                onValueChange={(value) => setFilterActive(value)}
                style={styles.picker}
                dropdownIconColor="#666"
                mode="dropdown"
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Active" value="active" />
                <Picker.Item label="Inactive" value="inactive" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Account Type Filter Dropdown */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Type</Text>
          <View style={styles.pickerWrapper}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterType}
                onValueChange={(value) => setFilterType(value)}
                style={styles.picker}
                dropdownIconColor="#666"
                mode="dropdown"
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Test" value="test" />
                <Picker.Item label="Live" value="live" />
              </Picker>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header title="Dashboard" showBack={false} showMenu={true} />
        <SafeAreaView
          style={styles.safeArea}
          edges={["right", "bottom", "left"]}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
          ) : (
            <FlatList
              data={filteredRestaurants}
              renderItem={renderItem}
              keyExtractor={(item) => `restaurant-${item.outlet_code}-${item.id}`}
              style={styles.list}
              numColumns={2}
              columnWrapperStyle={styles.row}
              refreshing={refreshing}
              onRefresh={onRefresh}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              ListHeaderComponent={
                <>
                  <View style={styles.tilesContainer}>
                    <TouchableOpacity style={styles.tile}>
                      <Text style={styles.tileNumber}>
                        {userData?.total_owners || 0}
                      </Text>
                      <Text style={styles.tileText}>Total Owners</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tile}>
                      <Text style={styles.tileNumber}>
                        {userData?.total_outlets || 0}
                      </Text>
                      <Text style={styles.tileText}>Total Outlets</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.outletSection}>
                    <View style={styles.searchContainer}>
                      <View style={styles.searchBar}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search outlets, orders, etc."
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          placeholderTextColor="#999"
                          autoCorrect={false}
                          clearButtonMode="while-editing"
                          returnKeyType="search"
                          blurOnSubmit={false}
                        />
                        <FontAwesome name="search" size={20} color="#666" style={styles.searchIcon} />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setSearchQuery("")}
                            style={styles.clearButton}
                          >
                            <FontAwesome6 name="times-circle" size={18} color="#999" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <FilterSection />
                    </View>

                    {error && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={refreshRestaurants}>
                          <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </>
              }
            />
          )}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  callButton: {
    padding: 8,
    borderRadius: 8,
    // backgroundColor: '#f8f8f8',
    minWidth: 80,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  callButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callButtonText: {
    fontSize: 13,
    color: '#67B279',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  tilesContainer: {
    flexDirection: "row",
    padding: 16,
    justifyContent: "space-between",
  },
  tile: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "48%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tileNumber: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  tileText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  tokenButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flexGrow: 1,
  },
  versionText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  outletSection: {
    flex: 1,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 45,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  searchIcon: {
    marginLeft: 10,
  },
  clearButton: {
    padding: 5,
    marginLeft: 5,
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#dc3545",
    marginBottom: 10,
  },
  retryText: {
    color: "#0066cc",
    textDecorationLine: "underline",
  },
  loader: {
    marginTop: 20,
  },
  list: {
    flex: 1,
    paddingHorizontal: 8,
  },
  row: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    marginVertical: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '48%',
  },
  cardContent: {
    padding: 16,
  },
  outletNameRow: {
    marginBottom: 12,
  },
  outletName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  ownerName: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto', // Pushes the bottom row to the end
    paddingTop: 12,
    // borderTopWidth: 1,
    // borderTopColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  lastCard: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 2,
  },
  filterGroup: {
    flex: 1,
    minWidth: '10%',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  pickerWrapper: {
    flex: 1,
    minWidth: 100,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'scroll',
    height: 45,
  },
  picker: {
    height: 45,
    width: '100%',
    color: '#333',
    fontSize: 14,
    marginLeft: -8,
    marginRight: -8,
  },
});  

