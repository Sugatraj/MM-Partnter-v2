import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import { PARTNER_BASE_URL, COMMON_BASE_URL } from "../apiConfig";

export default function OwnerScreen({ navigation }) {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        setUserData(JSON.parse(storedData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleEdit = () => {
    if (userData) {
      navigation.navigate('UpdateOwner', { ownerData: userData });
    }
  };

  if (!userData) {
    return (
      <View style={styles.container}>
        <Header title="Owner Profile" showBack={false} showMenu={true} />
        <ActivityIndicator size="large" style={styles.loadingIndicator} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header title="Owner Profile" showBack={false} showMenu={true} />
        <ScrollView style={styles.scrollView}>
          <View style={styles.contentContainer}>
            {/* Personal Info Card */}
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>NAME</Text>
                  <Text style={styles.value}>{userData.name}</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>MOBILE</Text>
                  <Text style={styles.value}>{userData.mobile}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>ADDRESS</Text>
                  <Text style={styles.value}>{userData.address}</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>DATE OF BIRTH</Text>
                  <Text style={styles.value}>{userData.dob}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>EMAIL</Text>
                  <Text style={styles.value}>{userData.email}</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>AADHAR NUMBER</Text>
                  <Text style={styles.value}>{userData.aadhar}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>RESTAURANT</Text>
                  <Text style={styles.value}>{userData.restaurant}</Text>
                </View>
              </View>
            </View>

            {/* Subscription Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Subscription Details</Text>
              
              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>Subscription Name</Text>
                  <Text style={styles.value}>-</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>No Of Category</Text>
                  <Text style={styles.value}>-</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>No Of Table</Text>
                  <Text style={styles.value}>-</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>No Of Menu Per Category</Text>
                  <Text style={styles.value}>-</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>No Of Restaurants</Text>
                  <Text style={styles.value}>-</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>Subscription Price</Text>
                  <Text style={styles.value}>-</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>Subscription Date</Text>
                  <Text style={styles.value}>-</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>Expiry Date</Text>
                  <Text style={styles.value}>-</Text>
                </View>
              </View>
            </View>

            {/* Footer Card */}
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>Created On</Text>
                  <Text style={styles.value}>{userData.created_on || '-'}</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>Created By</Text>
                  <Text style={styles.value}>{userData.created_by || '-'}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.column}>
                  <Text style={styles.label}>Updated On</Text>
                  <Text style={styles.value}>{userData.updated_on || '-'}</Text>
                </View>
                <View style={styles.column}>
                  <Text style={styles.label}>Updated By</Text>
                  <Text style={styles.value}>{userData.updated_by || '-'}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleEdit}
        >
          <FontAwesome name="edit" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
  },
}); 