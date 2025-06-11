import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import Header from "../components/Header";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth } = Dimensions.get('window');

export default function MenuDetails({ route, navigation }) {
  const { menuId, restaurantId } = route.params;
  const [menu, setMenu] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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

  useFocusEffect(
    React.useCallback(() => {
      if (!menuId || !restaurantId) {
        console.error("Invalid parameters received:", { menuId, restaurantId });
        setError("Invalid menu or restaurant ID");
        return;
      }
      loadMenuDetails();
    }, [menuId, restaurantId])
  );

  const loadMenuDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const userDataString = await AsyncStorage.getItem("userData");
      const userData = JSON.parse(userDataString);

      console.log("Fetching menu details:", {
        menu_id: menuId,
        outlet_id: restaurantId,
        user_id: userData.user_id
      });

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/menu_view`,
        data: {
          menu_id: parseInt(menuId),
          outlet_id: parseInt(restaurantId),
          user_id: parseInt(userData.user_id),
          app_source: "partner"
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Menu Details Response:", response.data);

      if (response.data.detail) {
        const menuData = response.data.detail;
        console.log("Portions data:", menuData.portions);
        setMenu({
          ...menuData,
          field_labels: {
            name: "Name",
            food_type: "Food Type",
            category_name: "Category",
            spicy_index: "Spicy Index",
            portions: "Portions",
            offer: "Offer",
            description: "Description",
            ingredients: "Ingredients",
            rating: "Rating",
            is_special: "Special Item",
            created_on: "Created On",
            created_by: "Created By",
            updated_on: "Updated On",
            updated_by: "Updated By",
          },
        });
        setCategoryName(menuData.category_name);
      } else {
        throw new Error("Failed to load menu details");
      }
    } catch (error) {
      console.error("Error loading menu details:", {
        message: error.message,
        response: error.response?.data,
        requestData: {
          menu_id: menuId,
          outlet_id: restaurantId,
        },
      });

      if (
        error.response?.status === 401 || 
        error.response?.data?.code === 'token_not_valid' ||
        error.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }

      setError(
        error.response?.data?.detail ||
          error.message ||
          "Unable to load menu details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Menu", "Are you sure you want to delete this menu?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("accessToken");
            const deviceToken = await AsyncStorage.getItem("devicePushToken");
            const userDataString = await AsyncStorage.getItem("userData");
            const userData = JSON.parse(userDataString);
            const userId = userData?.user_id;

            if (!userId) {
              throw new Error("User ID not found");
            }

            console.log("Attempting to delete menu:", {
              menu_id: menuId,
              outlet_id: restaurantId,
              device_token: deviceToken,
              user_id: userId
            });

            const response = await axios({
              method: "DELETE",
              url: `${COMMON_BASE_URL}/menu_delete`,
              data: {
                menu_id: parseInt(menuId),
                outlet_id: parseInt(restaurantId),
                device_token: deviceToken,
                user_id: parseInt(userId),
                app_source: "partner"
              },
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });

            console.log("Delete menu response:", response.data);

            if (response.data.st === 1) {
              alert("Menu deleted successfully");
              navigation.goBack();
            } else {
              throw new Error("Failed to delete menu");
            }
          } catch (error) {
            console.error("Error deleting menu:", {
              message: error.message,
              response: error.response?.data,
              requestConfig: {
                url: error.config?.url,
                method: error.config?.method,
                data: error.config?.data,
              },
            });
            Alert.alert(
              "Error",
              error.response?.data?.detail || "Failed to delete menu"
            );
          }
        },
      },
    ]);
  };

  const renderImageCarousel = () => {
    if (!menu?.images?.length) {
      return (
        <View style={styles.carouselContainer}>
          <View style={[styles.imageSlide, styles.placeholderContainer]}>
            <FontAwesome name="image" size={50} color="#ccc" />
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.carouselContainer}>
        <ScrollView 
          horizontal 
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setActiveImageIndex(newIndex);
          }}
        >
          {menu.images.map((imageData, index) => {
            console.log("Image data at index", index, ":", imageData);
            
            // Handle different possible image data formats
            let imageUrl;
            if (typeof imageData === 'string') {
              imageUrl = imageData;
            } else if (typeof imageData === 'object') {
              // Try different possible properties
              imageUrl = imageData?.url || imageData?.uri || imageData?.image || imageData?.path;
            }
            
            console.log("Processed image URL:", imageUrl);
            
            if (!imageUrl) {
              console.log("No valid image URL found for index", index);
              return (
                <View key={index} style={styles.imageSlide}>
                  <View style={[styles.carouselImage, styles.placeholderContainer]}>
                    <FontAwesome name="cutlery" size={40} color="#ccc" />
                    <Text style={styles.placeholderText}>Invalid image</Text>
                  </View>
                </View>
              );
            }

            return (
              <View key={index} style={styles.imageSlide}>
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.carouselImage}
                  resizeMode="cover"
                  onError={(error) => console.log("Image loading error:", error.nativeEvent.error)}
                />
              </View>
            );
          })}
        </ScrollView>
        
        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {menu.images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeImageIndex && styles.paginationDotActive
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadMenuDetails().finally(() => setRefreshing(false));
  }, [menuId, restaurantId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Menu Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#67B279" />
        </View>
      </View>
    );
  }

  if (error || !menu) {
    return (
      <View style={styles.container}>
        <Header title="Menu Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || "Menu not found"}</Text>
        </View>
      </View>
    );
  }
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "";

    // Regular expression to match the date and time pattern
    const pattern = /(\d{2} \w{3} \d{4}) (\d{2}):(\d{2}):\d{2} (AM|PM)/;
    const match = dateTimeString.match(pattern);

    if (match) {
      const [_, date, hours, minutes, ampm] = match;
      return `${date} ${hours}:${minutes} ${ampm}`;
    }

    return dateTimeString; // Return original string if pattern doesn't match
  };

  return (
    <View style={styles.container}>
      <Header title="Menu Details" showBack={true} showMenu={true} />
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#67B279"]}
            tintColor="#67B279"
          />
        }
      >
        {renderImageCarousel()}
        
        {/* Details Section */}
        <View style={styles.detailsContainer}>
          {/* Row 1 */}
          <View style={styles.row}>
            <View style={styles.column}>
              <View style={styles.detailItem}>
                <Text style={styles.value}>{menu.name}</Text>
                <Text style={styles.label}>{menu.field_labels.name}</Text>
              </View>
            </View>
            <View style={styles.column}>
              <View style={styles.detailItem}>
                <Text style={styles.value}>{menu.food_type.toUpperCase()}</Text>
                <Text style={styles.label}>{menu.field_labels.food_type}</Text>
              </View>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.row}>
            <View style={styles.column}>
              <View style={styles.detailItem}>
                <Text style={styles.value}>₹{menu.full_price || "-"}</Text>
                <Text style={styles.label}>{menu.field_labels.full_price}</Text>
              </View>
            </View>
          </View>

          {/* Row 3 */}
          <View style={styles.row}>
            <View style={styles.column}>
              <View style={styles.detailItem}>
                <Text style={styles.value}>{menu.spicy_index || "-"}</Text>
                <Text style={styles.label}>
                  {menu.field_labels.spicy_index}
                </Text>
              </View>
            </View>
            <View style={styles.column}>
              <View style={styles.detailItem}>
                <Text style={styles.value}>{menu.rating || "-"}</Text>
                <Text style={styles.label}>{menu.field_labels.rating}</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.column}>
              <View style={styles.detailItem}>
                <Text style={styles.value}>
                  {menu.is_special === true ? "Special" : "Not Special"}
                </Text>
                <Text style={styles.label}>Is Special</Text>
              </View>
            </View>
            <View style={styles.column}>
              <View style={styles.detailItem}>
                <Text style={styles.value}>{menu.offer + "%" || "-"}</Text>
                <Text style={styles.label}>{menu.field_labels.offer}</Text>
              </View>
            </View>
          </View>

          {/* Full Width Items */}
          <View style={styles.fullWidthItem}>
            <Text style={styles.value}>
              {menu.description || "-"}
            </Text>
            <Text style={styles.label}>{menu.field_labels.description}</Text>
          </View>

          <View style={styles.fullWidthItem}>
            <Text style={styles.value}>
              {menu.ingredients || "-"}
            </Text>
            <Text style={styles.label}>{menu.field_labels.ingredients}</Text>
          </View>

          {/* Portions Section - Moved here */}
          <View style={styles.fullWidthItem}>
            <Text style={styles.label}>{menu.field_labels.portions}</Text>
            {menu.portions && menu.portions.map((portion, index) => (
              <View key={index} style={styles.portionCard}>
                <View style={styles.portionHeader}>
                  <Text style={styles.portionName}>{portion.portion_name}</Text>
                  <Text style={styles.portionPrice}>₹{portion.price}</Text>
                </View>
                {(portion.unit_value || portion.unit_type) && (
                  <View style={styles.portionDetails}>
                    <Text style={styles.portionUnit}>
                      {portion.unit_value && `${portion.unit_value}`}
                      {portion.unit_type && ` ${portion.unit_type}`}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Additional Details */}
          <View style={styles.fullWidthItem}>
            <Text style={styles.sectionTitle}>Additional Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {menu.field_labels.created_on}:
              </Text>
              <Text style={styles.infoValue}>{formatDateTime(menu.created_on) || "-"}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {menu.field_labels.created_by}:
              </Text>
              <Text style={styles.infoValue}>{menu.created_by || "-"}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {menu.field_labels.updated_on}:
              </Text>
              <Text style={styles.infoValue}>{formatDateTime(menu.updated_on) || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {menu.field_labels.updated_by}:
              </Text>
              <Text style={styles.infoValue}>{menu.updated_by || "-"}</Text>
            </View>
          </View>
        </View>

        {/* Delete Button with consistent padding */}
        <View style={styles.fullWidthItem}>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete}
          >
            <FontAwesome name="trash" size={16} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete Menu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("UpdateMenu", {
            menuId,
            restaurantId,
            menuData: menu,
          })
        }
      >
        <FontAwesome name="edit" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  bottomActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 0,
    marginBottom: 20,
    alignSelf: 'flex-start',
    width: 140,
    marginLeft: 20,
  },
  deleteButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#67B279',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    width: screenWidth,
    height: screenWidth * 0.6,
  },
  placeholderText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  detailsContainer: {
    padding: 20,
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
  fullWidthItem: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    marginBottom: 2,
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
  },
  categoryName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
  },
  carouselContainer: {
    height: screenWidth * 0.6, // Maintain aspect ratio
    marginVertical: 20,
  },
  imageSlide: {
    width: screenWidth,
    height: '100%',
    paddingHorizontal: 20,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#67B279',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  portionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  portionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portionName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  portionPrice: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  portionDetails: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portionUnit: {
    fontSize: 14,
    color: '#6B7280',
  },
});
