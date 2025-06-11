import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import Header from '../components/Header';
import { COMMON_BASE_URL } from '../apiConfig';
import AsyncStorage from "@react-native-async-storage/async-storage";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    return "-";
  }
};

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '';
  
  // Regular expression to match the date and time pattern
  const pattern = /(\d{2} \w{3} \d{4}) (\d{2}):(\d{2}):\d{2} (AM|PM)/;
  const match = dateTimeString.match(pattern);
  
  if (match) {
    const [_, date, hours, minutes, ampm] = match;
    return `${date} ${hours}:${minutes} ${ampm}`;
  }
  
  return dateTimeString; // Return original string if pattern doesn't match
};

export default function CategoryDetailsScreen({ route, navigation }) {
  const { menu_cat_id, outlet_id } = route.params;
  const [category, setCategory] = useState(null);
  const [menuList, setMenuList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadCategoryDetails();
    }, [menu_cat_id])
  );

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

  const loadCategoryDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataStr);

      if (!userData || !userData.user_id) {
        throw new Error('User ID not found in stored data');
      }

      const requestBody = {
        outlet_id: Number(outlet_id),
        menu_cat_id: Number(menu_cat_id),
        device_token: deviceToken,
        user_id: userData.user_id,
        app_source: "partner"
      };

      console.log("📤 Request Body:", requestBody);

      const response = await axios({
        method: 'post',
        url: `${COMMON_BASE_URL}/menu_category_view`,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Device-Token": deviceToken
        },
        data: requestBody
      });

      console.log("📥 Response Data:", response.data);

      // Check for 401 unauthorized first
      if (response.status === 401 || 
          response.data.code === 'token_not_valid' || 
          (response.data.detail && response.data.detail.includes('token not valid'))) {
        await handleUnauthorized();
        return;
      }

      // Check if response.data exists and has the data property
      if (!response.data || !response.data.data) {
        throw new Error(response.data?.Msg || "Invalid response format");
      }

      const responseData = response.data.data;

      // Validate required fields
      if (!responseData.menu_cat_id || !responseData.name) {
        throw new Error("Missing required category data");
      }

      const categoryData = {
        menu_cat_id: responseData.menu_cat_id,
        name: responseData.name,
        image: responseData.image || null,
        outlet_id: responseData.outlet_id,
        menu_count: responseData.menu_count || 0,
        created_on: responseData.created_on || "-",
        created_by: responseData.created_by || "-",
        updated_on: responseData.updated_on || "-",
        updated_by: responseData.updated_by || "-",
        is_active: responseData.is_active === 1, // Convert 1/0 to boolean
      };

      // Set menu list with validation
      const menuList = Array.isArray(responseData.menu_list) ? responseData.menu_list : [];
      
      setMenuList(menuList);
      setCategory(categoryData);
      
      console.log("✅ Category Set:", categoryData);
      console.log("✅ Menu List Set:", menuList);
      
    } catch (err) {
      console.error("❌ Load Category Error:", {
        message: err.message,
        details: err,
        response: err.response?.data // Log the response data for debugging
      });
      
      // Handle case where error response contains 401 unauthorized
      if (err.response?.status === 401 || 
          err.response?.data?.code === 'token_not_valid' ||
          err.response?.data?.detail?.includes('token not valid')) {
        await handleUnauthorized();
      } else {
        // Set more specific error message
        setError(err.response?.data?.Msg || err.message || "Failed to load category details");
      }
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to load data
  useEffect(() => {
    loadCategoryDetails();
  }, [outlet_id, menu_cat_id]); // Dependencies array

  // Add useEffect to log when parameters change
  useEffect(() => {
    console.log("🔄 Parameters Updated:", {
      outlet_id,
      menu_cat_id,
    });
  }, [outlet_id, menu_cat_id]);

  // Add useEffect to log when category changes
  useEffect(() => {
    console.log("🔄 Category State Updated:", category);
  }, [category]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleDeleteCategory}
          style={styles.headerButton}
        >
          <FontAwesome name="trash" size={24} color="#ff4444" />
        </TouchableOpacity>
      ),
      headerLeft: null,
    });
  }, [category]); // Depend on category to ensure we have the data

  const handleEditPress = () => {
    navigation.navigate("UpdateCategory", {
      menu_cat_id: category.menu_cat_id,
      categoryDetails: category,
    });
  };

  const handleDeleteCategory = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const userDataStr = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataStr);
      
      console.log('📱 UserData:', userData);
      
      if (!userData || !userData.user_id) {
        throw new Error('User ID not found in stored data');
      }

      Alert.alert(
        "Delete Category",
        "Are you sure you want to delete this category?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                setLoading(true);

                const requestBody = {
                  outlet_id: Number(category.outlet_id),
                  menu_cat_id: Number(category.menu_cat_id),
                  device_token: deviceToken,
                  user_id: userData.user_id,
                  app_source: "partner"
                };

                console.log("📤 Deleting category:", requestBody);

                const response = await fetch(
                  `${COMMON_BASE_URL}/menu_category_delete`,
                  {
                    method: "DELETE",
                    headers: {
                      Accept: "application/json",
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                      "Device-Token": deviceToken
                    },
                    body: JSON.stringify(requestBody),
                  }
                );

                console.log("📥 Response status:", response.status);
                const responseText = await response.text();
                console.log("📥 Response text:", responseText);

                let responseData;
                try {
                  responseData = JSON.parse(responseText);
                  console.log("📥 Parsed response:", responseData);
                } catch (parseError) {
                  console.error("📥 JSON Parse error:", parseError);
                  throw new Error('Invalid response from server');
                }

                if (responseData.st === 1) {
                  Alert.alert(
                    "Success",
                    responseData.Msg || "Category deleted successfully",
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          if (route.params?.onUpdate) {
                            route.params.onUpdate();
                          }
                          navigation.goBack();
                        }
                      }
                    ]
                  );
                } else {
                  throw new Error(responseData.msg || "Failed to delete category");
                }
              } catch (error) {
                console.error("Error in delete operation:", error);
                Alert.alert("Error", error.message || "Failed to delete category");
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error in delete category:", error);
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to delete category");
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadCategoryDetails().finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Category Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#67B279" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Category Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!category) {
    return (
      <View style={styles.container}>
        <Header title="Category Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Category not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Category Details" showBack={true} showMenu={true} />
      {loading ? (
        <ActivityIndicator size="large" color="#67B279" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : category ? (
        <>
          <ScrollView 
            style={styles.detailsContainer}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#67B279"]}
                tintColor="#67B279"
              />
            }
          >
            {/* Category Image */}
            {category.image ? (
              <Image
                source={{ uri: category.image }}
                style={styles.categoryImage}
                onError={(e) =>
                  console.log("Image loading error:", e.nativeEvent.error)
                }
              />
            ) : (
              <View style={styles.placeholderImage}>
                <FontAwesome name="image" size={50} color="#ccc" />
              </View>
            )}

            {/* Category Details */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{category.name}</Text>
              </View>

              {/* Status */}
              <View style={[styles.infoRow, styles.statusRow]}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusText, { color: category.is_active ? '#67B279' : '#ff4444' }]}>{category.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>

              {/* Menu Count - Only show if available */}
              {category.menu_count !== undefined && (
                <View style={[styles.infoRow, styles.menuCountRow]}>
                  <Text style={styles.label}>Menu Count</Text>
                  <View style={styles.menuCountContainer}>
                    <Text style={styles.menuCountText}>
                      {category.menu_count}
                    </Text>
                    <Text style={styles.menuCountLabel}>Menus</Text>
                  </View>
                </View>
              )}

              {/* Created Info */}
              <View style={styles.infoRow}>
                <Text style={styles.label}>Created On</Text>
                <Text style={styles.value}>
                  {formatDateTime(category.created_on)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Created By</Text>
                <Text style={styles.value}>{category.created_by}</Text>
              </View>

              {/* Updated Info */}
              <View style={styles.infoRow}>
                <Text style={styles.label}>Updated On</Text>
                <Text style={styles.value}>
                  {formatDateTime(category.updated_on)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Updated By</Text>
                <Text style={styles.value}>{category.updated_by}</Text>
              </View>
            </View>

            {/* Add Menu List Section */}
            {menuList.length > 0 && (
              <View style={styles.menuListContainer}>
                <Text style={styles.menuListTitle}>Menu Items</Text>
                {menuList.map((menu) => (
                  <View key={menu.menu_id} style={styles.menuItem}>
                    <View style={styles.menuItemHeader}>
                      <Text style={styles.menuName}>{menu.menu_name}</Text>
                      <Text style={styles.menuPrice}>₹{menu.price}</Text>
                    </View>
                    <Text style={[
                      styles.foodType,
                      { color: menu.food_type === 'veg' ? '#67B279' : '#ff4444' }
                    ]}>
                      {menu.food_type.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Delete Button - Moved inside ScrollView */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteCategory}
            >
              <FontAwesome name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Category</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Keep the floating edit button outside ScrollView */}
          <TouchableOpacity
            style={styles.floatingEditButton}
            onPress={handleEditPress}
          >
            <FontAwesome name="edit" size={24} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.noDataText}>No category details available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "50%",
    aspectRatio: 1,
    backgroundColor: "#f0f0f0",
    alignSelf: "center",
    marginVertical: 20,
    borderRadius: 20,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    aspectRatio: 1,
  },
  placeholderText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -10,
  },
  column: {
    flex: 1,
    paddingHorizontal: 10,
  },
  detailItem: {
    marginBottom: 20,
    flexDirection: "column",
  },
  value: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    textTransform: "uppercase",
  },
  deleteButton: {
    backgroundColor: "#ff4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#67B279",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryImage: {
    width: "50%",
    aspectRatio: 1,
    alignSelf: "center",
    borderRadius: 8,
    marginBottom: 16,
  },
  placeholderImage: {
    width: "50%",
    aspectRatio: 1,
    alignSelf: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  infoContainer: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#67B279",
  },
  menuButton: {
    backgroundColor: "#4A90E2",
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  actionButtons: {
    gap: 12,
  },
  loader: {
    marginTop: 20,
  },
  menuCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuCountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuCountText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    marginRight: 8,
  },
  menuCountLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    textTransform: "uppercase",
  },
  floatingEditButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#67B279",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerButton: {
    marginRight: 15,
    padding: 5,
  },
  menuListContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  menuListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#67B279',
  },
  foodType: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
