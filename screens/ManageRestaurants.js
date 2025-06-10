import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Keyboard,
} from 'react-native';
import { FontAwesome6, FontAwesome } from '@expo/vector-icons';
import { useRestaurants } from '../hooks/useRestaurants';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../services/axiosConfig';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from '../apiConfig';

export default function ManageRestaurants({ navigation }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // const [restaurantsWithOwners, setRestaurantsWithOwners] = useState([]);
  // const [owners, setOwners] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load owners from API
  // const loadOwners = async () => {
  //   try {
  //     const response = await axios.get(`${PARTNER_BASE_URL}/owner/list`);
  //     if (response.data.status === 1) {
  //       const ownersData = response.data.data.map(owner => ({
  //         user_id: owner.user_id,
  //         name: owner.name
  //       }));
  //       setOwners(ownersData);
  //       return ownersData;
  //     }
  //   } catch (error) {
  //     console.error('Error loading owners:', error);
  //   }
  //   return [];
  // };

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

  // Load restaurants from API
  const refreshRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`${PARTNER_BASE_URL}/manage/restaurant/list`);
      console.log('Restaurant List API Response:', response.data);

      if (response.data.st === 1) {
        const transformedData = response.data.data.map(restaurant => ({
          id: restaurant.outlet_id,
          outlet_code: restaurant.outlet_code,
          owner_id: restaurant.owner_id,
          name: restaurant.name,
          mobile: restaurant.mobile,
          outlet_status: restaurant.outlet_status,
          ownerName: restaurant.owner_name,
          isOpen: restaurant.is_open
        }));

        console.log('Transformed Restaurant Data:', transformedData);
        setRestaurants(transformedData);
      } else {
        setError(response.data.msg || 'Failed to load restaurants');
      }
    } catch (err) {
      console.error('API Error:', err);
      // Check for token invalid error based on the actual API response structure
      if (
        err.response?.status === 401 || 
        err.response?.data?.code === 'token_not_valid' ||
        err.response?.data?.detail?.includes('token not valid')
      ) {
        await handleUnauthorized();
      } else {
        setError(err.message || 'Failed to load restaurants');
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh restaurants when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshRestaurants();
    }, [])
  );

  // Filter restaurants based on search query
  const filteredRestaurants = restaurants.filter(restaurant => {
    const query = searchQuery.toLowerCase();
    return (
      (restaurant.name || '').toLowerCase().includes(query) ||
      (restaurant.mobile || '').toLowerCase().includes(query) ||
      (restaurant.outlet_code || '').toLowerCase().includes(query) ||
      (restaurant.ownerName || '').toLowerCase().includes(query)
    );
  });

  const renderItem = ({ item, index }) => {
    // Helper function to capitalize first letter
    const capitalizeFirst = (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
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
        navigation.navigate('ViewRestaurant', { 
          restaurantId: item.id,
          outlet_code: item.outlet_code,
          owner_id: item.owner_id,
          outlet_id: item.id
        });
      }}
    >
      <View style={styles.cardContent}>
        {/* First Row */}
        <View style={styles.row}>
          <View style={styles.leftColumn}>
            <View style={styles.iconRow}>
              <FontAwesome6 name="utensils" size={16} color="#666" style={styles.icon} />
              <Text style={[styles.value, styles.boldText]}>{capitalizeFirst(item.name)}</Text>
            </View>
          </View>
          <View style={styles.rightColumn}>
            <Text style={[
              styles.statusText,
              { color: item.isOpen === true ? '#28a745' : '#dc3545' }
            ]}>
              {item.isOpen === true ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        {/* Second Row */}
        <View style={styles.row}>
          <View style={styles.leftColumn}>
            <View style={styles.iconRow}>
              <FontAwesome6 name="qrcode" size={16} color="#666" style={styles.icon} />
              <Text style={styles.value}>Code: {item.outlet_code.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.rightColumn}>
            <View style={styles.iconRow}>
              <FontAwesome name="phone" size={16} color="#666" style={styles.icon} />
              <Text style={styles.value}>{item.mobile}</Text>
            </View>
          </View>
        </View>

        {/* Third Row - Owner */}
        {/* {item.ownerName && ( */}
        <View style={styles.row}>
          <View style={styles.leftColumn}>
            <View style={styles.ownerRow}>
              <FontAwesome name="user-o" size={16} color="#666" style={styles.ownerIcon} />
              <Text style={styles.value}>{capitalizeFirst(item.ownerName)}</Text>
            </View>
            </View>
          </View>
        {/* )} */}
      </View>
    </TouchableOpacity>
  )};

  return (
    <View style={styles.container}>
      <Header title="Manage Outlets" showBack={true} showMenu={true} />
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <FontAwesome name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search outlets..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              blurOnSubmit={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <FontAwesome6 name="times-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refreshRestaurants}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredRestaurants}
            renderItem={renderItem}
            keyExtractor={item => `restaurant-${item.outlet_code}-${item.id}`}
            style={styles.list}
            refreshing={loading}
            onRefresh={refreshRestaurants}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          />
        )}

        {/* Static FAB */}
        {/* <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateRestaurant')}
        >
          <FontAwesome6 name="plus" size={24} color="white" />
        </TouchableOpacity> */}
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
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    padding: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 5,
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
    zIndex: 1,
  },
  list: {
    flex: 1,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerIcon: {
    marginRight: 8,
  },
  boldText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  lastCard: {
    marginBottom: 20,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 45,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 5,
  },
}); 
