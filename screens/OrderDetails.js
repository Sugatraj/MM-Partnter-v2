import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
  Linking,
} from "react-native";
import axios from "axios";
import Header from "../components/Header";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STATUS_COLORS = {
  placed: "#FF9800",    // Warm Orange - Indicates new/pending order
  cancelled: "#F44336", // Bright Red - Clear indication of cancellation
  cooking: "#FFC107",   // Amber/Yellow - Shows order in progress
  served: "#2196F3",    // Blue - Indicates service completed
  paid: "#4CAF50"       // Green - Successful completion
};

// Add complementary light background colors for better UI
const STATUS_LIGHT_COLORS = {
  placed: "#FFF3E0",    // Light Orange background
  cancelled: "#FFEBEE", // Light Red background
  cooking: "#FFF8E1",   // Light Amber background
  served: "#E3F2FD",    // Light Blue background
  paid: "#E8F5E9"       // Light Green background
};

// Helper function to get status color
const getStatusColor = (status) => {
  return STATUS_COLORS[status?.toLowerCase()] || "#757575"; // Default gray if status not found
};

// Helper function to get light background color
const getStatusLightColor = (status) => {
  return STATUS_LIGHT_COLORS[status?.toLowerCase()] || "#F5F5F5"; // Default light gray if status not found
};

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '';
  
  // Check if the date is in "DD-MMM-YYYY HH:mm:ss" format
  const match = dateTimeString.match(/(\d{2}-\w{3}-\d{4}) (\d{2}):(\d{2}):\d{2}/);
  if (match) {
    const [_, date, hours, minutes] = match;
    
    // Convert 24-hour format to 12-hour format with AM/PM
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12 for midnight
    
    // Format hour to always have leading zero
    const formattedHour = hour12.toString().padStart(2, '0');
    
    return `${date} ${formattedHour}:${minutes} ${ampm}`;
  }
  
  return dateTimeString;
};

