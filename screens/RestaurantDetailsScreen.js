import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useRestaurants } from "../hooks/useRestaurants";
import { useOwners } from "../hooks/useOwners";
import axios from "axios";
import Header from "../components/Header";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    // Handle date format like "08 Oct 2001"
    const parts = dateString.split(" ");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${day.padStart(2, "0")}-${month}-${year}`;
    }

    // Fallback for other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";

    const day = date.getDate().toString().padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return "-";
  }
};

// Helper function to capitalize first letter
const capitalizeFirst = (str) => {
  if (!str || typeof str !== 'string') return "-";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function RestaurantDetailsScreen({ route, navigation }) {
  const { restaurantId, outlet_code, owner_id } = route.params;
  const { getRestaurant, deleteRestaurant } = useRestaurants();
  const { getOwner } = useOwners();
  const [restaurant, setRestaurant] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId, route.params?.timestamp]);

  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the access token and device token from AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      const parsedUserData = JSON.parse(userData);
      const accessToken = parsedUserData?.access_token;
      const deviceToken = await AsyncStorage.getItem("devicePushToken");

      if (!accessToken) {
        throw new Error("Access token not found");
      }

      if (!deviceToken) {
        throw new Error("Device token not found");
      }

      // Call the view API with the correct payload and bearer token
      const response = await axios.post(
        `${COMMON_BASE_URL}/view_outlet`,
        {
          outlet_id: restaurantId?.toString(),
          user_id: owner_id,
          device_token: deviceToken,
          app_source: "partner"  // Added missing app_source
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      console.log("Restaurant View API Response:", response.data);

      // Check if we have data in the response
      if (response.data.data) {
        const restaurantDetails = response.data.data;

        // Transform API data to match our UI structure
        const transformedData = {
          id: restaurantId,
          outlet_id: restaurantId,
          outlet_code: outlet_code,
          owner_id: restaurantDetails.owner_id,
          owner_name: restaurantDetails.owner_name,
          name: restaurantDetails.name,
          fssaiNumber: restaurantDetails.fssainumber,
          gstNumber: restaurantDetails.gstnumber,
          mobile: restaurantDetails.mobile,
          address: restaurantDetails.address,
          outletType: restaurantDetails.outlet_type,
          vegNonveg: restaurantDetails.veg_nonveg,
          serviceCharges: restaurantDetails.service_charges,
          gst: restaurantDetails.gst,
          upiId: restaurantDetails.upi_id,
          outlet_status: restaurantDetails.outlet_status === 1, // Convert to boolean
          isOpen: restaurantDetails.is_open === 1, // Convert to boolean
          whatsapp: restaurantDetails.whatsapp,
          instagram: restaurantDetails.instagram,
          facebook: restaurantDetails.facebook,
          website: restaurantDetails.website,
          googleReview: restaurantDetails.google_review,
          googleBusinessLink: restaurantDetails.google_business_link,
          openingTime: restaurantDetails.opening_time,
          closingTime: restaurantDetails.closing_time,
          image: restaurantDetails.image,
          createdOn: restaurantDetails.created_on,
          createdBy: restaurantDetails.created_by,
          updatedOn: restaurantDetails.updated_on,
          updatedBy: restaurantDetails.updated_by,
          // Statistics
          totalCategory: restaurantDetails.total_category,
          totalMenu: restaurantDetails.total_menu,
          totalOrder: restaurantDetails.total_order,
          totalCompletedOrders: restaurantDetails.total_completed_orders,
          totalCancelledOrders: restaurantDetails.total_cancelled_orders,
          totalActiveMenu: restaurantDetails.total_active_menu,
          totalInactiveMenu: restaurantDetails.total_inactive_menu,
          totalActiveCategory: restaurantDetails.total_active_category,
          totalInactiveCategory: restaurantDetails.total_inactive_category,
          totalActiveSection: restaurantDetails.total_active_section,
          totalInactiveSection: restaurantDetails.total_inactive_section,
          // Additional counts
          waiterCount: restaurantDetails.waiter_count,
          captainCount: restaurantDetails.captain_count,
          chefCount: restaurantDetails.chef_count,
          managerCount: restaurantDetails.manager_count,
          menuCount: restaurantDetails.menu_count,
          menuCategoryCount: restaurantDetails.menu_category_count,
          sectionCount: restaurantDetails.section_count,
          tableCount: restaurantDetails.table_count,
          ordersCount: restaurantDetails.orders_count
        };

        console.log("Transformed Restaurant Data:", transformedData);
        setRestaurant(transformedData);

        // If there's an owner ID, load owner details
        if (transformedData.owner) {
          try {
            const ownerData = await getOwner(transformedData.owner);
            setOwner(ownerData);
          } catch (ownerErr) {
            console.log("Error loading owner:", ownerErr);
          }
        }
      } else {
        throw new Error("No restaurant data found");
      }
    } catch (err) {
      console.error("Restaurant View API Error:", {
        message: err.message,
        response: err.response?.data,
      });
      
      // Handle error messages from new API format
      const errorMessage = err.response?.data?.detail || err.message || "Failed to load restaurant details";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Restaurant",
      "Are you sure you want to delete this restaurant?",
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
              const response = await axios.post(
                `${PARTNER_BASE_URL}/manage/restaurant/delete`,
                {
                  outlet_id: restaurantId.toString(),
                },
                {
                  headers: {
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.data.status === 1) {
                Alert.alert("Success", "Restaurant deleted successfully", [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]);
              } else {
                throw new Error(
                  response.data.message || "Failed to delete restaurant"
                );
              }
            } catch (err) {
              console.error("Delete Restaurant Error:", {
                message: err.message,
                response: err.response?.data,
              });
              Alert.alert("Error", "Failed to delete restaurant");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleManageSectionsPress = () => {
    if (!restaurant) return;

    navigation.navigate("ManageSections", {
      restaurantId: restaurantId,
      // restaurantId: restaurant.outlet_id,
      outlet_id: restaurant.outlet_id,
      outlet_code: restaurant.outlet_code,
      owner_id: restaurant.owner_id,
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadRestaurantData().finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Restaurant Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={styles.container}>
        <Header title="Restaurant Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {error || "Restaurant not found"}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Restaurant Details" showBack={true} showMenu={true} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Action Buttons - In 2-column Grid Layout */}
        <Text style={styles.manageTitle}>Manage</Text>
        
        <View style={styles.cardsContainer}>
          {/* Category Card */}
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionCardButton}
              onPress={() => {
                navigation.navigate("ManageCategory", {
                  restaurantId: restaurantId,
                });
              }}
            >
              <View style={styles.titleRow}>
                <FontAwesome name="list" size={16} color="black" />
                <Text style={styles.actionButtonTitle}>Category</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statsColumn}>
                  <Text style={styles.statsNumber}>
                    {restaurant.totalActiveCategory || "0"}
                  </Text>
                  <Text style={styles.statsLabel}>Active</Text>
                </View>
                <View style={styles.statsColumn}>
                  <Text style={styles.statsNumber}>
                    {restaurant.totalInactiveCategory || "0"}
                  </Text>
                  <Text style={styles.statsLabel}>Inactive</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Menus Card */}
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionCardButton}
              onPress={() => {
                navigation.navigate("ManageMenus", {
                  restaurantId: restaurantId,
                });
              }}
            >
              <View style={styles.titleRow}>
                <FontAwesome name="cutlery" size={16} color="black" />
                <Text style={styles.actionButtonTitle}>Menus</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statsColumn}>
                  <Text style={styles.statsNumber}>
                    {restaurant.totalActiveMenu || "0"}
                  </Text>
                  <Text style={styles.statsLabel}>Active</Text>
                </View>
                <View style={styles.statsColumn}>
                  <Text style={styles.statsNumber}>
                    {restaurant.totalInactiveMenu || "0"}
                  </Text>
                  <Text style={styles.statsLabel}>Inactive</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Sections Card */}
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionCardButton}
              onPress={handleManageSectionsPress}
            >
              <View style={styles.titleRow}>
                <FontAwesome name="th-large" size={16} color="black" />
                <Text style={styles.actionButtonTitle}>Sections</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statsColumn}>
                  <Text style={styles.statsNumber}>
                    {restaurant.totalActiveSection || "0"}
                  </Text>
                  <Text style={styles.statsLabel}>Active</Text>
                </View>
                <View style={styles.statsColumn}>
                  <Text style={styles.statsNumber}>
                    {restaurant.totalInactiveSection || "0"}
                  </Text>
                  <Text style={styles.statsLabel}>Inactive</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Orders Card */}
          <View style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionCardButton}
              onPress={() => {
                navigation.navigate("Orders", { restaurantId: restaurantId });
              }}
            >
              <View style={styles.titleRow}>
                <FontAwesome name="shopping-cart" size={16} color="black" />
                <Text style={styles.actionButtonTitle}>Orders</Text>
              </View>
              <View style={[styles.statsRow, styles.centerStats]}>
                <View style={styles.statsColumn}>
                  <Text style={styles.statsNumber}>
                    {restaurant.totalOrder || "0"}
                  </Text>
                  <Text style={styles.statsLabel}>Total Orders</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Restaurant Image */}
        {restaurant.image ? (
          <Image
            source={{ uri: restaurant.image }}
            style={styles.restaurantImage}
            resizeMode="cover"
          />
        ) : (
          <View>
            {/* <FontAwesome name="image" size={50} color="#CBD5E0" /> */}
          </View>
        )}

        {/* Details Container */}
        <View style={styles.detailsContainer}>
          {/* Basic Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Outlet Details</Text>
            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{capitalizeFirst(restaurant?.name)}</Text>
                  <Text style={styles.label}>Outlet Name</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.mobile}</Text>
                  <Text style={styles.label}>Mobile</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>
                    {restaurant.outletType.charAt(0)?.toUpperCase() + restaurant.outletType.slice(1).toLowerCase()}
                  </Text>
                  <Text style={styles.label}>Outlet Type</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.vegNonveg.toUpperCase() || "-"}</Text>
                  <Text style={styles.label}>Veg Nonveg</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{capitalizeFirst(restaurant?.address)}</Text>
                  <Text style={styles.label}>Address</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <TouchableOpacity
                    onPress={() => {
                      if (!restaurant.owner_id || !restaurant.owner_name) {
                        Alert.alert("Error", "Owner information is not available");
                        return;
                      }
                      const ownerData = {
                        owner_id: restaurant.owner_id.toString(),
                        name: restaurant.owner_name || "",
                        ownerId: restaurant.owner_id.toString(),
                        user_id: restaurant.owner_id.toString(),
                        mobile: restaurant.mobile || "",
                        email: "",
                        address: restaurant.address || "",
                      };
                      navigation.navigate("ViewOwner", { ownerData: ownerData });
                    }}
                  >
                    <Text style={[styles.value, styles.linkText]}>
                      {restaurant.owner_name ? capitalizeFirst(restaurant?.owner_name) : "-"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>Owner Name</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.fssaiNumber || "-"}</Text>
                  <Text style={styles.label}>FSSAI Number</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.gstNumber || "-"}</Text>
                  <Text style={styles.label}>GST Number</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.upiId || "-"}</Text>
                  <Text style={styles.label}>UPI ID</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.serviceCharges || "0"}%</Text>
                  <Text style={styles.label}>Service Charges</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.gst || "0"}%</Text>
                  <Text style={styles.label}>GST</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Social Media Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Social</Text>
            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.whatsapp || "-"}</Text>
                  <Text style={styles.label}>WhatsApp</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.facebook || "-"}</Text>
                  <Text style={styles.label}>Facebook</Text>
                </View>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.instagram || "-"}</Text>
                  <Text style={styles.label}>Instagram</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.website || "-"}</Text>
                  <Text style={styles.label}>Website</Text>
                </View>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.googleReview || "-"}</Text>
                  <Text style={styles.label}>Google Review</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.googleBusinessLink || "-"}</Text>
                  <Text style={styles.label}>Google Business Link</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Audit Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Information</Text>
            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={[styles.value, { color: restaurant.outlet_status === true ? "#28a745" : "#dc3545" }]}>
                    {restaurant.outlet_status === true ? "Active" : "Inactive"}
                  </Text>
                  <Text style={styles.label}>Outlet Status</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={[styles.value, { color: restaurant.isOpen === true ? "#28a745" : "#dc3545" }]}>
                    {restaurant.isOpen === true ? "Open" : "Closed"}
                  </Text>
                  <Text style={styles.label}>Is Open</Text>
                </View>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.createdOn?.toUpperCase() || "-"}</Text>
                  <Text style={styles.label}>Created On</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant.createdBy || "-"}</Text>
                  <Text style={styles.label}>Created By</Text>
                </View>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant?.updatedOn?.toUpperCase() || "-"}</Text>
                  <Text style={styles.label}>Updated On</Text>
                </View>
              </View>
              <View style={styles.column}>
                <View style={styles.detailItem}>
                  <Text style={styles.value}>{restaurant?.updatedBy || "-"}</Text>
                  <Text style={styles.label}>Updated By</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Add padding at bottom for better spacing */}
        {/* <View style={styles.bottomSection}>
         
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <FontAwesome name="trash" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete Restaurant</Text>
          </TouchableOpacity>
        </View> */}
      </ScrollView>

      {/* FAB for Edit - stays floating */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("UpdateRestaurant", {
            restaurantId: restaurantId,
            outlet_code: outlet_code,
            owner_id: owner_id,
            outlet_id: restaurant.outlet_id,
          })
        }
      >
        <FontAwesome name="edit" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
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
  restaurantImage: {
    width: "50%",
    alignSelf: "center",
    aspectRatio: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    overflow: "hidden",
  },
  placeholderImage: {
    width: "50%",
    alignSelf: "center",
    aspectRatio: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  manageTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    textAlign: "center", // Center the text horizontally
    alignSelf: "center", // Center the text container
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  actionCard: {
    backgroundColor: "#f5f5f5", // Light grey background color
    borderRadius: 12,
    marginVertical: 8,
    width: "48%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionCardButton: {
    backgroundColor: "transparent",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "black",
    padding: 16,
    width: "100%",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    backgroundColor: "transparent",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "black",
    padding: 12,
    width: "48%",
    height: "auto", // Changed from fixed height
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  actionButtonTitle: {
    color: "black",
    fontSize: 14,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  statsColumn: {
    alignItems: "center",
  },
  statsNumber: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },
  statsLabel: {
    color: "gray",
    fontSize: 12,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#0066cc',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  actionButtonText: {
    color: "black",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
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
    zIndex: 1,
  },
  deleteButton: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    width: "auto",
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: "flex-start",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  auditSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  linkText: {
    color: "#2196F3",
    textDecorationLine: "underline",
  },
  centerStats: {
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
    marginHorizontal: 0,
  },
  sectionContainer: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },
  chargesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  chargeColumn: {
    alignItems: 'center',
  },
  chargeValue: {
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 4,
  },
  chargeLabel: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  centeredColumn: {
    alignItems: 'center',
  },
  centeredValue: {
    textAlign: 'center',
    fontSize: 18, // Made slightly larger
  },
  centeredLabel: {
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
}); 
