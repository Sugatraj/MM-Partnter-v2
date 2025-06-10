import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ManageMenus({ route, navigation }) {
  const { restaurantId } = route.params;
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [menuCounts, setMenuCounts] = useState({ active: 0, inactive: 0, total: 0 });

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
      loadMenus();
    }, [restaurantId])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadMenus().finally(() => setRefreshing(false));
  }, []);

  const loadMenus = async () => {
    try {
      setLoading(true);
      console.log('Loading menus for restaurant:', restaurantId);
      
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");

      const response = await axios.post(
        `${COMMON_BASE_URL}/menu_listview`,
        {
          outlet_id: parseInt(restaurantId),
          device_token: deviceToken
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Menu List API Response:', response.data);

      if (response.data.st === 1) {
        const menuList = response.data.lists || [];
        setMenus(menuList);
        
        // Calculate menu counts
        const activeMenus = menuList.filter(menu => menu.is_active === true);
        const inactiveMenus = menuList.filter(menu => menu.is_active === false);
        setMenuCounts({
          active: activeMenus.length,
          inactive: inactiveMenus.length,
          total: menuList.length
        });
      } else {
        throw new Error('Failed to load menus');
      }
    } catch (err) {
      console.error('Error loading menus:', err);
      
      // Check for token invalid error based on the actual API response structure
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
      } else {
        setError(err.message || 'Failed to load menus');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFoodTypeStyles = (foodType) => {
    switch (foodType?.toLowerCase()) {
      case 'veg':
        return {
          color: '#67B279',
          backgroundColor: '#E6F4EA'
        };
      case 'nonveg':
        return {
          color: '#DC2626',
          backgroundColor: '#FEE2E2'
        };
      case 'vegan':
        return {
          color: '#059669',
          backgroundColor: '#D1FAE5'
        };
      case 'egg':
        return {
          color: '#F59E0B',
          backgroundColor: '#FEF3C7'
        };
      default:
        return {
          color: '#666666',
          backgroundColor: '#F3F4F6'
        };
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('MenuDetails', { 
        menuId: item.menu_id,
        restaurantId: restaurantId
      })}
    >
      <View style={styles.cardContent}>
        <View style={styles.leftContent}>
          {item.image ? (
            <Image 
              source={{ uri: item.image }} 
              style={styles.menuImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <FontAwesome name="cutlery" size={32} color="#ccc" />
            </View>
          )}
          <View style={styles.menuInfo}>
            <Text style={styles.menuName}>{item.name}</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.categoryName}>{item.category_name.charAt(0).toUpperCase() + item.category_name.slice(1)}</Text>
              <View style={[
                styles.badge,
                { backgroundColor: getFoodTypeStyles(item.food_type).backgroundColor }
              ]}>
                <Text style={[
                  styles.foodType,
                  { color: getFoodTypeStyles(item.food_type).color }
                ]}>
                  {item.food_type?.toUpperCase() || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₹{item.full_price}</Text>
              {item.half_price > 0 && (
                <Text style={styles.price}>₹{item.half_price}</Text>
              )}
            </View>
          </View>
        </View>
        {/* <View style={styles.rightContent}>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={16} color="#FFB800" />
              <Text style={styles.rating}>{item.rating}</Text>
            </View>
          )}
          <View style={styles.spicyContainer}>
            {[...Array(parseInt(item.spicy_index))].map((_, i) => (
              <FontAwesome key={i} name="fire" size={14} color="#DC2626" style={styles.spicyIcon} />
            ))}
          </View>
        </View> */}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Manage Menus" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#67B279" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Manage Menus" showBack={true} showMenu={true} />
      <View style={styles.content}>
        {restaurantName && (
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        )}

        <View style={styles.filterContainer}>
          <View style={styles.filterButtons}>
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                styles.filterButtonLeft,
                filterStatus === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'all' && styles.filterButtonTextActive
              ]}>All ({menuCounts.total})</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                styles.filterButtonMiddle,
                filterStatus === 'active' && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus('active')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'active' && styles.filterButtonTextActive
              ]}>Active ({menuCounts.active})</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                styles.filterButtonRight,
                filterStatus === 'inactive' && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus('inactive')}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'inactive' && styles.filterButtonTextActive
              ]}>Inactive ({menuCounts.inactive})</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <FlatList
          data={menus.filter(menu => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'active') return menu.is_active === true;
            if (filterStatus === 'inactive') return menu.is_active === false;
            return true;
          })}
          renderItem={renderItem}
          keyExtractor={item => item.menu_id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#67B279"]}
              tintColor="#67B279"
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <FontAwesome name="cutlery" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No menus found</Text>
              <Text style={styles.emptySubText}>Tap the + button to create one</Text>
            </View>
          )}
        />

        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('CreateMenu', { restaurantId })}
        >
          <FontAwesome name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
  },
  menuImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  foodType: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  spicyContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  spicyIcon: {
    marginLeft: 2,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  filterButtonLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    borderRightWidth: 0,
  },
  filterButtonMiddle: {
    borderRadius: 0,
  },
  filterButtonRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    borderLeftWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: '#67B279',
    borderColor: '#67B279',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
}); 