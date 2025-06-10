import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";

export default function ManageRestaurantOwner({ navigation }) {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOwners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${PARTNER_BASE_URL}/owner/list`);
      
      if (response.data.status === 1) {
        const transformedData = response.data.data.map(owner => ({
          id: owner.user_id?.toString(),
          owner_id: owner.user_id?.toString(),
          user_id: owner.user_id?.toString(),
          name: owner.name,
          mobile: owner.mobile,
          email: owner.email,
          address: owner.address,
          outlets: owner.num_of_outlet_actually,
          subscription: owner.subscription_name || 'No Subscription',
          remainingDays: owner.remaining_days,
          isActive: owner.is_active
        }));
        
        console.log('Transformed Owner Data:', transformedData.map(owner => ({
          id: owner.id,
          owner_id: owner.owner_id,
          user_id: owner.user_id
        })));
        
        setOwners(transformedData);
      } else {
        setError('Failed to load owners');
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message || 'Failed to load owners');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOwners();
    }, [loadOwners])
  );

  const renderItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[
        styles.card,
        index === owners.length - 1 && styles.lastCard
      ]}
      onPress={() => navigation.navigate('ViewOwner', { 
        ownerData: {
          ...item,
          owner_id: item.owner_id,
          user_id: item.user_id
        }
      })}
    >
      <View style={styles.detailsContainer}>
        {/* Left Column */}
        <View style={styles.column}>
          <View style={styles.detailItem}>
            <Text style={styles.value}>{item.name}</Text>
            <Text style={styles.label}>Owner Name</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.value}>{item.mobile}</Text>
            <Text style={styles.label}>Mobile</Text>
          </View>
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          <View style={styles.detailItem}>
            <Text style={styles.value}>{item.outlets}</Text>
            <Text style={styles.label}>Outlets</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: item.isActive ? '#67B279' : '#DC2626' }]} />
            <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Manage Owners" showBack={true} showMenu={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadOwners} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Manage Owners" showBack={true} showMenu={true} />
      {loading ? (
        <ActivityIndicator size="large" color="#67B279" style={styles.loader} />
      ) : (
        <FlatList
          data={owners}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.list}
          refreshing={loading}
          onRefresh={loadOwners}
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateOwner')}
      >
        <FontAwesome name="plus" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -10,
  },
  column: {
    flex: 1,
    paddingHorizontal: 10,
  },
  detailItem: {
    marginBottom: 16,
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 8,
  },
  retryText: {
    color: '#67B279',
    textDecorationLine: 'underline',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 10,
    padding: 10,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
    zIndex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  lastCard: {
    marginBottom: 90,
  },
});
