import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import Header from "../components/Header";
import * as Notifications from "expo-notifications";
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
const FILTER_OPTIONS = [
  { label: "All", value: "" },
  { label: "Placed", value: "placed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Cooking", value: "cooking" },
  { label: "Served", value: "served" },
  { label: "Paid", value: "paid" },
];

const STATUS_COLORS = {
  placed: '#3B82F6',    // Blue
  cooking: '#F97316',   // Orange
  served: '#22C55E',    // Green
  paid: '#8B5CF6',      // Purple
  cancelled: '#EF4444'  // Red
};

const STATUS_LIGHT_COLORS = {
  placed: '#EFF6FF',    // Light Blue
  cooking: '#FFF7ED',   // Light Orange
  served: '#F0FDF4',    // Light Green
  paid: '#F3E8FF',      // Light Purple
  cancelled: '#FEF2F2'  // Light Red
};

const FilterButton = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterButton, active && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text
      style={[styles.filterButtonText, active && styles.filterButtonTextActive]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default function Orders({ route, navigation }) {
  const { restaurantId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("");
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Handle unauthorized access (401)
  const handleUnauthorized = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'userData', 'refreshToken']);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Setup notification listener
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      fetchOrders(activeFilter);
    });

    return () => {
      subscription.remove();
    };
  }, [activeFilter]);

  // Fetch orders with debounce
  const fetchOrders = useCallback(async (filter = activeFilter) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");

      // Prepare request body
      const requestBody = {
        outlet_id: parseInt(restaurantId),
        device_token: deviceToken || "",
      };

      // Only add order_status if a filter is selected and not empty
      if (filter && filter.trim() !== "") {
        requestBody.order_status = filter.trim();
      }

      console.log('Fetching orders with params:', requestBody);

      const response = await axios.post(
        `${COMMON_BASE_URL}/order_listview`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
        }
      );

      // Handle both success and "no orders" cases
      if (response.data.st === 1 || response.data.st === 2) {
        if (response.data.lists && Array.isArray(response.data.lists)) {
          setOrders(response.data.lists);
        } else {
          setOrders([]);
        }
        // Set error message only if st === 2
        if (response.data.st === 2) {
          setError(response.data.msg || "No orders found");
        }
      } else {
        throw new Error(response.data.msg || "Failed to fetch orders");
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        config: err.config
      });
      
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
        return;
      }
      
      // Handle 400 status specifically
      if (err.response?.status === 400) {
        setOrders([]);
        setError(err.response?.data?.msg || "No orders found");
        return;
      }
      
      setError(err.response?.data?.msg || "Failed to fetch orders");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [restaurantId, activeFilter]);

  // Handle filter change with error handling
  const handleFilterChange = useCallback((filter) => {
    try {
      setActiveFilter(filter);
      setLoading(true);
      setError(null); // Clear any previous errors
      fetchOrders(filter);
    } catch (error) {
      console.error('Error changing filter:', error);
      setError('Failed to change filter');
      setLoading(false);
    }
  }, [fetchOrders]);

  // Handle pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchOrders(activeFilter);
    } finally {
      setRefreshing(false);
    }
  }, [activeFilter, fetchOrders]);

  // Fetch orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isInitialLoad) {
        fetchOrders(activeFilter);
      }
    }, [isInitialLoad, activeFilter, fetchOrders])
  );

  const handleOrderPress = (order) => {
    navigation.navigate("OrderDetails", {
      orderNumber: order.order_number,
      outlet_id: restaurantId,
      order_id: order.order_id
    });
  };

  const renderOrderCard = ({ item, date }) => (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: STATUS_COLORS[item.order_status], borderLeftWidth: 4 }]}
      onPress={() => handleOrderPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{item.order_number}</Text>
          <Text style={styles.dateTime}>{item.time}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_LIGHT_COLORS[item.order_status] }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.order_status] }]}>
            {item.order_status?.toUpperCase()}
          </Text>
        </View>
      </View>

      {item.order_type !== "counter" && 
       item.order_type !== "drive-through" && 
       item.order_type !== "parsel" && (
        <View style={styles.sectionInfo}>
          <Text style={styles.label}>Table No:</Text>
          <Text style={styles.value}>{item.table_number?.join(', ') || '-'}</Text>
          <Text style={styles.label}>Section:</Text>
          <Text style={styles.value}>{item.section_name || '-'}</Text>
        </View>
      )}

      <View style={styles.orderTypeContainer}>
        <View style={styles.orderTypeTag}>
          <Text style={styles.orderTypeText}>{item.order_type.toUpperCase()}</Text>
        </View>
        <Text style={styles.itemCount}>{item.menu_count} Menu</Text>
      </View>

      <View style={styles.priceContainer}>
        <View style={styles.leftPriceSection}>
          {item.order_status === 'paid' && (
            <View style={[styles.priceItem, styles.leftAligned]}>
              <View style={styles.paymentMethodBox}>
                <Text style={styles.priceValue}>
                  {item.is_paid ? (item.payment_method || item.is_paid.toString()) : 'N/A'}
                </Text>
              </View>
            </View>
          )}
        </View>
        <View style={styles.rightPriceSection}>
          <View style={[styles.priceItem, styles.rightAligned]}>
            <Text style={styles.priceValue}>₹{item.final_grand_total.toFixed(2)}</Text>
            <Text style={styles.priceLabel}>Total Amount</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Optimize with React.memo to prevent unnecessary re-renders
  const OrderCard = React.memo(({ item, date }) => renderOrderCard({ item, date }));
  
  // Optimized renderOrderGroup with React.memo
  const renderOrderGroup = React.useCallback(({ item: group }) => {
    return (
      <View>
        <Text style={styles.dateHeader}>{group.date}</Text>
        {group.data.map((order) => (
          <OrderCard 
            key={`order-${order.order_number}`} 
            item={order} 
            date={group.date} 
          />
        ))}
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Orders" showBack={true} showMenu={true} />
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((filter) => (
            <FilterButton
              key={filter.value}
              label={filter.label}
              active={activeFilter === filter.value}
              onPress={() => handleFilterChange(filter.value)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderGroup}
        keyExtractor={(item) => `date-group-${item.date.replace(/\s+/g, '-')}`}
        contentContainerStyle={[styles.list, loading && orders.length === 0 && styles.centerList]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0284c7"]}
            tintColor="#0284c7"
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            {loading ? (
              <ActivityIndicator size="large" color="#0284c7" />
            ) : (
              <Text style={styles.emptyText}>{error || "No orders found"}</Text>
            )}
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={5}
        updateCellsBatchingPeriod={50}
      />
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
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    marginRight: 12,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTypeTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderTypeText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '500',
  },
  itemCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  leftPriceSection: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  rightPriceSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  priceItem: {
    alignItems: 'center',
  },
  leftAligned: {
    alignItems: 'flex-start',
  },
  rightAligned: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentMethodBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#F9FAFB'
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  discountText: {
    color: '#059669',
  },
  filterContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterScroll: {
    padding: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#0284c7",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 16,
    color: "#6B7280",
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
