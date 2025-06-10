import React, { useState, useEffect } from 'react';
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
import { COMMON_BASE_URL } from '../apiConfig';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ManageCategory({ route, navigation }) {
  const { restaurantId } = route.params;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [categoryCounts, setCategoryCounts] = useState({ active: 0, inactive: 0, total: 0 });

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

  // Use useFocusEffect to reload categories when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
    }, [restaurantId])
  );

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem("accessToken");
      const deviceToken = await AsyncStorage.getItem("devicePushToken");
      const userData = await AsyncStorage.getItem("userData");
      const userInfo = JSON.parse(userData);

      const response = await axios({
        method: "POST",
        url: `${COMMON_BASE_URL}/menu_category_list`,
        data: {
          outlet_id: restaurantId,
          user_id: userInfo.user_id,
          app_source: "partner"
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // console.log('Categories Response:', response.data);
      
      // Transform the API response to match the expected format
      const menuCategories = response.data.data.menucat_details;
      const transformedCategories = menuCategories.map(cat => ({
        menu_cat_id: cat.menu_cat_id,
        name: cat.category_name,
        image: cat.image,
        menu_count: cat.menu_count,
        is_active: cat.is_active === 1, // Convert 1/0 to true/false
        outlet_id: cat.outlet_id
      })).filter(cat => cat.menu_cat_id !== null);
      
      setCategories(transformedCategories);
      
      // Use the counts directly from the API response
      // Taking the counts from the first item since they're same for all items
      if (menuCategories.length > 0) {
        setCategoryCounts({
          active: menuCategories[0].total_active_categories,
          inactive: menuCategories[0].total_inactive_categories,
          total: menuCategories[0].total_active_categories + menuCategories[0].total_inactive_categories
        });
      } else {
        // Reset counts if no categories exist
        setCategoryCounts({
          active: 0,
          inactive: 0,
          total: 0
        });
      }
      
    } catch (err) {
      console.error('Load Categories Error:', {
        message: err.message,
        response: err.response?.data
      });
      
      // Check for token invalid error based on the actual API response structure
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
      } else {
        setError('Failed to load categories');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadCategories().finally(() => setRefreshing(false));
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        console.log('📤 Navigation Parameters:', {
          outlet_id: restaurantId,
          menu_cat_id: item.menu_cat_id
        });

        navigation.navigate('CategoryDetails', {
          outlet_id: restaurantId,
          menu_cat_id: item.menu_cat_id
        });
      }}
    >
      <View style={styles.cardContent}>
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image 
              source={{ uri: item.image }} 
              style={styles.categoryImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <FontAwesome name="image" size={24} color="#666" />
            </View>
          )}
        </View>
        <View style={styles.mainContent}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <View style={styles.menuInfo}>
            <FontAwesome name="cutlery" size={14} color="#666" />
            <Text style={styles.menuCount}>{item.menu_count || 0} items</Text>
          </View>
        </View>
        <View style={{paddingRight: 4}}>
          <FontAwesome name="angle-right" size={20} color="#666" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Manage Categories" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Manage Categories" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Manage Categories" showBack={true} showMenu={true} />
      
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
            ]}>All ({categoryCounts.total})</Text>
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
            ]}>Active ({categoryCounts.active})</Text>
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
            ]}>Inactive ({categoryCounts.inactive})</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* <View style={styles.divider} /> */}
      <FlatList
        data={categories.filter(category => {
          if (filterStatus === 'all') return true;
          if (filterStatus === 'active') return category.is_active === true;
          if (filterStatus === 'inactive') return category.is_active === false;
          return true;
        })}
        renderItem={renderItem}
        keyExtractor={item => item.menu_cat_id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#67B279"]} // Android
            tintColor="#67B279" // iOS
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No categories found</Text>
            <Text style={styles.emptySubText}>Tap the + button to create one</Text>
          </View>
        )}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCategory', { restaurantId })}
      >
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    borderRadius: 8,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingLeft: 1,
    paddingRight: 18, // Add padding on the right for the arrow
  },
  imageContainer: {
    width: 60,
    height: 60,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mainContent: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  menuCount: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
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
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
    marginHorizontal: 0,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
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
