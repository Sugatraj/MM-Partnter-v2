import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";

export default function ViewRestaurantScreen({ route, navigation }) {
  const { restaurantId, timestamp } = route.params;
  const [restaurant, setRestaurant] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadRestaurant = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(
        `${COMMON_BASE_URL}/view_outlet`,
        { outlet_id: restaurantId?.toString(),
          user_id : "1"
         },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setRestaurant(response.data.data);
      } else {
        throw new Error(response.data.msg || "Failed to load restaurant");
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
      setError("Failed to load restaurant details");
      Alert.alert("Error", "Failed to load restaurant details");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  React.useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant, timestamp]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadRestaurant();
    });

    return unsubscribe;
  }, [navigation, loadRestaurant]);

  const handleDelete = () => {
    // Implement delete functionality here
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="View Restaurant" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.container}>
        <Header title="View Restaurant" showBack={true} showMenu={true} />
        <View style={styles.centered}>
          <Text>Restaurant not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="View Restaurant" showBack={true} showMenu={true} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>{restaurant.name}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.headerButton, styles.editButton]}
              onPress={() => navigation.replace('UpdateRestaurant', { restaurantId })}
            >
              <FontAwesome name="edit" size={20} color="#67B279" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <FontAwesome name="trash" size={20} color="#dc3545" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>FSSAI Number</Text>
            <Text style={styles.value}>{restaurant.fssainumber}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>GST Number</Text>
            <Text style={styles.value}>{restaurant.gstnumber}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Mobile</Text>
            <Text style={styles.value}>{restaurant.mobile}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Service Charges</Text>
            <Text style={styles.value}>{restaurant.service_charges}%</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>GST</Text>
            <Text style={styles.value}>{restaurant.gst}%</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{restaurant.veg_nonveg}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Owner</Text>
            <Text style={styles.value}>{restaurant.Owner_id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Restaurant Type</Text>
            <Text style={styles.value}>{restaurant.outlet_type}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>UPI ID</Text>
            <Text style={styles.value}>{restaurant.upi_id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Status</Text>
            <Text style={[
              styles.statusText,
              { color: restaurant.outlet_status === "True" ? '#28a745' : '#dc3545' }
            ]}>
              {restaurant.outlet_status === "True" ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Currently</Text>
            <Text style={[
              styles.statusText,
              { color: restaurant.is_open ? '#28a745' : '#dc3545' }
            ]}>
              {restaurant.is_open ? 'Open' : 'Closed'}
            </Text>
          </View>

          <View style={styles.addressContainer}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.address}>{restaurant.address}</Text>
          </View>
        </View>
      </ScrollView>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 10,
    marginLeft: 10,
    borderRadius: 5,
  },
  editButton: {
    backgroundColor: '#e8f5e9',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  section: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressContainer: {
    marginTop: 20,
  },
  address: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
    lineHeight: 24,
  },
}); 