export default function OrderDetails({ route, navigation }) {
  const { orderNumber, outlet_id, order_id } = route.params;
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const [isServed, setIsServed] = useState(false);

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
    fetchOrderDetails();
  }, [orderNumber]);

  const fetchOrderDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${COMMON_BASE_URL}/order_view`,
        {
          outlet_id: outlet_id,
          order_id: order_id,
          order_number: orderNumber,
          device_token : deviceToken
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.st === 1) {
        setOrderDetails(response.data.lists);
        setIsServed(response.data.lists.order_details.order_status === "paid");
      } else {
        throw new Error(response.data.msg || "Failed to fetch order details");
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      
      // Check for 401 unauthorized
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      setError("An error occurred while fetching order details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Ongoing Order Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Ongoing Order Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!orderDetails) {
    return (
      <View style={styles.container}>
        <Header title="Ongoing Order Details" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text>No order details found</Text>
        </View>
      </View>
    );
  }

  const { order_details, menu_details, invoice_url } = orderDetails;

  return (
    <View style={styles.container}>
      <Header title="Order Details" showBack={true} showMenu={true} />
      <ScrollView>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: getStatusColor(order_details.order_status) },
          ]}
        >
          <View style={styles.statusLeft}>
            <Text style={styles.statusText}>
              Status: {order_details.order_status?.toUpperCase()}
            </Text>
            <Text style={styles.timeText}>
              {formatDateTime(order_details.datetime)}
            </Text>
          </View>
          <View style={styles.statusRight}>
            <Text style={styles.orderIdText}>
              Order Number: #{order_details.order_number}
            </Text>
            {/* <Text style={styles.orderIdLabel}>
              Order ID: {order_details.order_id}
            </Text> */}
          </View>
        </View>

        {/* Only show section and table number for dine-in orders */}
        {order_details.order_type?.toLowerCase() === 'dine-in' && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              Section: {order_details.section || "-"}
            </Text>
            <Text style={styles.infoLabel}>
              Table Number: {order_details.table_number || "-"}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            Menu Count: {order_details.menu_count}
          </Text>
          {/* <Text style={styles.infoValue}>{order_details.menu_count}</Text> */}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>
            Order Type: {order_details.order_type.toUpperCase()}
          </Text>
          {/* <Text style={styles.infoValue}>{order_details.menu_count}</Text> */}
        </View>

        {/* Menu Items */}
        {menu_details.map((item, index) => (
          <View key={index} style={styles.menuItemCard}>
            <Text style={styles.menuName}>{item.menu_name}</Text>
            <View style={styles.menuRow}>
              <Text style={styles.menuPrice}>₹{item.price.toFixed(2)}</Text>
              {item.offer > 0 && (
                <Text style={styles.menuDiscount}>{item.offer}% Off</Text>
              )}
              <Text style={styles.menuQuantity}>x{item.quantity}</Text>
              <Text style={styles.menuTotal}>
                ₹{item.menu_sub_total.toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        {/* Bill Details */}
        <View style={styles.billCard}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Total:</Text>
            <Text style={styles.billValue}>
              ₹{order_details.total_bill_amount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Discount ({order_details.discount_percent}%):
            </Text>
            <Text style={[styles.billValue, styles.discountText]}>
              {order_details.discount_amount === 0
                ? "0"
                : `-₹${order_details.discount_amount.toFixed(2)}`}
            </Text>
          </View>

          {order_details.special_discount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Special Discount:</Text>
              <Text style={[styles.billValue, styles.discountText]}>
                -₹{order_details.special_discount.toFixed(2)}
              </Text>
            </View>
          )}

          {order_details.charges > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Extra Charges:</Text>
              <Text style={[styles.billValue, { color: '#4CAF50' }]}>
                +₹{order_details.charges.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.separator} />

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal:</Text>
            <Text style={styles.billValue}>
              ₹{(order_details.total_bill_amount - order_details.discount_amount - (order_details.special_discount || 0) + (order_details.charges || 0)).toFixed(2)}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Service Charges ({order_details.service_charges_percent}%):
            </Text>
            <Text style={[styles.billValue, { color: '#4CAF50' }]}>
              +₹{order_details.service_charges_amount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              GST ({order_details.gst_percent}%):
            </Text>
            <Text style={[styles.billValue, { color: '#4CAF50' }]}>
              +₹{order_details.gst_amount.toFixed(2)}
            </Text>
          </View>

          {order_details.tip > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Tip:</Text>
              <Text style={[styles.billValue, { color: '#4CAF50' }]}>
                +₹{order_details.tip.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.separator} />

          <View style={styles.billRow}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>
              ₹{order_details.final_grand_total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Mark as Served Toggle */}
        {/* <View style={styles.toggleCard}>
          <Text style={styles.toggleLabel}>Mark as Served</Text>
          <Switch
            value={isServed}
            onValueChange={setIsServed}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isServed ? "#f5dd4b" : "#f4f3f4"}
          />
        </View> */}
        {/* {order_details.order_status === "paid" && invoice_url && (
          <View style={styles.downloadButtonContainer}>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => Linking.openURL(invoice_url)}
            >
              <Icon
                name="file-download"
                size={18}
                color="#FFFFFF"
                style={styles.downloadIcon}
              />
              <Text style={styles.downloadButtonText}>Download Invoice</Text>
            </TouchableOpacity>
          </View>
        )} */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBanner: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusLeft: {
    flex: 1,
  },
  statusRight: {
    alignItems: "flex-end",
  },
  statusText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  orderIdText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  orderIdLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: "#000",
  },
  infoValue: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  menuItemCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  menuName: {
    fontSize: 16,
    color: "#000",
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuPrice: {
    fontSize: 16,
    color: "#4B5563",
  },
  menuDiscount: {
    fontSize: 14,
    color: "#10B981",
    marginLeft: 8,
  },
  menuQuantity: {
    fontSize: 16,
    color: "#4B5563",
    marginLeft: 8,
  },
  menuTotal: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  billCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  billLabel: {
    fontSize: 16,
    color: "#000",
  },
  billValue: {
    fontSize: 16,
    color: "#000",
  },
  discountText: {
    color: '#FF0000',  // Red color for discounts
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  grandTotalValue: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  toggleCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleLabel: {
    fontSize: 16,
    color: "#000",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
  },
  downloadButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  downloadButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  downloadIcon: {
    marginRight: 4,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
